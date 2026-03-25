import axios from 'axios';

const API_BASE = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

// Inject JWT token on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 globally → redirect to login
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

/* ─── Auth ─────────────────────────────────────────────── */
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
  changePassword: (data) => api.put('/auth/change-password', data),
};

/* ─── Rooms ────────────────────────────────────────────── */
export const roomAPI = {
  create: (data) => api.post('/rooms', data),
  getAll: (page = 1, limit = 12) => api.get(`/rooms?page=${page}&limit=${limit}`),
  getById: (id) => api.get(`/rooms/${id}`),
  join: (inviteCode) => api.post('/rooms/join', { inviteCode }),
  updateNotes: (id, notes) => api.patch(`/rooms/${id}/notes`, { notes }),
  delete: (id) => api.delete(`/rooms/${id}`),
  leave: (id) => api.post(`/rooms/${id}/leave`),
  kickMember: (id, memberId) => api.delete(`/rooms/${id}/members/${memberId}`),
  transferOwnership: (id, newOwnerId) => api.patch(`/rooms/${id}/transfer`, { newOwnerId }),
};

/* ─── AI ───────────────────────────────────────────────── */
export const aiAPI = {
  chat: (data) => api.post('/ai/chat', data),
  summarize: (data) => api.post('/ai/summarize', data),
  getHistory: (roomId, page = 1, limit = 10) => api.get(`/ai/history/${roomId}?page=${page}&limit=${limit}`),
  getConversation: (id) => api.get(`/ai/conversation/${id}`),
  deleteConversation: (id) => api.delete(`/ai/conversation/${id}`),
  explainQuiz: (data) => api.post('/ai/explain-quiz', data),
  getStudySuggestions: () => api.get('/ai/study-suggestions'),
};

/* ─── Quiz ─────────────────────────────────────────────── */
export const quizAPI = {
  generate: (data) => api.post('/quiz/generate', data),
  getByRoom: (roomId, page = 1, limit = 12) => api.get(`/quiz/${roomId}?page=${page}&limit=${limit}`),
  getDetail: (id) => api.get(`/quiz/detail/${id}`),
  submit: (id, answers) => api.post(`/quiz/${id}/submit`, { answers }),
  getResults: (id) => api.get(`/quiz/${id}/results`),
  delete: (id) => api.delete(`/quiz/${id}`),
  getAnalytics: (roomId) => api.get(`/quiz/analytics/${roomId}`),
};

/* ─── Payment ──────────────────────────────────────────── */
export const paymentAPI = {
  createPaymentUrl: (data) => api.post('/payment/create-url', data),
  getHistory: () => api.get('/payment/history'),
};

/* ─── Notifications ────────────────────────────────────── */
export const notificationAPI = {
  getAll: (page = 1, limit = 20) => api.get(`/notifications?page=${page}&limit=${limit}`),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  markAsRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllAsRead: () => api.patch('/notifications/read-all'),
  delete: (id) => api.delete(`/notifications/${id}`),
  clearAll: () => api.delete('/notifications/clear'),
};

/* ─── Direct Messaging ─────────────────────────────────── */
export const dmAPI = {
  getContacts: () => api.get('/dm/contacts'),
  getConversations: () => api.get('/dm/conversations'),
  getMessages: (partnerId, page = 1, limit = 50) =>
    api.get(`/dm/messages/${partnerId}?page=${page}&limit=${limit}`),
  sendMessage: (receiverId, content) =>
    api.post('/dm/send', { receiverId, content }),
  getUnreadTotal: () => api.get('/dm/unread-total'),
  markRead: (partnerId) => api.patch(`/dm/read/${partnerId}`),
};

/* ─── Documents ────────────────────────────────────────── */
export const documentAPI = {
  upload: (file, roomId) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('roomId', roomId);
    return api.post('/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  getByRoom: (roomId, page = 1, limit = 12) =>
    api.get(`/documents/${roomId}?page=${page}&limit=${limit}`),
  getDetail: (id) => api.get(`/documents/detail/${id}`),
  retry: (id) => api.post(`/documents/${id}/retry`),
  analyze: (id) => api.post(`/documents/${id}/analyze`),
  ask: (id, question, history) =>
    api.post(`/documents/${id}/ask`, { question, history }),
  delete: (id) => api.delete(`/documents/${id}`),
};

/* ─── Tasks (Kanban Board) ─────────────────────────────── */
export const taskAPI = {
  getByRoom: (roomId) => api.get(`/tasks/${roomId}`),
  create: (data) => api.post('/tasks', data),
  update: (id, data) => api.patch(`/tasks/${id}`, data),
  updateStatus: (id, status, order) =>
    api.patch(`/tasks/${id}/status`, { status, order }),
  reorder: (roomId, tasks) =>
    api.patch('/tasks/reorder', { roomId, tasks }),
  delete: (id) => api.delete(`/tasks/${id}`),
};

export default api;
