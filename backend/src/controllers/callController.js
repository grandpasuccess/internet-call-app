const Call = require('../models/Call');

/**
 * Call Controller - handles call-related API endpoints
 */
const callController = {
  /**
   * Get active calls for a user
   * GET /api/calls/active
   */
  async getActiveCalls(req, res) {
    try {
      const userId = req.userId;
      const calls = await Call.findActiveForUser(userId);
      return res.status(200).json({
        calls,
        count: calls.length,
      });
    } catch (err) {
      console.error('getActiveCalls error:', err);
      return res.status(500).json({
        error: 'Failed to get active calls',
        code: 'SERVER_ERROR',
        status: 500,
      });
    }
  },

  /**
   * Get call history for a user
   * GET /api/calls/history?limit=50
   */
  async getCallHistory(req, res) {
    try {
      const userId = req.userId;
      const limit = parseInt(req.query.limit, 10) || 50;
      const calls = await Call.getHistory(userId, Math.min(limit, 100));
      return res.status(200).json({
        calls,
        count: calls.length,
      });
    } catch (err) {
      console.error('getCallHistory error:', err);
      return res.status(500).json({
        error: 'Failed to get call history',
        code: 'SERVER_ERROR',
        status: 500,
      });
    }
  },

  /**
   * Get a specific call by ID
   * GET /api/calls/:id
   */
  async getCall(req, res) {
    try {
      const callId = req.params.id;
      const call = await Call.findById(callId);
      if (!call) {
        return res.status(404).json({
          error: 'Call not found',
          code: 'CALL_NOT_FOUND',
          status: 404,
        });
      }
      return res.status(200).json(call.toJSON());
    } catch (err) {
      console.error('getCall error:', err);
      return res.status(500).json({
        error: 'Failed to get call',
        code: 'SERVER_ERROR',
        status: 500,
      });
    }
  },
};

module.exports = callController;
