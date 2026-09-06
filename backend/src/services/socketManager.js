const { Server } = require('socket.io');
const socketAuthenticate = require('../middleware/socketAuthenticate');
const presenceManager = require('./presenceManager');
const signalingManager = require('./signalingManager');
const Call = require('../models/Call');

let io = null;

/**
 * Get the Socket.io instance (for external use)
 */
function getSocketIO() {
  return io;
}

/**
 * Initialize Socket.io server with auth, presence, and signaling
 */
function initialize(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: (process.env.CORS_ORIGIN || 'http://localhost:3000').split(','),
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Apply authentication middleware to all socket connections
  io.use(socketAuthenticate);

  io.on('connection', async (socket) => {
    const userId = socket.userId;
    console.log(`Client authenticated: ${socket.id} (user: ${userId})`);

    // Mark user as online and join their room
    await presenceManager.setUserOnline(userId);
    socket.join(`user:${userId}`);
    console.log(`User ${userId} joined room user:${userId}`);

    // Broadcast user online status to others
    io.emit('user_online', { userId });

    // --- Call Events ---

    socket.on('call_request', async (data) => {
      console.log(`Call request: ${userId} → ${data.toUserId}`);
      try {
        // Persist call to database
        const call = await Call.create(userId, data.toUserId);
        // Forward to signaling manager with io instance
        signalingManager.handleCallRequest(io, socket, {
          ...data,
          callId: call.id,
        });
      } catch (err) {
        console.error('call_request error:', err);
        socket.emit('call_error', { error: 'Failed to create call' });
      }
    });

    socket.on('call_accept', async (data) => {
      console.log(`Call accepted: ${data.callId} by ${userId}`);
      try {
        // Update DB status
        const call = await Call.findById(data.callId);
        if (!call) {
          socket.emit('call_error', { error: 'Call not found' });
          return;
        }
        await call.updateStatus('connected');
        signalingManager.handleCallAccept(io, socket, data);
      } catch (err) {
        console.error('call_accept error:', err);
        socket.emit('call_error', { error: 'Failed to accept call' });
      }
    });

    socket.on('call_reject', async (data) => {
      console.log(`Call rejected: ${data.callId} by ${userId}`);
      try {
        const call = await Call.findById(data.callId);
        if (!call) {
          socket.emit('call_error', { error: 'Call not found' });
          return;
        }
        await call.updateStatus('rejected');
        signalingManager.handleCallReject(io, socket, data);
      } catch (err) {
        console.error('call_reject error:', err);
        socket.emit('call_error', { error: 'Failed to reject call' });
      }
    });

    socket.on('call_end', async (data) => {
      console.log(`Call ended: ${data.callId} by ${userId}`);
      try {
        const call = await Call.findById(data.callId);
        if (!call) {
          socket.emit('call_error', { error: 'Call not found' });
          return;
        }
        await call.end();
        signalingManager.handleCallEnd(io, socket, data);
      } catch (err) {
        console.error('call_end error:', err);
        socket.emit('call_error', { error: 'Failed to end call' });
      }
    });

    // --- WebRTC Signaling Events ---

    socket.on('offer', (data) => {
      signalingManager.handleSignalingData(io, socket, {
        callId: data.callId,
        type: 'offer',
        payload: data.offer,
      });
    });

    socket.on('answer', (data) => {
      signalingManager.handleSignalingData(io, socket, {
        callId: data.callId,
        type: 'answer',
        payload: data.answer,
      });
    });

    socket.on('ice_candidate', (data) => {
      signalingManager.handleSignalingData(io, socket, {
        callId: data.callId,
        type: 'ice_candidate',
        payload: data.candidate,
      });
    });

    // --- Disconnect ---

    socket.on('disconnect', async (reason) => {
      console.log(`Client disconnected: ${socket.id} (user: ${userId}) - ${reason}`);

      // Mark user offline
      await presenceManager.setUserOffline(userId);
      socket.leave(`user:${userId}`);

      // Broadcast user offline status
      io.emit('user_offline', { userId });
    });
  });

  return io;
}

module.exports = { initialize, getSocketIO };
