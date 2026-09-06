const { validateToken } = require('../utils/tokenUtils');

/**
 * Socket.io authentication middleware
 * Validates JWT token from handshake auth data
 */
module.exports = function socketAuthenticate(socket, next) {
  const token = socket.handshake.auth?.token;

  if (!token) {
    console.log(`Socket auth failed: no token for socket ${socket.id}`);
    return next(new Error('Authentication required'));
  }

  try {
    const payload = validateToken(token);
    socket.userId = payload.userId;
    socket.authToken = token;
    next();
  } catch (err) {
    console.log(`Socket auth failed: ${err.message} for socket ${socket.id}`);
    next(new Error('Invalid or expired token'));
  }
};
