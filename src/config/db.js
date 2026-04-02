const mongoose = require('mongoose');
const logger = require('./logger');

const MONGO_OPTIONS = {
  // How long to wait when choosing a server from the cluster
  serverSelectionTimeoutMS: 10000,
  // Close sockets after 45s of inactivity (keeps Atlas from silently dropping them)
  socketTimeoutMS: 45000,
  // Send a heartbeat every 10s so the driver detects dropped connections quickly
  heartbeatFrequencyMS: 10000,
};

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, MONGO_OPTIONS);
    logger.info(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    logger.error(`MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};

// Auto-reconnect when the driver detects a disconnection from Atlas
mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB disconnected — attempting to reconnect...');
  setTimeout(() => {
    connectDB().catch((err) =>
      logger.error(`MongoDB reconnect failed: ${err.message}`)
    );
  }, 5000); // wait 5s before retrying
});

mongoose.connection.on('reconnected', () => {
  logger.info('MongoDB reconnected successfully');
});

module.exports = connectDB;
