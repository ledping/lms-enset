// src/api/authService.js
import api from './axiosConfig';

export const authService = {
  login: (username, password) =>
    api.post('/auth/token/', { username, password }).then(r => r.data),

  register: (data) =>
    api.post('/auth/register/', data).then(r => r.data),

  getMe: () =>
    api.get('/auth/me/').then(r => r.data),

  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  },
};