import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI, setAuthToken, removeAuthToken, getAuthToken } from '../services/api';

const AuthContext = createContext();

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const isAuthenticated = !!user;

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = getAuthToken();
      if (!token) {
        setLoading(false);
        return;
      }

      const response = await authAPI.getCurrentUser();
      setUser(response.data);
    } catch (error) {
      console.error('Auth check failed:', error);
      removeAuthToken();
    } finally {
      setLoading(false);
    }
  };

  const login = async (credentials) => {
    try {
      setError(null);
      console.log('🔐 Attempting login with:', { email: credentials.email });
      console.log('🌐 API Base URL:', process.env.REACT_APP_API_URL);
      
      const response = await authAPI.login(credentials);
      console.log('✅ Login successful:', response.data);
      
      const { access_token, user: userData } = response.data;
      
      setAuthToken(access_token);
      setUser(userData);
      
      return { success: true };
    } catch (error) {
      console.error('❌ Login failed:', error);
      console.error('Response data:', error.response?.data);
      console.error('Status:', error.response?.status);
      
      const message = error.response?.data?.detail || 'Eroare la autentificare';
      setError(message);
      return { success: false, error: message };
    }
  };

  const logout = () => {
    removeAuthToken();
    setUser(null);
    setError(null);
  };

  const value = {
    user,
    isAuthenticated,
    loading,
    error,
    login,
    logout,
    checkAuthStatus
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}