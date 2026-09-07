const { describe, it, expect, beforeEach } = require('@jest/globals');

// Mock Call model
jest.mock('../../src/models/Call', () => ({
  findActiveForUser: jest.fn(),
  getHistory: jest.fn(),
}));

// Mock auth middleware to set req.userId
jest.mock('../../src/middleware/authenticate', () => {
  return jest.fn((req, res, next) => {
    req.userId = 'test-user-123';
    next();
  });
});

const callController = require('../../src/controllers/callController');
const Call = require('../../src/models/Call');

function makeRes() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };
}

describe('Call Controller', () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = { userId: 'test-user-123', query: {} };
    res = makeRes();
  });

  describe('getActiveCalls', () => {
    it('should return active calls for the user', async () => {
      const mockCalls = [
        {
          id: 1,
          toJSON: () => ({ id: 1, callerId: 'test-user-123', status: 'connected' }),
        },
        {
          id: 2,
          toJSON: () => ({ id: 2, calleeId: 'test-user-123', status: 'initiated' }),
        },
      ];
      Call.findActiveForUser.mockResolvedValue(mockCalls);

      await callController.getActiveCalls(req, res);

      expect(Call.findActiveForUser).toHaveBeenCalledWith('test-user-123');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        calls: [
          { id: 1, callerId: 'test-user-123', status: 'connected' },
          { id: 2, calleeId: 'test-user-123', status: 'initiated' },
        ],
        count: 2,
      });
    });

    it('should return empty list when no active calls', async () => {
      Call.findActiveForUser.mockResolvedValue([]);

      await callController.getActiveCalls(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ calls: [], count: 0 });
    });

    it('should return 500 on database error', async () => {
      Call.findActiveForUser.mockRejectedValue(new Error('DB connection failed'));

      await callController.getActiveCalls(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'SERVER_ERROR' })
      );
    });
  });

  describe('getCallHistory', () => {
    it('should return call history for the user', async () => {
      const mockCalls = [
        {
          id: 1,
          toJSON: () => ({ id: 1, callerId: 'test-user-123', status: 'ended', durationSeconds: 120 }),
        },
        {
          id: 2,
          toJSON: () => ({ id: 2, calleeId: 'test-user-123', status: 'rejected' }),
        },
      ];
      Call.getHistory.mockResolvedValue(mockCalls);

      await callController.getCallHistory(req, res);

      expect(Call.getHistory).toHaveBeenCalledWith('test-user-123', 50);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        calls: [
          { id: 1, callerId: 'test-user-123', status: 'ended', durationSeconds: 120 },
          { id: 2, calleeId: 'test-user-123', status: 'rejected' },
        ],
        count: 2,
      });
    });

    it('should use custom limit from query param', async () => {
      Call.getHistory.mockResolvedValue([]);
      req.query = { limit: '10' };

      await callController.getCallHistory(req, res);

      expect(Call.getHistory).toHaveBeenCalledWith('test-user-123', 10);
    });

    it('should cap limit at 100', async () => {
      Call.getHistory.mockResolvedValue([]);
      req.query = { limit: '999' };

      await callController.getCallHistory(req, res);

      expect(Call.getHistory).toHaveBeenCalledWith('test-user-123', 100);
    });

    it('should return empty list when no history', async () => {
      Call.getHistory.mockResolvedValue([]);

      await callController.getCallHistory(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ calls: [], count: 0 });
    });

    it('should return 500 on database error', async () => {
      Call.getHistory.mockRejectedValue(new Error('DB connection failed'));

      await callController.getCallHistory(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'SERVER_ERROR' })
      );
    });
  });
});
