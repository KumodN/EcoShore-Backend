const express = require('express');
const beachRoutes = require('./beach.routes');
const wasteRecordRoutes = require('./wasteRecord.routes');
const analyticsRoutes = require('./analytics.routes');
const carbonConfigRoutes = require('./carbonConfig.routes');
const agentRoutes = require('./agent.routes');
const organizerRequestRoutes = require('./organizerRequest.routes');
const chatRoutes = require('./chat.routes');
const postRoutes = require('./postRoutes.routes');
const eventRoutes = require('./event.routes');
const meetingRoutes = require('./meeting.routes');
const authRoutes = require('./auth.routes');
const heatmapRoutes = require('./heatmap.routes');
const fileUploadRoutes = require('./fileUpload.routes');

const router = express.Router();

/**
 * API Routes
 * All routes are prefixed with /api
 */
router.use('/auth', authRoutes);
router.use('/beaches', beachRoutes);
router.use('/waste-records', wasteRecordRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/carbon-config', carbonConfigRoutes);
router.use('/heatmap', heatmapRoutes);
router.use('/agents', agentRoutes);
router.use('/organizer-requests', organizerRequestRoutes);
router.use('/chat', chatRoutes);
router.use('/posts', postRoutes);
router.use('/events', eventRoutes);
router.use('/meetings', meetingRoutes);
router.use('/upload-file', fileUploadRoutes);

module.exports = router;
