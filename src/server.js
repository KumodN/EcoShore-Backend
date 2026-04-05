const dotenv = require('dotenv');

// Load environment variables FIRST, before any other modules
dotenv.config();

const express = require('express');
const passport = require('passport');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');
const logger = require('./config/logger');
const apiRoutes = require('./routes/index');
const { swaggerUi, specs } = require('./config/swagger');
const { verifyConnection: verifyEmailConnection } = require('./config/email');

require('./config/google.passport.js');

connectDB();

// Verify email configuration on startup
if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
  verifyEmailConnection()
    .then(() => {
      logger.info('Email service initialized successfully');
    })
    .catch((err) => {
      logger.warn(
        'Email service failed to initialize. Agent credentials emails will not be sent:',
        err.message
      );
    });
} else {
  logger.warn(
    'Gmail credentials not configured. Agent credential emails will not be sent. Set GMAIL_USER and GMAIL_APP_PASSWORD environment variables.'
  );
}

const app = express();

app.use(express.json());
app.use(cors());
app.use(passport.initialize());

// Serve static files from the uploads directory
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Define Routes
app.use('/api', apiRoutes);
// Swagger Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

// ── Global Error Handler ───────────────────────────────────────────────────
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const status = err.status || 'error';
  logger.error(
    `[${req.method}] ${req.originalUrl} → ${statusCode}: ${err.message}`
  );
  res.status(statusCode).json({
    status,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});
