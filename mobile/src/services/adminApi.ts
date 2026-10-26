import api from './api';

export const usersApi = {
  list: (page = 0, size = 20) => api.get('/api/users', { params: { page, size } }).then(r => r.data),
  pending: (page = 0, size = 20) => api.get('/api/users/pending', { params: { page, size } }).then(r => r.data),
  get: (id: number) => api.get(`/api/users/${id}`).then(r => r.data),
  create: (payload: any) => api.post('/api/users', payload).then(r => r.data),
  update: (id: number, payload: any) => api.put(`/api/users/${id}`, payload).then(r => r.data),
  enable: (id: number) => api.patch(`/api/users/${id}/enable`).then(r => r.data),
  disable: (id: number) => api.patch(`/api/users/${id}/disable`).then(r => r.data),
  remove: (id: number) => api.delete(`/api/users/${id}`).then(r => r.data),
  assignApartment: (id: number, apartmentId: number | null) => api.patch(`/api/users/${id}/apartment`, { apartmentId }).then(r => r.data),
  updateHousing: (id: number, payload: any) => api.patch(`/api/users/${id}/housing`, payload).then(r => r.data),
};

export const apartmentsApi = {
  options: () => api.get('/api/apartments/options').then(r => r.data),
  list: () => api.get('/api/apartments').then(r => r.data),
};

export const mailApi = {
  send: (payload: any) => api.post('/api/admin/mail', payload).then(r => r.data),
};

export const callsApi = {
  staff: () => api.get('/api/calls/staff').then(r => r.data),
  apartments: () => api.get('/api/calls/apartments').then(r => r.data),
  apartmentResidents: (id: number) => api.get(`/api/calls/apartments/${id}/residents`).then(r => r.data),
};
