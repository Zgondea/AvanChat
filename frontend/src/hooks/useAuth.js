import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

// Create dedicated axios instance for auth
const authApi = axios.create({
  baseURL: 'http://localhost:8000/api/v1',
  timeout: 10000,
});

// Token management - SUPER SIMPLE
const getToken = () => localStorage.getItem('AUTH_TOKEN');
const setToken = (token) => {
  localStorage.setItem('AUTH_TOKEN', token);
  authApi.defaults.headers.common['Authorization'] = `Bearer ${token}`;
};
const clearToken = () => {
  localStorage.removeItem('AUTH_TOKEN');
  delete authApi.defaults.headers.common['Authorization'];
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check if user is authenticated
  const isAuthenticated = Boolean(user && getToken());

  // Initialize auth on mount
  useEffect(() => {
    const token = getToken();
    if (token) {
      authApi.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      // Verify token with backend
      authApi.get('/dashboard/me')
        .then(response => {
          setUser(response.data);
          setLoading(false);
        })
        .catch(() => {
          clearToken();
          setUser(null);
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (credentials) => {
    setLoading(true);
    setError(null);

    try {
      const response = await authApi.post('/dashboard/login', credentials);
      const { access_token, user: userData } = response.data;
      
      // Save token and set user
      setToken(access_token);
      setUser(userData);
      
      setLoading(false);
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.detail || 'Login failed';
      setError(message);
      setLoading(false);
      return { success: false, error: message };
    }
  };

  const logout = () => {
    clearToken();
    setUser(null);
    setError(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      loading,
      error,
      login,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
}