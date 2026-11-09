import api from '@/api/axios';
import { pageParams, type PageParams } from '@/api/pagination';
import type {
  CorrespondencePayload,
  CorrespondenceResponse,
  CorrespondenceStatusPayload,
  Paged,
  RecipientResponse,
} from '@/types';

/** `CorrespondenceController` — `/api/correspondences`. */
export const correspondenceApi = {
  /** ADMIN | CONCIERGE. */
  list: (params?: PageParams & { apartmentId?: number | null }) =>
    api
      .get<Paged<CorrespondenceResponse>>('/api/correspondences', {
        params: { ...pageParams(params), apartmentId: params?.apartmentId ?? undefined },
      })
      .then((response) => response.data),
  /** Cualquier usuario autenticado: correspondencia de su vivienda. */
  mine: (params?: PageParams) =>
    api
      .get<Paged<CorrespondenceResponse>>('/api/correspondences/mine', {
        params: pageParams(params),
      })
      .then((response) => response.data),
  /** ADMIN | CONCIERGE. */
  recipients: (apartmentId: number) =>
    api
      .get<RecipientResponse[]>('/api/correspondences/recipients', { params: { apartmentId } })
      .then((response) => response.data),
  get: (id: number) =>
    api
      .get<CorrespondenceResponse>(`/api/correspondences/${id}`)
      .then((response) => response.data),
  /** ADMIN | CONCIERGE. */
  register: (payload: CorrespondencePayload) =>
    api
      .post<CorrespondenceResponse>('/api/correspondences', payload)
      .then((response) => response.data),
  /** ADMIN | CONCIERGE. */
  notify: (id: number, residentIds: number[]) =>
    api
      .post<CorrespondenceResponse>(`/api/correspondences/${id}/notify`, { residentIds })
      .then((response) => response.data),
  /** ADMIN | CONCIERGE: deja la correspondencia en portería y avisa por buzón. */
  hold: (id: number) =>
    api
      .post<CorrespondenceResponse>(`/api/correspondences/${id}/hold`)
      .then((response) => response.data),
  /** ADMIN | CONCIERGE. */
  updateStatus: (id: number, payload: CorrespondenceStatusPayload) =>
    api
      .patch<CorrespondenceResponse>(`/api/correspondences/${id}/status`, payload)
      .then((response) => response.data),
};
