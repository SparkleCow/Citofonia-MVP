import api from '@/api/axios';
import type { ApartmentOption, ApartmentResident, ApartmentResponse, Paged } from '@/types';

export interface ApartmentPayload {
  identifier: string;
  block?: string | null;
  floor?: number | null;
  notes?: string | null;
}

/** `ApartmentController` — `/api/apartments`. */
export const apartmentsApi = {
  /** Público. */
  options: () =>
    api.get<ApartmentOption[]>('/api/apartments/options').then((response) => response.data),
  /** ADMIN | CONCIERGE. */
  list: (page = 0, size = 200) =>
    api
      .get<Paged<ApartmentResponse>>('/api/apartments', { params: { page, size } })
      .then((response) => response.data),
  /** ADMIN | CONCIERGE. */
  get: (id: number) =>
    api.get<ApartmentResponse>(`/api/apartments/${id}`).then((response) => response.data),
  /** ADMIN | CONCIERGE. */
  residents: (id: number) =>
    api
      .get<ApartmentResident[]>(`/api/apartments/${id}/residents`)
      .then((response) => response.data),
  /** ADMIN. */
  create: (payload: ApartmentPayload) =>
    api.post<ApartmentResponse>('/api/apartments', payload).then((response) => response.data),
  /** ADMIN. */
  update: (id: number, payload: ApartmentPayload) =>
    api
      .put<ApartmentResponse>(`/api/apartments/${id}`, payload)
      .then((response) => response.data),
  /** ADMIN. */
  remove: (id: number) => api.delete<void>(`/api/apartments/${id}`).then(() => undefined),
};
