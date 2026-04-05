const express = require('express');

const setupTestApp = (router, routePath = '/api') => {
  const app = express();
  app.use(express.json());

  // Custom mock user for request
  app.use((req, res, next) => {
    req.user = {
      id: 'mockUserId123',
      role: 'admin',
    };
    next();
  });

  app.use(routePath, router);

  // Global error handler mock equivalent to the actual one in app
  app.use((err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      message: err.message,
    });
  });

  return app;
};

module.exports = setupTestApp;
