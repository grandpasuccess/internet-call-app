const jwt = require('jsonwebtoken');
const env = require('../config/environment');

/**
 * Generate a JWT token for a user
 * @param {string|number} userId - The user ID
 * @param {string} expiresIn - Token expiration time (default: '24h')
 * @returns {string} - The JWT token
 */
function generateToken(userId, expiresIn = env.jwtExpiresIn || '24h') {
  const payload = {
    userId,
    iat: Math.floor(Date.now() / 1000),
  };

  return jwt.sign(payload, env.jwtSecret, {
    expiresIn,
    issuer: 'internet-call-app',
    subject: 'user-authentication',
  });
}

/**
 * Validate and decode a JWT token
 * @param {string} token - The JWT token to validate
 * @returns {object} - Decoded payload containing userId
 * @throws {Error} - If token is invalid or expired
 */
function validateToken(token) {
  if (!token) {
    throw new Error('No token provided');
  }

  try {
    const decoded = jwt.verify(token, env.jwtSecret, {
      issuer: 'internet-call-app',
      maxAge: env.jwtExpiresIn || '24h',
    });

    return {
      userId: decoded.userId,
      iat: decoded.iat,
      exp: decoded.exp,
    };
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw new Error('Token expired');
    }
    if (err.name === 'JsonWebTokenError') {
      throw new Error('Invalid token');
    }
    throw new Error('Token validation failed');
  }
}

module.exports = { generateToken, validateToken };
