const { describe, it, expect, beforeEach } = require('@jest/globals');

// Mock the Call model before requiring signalingManager
jest.mock('../../src/models/Call', () => {
  const mockCalls = new Map();
  return {
    create: jest.fn(async (callerId, calleeId) => {
      const id = `call-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const call = {
        id,
        callerId,
        calleeId,
        status: 'initiated',
        startedAt: new Date(),
        endedAt: null,
        durationSeconds: null,
        createdAt: new Date(),
        toJSON: jest.fn().mockReturnValue({
          id, callerId, calleeId, status: 'initiated',
          startedAt: new Date(), endedAt: null, durationSeconds: null,
        }),
        updateStatus: jest.fn(async (status) => {
          call.status = status;
          if (status === 'ended') call.endedAt = new Date();
          return call;
        }),
        end: jest.fn(async () => {
          call.status = 'ended';
          call.endedAt = new Date();
          const started = new Date(call.startedAt);
          const ended = new Date();
          call.durationSeconds = Math.floor((ended - started) / 1000);
          return call;
        }),
      };
      mockCalls.set(id, call);
      return call;
    }),
    findById: jest.fn(async (id) => {
      const call = mockCalls.get(id);
      if (!call) return null;
      // Only return if active
      if (!['initiated', 'connected'].includes(call.status)) return null;
      return { ...call };
    }),
  };
});

const Call = require('../../src/models/Call');
const signalingManager = require('../../src/services/signalingManager');

describe('Signaling Manager', () => {
  let mockIo, mockSocket;

  beforeEach(() => {
    mockIo = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    };
    mockSocket = {
      userId: 'caller-1',
      emit: jest.fn(),
    };
    jest.clearAllMocks();
  });

  describe('createCall', () => {
    it('should create a call record in DB via Call.create', async () => {
      const call = await signalingManager.createCall('user-1', 'user-2');
      expect(call).toBeDefined();
      expect(call.id).toBeDefined();
      expect(call.callerId).toBe('user-1');
      expect(call.calleeId).toBe('user-2');
      expect(call.status).toBe('initiated');
      expect(Call.create).toHaveBeenCalledWith('user-1', 'user-2');
    });

    it('should create unique IDs for different calls', async () => {
      const call1 = await signalingManager.createCall('u1', 'u2');
      const call2 = await signalingManager.createCall('u3', 'u4');
      expect(call1.id).not.toBe(call2.id);
    });
  });

  describe('getCall', () => {
    it('should return a call by ID when active', async () => {
      const created = await signalingManager.createCall('u1', 'u2');
      const found = await signalingManager.getCall(created.id);
      expect(found).toBeDefined();
      expect(found.id).toBe(created.id);
    });

    it('should return null for non-existent call', async () => {
      const found = await signalingManager.getCall('nonexistent');
      expect(found).toBeNull();
    });

    it('should return null for ended call', async () => {
      const created = await signalingManager.createCall('u1', 'u2');
      // Simulate ending via mock
      Call.findById.mockResolvedValueOnce({
        ...created,
        status: 'ended',
        endedAt: new Date(),
      });
      const found = await signalingManager.getCall(created.id);
      expect(found).toBeNull();
    });
  });

  describe('updateCallStatus', () => {
    it('should update call status via DB', async () => {
      const created = await signalingManager.createCall('u1', 'u2');
      const updated = await signalingManager.updateCallStatus(created.id, 'connected');
      expect(updated.status).toBe('connected');
      // Verify findById was called (internal lookup)
      expect(Call.findById).toHaveBeenCalledWith(created.id);
    });

    it('should return null for non-existent call', async () => {
      Call.findById.mockResolvedValueOnce(null);
      const result = await signalingManager.updateCallStatus('nonexistent', 'connected');
      expect(result).toBeNull();
    });
  });

  describe('handleCallRequest', () => {
    it('should emit call_request_sent to caller and incoming_call to callee', async () => {
      mockSocket.userId = 'caller-1';
      await signalingManager.handleCallRequest(mockIo, mockSocket, {
        toUserId: 'callee-1',
        fromUsername: 'Alice',
      });

      expect(mockSocket.emit).toHaveBeenCalledWith('call_request_sent', expect.objectContaining({
        toUserId: 'callee-1',
      }));
      expect(mockIo.to).toHaveBeenCalledWith('user:callee-1');
      expect(mockIo.to().emit).toHaveBeenCalledWith('incoming_call', expect.objectContaining({
        fromUserId: 'caller-1',
        fromUsername: 'Alice',
      }));
    });

    it('should emit call_error when toUserId is missing', async () => {
      mockSocket.userId = 'caller-1';
      await signalingManager.handleCallRequest(mockIo, mockSocket, {
        fromUsername: 'Alice',
      });

      expect(mockSocket.emit).toHaveBeenCalledWith('call_error', {
        error: 'Missing recipient user ID',
      });
      expect(mockIo.to).not.toHaveBeenCalled();
    });
  });

  describe('handleCallAccept', () => {
    it('should emit call_accepted to caller and call_connected to callee', async () => {
      const call = await signalingManager.createCall('caller-1', 'callee-1');
      mockSocket.userId = 'callee-1';

      await signalingManager.handleCallAccept(mockIo, mockSocket, { callId: call.id });

      expect(mockIo.to).toHaveBeenCalledWith('user:caller-1');
      expect(mockIo.to().emit).toHaveBeenCalledWith('call_accepted', expect.objectContaining({
        callId: call.id,
        calleeId: 'callee-1',
      }));
      expect(mockIo.to).toHaveBeenCalledWith('user:callee-1');
      expect(mockIo.to().emit).toHaveBeenCalledWith('call_connected', expect.objectContaining({
        callerId: 'caller-1',
      }));
    });

    it('should emit call_error for non-existent call', async () => {
      mockSocket.userId = 'callee-1';
      await signalingManager.handleCallAccept(mockIo, mockSocket, { callId: 'nonexistent' });

      expect(mockSocket.emit).toHaveBeenCalledWith('call_error', { error: 'Call not found' });
    });

    it('should emit call_error when user is not the callee', async () => {
      const call = await signalingManager.createCall('caller-1', 'callee-1');
      mockSocket.userId = 'random-user';

      await signalingManager.handleCallAccept(mockIo, mockSocket, { callId: call.id });

      expect(mockSocket.emit).toHaveBeenCalledWith('call_error', {
        error: 'Not authorized for this call',
      });
    });
  });

  describe('handleCallReject', () => {
    it('should emit call_rejected to caller and clean up', async () => {
      const call = await signalingManager.createCall('caller-1', 'callee-1');
      mockSocket.userId = 'callee-1';

      await signalingManager.handleCallReject(mockIo, mockSocket, { callId: call.id, reason: 'Busy' });

      expect(mockIo.to).toHaveBeenCalledWith('user:caller-1');
      expect(mockIo.to().emit).toHaveBeenCalledWith('call_rejected', expect.objectContaining({
        callId: call.id,
        reason: 'Busy',
      }));
      // After rejection, getCall should return null (status is 'rejected')
      const after = await signalingManager.getCall(call.id);
      expect(after).toBeNull();
    });

    it('should emit call_error for non-existent call', async () => {
      mockSocket.userId = 'callee-1';
      await signalingManager.handleCallReject(mockIo, mockSocket, { callId: 'nonexistent' });

      expect(mockSocket.emit).toHaveBeenCalledWith('call_error', { error: 'Call not found' });
    });
  });

  describe('handleCallEnd', () => {
    it('should emit call_ended to the other party and clean up', async () => {
      const call = await signalingManager.createCall('caller-1', 'callee-1');
      mockSocket.userId = 'caller-1';

      await signalingManager.handleCallEnd(mockIo, mockSocket, { callId: call.id });

      expect(mockIo.to).toHaveBeenCalledWith('user:callee-1');
      expect(mockIo.to().emit).toHaveBeenCalledWith('call_ended', expect.objectContaining({
        callId: call.id,
        endedBy: 'caller-1',
      }));
      const after = await signalingManager.getCall(call.id);
      expect(after).toBeNull();
    });

    it('should emit call_error for non-existent call', async () => {
      mockSocket.userId = 'caller-1';
      await signalingManager.handleCallEnd(mockIo, mockSocket, { callId: 'nonexistent' });

      expect(mockSocket.emit).toHaveBeenCalledWith('call_error', { error: 'Call not found' });
    });

    it('should emit call_error when user is not part of the call', async () => {
      const call = await signalingManager.createCall('caller-1', 'callee-1');
      mockSocket.userId = 'random-user';

      await signalingManager.handleCallEnd(mockIo, mockSocket, { callId: call.id });

      expect(mockSocket.emit).toHaveBeenCalledWith('call_error', {
        error: 'Not authorized for this call',
      });
    });
  });

  describe('handleSignalingData', () => {
    it('should forward signaling data to the other party', async () => {
      const call = await signalingManager.createCall('caller-1', 'callee-1');
      mockSocket.userId = 'caller-1';

      await signalingManager.handleSignalingData(mockIo, mockSocket, {
        callId: call.id,
        type: 'offer',
        payload: { sdp: 'test-sdp' },
      });

      expect(mockIo.to).toHaveBeenCalledWith('user:callee-1');
      expect(mockIo.to().emit).toHaveBeenCalledWith('signaling_data', expect.objectContaining({
        callId: call.id,
        type: 'offer',
        payload: { sdp: 'test-sdp' },
        fromUserId: 'caller-1',
      }));
    });

    it('should emit signaling_error for non-existent call', async () => {
      mockSocket.userId = 'caller-1';
      await signalingManager.handleSignalingData(mockIo, mockSocket, {
        callId: 'nonexistent',
        type: 'offer',
        payload: {},
      });

      expect(mockSocket.emit).toHaveBeenCalledWith('signaling_error', { error: 'Call not found or not active' });
    });

    it('should emit signaling_error when user is not part of the call', async () => {
      const call = await signalingManager.createCall('caller-1', 'callee-1');
      mockSocket.userId = 'random-user';

      await signalingManager.handleSignalingData(mockIo, mockSocket, {
        callId: call.id,
        type: 'answer',
        payload: {},
      });

      expect(mockSocket.emit).toHaveBeenCalledWith('signaling_error', {
        error: 'Not authorized for this call',
      });
    });
  });

  describe('handleJoinUserRoom', () => {
    it('should join the user room', () => {
      const socket = { userId: 'user-1', join: jest.fn() };
      signalingManager.handleJoinUserRoom(socket);
      expect(socket.join).toHaveBeenCalledWith('user:user-1');
    });
  });

  describe('handleLeaveUserRoom', () => {
    it('should leave the user room', () => {
      const socket = { userId: 'user-1', leave: jest.fn() };
      signalingManager.handleLeaveUserRoom(socket);
      expect(socket.leave).toHaveBeenCalledWith('user:user-1');
    });
  });
});
