const { getSocketIO } = require('./socketManager');
const { v4: uuidv4 } = require('uuid');

// Active calls storage (in production, use Redis/DB)
const activeCalls = new Map();

/**
 * Create a new call between two users
 */
function createCall(callerId, calleeId) {
  const callId = uuidv4();
  const call = {
    id: callId,
    callerId,
    calleeId,
    status: 'initiated', // initiated, connected, ended, rejected
    createdAt: new Date(),
  };
  activeCalls.set(callId, call);
  return call;
}

/**
 * Get an active call by ID
 */
function getCall(callId) {
  return activeCalls.get(callId);
}

/**
 * Update call status
 */
function updateCallStatus(callId, status) {
  const call = activeCalls.get(callId);
  if (call) {
    call.status = status;
    if (status === 'ended') {
      call.endedAt = new Date();
    }
    activeCalls.set(callId, call);
  }
  return call;
}

/**
 * End a call
 */
function endCall(callId) {
  const call = activeCalls.get(callId);
  if (call) {
    call.status = 'ended';
    call.endedAt = new Date();
    activeCalls.delete(callId);
  }
  return call;
}

/**
 * Handle incoming call request
 */
function handleCallRequest(socket, data) {
  const { toUserId, fromUsername } = data;
  const callerId = socket.userId;

  if (!toUserId) {
    socket.emit('call_error', { error: 'Missing recipient user ID' });
    return;
  }

  // Create the call
  const call = createCall(callerId, toUserId);

  // Inform caller
  socket.emit('call_request_sent', {
    callId: call.id,
    toUserId,
  });

  // Notify callee
  const io = getSocketIO();
  io.to(`user:${toUserId}`).emit('incoming_call', {
    callId: call.id,
    fromUserId: callerId,
    fromUsername: fromUsername || 'Unknown',
    timestamp: call.createdAt,
  });
}

/**
 * Handle call acceptance
 */
function handleCallAccept(socket, data) {
  const { callId } = data;
  const calleeId = socket.userId;

  const call = getCall(callId);
  if (!call) {
    socket.emit('call_error', { error: 'Call not found' });
    return;
  }

  if (call.calleeId !== calleeId) {
    socket.emit('call_error', { error: 'Not authorized for this call' });
    return;
  }

  // Update status
  updateCallStatus(callId, 'connected');

  // Notify both parties
  const io = getSocketIO();
  io.to(`user:${call.callerId}`).emit('call_accepted', {
    callId,
    calleeId,
    timestamp: new Date(),
  });

  io.to(`user:${calleeId}`).emit('call_connected', {
    callId,
    callerId: call.callerId,
    timestamp: new Date(),
  });
}

/**
 * Handle call rejection
 */
function handleCallReject(socket, data) {
  const { callId, reason } = data;
  const calleeId = socket.userId;

  const call = getCall(callId);
  if (!call) {
    socket.emit('call_error', { error: 'Call not found' });
    return;
  }

  if (call.calleeId !== calleeId) {
    socket.emit('call_error', { error: 'Not authorized for this call' });
    return;
  }

  // Update status
  updateCallStatus(callId, 'rejected');

  // Notify caller
  const io = getSocketIO();
  io.to(`user:${call.callerId}`).emit('call_rejected', {
    callId,
    reason: reason || 'User declined the call',
    timestamp: new Date(),
  });

  // Clean up
  activeCalls.delete(callId);
}

/**
 * Handle call end
 */
function handleCallEnd(socket, data) {
  const { callId } = data;
  const userId = socket.userId;

  const call = getCall(callId);
  if (!call) {
    socket.emit('call_error', { error: 'Call not found' });
    return;
  }

  // Verify user is part of the call
  if (call.callerId !== userId && call.calleeId !== userId) {
    socket.emit('call_error', { error: 'Not authorized for this call' });
    return;
  }

  // Update status
  updateCallStatus(callId, 'ended');

  // Notify the other party
  const io = getSocketIO();
  const otherUserId = call.callerId === userId ? call.calleeId : call.callerId;

  io.to(`user:${otherUserId}`).emit('call_ended', {
    callId,
    endedBy: userId,
    timestamp: new Date(),
  });

  // Clean up
  activeCalls.delete(callId);
}

/**
 * Handle WebRTC signaling data (offer, answer, ICE candidates)
 */
function handleSignalingData(socket, data) {
  const { callId, type, payload } = data;
  const userId = socket.userId;

  const call = getCall(callId);
  if (!call) {
    socket.emit('signaling_error', { error: 'Call not found' });
    return;
  }

  // Verify user is part of the call
  if (call.callerId !== userId && call.calleeId !== userId) {
    socket.emit('signaling_error', { error: 'Not authorized for this call' });
    return;
  }

  // Determine the other user
  const otherUserId = call.callerId === userId ? call.calleeId : call.callerId;

  // Forward the signaling data
  const io = getSocketIO();
  io.to(`user:${otherUserId}`).emit('signaling_data', {
    callId,
    type, // 'offer', 'answer', 'ice_candidate'
    payload,
    fromUserId: userId,
    timestamp: new Date(),
  });
}

/**
 * Join user's personal room for targeted messaging
 */
function handleJoinUserRoom(socket) {
  const userId = socket.userId;
  socket.join(`user:${userId}`);
  console.log(`User ${userId} joined room user:${userId}`);
}

/**
 * Remove user from their personal room
 */
function handleLeaveUserRoom(socket) {
  const userId = socket.userId;
  socket.leave(`user:${userId}`);
  console.log(`User ${userId} left room user:${userId}`);
}

// Export handlers
module.exports = {
  createCall,
  getCall,
  updateCallStatus,
  endCall,
  handleCallRequest,
  handleCallAccept,
  handleCallReject,
  handleCallEnd,
  handleSignalingData,
  handleJoinUserRoom,
  handleLeaveUserRoom,
};
