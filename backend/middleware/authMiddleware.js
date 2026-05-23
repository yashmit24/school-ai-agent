/**
 * Simple Authentication Middleware
 * Protects administrative routes by checking for a secret header key.
 */
function authMiddleware(req, res, next) {
  // For GET requests, we can let them pass (e.g. public info)
  // For POST, PUT, DELETE, we require verification
  if (req.method === 'GET') {
    return next();
  }

  const apiKey = req.headers['x-admin-key'];
  const adminSecret = process.env.ADMIN_SECRET || 'school-admin-super-secret-key-123';

  if (!apiKey || apiKey !== adminSecret) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Invalid or missing X-Admin-Key in headers.'
    });
  }

  next();
}

module.exports = authMiddleware;
