import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

let socket = null;

/**
 * Initialize socket connection with auth token
 */
export const connectSocket = (token) => {
  if (socket) {
    socket.disconnect();
  }

  socket = io(SOCKET_URL, {
    auth: { token },
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 10,
    transports: ['websocket', 'polling'],
  });

  return new Promise((resolve, reject) => {
    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
      resolve(socket);
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message);
      reject(error);
    });

    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });
  });
};

/**
 * Get current socket instance
 */
export const getSocket = () => socket;

/**
 * Disconnect socket
 */
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

/**
 * Add event listener, returns unsubscribe function
 */
export const onSocketEvent = (event, callback) => {
  on(event, callback);
  return () => off(event, callback);
};

/**
 * Emit event with data
 */
export const emitSocketEvent = (event, data) => {
  if (socket && socket.connected) {
    socket.emit(event, data);
  }
};

/**
 * Listen for event
 */
export const onSocket = (event, callback) => {
  if (socket) {
    socket.on(event, callback);
  }
};

/**
 * Remove event listener
 */
export const offSocket = (event, callback) => {
  if (socket) {
    socket.off(event, callback);
  }
};

// Alias for backward compatibility
export const connect = connectSocket;
export const disconnect = disconnectSocket;

// Service object for useCallSocket.js
export const socketService = {
  on: onSocket,
  off: offSocket,
  emit: emitSocketEvent,
};
