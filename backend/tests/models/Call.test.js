const { describe, it, expect, beforeEach, jest } = require('@jest/globals');

// Mock the socket authenticate middleware
jest.mock('../../src/middleware/socketAuthenticate', () => {
  return jest.fn((socket, next) => {
    // For testing, assume token is always valid
    if (socket.handshake?.auth?.token) {
      socket.userId = 'test-user-' + Math.random().toString(36).substr(2, 9);
      next();
    } else {
      next(new Error('No token'));
    }
  });
});

// Mock the database before requiring Call model
jest.mock('../../src/db', () => ({
  query: jest.fn(),
  on: jest.fn(),
}));

const pool = require('../../src/db');
const Call = require('../../src/models/Call');

describe('Call Model', () => {
  beforeEach(() => {
    pool.query.mockReset();
  });

  describe('create', () => {
    it('should create a call record with initiated status', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [{
          id: 'call-123',
          caller_id: 'user-1',
          callee_id: 'user-2',
          started_at: new Date(),
          ended_at: null,
          duration_seconds: null,
          status: 'initiated',
        }],
      });

      const call = await Call.create('user-1', 'user-2');

      expect(call).toBeDefined();
      expect(call.id).toBe('call-123');
      expect(call.callerId).toBe('user-1');
      expect(call.calleeId).toBe('user-2');
      expect(call.status).toBe('initiated');
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO calls'),
        ['user-1', 'user-2']
      );
    });
  });

  describe('findById', () => {
    it('should find a call by ID', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [{
          id: 'call-456',
          caller_id: 'user-1',
          callee_id: 'user-2',
          started_at: new Date(),
          ended_at: null,
          duration_seconds: null,
          status: 'connected',
        }],
      });

      const call = await Call.findById('call-456');

      expect(call).toBeDefined();
      expect(call.id).toBe('call-456');
      expect(call.status).toBe('connected');
    });

    it('should return null for non-existent call', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const call = await Call.findById('nonexistent');

      expect(call).toBeNull();
    });
  });

  describe('updateStatus', () => {
    it('should update call status', async () => {
      const existingCall = new Call({
        id: 'call-789',
        caller_id: 'user-1',
        callee_id: 'user-2',
        started_at: new Date(),
        ended_at: null,
        duration_seconds: null,
        status: 'initiated',
      });

      pool.query.mockResolvedValueOnce({
        rows: [{
          id: 'call-789',
          caller_id: 'user-1',
          callee_id: 'user-2',
          started_at: new Date(),
          ended_at: null,
          duration_seconds: null,
          status: 'connected',
        }],
      });

      const updated = await existingCall.updateStatus('connected');

      expect(updated.status).toBe('connected');
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE calls SET status'),
        ['connected', 'call-789']
      );
    });
  });

  describe('end', () => {
    it('should end call and calculate duration', async () => {
      const existingCall = new Call({
        id: 'call-999',
        caller_id: 'user-1',
        callee_id: 'user-2',
        started_at: new Date(Date.now() - 60000), // 1 minute ago
        ended_at: null,
        duration_seconds: null,
        status: 'connected',
      });

      pool.query.mockResolvedValueOnce({
        rows: [{
          id: 'call-999',
          caller_id: 'user-1',
          callee_id: 'user-2',
          started_at: new Date(Date.now() - 60000),
          ended_at: new Date(),
          duration_seconds: 60,
          status: 'ended',
        }],
      });

      const ended = await existingCall.end();

      expect(ended.status).toBe('ended');
      expect(ended.endedAt).toBeDefined();
      expect(pool.query).toHaveBeenCalled();
    });
  });

  describe('toJSON', () => {
    it('should return serializable object', () => {
      const call = new Call({
        id: 'call-001',
        caller_id: 'user-1',
        callee_id: 'user-2',
        started_at: new Date(),
        ended_at: null,
        duration_seconds: null,
        status: 'initiated',
      });

      const json = call.toJSON();

      expect(json).toHaveProperty('id', 'call-001');
      expect(json).toHaveProperty('callerId', 'user-1');
      expect(json).toHaveProperty('calleeId', 'user-2');
      expect(json).toHaveProperty('status', 'initiated');
    });
  });
});
