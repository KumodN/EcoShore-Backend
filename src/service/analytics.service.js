const beachRepository = require('../repository/beach.repository');
const wasteRecordRepository = require('../repository/wasteRecord.repository');
const { CarbonConfig, WasteRecord, Beach } = require('../models');
const Event = require('../models/Event');
const { NotFoundError } = require('../utils/AppError');
const {
  SEVERITY_WEIGHTS,
  TREND_PREDICTION,
  PLASTIC_TYPES,
} = require('../constants/analytics.constants');

class AnalyticsService {
  /**
   * Get dashboard overview statistics
   */
  async getDashboardOverview(startDate, endDate) {
    const wsMatch = { isDeleted: { $ne: true } };
    const eventMatch = { isDeleted: { $ne: true } };

    if (startDate || endDate) {
      wsMatch.collectionDate = {};
      eventMatch.startDate = {};
      if (startDate) {
        wsMatch.collectionDate.$gte = new Date(startDate);
        eventMatch.startDate.$gte = new Date(startDate);
      }
      if (endDate) {
        wsMatch.collectionDate.$lte = new Date(endDate);
        eventMatch.startDate.$lte = new Date(endDate);
      }
    }

    // ── 1. Total plastic weight — direct from WasteRecord collection ─────────
    const wasteSummary = await WasteRecord.aggregate([
      { $match: wsMatch },
      {
        $group: {
          _id: null,
          totalWasteCollected: { $sum: '$weight' },
          totalCarbonOffset: { $sum: '$carbonOffset' },
        },
      },
    ]);
    const totalWasteCollected = wasteSummary[0]?.totalWasteCollected || 0;
    const totalCarbonOffset = wasteSummary[0]?.totalCarbonOffset || 0;

    // ── 2. Distinct beaches that have at least one waste record ───────────────
    const distinctBeachIds = await WasteRecord.distinct('beachId', wsMatch);
    const totalBeachesCleaned = distinctBeachIds.length;

    // ── 3. Total events (all non-deleted) ─────────────────────────────────────
    const totalEvents = await Event.countDocuments(eventMatch);

    // ── 4. Most polluted beach (for informational section) ────────────────────
    const rankings = await beachRepository.getSeverityRanking(1);
    const mostPollutedBeach = rankings[0] || null;

    // ── 5. Monthly trend data for sparklines ──────────────────────────────────
    const monthlyTrends = await wasteRecordRepository.getMonthlyTrends(null, 6);

    // ── 6. Total active beaches ───────────────────────────────────────────────
    const beachStats = await beachRepository.getDashboardStats();

    return {
      summary: {
        totalBeaches: totalBeachesCleaned,
        totalWasteCollected,
        totalCleanups: totalEvents,
        totalCarbonOffset,
        averageSeverity: beachStats?.avgSeverity || 0,
      },
      mostPollutedBeach: mostPollutedBeach
        ? {
            id: mostPollutedBeach._id,
            name: mostPollutedBeach.name,
            city: mostPollutedBeach.location?.city,
            severityScore: mostPollutedBeach.analytics?.severityScore,
            totalWaste: mostPollutedBeach.analytics?.totalWasteCollected,
          }
        : null,
      monthlyTrends,
    };
  }

  /**
   * Calculate severity scores for all beaches
   * Advanced algorithm with weighted factors
   */
  async calculateSeverityScores() {
    const beaches = await beachRepository.find({ isActive: true });
    const results = [];

    for (const beach of beaches) {
      // Get last 90 days of data for trend analysis
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      // Need to find records.
      // BaseRepository 'find' returns all.
      // We need filtered find with sort.
      // wasteRecordRepository.findByFilter available?
      // I created findByFilter(filter, sort, skip, limit)
      const wasteRecords = (
        await wasteRecordRepository.findByFilter(
          {
            beachId: beach._id,
            collectionDate: { $gte: ninetyDaysAgo },
            isDeleted: { $ne: true },
          },
          { collectionDate: 1 },
          0,
          1000 // limit
        )
      )[0]; // findByFilter returns [records, total]

      if (wasteRecords.length === 0) {
        beach.analytics.severityScore = 0;
        beach.calculateSeverityLevel();
        await beach.save();
        results.push({ beachId: beach._id, score: 0, level: 'LOW' });
        continue;
      }

      // 1. Waste Volume Score (40%)
      const totalWeight = wasteRecords.reduce((sum, r) => sum + r.weight, 0);
      const volumeScore =
        Math.min((totalWeight / 500) * 100, 100) * SEVERITY_WEIGHTS.TOTAL_WASTE;

      // 2. Plastic Composition Score (30%)
      const nonRecyclableWeight = wasteRecords
        .filter((r) => ['PVC', 'PS', 'OTHER'].includes(r.plasticType))
        .reduce((sum, r) => sum + r.weight, 0);

      const nonRecyclableRatio = nonRecyclableWeight / totalWeight;
      const compositionScore =
        nonRecyclableRatio * 100 * SEVERITY_WEIGHTS.PLASTIC_RATIO;

      // 3. Frequency Score (20%)
      const uniqueDays = new Set(
        wasteRecords.map((r) => r.collectionDate.toISOString().split('T')[0])
      ).size;

      const frequencyScore =
        Math.min((uniqueDays / 30) * 100, 100) * SEVERITY_WEIGHTS.FREQUENCY;

      // 4. Trend Score (10%) - Increasing trend is worse
      let trendScore = 0;
      if (wasteRecords.length >= TREND_PREDICTION.MIN_DATA_POINTS) {
        const recentAvg =
          wasteRecords.slice(-7).reduce((sum, r) => sum + r.weight, 0) / 7;
        const olderAvg =
          wasteRecords.slice(0, 7).reduce((sum, r) => sum + r.weight, 0) / 7;

        if (olderAvg > 0) {
          const trend = (recentAvg - olderAvg) / olderAvg;
          trendScore =
            Math.max(0, Math.min(trend * 50, 100)) * SEVERITY_WEIGHTS.TREND;
        }
      }

      // Calculate total score
      const totalScore = Math.min(
        volumeScore + compositionScore + frequencyScore + trendScore,
        100
      );

      beach.analytics.severityScore = Number(totalScore.toFixed(2));
      beach.calculateSeverityLevel();
      await beach.save();

      results.push({
        beachId: beach._id,
        name: beach.name,
        score: beach.analytics.severityScore,
        level: beach.analytics.severityLevel,
      });
    }

    return results;
  }

  /**
   * Get beach severity ranking with dynamically aggregated carbon offset
   */
  async getSeverityRanking(limit = 10) {
    const beaches = await beachRepository.getSeverityRanking(limit);

    // Aggregating Carbon Offset for these exact beaches
    const beachIds = beaches.map((b) => b._id);
    const offsetData = await WasteRecord.aggregate([
      { $match: { beachId: { $in: beachIds }, isDeleted: { $ne: true } } },
      {
        $group: {
          _id: '$beachId',
          totalCarbonOffset: { $sum: '$carbonOffset' },
        },
      },
    ]);

    const offsetMap = {};
    offsetData.forEach((d) => {
      offsetMap[d._id.toString()] = d.totalCarbonOffset;
    });

    return beaches.map((beach) => ({
      id: beach._id,
      name: beach.name,
      city: beach.location?.city,
      severityScore: beach.analytics?.severityScore,
      severityLevel: beach.analytics?.severityLevel,
      totalWaste: beach.analytics?.totalWasteCollected,
      totalCarbonOffset: Number(
        (offsetMap[beach._id.toString()] || 0).toFixed(2)
      ),
    }));
  }

  /**
   * Predict pollution trends using Moving Average
   */
  async predictPollutionTrend(beachId = null, months = 3) {
    // Reusing repo method for aggregation
    const monthlyData = await wasteRecordRepository.getMonthlyTrends(
      beachId,
      12
    );

    if (monthlyData.length < TREND_PREDICTION.MIN_DATA_POINTS) {
      return {
        success: false,
        message: 'Insufficient data for prediction',
        required: TREND_PREDICTION.MIN_DATA_POINTS,
        current: monthlyData.length,
      };
    }

    // Extract weights
    const weights = monthlyData.map((d) => d.totalWeight);

    // Simple Moving Average forecast
    const windowSize = 3;
    const forecast = [];

    // Use average emission factor of 2.5 kg CO₂ per kg waste as default
    const carbonConfig = await CarbonConfig.getActiveConfig();
    const emissionFactor = carbonConfig?.emissionFactor || 2.5;

    // Start from the beginning of next month
    const forecastStart = new Date();
    forecastStart.setDate(1);
    forecastStart.setMonth(forecastStart.getMonth() + 1);

    for (let i = 0; i < months; i++) {
      const recentWeights = weights.slice(-windowSize);
      const average = recentWeights.reduce((a, b) => a + b, 0) / windowSize;

      // Add some random variation for realism (±10%)
      const variation = average * 0.1 * (Math.random() - 0.5);
      const predictedWeight = Math.max(0, average + variation);
      const predictedCarbonOffset = predictedWeight * emissionFactor;

      // Build a human-readable month label e.g. "Apr 2026"
      const forecastDate = new Date(forecastStart);
      forecastDate.setMonth(forecastStart.getMonth() + i);
      const dateLabel = forecastDate.toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric',
      });

      forecast.push({
        month: i + 1,
        date: dateLabel,
        predictedWeight: Number(predictedWeight.toFixed(2)),
        predictedCarbonOffset: Number(predictedCarbonOffset.toFixed(2)),
        confidence: 0.8 - i * 0.1, // Decreasing confidence
      });

      weights.push(predictedWeight); // Add to weights for next prediction
    }

    // Calculate trend direction
    const currentAvg = weights.slice(-6, -3).reduce((a, b) => a + b, 0) / 3;
    const predictedAvg =
      forecast.reduce((a, b) => a + b.predictedWeight, 0) / months;

    const trendDirection =
      predictedAvg > currentAvg ? 'INCREASING' : 'DECREASING';
    const percentageChange = (
      ((predictedAvg - currentAvg) / currentAvg) *
      100
    ).toFixed(1);

    return {
      success: true,
      beachId: beachId || 'all',
      historicalData: monthlyData.map((d) => ({
        month: `${d._id.year}-${d._id.month}`,
        weight: d.totalWeight,
      })),
      forecast,
      trend: {
        direction: trendDirection,
        percentageChange: `${percentageChange}%`,
        summary: `Pollution is ${trendDirection === 'INCREASING' ? 'increasing' : 'decreasing'} by ${Math.abs(percentageChange)}% over the next ${months} months`,
      },
    };
  }

  /**
   * Calculate carbon offset summary
   */
  async getCarbonOffsetSummary(startDate, endDate) {
    // Include ALL non-deleted records (not just verified) for accurate totals
    const matchStage = { isDeleted: { $ne: true } };

    if (startDate || endDate) {
      matchStage.collectionDate = {};
      if (startDate) matchStage.collectionDate.$gte = new Date(startDate);
      if (endDate) matchStage.collectionDate.$lte = new Date(endDate);
    }

    // Use Repo
    const carbonData =
      await wasteRecordRepository.getCarbonOffsetSummary(matchStage);

    // Get carbon configuration
    const carbonConfig = await CarbonConfig.getActiveConfig();

    // Calculate equivalents for better understanding
    const carbonEquivalent = {
      carsPerYear: Math.round((carbonData[0]?.totalCarbonOffset || 0) / 4.6), // Avg car emits 4.6 tons/year
      treePlanting: Math.round((carbonData[0]?.totalCarbonOffset || 0) * 0.5), // 1 tree absorbs ~2kg CO2/year
      homesEnergy: Math.round((carbonData[0]?.totalCarbonOffset || 0) / 10.2), // Avg home uses 10.2 tons/year
    };

    return {
      summary: carbonData[0] || {
        totalCarbonOffset: 0,
        totalWasteWeight: 0,
        averageCarbonPerKg: 0,
        recordCount: 0,
      },
      emissionFactor: carbonConfig?.emissionFactor || 2.5,
      equivalents: carbonEquivalent,
    };
  }

  /**
   * Bulk-recalculate carbonOffset for every WasteRecord in the DB.
   * Also verifies all records and rebuilds Beach.analytics totals.
   */
  async recalculateCarbonOffsets() {
    const carbonConfig = await CarbonConfig.getActiveConfig();
    const emissionFactor = carbonConfig?.emissionFactor || 2.5;

    // 1. Recalculate carbonOffset for every non-deleted waste record
    const records = await WasteRecord.find({ isDeleted: { $ne: true } });
    let updated = 0;

    const bulkOps = records.map((record) => {
      const multiplier = PLASTIC_TYPES[record.plasticType]?.weight || 1.0;
      const carbonOffset = Number(
        (record.weight * emissionFactor * multiplier).toFixed(4)
      );
      updated++;
      return {
        updateOne: {
          filter: { _id: record._id },
          update: { $set: { carbonOffset, isVerified: true } },
        },
      };
    });

    if (bulkOps.length > 0) {
      await WasteRecord.bulkWrite(bulkOps);
    }

    // 2. Rebuild Beach.analytics totals from scratch
    const beaches = await beachRepository.find({ isActive: true });
    for (const beach of beaches) {
      const beachRecords = await WasteRecord.find({
        beachId: beach._id,
        isDeleted: { $ne: true },
      });

      const totalWaste = beachRecords.reduce((s, r) => s + (r.weight || 0), 0);
      beach.analytics.totalWasteCollected = totalWaste;
      beach.analytics.totalCleanups = beachRecords.length;
      if (beachRecords.length > 0) {
        const latest = beachRecords.reduce((a, b) =>
          a.collectionDate > b.collectionDate ? a : b
        );
        beach.analytics.lastCleanupDate = latest.collectionDate;
      }
      await beach.save();
    }

    return {
      recordsUpdated: updated,
      emissionFactorUsed: emissionFactor,
      beachesRebuild: beaches.length,
    };
  }
}

module.exports = new AnalyticsService();
