import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Attach token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('fincorp_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 globally
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('fincorp_token');
      localStorage.removeItem('fincorp_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  me: () => api.get('/auth/me'),
  updateSettings: (data) => api.put('/auth/settings', data),
  updatePassword: (data) => api.put('/auth/password', data),
};

export const transactionsAPI = {
  list: (params) => api.get('/transactions', { params }),
  create: (data) => api.post('/transactions', data),
  update: (id, data) => api.put(`/transactions/${id}`, data),
  delete: (id) => api.delete(`/transactions/${id}`),
};

export const analyticsAPI = {
  overview: () => api.get('/analytics/overview'),
  monthlyTrends: () => api.get('/analytics/monthly-trends'),
  categoryDistribution: (month) => api.get('/analytics/category-distribution', { params: { month } }),
  budgets: () => api.get('/analytics/budgets'),
  spendingVelocity: () => api.get('/analytics/spending-velocity'),
  goals: () => api.get('/analytics/goals'),
  createGoal: (data) => api.post('/analytics/goals', data),
  calendar: (year, month) => api.get(`/analytics/calendar/${year}/${month}`),
  topMerchants: (limit) => api.get('/analytics/top-merchants', { params: { limit } }),
};

export const categoriesAPI = {
  list: () => api.get('/categories'),
  create: (data) => api.post('/categories', data),
  update: (id, data) => api.put(`/categories/${id}`, data),
  delete: (id) => api.delete(`/categories/${id}`),
};

export default api;
