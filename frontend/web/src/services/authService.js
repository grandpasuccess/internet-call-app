import api from './api';

export const authService = {
  async register(username, email, password) {
    const res = await api.post('/auth/register', { username, email, password });
    const { token, userId, username: uname, email: mail } = res.data;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify({ userId, username: uname, email: mail }));
    return res.data;
  },

  async login(email, password) {
    const res = await api.post('/auth/login', { email, password });
    const { token, userId, username, email: mail } = res.data;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify({ userId, username, email: mail }));
    return res.data;
  },

  async getProfile() {
    const res = await api.get('/auth/me');
    return res.data;
  },

  async logout() {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        await api.post('/auth/logout', { token });
      } catch {
        // Ignore logout errors
      }
    }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  getToken() {
    return localStorage.getItem('token');
  },

  getUser() {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  },

  clearToken() {
    localStorage.removeItem('token');
  },
};
