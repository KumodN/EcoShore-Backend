const express = require('express');
const analyticsController = require('../controller/analytics.controller');
const analyticsValidation = require('../validation/analytics.validation');
const validate = require('../middleware/validate');
const auth = require('../middleware/auth');

const router = express.Router();

/**
 * All analytics routes require authentication
 */
router.use(auth());

/**
 * @swagger
 * /analytics/dashboard:
 *   get:
 *     summary: Get dashboard overview
 *     tags: [Analytics]
 *     responses:
 *       200: { description: Dashboard overview retrieved successfully }
 */
router.get(
  '/dashboard',
  validate(analyticsValidation.dashboard),
  analyticsController.getDashboardOverview
);

/**
 * @swagger
 * /analytics/severity-ranking:
 *   get:
 *     summary: Get beach severity ranking
 *     tags: [Analytics]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *     responses:
 *       200: { description: Severity ranking retrieved successfully }
 */
router.get(
  '/severity-ranking',
  validate(analyticsValidation.severityRanking),
  analyticsController.getSeverityRanking
);

/**
 * @swagger
 * /analytics/severity/recalculate:
 *   post:
 *     summary: Recalculate severity scores for all beaches
 *     tags: [Analytics]
 *     responses:
 *       200: { description: Severity scores recalculated successfully }
 */
router.post(
  '/severity/recalculate',
  validate(analyticsValidation.recalculateSeverity),
  analyticsController.recalculateSeverity
);

/**
 * @swagger
 * /analytics/carbon/recalculate:
 *   post:
 *     summary: Bulk-recalculate carbon offsets for all waste records (admin)
 *     tags: [Analytics]
 *     responses:
 *       200: { description: Carbon offsets recalculated successfully }
 */
router.post(
  '/carbon/recalculate',
  analyticsController.recalculateCarbonOffsets
);

/**
 * @swagger
 * /analytics/trend-prediction:
 *   get:
 *     summary: Predict pollution trends
 *     tags: [Analytics]
 *     parameters:
 *       - in: query
 *         name: beachId
 *         schema: { type: string }
 *       - in: query
 *         name: months
 *         schema: { type: integer, default: 3 }
 *     responses:
 *       200: { description: Trend prediction generated successfully }
 */
router.get(
  '/trend-prediction',
  validate(analyticsValidation.trendPrediction),
  analyticsController.predictTrends
);

/**
 * @swagger
 * /analytics/carbon-offset:
 *   get:
 *     summary: Get carbon offset summary
 *     tags: [Analytics]
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: endDate
 *         schema: { type: string, format: date }
 *     responses:
 *       200: { description: Carbon offset summary retrieved successfully }
 */
router.get(
  '/carbon-offset',
  validate(analyticsValidation.carbonOffset),
  analyticsController.getCarbonOffsetSummary
);

/**
 * @swagger
 * /analytics/export/json:
 *   get:
 *     summary: Export analytics as JSON
 *     tags: [Analytics]
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: endDate
 *         schema: { type: string, format: date }
 *     responses:
 *       200: { description: Analytics exported successfully }
 */
router.get('/export/json', analyticsController.exportAnalyticsJSON);

/**
 * @swagger
 * /analytics/export/csv:
 *   get:
 *     summary: Export analytics as CSV-ready structure
 *     tags: [Analytics]
 *     responses:
 *       200: { description: CSV data prepared successfully }
 */
router.get('/export/csv', analyticsController.exportAnalyticsCSV);

module.exports = router;
