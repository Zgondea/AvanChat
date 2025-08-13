import axios from 'axios';

// Create axios instance
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost/api/v1',
  timeout: 30000,
});

// Auth token management
const getAuthToken = () => localStorage.getItem('token');
const setAuthToken = (token) => localStorage.setItem('token', token);
const removeAuthToken = () => localStorage.removeItem('token');

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      removeAuthToken();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (credentials) => api.post('/admin/login', credentials),
  getCurrentUser: () => api.get('/admin/me'),
};

// Municipalities API
export const municipalitiesAPI = {
  list: (params) => api.get('/municipalities', { params }),
  get: (id) => api.get(`/municipalities/${id}`),
  create: (data) => api.post('/municipalities', data),
  update: (id, data) => api.put(`/municipalities/${id}`, data),
  delete: (id) => api.delete(`/municipalities/${id}`),
  getStats: (id) => api.get(`/municipalities/${id}/stats`),
};

// Documents API
export const documentsAPI = {
  list: (params) => api.get('/documents', { params }),
  get: (id) => api.get(`/documents/${id}`),
  upload: (formData) => api.post('/documents/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  delete: (id) => api.delete(`/documents/${id}`),
  bulkAssign: (data) => api.post('/documents/bulk-assign', data),
};

// Conversations API
export const conversationsAPI = {
  list: (params) => api.get('/conversations', { params }),
  get: (id) => api.get(`/conversations/${id}`),
  deactivate: (id) => api.put(`/conversations/${id}/deactivate`),
  delete: (id) => api.delete(`/conversations/${id}`),
  getAnalytics: (params) => api.get('/conversations/analytics/summary', { params }),
};

// Admin API
export const adminAPI = {
  getDashboardStats: () => api.get('/admin/dashboard'),
  listUsers: () => api.get('/admin/users'),
};

// Chat API
export const chatAPI = {
  health: () => api.get('/chat/health'),
  listMunicipalities: () => api.get('/chat/municipalities'),
};

// Export auth token utilities
export { getAuthToken, setAuthToken, removeAuthToken };

export default api;