/**
 * Global Error Handling Middleware
 * Catch all unhandled errors in express routes and return a clean JSON response.
 */
function errorHandler(err, req, res, next) {
  console.error('❌ SERVER ERROR LOG:', err.stack || err.message || err);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    success: false,
    error: message,
    // Only show stack trace in development mode
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
}

module.exports = errorHandler;
