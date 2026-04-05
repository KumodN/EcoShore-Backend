const express = require('express');
const dotenv = require('dotenv');
const passport = require('passport');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const connectDB = require('./config/db');
const logger = require('./config/logger');
const apiRoutes = require('./routes/index');
const { swaggerUi, specs } = require('./config/swagger');
const registerMeetingSocket = require('./socket/meeting.socket');

dotenv.config();
require('./config/google.passport.js');

connectDB();

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

const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || '*',
    methods: ['GET', 'POST'],
  },
});

registerMeetingSocket(io);

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

httpServer.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});
