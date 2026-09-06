const { validateToken } = require('../utils/tokenUtils');

/**
 * Authentication middleware for Express routes
 * Extracts JWT token from Authorization header and validates it
 */
module.exports = function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  // Check for Bearer token format
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Unauthorized',
      code: 'MISSING_TOKEN',
      status: 401,
    });
  }

  const token = authHeader.slice(7); // Remove "Bearer " prefix

  try {
    const payload = validateToken(token);
    req.userId = payload.userId;
    next();
  } catch (err) {
    return res.status(401).json({
      error: err.message,
      code: 'INVALID_TOKEN',
      status: 401,
    });
  }
};
