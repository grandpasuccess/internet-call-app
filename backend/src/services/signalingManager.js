const Call = require('../models/Call');

/**
 * Create a new call record in the database
 * Returns the created Call instance
 */
async function createCall(callerId, calleeId) {
  return await Call.create(callerId, calleeId);
}

/**
 * Get an active call by ID from the database
 */
async function getCall(callId) {
  const call = await Call.findById(callId);
  // Only return if it's still active (not ended/rejected)
  if (call && ['initiated', 'connected'].includes(call.status)) {
    return call;
  }
  return null;
}

/**
 * Update call status in the database
 */
async function updateCallStatus(callId, status) {
  const call = await Call.findById(callId);
  if (!call) return null;
  return call.updateStatus(status);
}

/**
 * End a call in the database
 */
async function endCall(callId) {
  const call = await Call.findById(callId);
  if (!call) return null;
  return call.end();
}

/**
 * Handle incoming call request
 * socketManager creates the DB record first, then delegates here
 */
function handleCallRequest(io, socket, data) {
  const { toUserId, fromUsername, callId } = data;
  const callerId = socket.userId;

  if (!toUserId) {
    socket.emit('call_error', { error: 'Missing recipient user ID' });
    return;
  }

  socket.emit('call_request_sent', {
    callId,
    toUserId,
  });

  io.to(`user:${toUserId}`).emit('incoming_call', {
    callId,
    fromUserId: callerId,
    fromUsername: fromUsername || 'Unknown',
    timestamp: new Date(),
  });
}

/**
 * Handle call acceptance
 */
async function handleCallAccept(io, socket, data) {
  const { callId } = data;
  const calleeId = socket.userId;

  const call = await getCall(callId);
  if (!call) {
    socket.emit('call_error', { error: 'Call not found' });
    return;
  }

  if (call.calleeId !== calleeId) {
    socket.emit('call_error', { error: 'Not authorized for this call' });
    return;
  }

  await updateCallStatus(callId, 'connected');

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
async function handleCallReject(io, socket, data) {
  const { callId, reason } = data;
  const calleeId = socket.userId;

  const call = await getCall(callId);
  if (!call) {
    socket.emit('call_error', { error: 'Call not found' });
    return;
  }

  if (call.calleeId !== calleeId) {
    socket.emit('call_error', { error: 'Not authorized for this call' });
    return;
  }

  await updateCallStatus(callId, 'rejected');

  io.to(`user:${call.callerId}`).emit('call_rejected', {
    callId,
    reason: reason || 'User declined the call',
    timestamp: new Date(),
  });
}

/**
 * Handle call end
 */
async function handleCallEnd(io, socket, data) {
  const { callId } = data;
  const userId = socket.userId;

  const call = await getCall(callId);
  if (!call) {
    socket.emit('call_error', { error: 'Call not found' });
    return;
  }

  if (call.callerId !== userId && call.calleeId !== userId) {
    socket.emit('call_error', { error: 'Not authorized for this call' });
    return;
  }

  await endCall(callId);

  const otherUserId = call.callerId === userId ? call.calleeId : call.callerId;
  io.to(`user:${otherUserId}`).emit('call_ended', {
    callId,
    endedBy: userId,
    timestamp: new Date(),
  });
}

/**
 * Handle WebRTC signaling data (offer, answer, ICE candidates)
 */
function handleSignalingData(io, socket, data) {
  const { callId, type, payload } = data;
  const userId = socket.userId;

  // For signaling we need the call to exist; use DB lookup
  Call.findById(callId).then((call) => {
    if (!call || !['initiated', 'connected'].includes(call.status)) {
      socket.emit('signaling_error', { error: 'Call not found or not active' });
      return;
    }

    if (call.callerId !== userId && call.calleeId !== userId) {
      socket.emit('signaling_error', { error: 'Not authorized for this call' });
      return;
    }

    const otherUserId = call.callerId === userId ? call.calleeId : call.callerId;

    io.to(`user:${otherUserId}`).emit('signaling_data', {
      callId,
      type,
      payload,
      fromUserId: userId,
      timestamp: new Date(),
    });
  }).catch(() => {
    socket.emit('signaling_error', { error: 'Failed to lookup call' });
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
