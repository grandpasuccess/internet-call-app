const redis = require('../services/redis');

/**
 * Session Manager - creates and manages user sessions in Redis
 */
const SESSION_TTL = 24 * 60 * 60; // 24 hours in seconds

const sessionManager = {
  /**
   * Create a new session for a user
   * @param {string} userId - The user's unique ID
   * @returns {Promise<string>} - The session token
   */
  async createSession(userId) {
    const token = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await redis.set(`session:${token}`, userId, { EX: SESSION_TTL });
    return token;
  },

  /**
   * Get user ID from a session token
   * @param {string} token - The session token
   * @returns {Promise<string|null>} - The user ID or null if not found
   */
  async getSession(token) {
    if (!token) { return null; }
    const userId = await redis.get(`session:${token}`);
    return userId || null;
  },

  /**
   * Delete a session
   * @param {string} token - The session token
   * @returns {Promise<void>}
   */
  async deleteSession(token) {
    if (!token) { return; }
    await redis.del(`session:${token}`);
  },

  /**
   * Validate a session token
   * @param {string} token - The session token
   * @returns {Promise<boolean>} - True if valid
   */
  async validateSession(token) {
    const userId = await this.getSession(token);
    return userId !== null;
  },
};

module.exports = sessionManager;
