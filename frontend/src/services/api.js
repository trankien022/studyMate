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

export default api;
