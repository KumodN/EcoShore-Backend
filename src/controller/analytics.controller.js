const analyticsService = require('../service/analytics.service');
const catchAsync = require('../utils/catchAsync');
const ResponseHandler = require('../utils/responseHandler');

class AnalyticsController {
  /**
   * Get dashboard overview
   */
  getDashboardOverview = catchAsync(async (req, res) => {
    const { startDate, endDate } = req.query;
    const dashboard = await analyticsService.getDashboardOverview(
      startDate,
      endDate
    );

    return ResponseHandler.success(
      res,
      {
        dashboard,
      },
      'Dashboard overview retrieved successfully'
    );
  });

  /**
   * Get severity ranking
   */
  getSeverityRanking = catchAsync(async (req, res) => {
    const limit = req.query.limit || 10;
    const ranking = await analyticsService.getSeverityRanking(limit);

    return ResponseHandler.success(
      res,
      {
        ranking,
      },
      'Severity ranking retrieved successfully'
    );
  });

  /**
   * Recalculate severity scores
   */
  recalculateSeverity = catchAsync(async (req, res) => {
    const results = await analyticsService.calculateSeverityScores();

    return ResponseHandler.success(
      res,
      {
        results,
        totalUpdated: results.length,
      },
      'Severity scores recalculated successfully'
    );
  });

  /**
   * Predict pollution trends
   */
  predictTrends = catchAsync(async (req, res) => {
    const { beachId, months = 3 } = req.query;
    const prediction = await analyticsService.predictPollutionTrend(
      beachId,
      months
    );

    return ResponseHandler.success(
      res,
      {
        prediction,
      },
      'Trend prediction generated successfully'
    );
  });

  /**
   * Get carbon offset summary
   */
  getCarbonOffsetSummary = catchAsync(async (req, res) => {
    const { startDate, endDate } = req.query;
    const summary = await analyticsService.getCarbonOffsetSummary(
      startDate,
      endDate
    );

    return ResponseHandler.success(
      res,
      {
        summary,
      },
      'Carbon offset summary retrieved successfully'
    );
  });

  /**
   * Export analytics as JSON
   */
  exportAnalyticsJSON = catchAsync(async (req, res) => {
    const { startDate, endDate, beachId } = req.query;

    // Gather all analytics data
    const [dashboard, ranking, carbonSummary, trends] = await Promise.all([
      analyticsService.getDashboardOverview(),
      analyticsService.getSeverityRanking(50),
      analyticsService.getCarbonOffsetSummary(startDate, endDate),
      analyticsService.predictPollutionTrend(beachId, 3),
    ]);

    const exportData = {
      generatedAt: new Date().toISOString(),
      dateRange: { startDate, endDate },
      summary: {
        ...dashboard.summary,
        carbonSummary: carbonSummary.summary,
      },
      severityRanking: ranking,
      carbonEquivalents: carbonSummary.equivalents,
      pollutionForecast: trends,
    };

    return ResponseHandler.success(
      res,
      {
        exportData,
      },
      'Analytics exported successfully'
    );
  });

  /**
   * Export analytics as CSV-ready structure
   */
  exportAnalyticsCSV = catchAsync(async (req, res) => {
    const { startDate, endDate } = req.query;

    const ranking = await analyticsService.getSeverityRanking(50);

    // Format for CSV conversion
    const csvData = ranking.map((beach) => ({
      BeachName: beach.name,
      City: beach.city,
      SeverityScore: beach.severityScore,
      SeverityLevel: beach.severityLevel,
      TotalWasteKg: beach.totalWaste,
    }));

    return ResponseHandler.success(
      res,
      {
        data: csvData,
        headers: [
          'BeachName',
          'City',
          'SeverityScore',
          'SeverityLevel',
          'TotalWasteKg',
        ],
      },
      'CSV data prepared successfully'
    );
  });
  /**
   * Recalculate carbon offsets for all waste records (admin)
   */
  recalculateCarbonOffsets = catchAsync(async (req, res) => {
    const result = await analyticsService.recalculateCarbonOffsets();

    return ResponseHandler.success(
      res,
      { result },
      `Carbon offsets recalculated: ${result.recordsUpdated} records updated, ${result.beachesRebuild} beaches rebuilt`
    );
  });
}

module.exports = new AnalyticsController();
