const redis = require('../services/redis');

const PRESENCE_TTL = 5 * 60; // 5 minutes in seconds

const presenceManager = {
  /**
   * Mark a user as online
   * @param {string} userId - The user's unique ID
   * @returns {Promise<void>}
   */
  async setUserOnline(userId) {
    await redis.set(`presence:${userId}`, 'online', { EX: PRESENCE_TTL });
  },

  /**
   * Mark a user as offline
   * @param {string} userId - The user's unique ID
   * @returns {Promise<void>}
   */
  async setUserOffline(userId) {
    await redis.del(`presence:${userId}`);
  },

  /**
   * Get a user's presence status
   * @param {string} userId - The user's unique ID
   * @returns {Promise<object>} - { online: boolean, lastSeen?: string }
   */
  async getUserPresence(userId) {
    const status = await redis.get(`presence:${userId}`);
    return {
      online: status === 'online',
      lastSeen: status === 'online' ? new Date().toISOString() : null,
    };
  },

  /**
   * Get all online users
   * @returns {Promise<string[]>} - Array of user IDs who are online
   */
  async getOnlineUsers() {
    const keys = await redis.keys('presence:*');
    if (keys.length === 0) { return []; }
    
    const onlineUsers = [];
    for (const key of keys) {
      const status = await redis.get(key);
      if (status === 'online') {
        const userId = key.replace('presence:', '');
        onlineUsers.push(userId);
      }
    }
    return onlineUsers;
  },

  /**
   * Extend presence TTL (called periodically to keep user online)
   * @param {string} userId - The user's unique ID
   * @returns {Promise<void>}
   */
  async refreshPresence(userId) {
    await redis.set(`presence:${userId}`, 'online', { EX: PRESENCE_TTL });
  },
};

module.exports = presenceManager;
