const supabase = require('../config/supabase');

/**
 * Middleware to check if the database is configured.
 * If Supabase keys are not set yet, it returns a friendly message
 * instead of crashing the server.
 */
function checkDb(req, res, next) {
  if (!supabase) {
    return res.status(503).json({
      success: false,
      error: '⚠️ Supabase Database is not configured yet. Please complete PHASE 5 (Database Setup) to enable this feature.'
    });
  }
  next();
}

module.exports = checkDb;
