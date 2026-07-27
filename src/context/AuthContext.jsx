import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as api from '../services/apiClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api.setUnauthorizedHandler(() => setUser(null));
  }, []);

  useEffect(() => {
    const token = api.getAuthToken();
    if (!token) {
      setIsLoading(false);
      return;
    }
    api.fetchMe()
      .then(setUser)
      .catch(() => api.setAuthToken(null))
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (email, password) => {
    const { token, user: loggedInUser } = await api.login({ email, password });
    api.setAuthToken(token);
    setUser(loggedInUser);
  }, []);

  const register = useCallback(async (payload) => {
    const { token, user: newUser } = await api.register(payload);
    api.setAuthToken(token);
    setUser(newUser);
  }, []);

  const logout = useCallback(() => {
    api.setAuthToken(null);
    setUser(null);
  }, []);

  return <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
