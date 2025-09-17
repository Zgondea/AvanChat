import axios from 'axios';

// Create axios instance
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost/api/v1',
  timeout: 30000,
});

// Auth token management
const getAuthToken = () => localStorage.getItem('auth_token');
const setAuthToken = (token) => localStorage.setItem('auth_token', token);
const removeAuthToken = () => localStorage.removeItem('auth_token');

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
    console.error('API Error:', {
      status: error.response?.status,
      data: error.response?.data,
      url: error.config?.url,
      method: error.config?.method,
    });
    
    if (error.response?.status === 401) {
      removeAuthToken();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (credentials) => api.post('/dashboard/login', credentials),
  getCurrentUser: () => api.get('/dashboard/me'),
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
  addUrl: (data) => api.post('/documents/add-url', data),
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
  getDashboardStats: () => api.get('/dashboard/dashboard'),
  listUsers: () => api.get('/dashboard/users'),
};

// Chat API
export const chatAPI = {
  health: () => api.get('/chat/health'),
  listMunicipalities: () => api.get('/chat/municipalities'),
};

// Laws API
export const lawsAPI = {
  list: () => api.get('/laws'),
  get: (id) => api.get(`/laws/${id}`),
  create: (data) => api.post('/laws', data),
  listVersions: (lawId) => api.get(`/laws/${lawId}/versions`),
  createVersion: (lawId, data) => api.post(`/laws/${lawId}/versions`, data),
  listSections: (lawId, versionId) => api.get(`/laws/${lawId}/versions/${versionId}/sections`),
  compareVersions: (lawId, from, to) => api.get(`/laws/${lawId}/compare`, { 
    params: { from, to } 
  }),
  getSectionDiff: (lawId, sectionKey, from, to, mode = 'inline') => api.get(
    `/laws/${lawId}/sections/${sectionKey}/diff`, 
    { params: { from, to, mode } }
  ),
  searchDifferences: (lawId, from, to, filters) => api.post(
    `/laws/${lawId}/search`,
    filters,
    { params: { from, to } }
  ),
  uploadNewLaw: (data) => api.post('/laws/upload-new', data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  uploadLawVersion: (lawId, versionNo, data) => api.post(
    `/laws/${lawId}/versions/${versionNo}/upload`, 
    data, 
    { headers: { 'Content-Type': 'multipart/form-data' } }
  ),
};

// Export auth token utilities
// Favorites API
export const favoritesAPI = {
  add: (lawId, userId) => api.post('/favorites', { law_id: lawId, user_id: userId }),
  list: (userId) => api.get('/favorites', { params: { user_id: userId } }),
  remove: (lawId, userId) => api.delete(`/favorites/${lawId}`, { params: { user_id: userId } }),
  check: (lawId, userId) => api.get(`/favorites/check/${lawId}`, { params: { user_id: userId } }),
  getStats: (userId) => api.get('/favorites/stats', { params: { user_id: userId } }),
};

// Notifications API
export const notificationsAPI = {
  list: (userId, unreadOnly = false, limit = 20, offset = 0) => api.get('/notifications', { 
    params: { user_id: userId, unread_only: unreadOnly, limit, offset } 
  }),
  markRead: (notificationId, userId) => api.post(`/notifications/${notificationId}/read`, {}, { 
    params: { user_id: userId } 
  }),
  markAllRead: (userId) => api.post('/notifications/mark-all-read', {}, { 
    params: { user_id: userId } 
  }),
  delete: (notificationId, userId) => api.delete(`/notifications/${notificationId}`, { 
    params: { user_id: userId } 
  }),
  getCount: (userId, unreadOnly = true) => api.get('/notifications/count', { 
    params: { user_id: userId, unread_only: unreadOnly } 
  }),
  create: (data) => api.post('/notifications', data),
};

export { getAuthToken, setAuthToken, removeAuthToken };

export default api;