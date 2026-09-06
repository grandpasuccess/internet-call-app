const presenceManager = require('./presenceManager');

/**
 * Get online users list
 */
async function getOnlineUsers() {
  const userIds = await presenceManager.getOnlineUsers();
  return userIds;
}

/**
 * Check if a specific user is online
 */
async function isUserOnline(userId) {
  const status = await presenceManager.getUserPresence(userId);
  return status.online;
}

module.exports = { getOnlineUsers, isUserOnline };
