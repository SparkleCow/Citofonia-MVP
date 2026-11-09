import api from '@/api/axios';
import type {
  AdminDashboardResponse,
  ApproveUserPayload,
  CallAuditResponse,
  CreateUserPayload,
  Paged,
  UpdateUserPayload,
  UserResponse,
  UserSearchParams,
} from '@/types';

export const adminApi = {
  dashboard: () =>
    api.get<AdminDashboardResponse>('/api/admin/dashboard').then((response) => response.data),
  calls: (page = 0, size = 30) =>
    api
      .get<Paged<CallAuditResponse>>('/api/admin/calls', { params: { page, size } })
      .then((response) => response.data),
};

export const usersApi = {
  /** Listado con filtros (texto, rol, apartamento, estado). */
  search: ({ page = 0, size = 200, ...filters }: UserSearchParams = {}) =>
    api
      .get<Paged<UserResponse>>('/api/users', { params: { page, size, ...filters } })
      .then((response) => response.data),
  approve: (id: number, payload: ApproveUserPayload = {}) =>
    api.post<UserResponse>(`/api/users/${id}/approve`, payload).then((response) => response.data),
  reject: (id: number) => api.post<void>(`/api/users/${id}/reject`).then(() => undefined),
  list: (page = 0, size = 20) =>
    api
      .get<Paged<UserResponse>>('/api/users', { params: { page, size } })
      .then((response) => response.data),
  pending: (page = 0, size = 20) =>
    api
      .get<Paged<UserResponse>>('/api/users/pending', { params: { page, size } })
      .then((response) => response.data),
  get: (id: number) => api.get<UserResponse>(`/api/users/${id}`).then((response) => response.data),
  create: (payload: CreateUserPayload) =>
    api.post<UserResponse>('/api/users', payload).then((response) => response.data),
  update: (id: number, payload: UpdateUserPayload) =>
    api.put<UserResponse>(`/api/users/${id}`, payload).then((response) => response.data),
  enable: (id: number) =>
    api.patch<UserResponse>(`/api/users/${id}/enable`).then((response) => response.data),
  disable: (id: number) =>
    api.patch<UserResponse>(`/api/users/${id}/disable`).then((response) => response.data),
  remove: (id: number) => api.delete(`/api/users/${id}`).then((response) => response.data),
  assignApartment: (id: number, apartmentId: number | null) =>
    api
      .patch<UserResponse>(`/api/users/${id}/apartment`, { apartmentId })
      .then((response) => response.data),
};

export { apartmentsApi } from '@/api/apartments';
export { callsApi } from '@/api/calls';

export type { SendMailPayload } from '@/api/mail';

export { mailApi } from '@/api/mail';
