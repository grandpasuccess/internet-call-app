const Call = require('../models/Call');

/**
 * Call Controller - handles call-related API requests
 */
const callController = {
  /**
   * Get active calls for the authenticated user
   * GET /calls/active
   */
  async getActiveCalls(req, res) {
    try {
      const userId = req.userId;
      const calls = await Call.findActiveForUser(userId);

      return res.status(200).json({
        calls: calls.map((c) => c.toJSON()),
        count: calls.length,
      });
    } catch (err) {
      console.error('getActiveCalls error:', err);
      return res.status(500).json({
        error: 'Failed to fetch active calls',
        code: 'SERVER_ERROR',
        status: 500,
      });
    }
  },

  /**
   * Get call history for the authenticated user
   * GET /calls/history?limit=50
   */
  async getCallHistory(req, res) {
    try {
      const userId = req.userId;
      const limit = parseInt(req.query.limit, 10) || 50;
      const calls = await Call.getHistory(userId, Math.min(limit, 100));

      return res.status(200).json({
        calls: calls.map((c) => c.toJSON()),
        count: calls.length,
      });
    } catch (err) {
      console.error('getCallHistory error:', err);
      return res.status(500).json({
        error: 'Failed to fetch call history',
        code: 'SERVER_ERROR',
        status: 500,
      });
    }
  },
};

module.exports = callController;
