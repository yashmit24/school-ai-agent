const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'school-mitra-super-secret-jwt-2024';

/**
 * JWT Authentication Middleware
 * Verifies Bearer token in Authorization header.
 * Attaches decoded admin info to req.admin
 */
function jwtMiddleware(req, res, next) {
  // Allow GET requests to pass through for public data reads
  if (req.method === 'GET') return next();

  const auth = req.headers['authorization'];
  if (!auth || !auth.startsWith('Bearer ')) {
    // Fallback: check legacy X-Admin-Key for backward compatibility
    const apiKey = req.headers['x-admin-key'];
    const adminSecret = process.env.ADMIN_SECRET || 'school-admin-super-secret-key-123';
    if (apiKey && apiKey === adminSecret) return next();

    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Please login to perform this action.'
    });
  }

  try {
    const token = auth.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    req.admin = decoded;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: 'Session expired. Please login again.',
      code: 'TOKEN_EXPIRED'
    });
  }
}

module.exports = jwtMiddleware;
