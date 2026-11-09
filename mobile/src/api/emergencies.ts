import api from '@/api/axios';
import type { EmergencyResponse, Paged } from '@/types';

/** `EmergencyController` — `/api/emergencies`. El código se valida solo en el servidor. */
export const emergenciesApi = {
  /** Cualquier usuario autenticado. */
  trigger: (code: string, message?: string | null) =>
    api
      .post<EmergencyResponse>('/api/emergencies', { code, message: message || null })
      .then((response) => response.data),
  /** Alertas en curso (cualquier usuario). */
  active: () =>
    api.get<EmergencyResponse[]>('/api/emergencies/active').then((response) => response.data),
  /** ADMIN | CONCIERGE. */
  history: (page = 0, size = 50) =>
    api
      .get<Paged<EmergencyResponse>>('/api/emergencies', { params: { page, size, sort: 'createdAt,desc' } })
      .then((response) => response.data),
  /** ADMIN | CONCIERGE. */
  resolve: (id: number, notes?: string | null) =>
    api
      .patch<EmergencyResponse>(`/api/emergencies/${id}/resolve`, { notes: notes || null })
      .then((response) => response.data),
};
