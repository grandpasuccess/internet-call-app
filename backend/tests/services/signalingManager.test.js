const { describe, it, expect, beforeEach } = require('@jest/globals');

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
    it('should create a call with unique ID and initiated status', () => {
      const call = signalingManager.createCall('user-1', 'user-2');
      expect(call).toHaveProperty('id');
      expect(call.callerId).toBe('user-1');
      expect(call.calleeId).toBe('user-2');
      expect(call.status).toBe('initiated');
      expect(call.createdAt).toBeInstanceOf(Date);
    });

    it('should generate unique IDs for different calls', () => {
      const call1 = signalingManager.createCall('u1', 'u2');
      const call2 = signalingManager.createCall('u3', 'u4');
      expect(call1.id).not.toBe(call2.id);
    });
  });

  describe('getCall', () => {
    it('should return a call by ID', () => {
      const call = signalingManager.createCall('u1', 'u2');
      const found = signalingManager.getCall(call.id);
      expect(found).toBe(call);
    });

    it('should return undefined for non-existent call', () => {
      expect(signalingManager.getCall('nonexistent')).toBeUndefined();
    });
  });

  describe('updateCallStatus', () => {
    it('should update call status', () => {
      const call = signalingManager.createCall('u1', 'u2');
      const updated = signalingManager.updateCallStatus(call.id, 'connected');
      expect(updated.status).toBe('connected');
    });

    it('should set endedAt when status is ended', () => {
      const call = signalingManager.createCall('u1', 'u2');
      const updated = signalingManager.updateCallStatus(call.id, 'ended');
      expect(updated.endedAt).toBeInstanceOf(Date);
    });

    it('should return undefined for non-existent call', () => {
      expect(signalingManager.updateCallStatus('nonexistent', 'connected')).toBeUndefined();
    });
  });

  describe('handleCallRequest', () => {
    it('should emit call_request_sent to caller and incoming_call to callee', () => {
      mockSocket.userId = 'caller-1';
      signalingManager.handleCallRequest(mockIo, mockSocket, {
        toUserId: 'callee-1',
        fromUsername: 'Alice',
      });

      expect(mockSocket.emit).toHaveBeenCalledWith('call_request_sent', {
        callId: expect.any(String),
        toUserId: 'callee-1',
      });
      expect(mockIo.to).toHaveBeenCalledWith('user:callee-1');
      expect(mockIo.to().emit).toHaveBeenCalledWith('incoming_call', expect.objectContaining({
        fromUserId: 'caller-1',
        fromUsername: 'Alice',
      }));
    });

    it('should emit call_error when toUserId is missing', () => {
      mockSocket.userId = 'caller-1';
      signalingManager.handleCallRequest(mockIo, mockSocket, {
        fromUsername: 'Alice',
      });

      expect(mockSocket.emit).toHaveBeenCalledWith('call_error', {
        error: 'Missing recipient user ID',
      });
      expect(mockIo.to).not.toHaveBeenCalled();
    });
  });

  describe('handleCallAccept', () => {
    it('should emit call_accepted to caller and call_connected to callee', () => {
      const call = signalingManager.createCall('caller-1', 'callee-1');
      mockSocket.userId = 'callee-1';

      signalingManager.handleCallAccept(mockIo, mockSocket, { callId: call.id });

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

    it('should emit call_error for non-existent call', () => {
      mockSocket.userId = 'callee-1';
      signalingManager.handleCallAccept(mockIo, mockSocket, { callId: 'nonexistent' });

      expect(mockSocket.emit).toHaveBeenCalledWith('call_error', { error: 'Call not found' });
    });

    it('should emit call_error when user is not the callee', () => {
      const call = signalingManager.createCall('caller-1', 'callee-1');
      mockSocket.userId = 'random-user';

      signalingManager.handleCallAccept(mockIo, mockSocket, { callId: call.id });

      expect(mockSocket.emit).toHaveBeenCalledWith('call_error', {
        error: 'Not authorized for this call',
      });
    });
  });

  describe('handleCallReject', () => {
    it('should emit call_rejected to caller and clean up', () => {
      const call = signalingManager.createCall('caller-1', 'callee-1');
      mockSocket.userId = 'callee-1';

      signalingManager.handleCallReject(mockIo, mockSocket, { callId: call.id, reason: 'Busy' });

      expect(mockIo.to).toHaveBeenCalledWith('user:caller-1');
      expect(mockIo.to().emit).toHaveBeenCalledWith('call_rejected', expect.objectContaining({
        callId: call.id,
        reason: 'Busy',
      }));
      expect(signalingManager.getCall(call.id)).toBeUndefined();
    });

    it('should emit call_error for non-existent call', () => {
      mockSocket.userId = 'callee-1';
      signalingManager.handleCallReject(mockIo, mockSocket, { callId: 'nonexistent' });

      expect(mockSocket.emit).toHaveBeenCalledWith('call_error', { error: 'Call not found' });
    });
  });

  describe('handleCallEnd', () => {
    it('should emit call_ended to the other party and clean up', () => {
      const call = signalingManager.createCall('caller-1', 'callee-1');
      mockSocket.userId = 'caller-1';

      signalingManager.handleCallEnd(mockIo, mockSocket, { callId: call.id });

      expect(mockIo.to).toHaveBeenCalledWith('user:callee-1');
      expect(mockIo.to().emit).toHaveBeenCalledWith('call_ended', expect.objectContaining({
        callId: call.id,
        endedBy: 'caller-1',
      }));
      expect(signalingManager.getCall(call.id)).toBeUndefined();
    });

    it('should emit call_error for non-existent call', () => {
      mockSocket.userId = 'caller-1';
      signalingManager.handleCallEnd(mockIo, mockSocket, { callId: 'nonexistent' });

      expect(mockSocket.emit).toHaveBeenCalledWith('call_error', { error: 'Call not found' });
    });

    it('should emit call_error when user is not part of the call', () => {
      const call = signalingManager.createCall('caller-1', 'callee-1');
      mockSocket.userId = 'random-user';

      signalingManager.handleCallEnd(mockIo, mockSocket, { callId: call.id });

      expect(mockSocket.emit).toHaveBeenCalledWith('call_error', {
        error: 'Not authorized for this call',
      });
    });
  });

  describe('handleSignalingData', () => {
    it('should forward signaling data to the other party', () => {
      const call = signalingManager.createCall('caller-1', 'callee-1');
      mockSocket.userId = 'caller-1';

      signalingManager.handleSignalingData(mockIo, mockSocket, {
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

    it('should emit signaling_error for non-existent call', () => {
      mockSocket.userId = 'caller-1';
      signalingManager.handleSignalingData(mockIo, mockSocket, {
        callId: 'nonexistent',
        type: 'offer',
        payload: {},
      });

      expect(mockSocket.emit).toHaveBeenCalledWith('signaling_error', { error: 'Call not found' });
    });

    it('should emit signaling_error when user is not part of the call', () => {
      const call = signalingManager.createCall('caller-1', 'callee-1');
      mockSocket.userId = 'random-user';

      signalingManager.handleSignalingData(mockIo, mockSocket, {
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
