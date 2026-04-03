const axios = require('axios');
const NodeCache = require('node-cache');
const beachRepository = require('../repository/beach.repository');
const weatherService = require('./weather.service');
const { NotFoundError } = require('../utils/AppError');

// Cache heatmap predictions for HEATMAP_CACHE_TTL seconds (default 6 hours)
const heatmapCache = new NodeCache({
  stdTTL: parseInt(process.env.HEATMAP_CACHE_TTL) || 21600,
  checkperiod: 600,
});

// Risk level thresholds based on predicted pollution score (0-100)
const RISK_LEVELS = {
  LOW: { min: 0, max: 25, label: 'LOW', color: '#22c55e' },
  MODERATE: { min: 25, max: 50, label: 'MODERATE', color: '#eab308' },
  HIGH: { min: 50, max: 75, label: 'HIGH', color: '#f97316' },
  CRITICAL: { min: 75, max: 100, label: 'CRITICAL', color: '#ef4444' },
};

class HeatmapService {
  constructor() {
    this.mlServiceUrl = process.env.ML_SERVICE_URL || 'http://localhost:5001';
  }

  /**
   * Get risk level object from a numeric score (0-100)
   * @param {number} score
   * @returns {object} Risk level info
   */
  _getRiskLevel(score) {
    if (score >= 75) return RISK_LEVELS.CRITICAL;
    if (score >= 50) return RISK_LEVELS.HIGH;
    if (score >= 25) return RISK_LEVELS.MODERATE;
    return RISK_LEVELS.LOW;
  }

  /**
   * Build a rules-based 7-day prediction when the ML service is unavailable.
   * Uses the beach's existing severityScore as a baseline and applies weather
   * influence factors (rain increases risk, high wind disperses waste, etc.)
   *
   * @param {object} beach - Mongoose Beach document
   * @param {Array}  weatherForecast - 7-day weather array from weatherService
   * @returns {Array} 7 prediction objects
   */
  _fallbackPrediction(beach, weatherForecast) {
    const baseScore = beach.analytics?.severityScore || 30;

    return weatherForecast.map((day) => {
      // Rain increases waste accumulation (runoff), high wind disperses it
      const rainFactor = Math.min(day.precipitation * 0.8, 15);
      const windFactor = Math.max(0, (day.windSpeed - 5) * -0.5);
      const humidityFactor = (day.humidity - 70) * 0.1;

      const predictedScore = Math.min(
        100,
        Math.max(0, baseScore + rainFactor + windFactor + humidityFactor)
      );

      const riskLevel = this._getRiskLevel(predictedScore);

      return {
        date: day.date,
        riskScore: Number(predictedScore.toFixed(2)),
        riskLevel: riskLevel.label,
        color: riskLevel.color,
        confidence: 0.6, // Lower confidence for rules-based fallback
        source: 'rules-based',
        weatherSnapshot: {
          temp: day.temp,
          humidity: day.humidity,
          precipitation: day.precipitation,
          windSpeed: day.windSpeed,
        },
      };
    });
  }

  /**
   * Call the Python ML microservice for predictions.
   * Falls back to rules-based predictions if the service is unreachable.
   *
   * @param {object} beachData - Serialized beach object
   * @param {Array}  weatherForecast - 7-day weather array
   * @returns {Array} 7 prediction objects
   */
  async callMLService(beachData, weatherForecast) {
    try {
      const response = await axios.post(
        `${this.mlServiceUrl}/predict`,
        {
          beach: {
            id: beachData._id,
            name: beachData.name,
            severityScore: beachData.analytics?.severityScore || 0,
            totalWasteCollected: beachData.analytics?.totalWasteCollected || 0,
            totalCleanups: beachData.analytics?.totalCleanups || 0,
            location: beachData.location,
          },
          weather: weatherForecast,
        },
        { timeout: 15000 }
      );

      // Flask wraps its response: { success, data: { predictions, beachId, beachName } }
      // Axios response.data = the full JSON body, so predictions are at response.data.data.predictions
      return response.data.data.predictions;
    } catch (error) {
      // ML service is down — log warning and fall back gracefully
      console.warn(
        `[HeatmapService] ML service unavailable (${error.message}), using rules-based fallback`
      );
      return this._fallbackPrediction(beachData, weatherForecast);
    }
  }

  /**
   * Generate heatmap prediction data for one beach or all beaches.
   * Results are cached for HEATMAP_CACHE_TTL seconds.
   *
   * @param {string|null} beachId - If provided, only predict for this beach
   * @returns {object} Heatmap data payload
   */
  async generateHeatmapData(beachId = null) {
    const cacheKey = beachId ? `heatmap_beach_${beachId}` : 'heatmap_all';

    // Return cached result if fresh
    const cached = heatmapCache.get(cacheKey);
    if (cached) {
      return { ...cached, fromCache: true };
    }

    // Fetch beaches from MongoDB
    let beaches;
    if (beachId) {
      const beach = await beachRepository.findById(beachId);
      if (!beach) throw new NotFoundError('Beach');
      beaches = [beach];
    } else {
      beaches = await beachRepository.find({ isActive: true });
    }

    if (beaches.length === 0) {
      return {
        predictions: [],
        generatedAt: new Date().toISOString(),
        fromCache: false,
      };
    }

    // Build predictions for each beach concurrently
    const predictions = await Promise.all(
      beaches.map(async (beach) => {
        // Extract coordinates — Beach schema stores [longitude, latitude]
        // Must check Array.isArray + length because an empty [] is truthy
        const coords = beach.location?.coordinates?.coordinates;
        const hasCoords = Array.isArray(coords) && coords.length === 2;
        const lat = hasCoords ? coords[1] : null;
        const lon = hasCoords ? coords[0] : null;

        // Fetch 7-day weather forecast (handles caching internally)
        const weatherForecast = await weatherService.getForecast(lat, lon);

        // Get ML (or fallback) predictions
        const dailyPredictions = await this.callMLService(
          beach,
          weatherForecast
        );

        // Compute the overall risk for today (day 0) for the map pin
        const todayRisk =
          Array.isArray(dailyPredictions) && dailyPredictions.length > 0
            ? dailyPredictions[0]
            : null;

        return {
          beachId: beach._id,
          beachName: beach.name,
          location: {
            city: beach.location?.city,
            address: beach.location?.address,
            coordinates: coords || null,
          },
          currentSeverityScore: beach.analytics?.severityScore || 0,
          currentSeverityLevel: beach.analytics?.severityLevel || 'LOW',
          todayRisk,
          forecast: Array.isArray(dailyPredictions) ? dailyPredictions : [],
        };
      })
    );

    const result = {
      predictions,
      beachCount: predictions.length,
      generatedAt: new Date().toISOString(),
      cacheTTL: parseInt(process.env.HEATMAP_CACHE_TTL) || 21600,
      fromCache: false,
    };

    // Store in cache
    heatmapCache.set(cacheKey, result);

    return result;
  }

  /**
   * Force-refresh the heatmap cache for one beach or all beaches.
   * Deletes the cached entry then regenerates fresh predictions.
   *
   * @param {string|null} beachId
   * @returns {object} Fresh heatmap data
   */
  async refreshCache(beachId = null) {
    const cacheKey = beachId ? `heatmap_beach_${beachId}` : 'heatmap_all';
    heatmapCache.del(cacheKey);
    return this.generateHeatmapData(beachId);
  }

  /**
   * Get cache statistics for debugging/monitoring
   * @returns {object}
   */
  getCacheStats() {
    return {
      heatmapCache: heatmapCache.getStats(),
      weatherCache: weatherService.getCacheStats(),
    };
  }

  /**
   * Check if the Python ML microservice is reachable and ready
   * @returns {object} Health status
   */
  async checkMLServiceHealth() {
    try {
      const response = await axios.get(`${this.mlServiceUrl}/health`, {
        timeout: 5000,
      });
      return { reachable: true, ...response.data };
    } catch (error) {
      return {
        reachable: false,
        error: error.message,
        fallbackMode: true,
        message: 'Using rules-based predictions',
      };
    }
  }
}

module.exports = new HeatmapService();
