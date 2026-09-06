import api from './api';

export const callService = {
  async initiateCall(toUserId, fromUsername) {
    const res = await api.post('/api/calls/initiate', {
      toUserId,
      fromUsername,
    });
    return res.data;
  },

  async acceptCall(callId) {
    const res = await api.post('/api/calls/accept', { callId });
    return res.data;
  },

  async rejectCall(callId, reason) {
    const res = await api.post('/api/calls/reject', { callId, reason });
    return res.data;
  },

  async endCall(callId) {
    const res = await api.post('/api/calls/end', { callId });
    return res.data;
  },

  async getCallHistory(userId, limit = 20) {
    const res = await api.get(`/api/calls/history/${userId}?limit=${limit}`);
    return res.data;
  },

  async getActiveCalls(userId) {
    const res = await api.get(`/api/calls/active/${userId}`);
    return res.data;
  },
};
