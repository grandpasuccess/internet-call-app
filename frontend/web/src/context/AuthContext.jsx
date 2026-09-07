import { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const init = async () => {
      try {
        const token = authService.getToken();
        if (token) {
          const profile = await authService.getProfile();
          setUser(profile);
        }
      } catch (err) {
        authService.clearToken();
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const login = async (email, password) => {
    setError(null);
    const data = await authService.login(email, password);
    authService.setToken(data.token);
    authService.setUser(data.userId, data.username, data.email);
    setUser({ id: data.userId, username: data.username, email: data.email });
    return data;
  };

  const register = async (username, email, password) => {
    setError(null);
    const data = await authService.register(username, email, password);
    authService.setToken(data.token);
    authService.setUser(data.userId, data.username, data.email);
    setUser({ id: data.userId, username: data.username, email: data.email });
    return data;
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (err) {
      // Continue with logout even if API fails
    }
    authService.clearToken();
    authService.clearUser();
    setUser(null);
  };

  const value = { user, loading, error, login, register, logout };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
