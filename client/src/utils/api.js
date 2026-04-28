import axios from 'axios';

// Create axios instance with base URL
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to add the auth token to requests
api.interceptors.request.use(
  (config) => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (user && user.token) {
      config.headers.Authorization = `Bearer ${user.token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle token expiration
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      // Token expired or invalid, logout user
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// User API calls
export const getUserStats = async () => {
  try {
    const response = await api.get('/users/stats');
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to fetch user statistics' };
  }
};

// Auth API calls
export const login = async (email, password) => {
  try {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Login failed' };
  }
};

export const register = async (name, email, password) => {
  try {
    const response = await api.post('/auth/register', { name, email, password });
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Registration failed' };
  }
};

export const getUserProfile = async () => {
  try {
    const response = await api.get('/auth/profile');
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to fetch profile' };
  }
};

export const logout = async () => {
  try {
    const response = await api.post('/auth/logout');
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to logout' };
  }
};

export const getActiveUsers = async () => {
  try {
    const response = await api.get('/auth/active-users');
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to fetch active users' };
  }
};

export const updateUserProfile = async (userData) => {
  try {
    const response = await api.put('/auth/profile', userData);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to update profile' };
  }
};

// Alias for updateUserProfile for backward compatibility
export const updateProfile = updateUserProfile;

export const getUserActivity = async () => {
  try {
    const response = await api.get('/auth/activity');
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to fetch user activity' };
  }
};

// Event API calls
export const getEvents = async (filters = {}) => {
  try {
    const response = await api.get('/events', { params: filters });
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to fetch events' };
  }
};

export const getEventById = async (id) => {
  try {
    const response = await api.get(`/events/${id}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to fetch event' };
  }
};

export const createEvent = async (eventData) => {
  try {
    const response = await api.post('/events', eventData);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to create event' };
  }
};

export const updateEvent = async (id, eventData) => {
  try {
    const response = await api.put(`/events/${id}`, eventData);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to update event' };
  }
};

export const deleteEvent = async (id) => {
  try {
    const response = await api.delete(`/events/${id}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to delete event' };
  }
};

export const getEventStats = async (id) => {
  try {
    const response = await api.get(`/events/${id}/stats`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to fetch event statistics' };
  }
};

// QR Code API calls
export const generateQRCodes = async (qrData) => {
  try {
    const response = await api.post('/qr/generate', qrData);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to generate QR codes' };
  }
};

export const verifyQRCode = async (qrData) => {
  try {
    const response = await api.post('/qr/verify', { qrData });
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to verify QR code' };
  }
};

export const getAllQRCodes = async (filters = {}) => {
  try {
    const response = await api.get('/qr', { params: filters });
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to fetch QR codes' };
  }
};

export const sendQRCodesByEmail = async (data) => {
  try {
    const response = await api.post('/qr/send-email', data);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to send QR codes by email' };
  }
};

export const testEmailConfig = async (email) => {
  try {
    const response = await api.post('/qr/test-email', { email });
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to test email configuration' };
  }
};

export const downloadQRCode = async (id) => {
  try {
    const response = await api.get(`/qr/download/${id}`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `qr-code-${id}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    return true;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to download QR codes' };
  }
};

export const downloadQRCodes = async (qrCodeIds) => {
  try {
    const response = await api.post('/qr/download', { qrCodeIds }, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `qr-codes-${Date.now()}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    return true;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to download QR codes' };
  }
};

export const downloadEventQRCodes = async (eventId) => {
  try {
    const response = await api.get(`/qr/download/${eventId}`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `event-qr-codes-${eventId}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    return true;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to download event QR codes' };
  }
};

// Stats API calls
export const getOverallStats = async () => {
  try {
    const response = await api.get('/stats');
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to fetch statistics' };
  }
};

export const getQRUsageStats = async (filters = {}) => {
  try {
    const response = await api.get('/stats/qr-usage', { params: filters });
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to fetch QR usage statistics' };
  }
};

// User Management API calls
export const getAllUsers = async () => {
  try {
    const response = await api.get('/users');
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to fetch users' };
  }
};

// Student Management API calls
export const getAllStudents = async (filters = {}) => {
  try {
    const response = await api.get('/students', { params: filters });
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to fetch students' };
  }
};



export const getStudentById = async (id) => {
  try {
    const response = await api.get(`/students/${id}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to fetch student' };
  }
};

export const createStudent = async (studentData) => {
  try {
    const response = await api.post('/students', studentData);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to create student' };
  }
};

export const updateStudent = async (id, studentData) => {
  try {
    const response = await api.put(`/students/${id}`, studentData);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to update student' };
  }
};

export const deleteStudent = async (id) => {
  try {
    const response = await api.delete(`/students/${id}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to delete student' };
  }
};

export const uploadStudentCSV = async (file) => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post('/students/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to upload student data' };
  }
};

export const getStudentsByFilter = async (filters) => {
  try {
    const response = await api.get('/students/filter', { params: filters });
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to fetch filtered students' };
  }
};

export const getUserById = async (id) => {
  try {
    const response = await api.get(`/users/${id}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to fetch user' };
  }
};

export const createUser = async (userData) => {
  try {
    const response = await api.post('/users', userData);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to create user' };
  }
};

export const updateUser = async (id, userData) => {
  try {
    const response = await api.put(`/users/${id}`, userData);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to update user' };
  }
};

export const deleteUser = async (id) => {
  try {
    const response = await api.delete(`/users/${id}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to delete user' };
  }
};

// Admin QR Scanner API calls
export const validateQRCodeAdmin = async (qrData) => {
  try {
    const response = await api.post('/qr/admin-validate', { qrData });
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to validate QR code' };
  }
};
// Bounced Email API calls
export const getBouncedEmails = async (filters = {}) => {
  try {
    const response = await api.get('/bounced-emails', { params: filters });
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to fetch bounced emails' };
  }
};

export const getBouncedEmailStats = async () => {
  try {
    const response = await api.get('/bounced-emails/stats');
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to fetch bounced email stats' };
  }
};

export const resolveBouncedEmail = async (id, notes) => {
  try {
    const response = await api.put(`/bounced-emails/${id}/resolve`, { notes });
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to resolve bounced email' };
  }
};

export const bulkResolveBouncedEmails = async (ids, notes) => {
  try {
    const response = await api.put('/bounced-emails/bulk-resolve', { ids, notes });
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to bulk resolve bounced emails' };
  }
};

export const deleteBouncedEmail = async (id) => {
  try {
    const response = await api.delete(`/bounced-emails/${id}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to delete bounced email' };
  }
};

export const bulkDeleteBouncedEmails = async (ids) => {
  try {
    const response = await api.delete('/bounced-emails/bulk-delete', { data: { ids } });
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to bulk delete bounced emails' };
  }
};

export const retryBouncedEmail = async (id, correctedEmail) => {
  try {
    const response = await api.post(`/bounced-emails/${id}/retry`, { correctedEmail });
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to retry bounced email' };
  }
};

export const exportBouncedEmails = async (filters = {}) => {
  try {
    const response = await api.get('/bounced-emails/export', {
      params: filters,
      responseType: 'blob'
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to export bounced emails' };
  }
};

export default api;
