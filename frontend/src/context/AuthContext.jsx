import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    try {
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);
  const [googleClientId, setGoogleClientId] = useState(import.meta.env.VITE_GOOGLE_CLIENT_ID || '');

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await api.get('/auth/config');
        if (res.data?.google_client_id) {
          setGoogleClientId(res.data.google_client_id);
        }
      } catch (err) {
        // Backend config is optional
      }
    };
    fetchConfig();
  }, []);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      if (token) {
        try {
          const res = await api.get('/auth/me');
          setUser(res.data);
          localStorage.setItem('user', JSON.stringify(res.data));
        } catch (err) {
          console.error("Session expired or invalid:", err);
          logout();
        }
      }
      setLoading(false);
    };

    fetchCurrentUser();
  }, [token]);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const { access_token, user_id, full_name, role, picture } = res.data;
    localStorage.setItem('token', access_token);
    const userData = { id: user_id, email, full_name, role, picture };
    localStorage.setItem('user', JSON.stringify(userData));
    setToken(access_token);
    setUser(userData);
    return res.data;
  };

  const loginWithGoogle = async ({ credential, email, full_name, picture } = {}) => {
    const res = await api.post('/auth/google', { credential, email, full_name, picture });
    const { access_token, user_id, email: userEmail, full_name: name, role, picture: userPic } = res.data;
    localStorage.setItem('token', access_token);
    const userData = { id: user_id, email: userEmail, full_name: name, role, picture: userPic };
    localStorage.setItem('user', JSON.stringify(userData));
    setToken(access_token);
    setUser(userData);
    return res.data;
  };

  const register = async (email, password, fullName) => {
    // 1. Create account on backend
    await api.post('/auth/register', {
      email,
      password,
      full_name: fullName,
    });
    // 2. Automatically log in to establish session & JWT token
    return await login(email, password);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, googleClientId, login, register, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
