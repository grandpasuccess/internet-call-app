import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

let socket = null;

export function initSocket(token) {
  socket = io(SOCKET_URL, {
    auth: { token },
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 10,
    transports: ['websocket', 'polling'],
  });

  socket.on('connect', () => {
    console.log('[Socket] Connected:', socket.id);
  });

  socket.on('connect_error', (error) => {
    console.error('[Socket] Connection error:', error.message);
  });

  socket.on('disconnect', (reason) => {
    console.log('[Socket] Disconnected:', reason);
  });

  socket.on('user_online', (data) => {
    console.log('[Socket] User online:', data.userId);
  });

  socket.on('user_offline', (data) => {
    console.log('[Socket] User offline:', data.userId);
  });

  return socket;
}

export function getSocket() {
  return socket;
}

export function closeSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function emitSocketEvent(event, data) {
  if (socket && socket.connected) {
    socket.emit(event, data);
  }
}

export function onSocketEvent(event, callback) {
  if (socket) {
    socket.on(event, callback);
    return () => socket.off(event, callback);
  }
  return () => {};
}
