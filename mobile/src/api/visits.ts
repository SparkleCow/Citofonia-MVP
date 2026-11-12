import api from '@/api/axios';
import { pageParams, type PageParams } from '@/api/pagination';
import type {
  Paged,
  RecipientResponse,
  VisitPayload,
  VisitPreauthorizePayload,
  VisitResponse,
  VisitStatusPayload,
} from '@/types';

/** `VisitController` — `/api/visits`. */
export const visitsApi = {
  /** ADMIN | CONCIERGE. */
  list: (params?: PageParams & { apartmentId?: number | null }) =>
    api
      .get<Paged<VisitResponse>>('/api/visits', {
        params: { ...pageParams(params), apartmentId: params?.apartmentId ?? undefined },
      })
      .then((response) => response.data),
  /** Cualquier usuario autenticado: visitas de su vivienda. */
  mine: (params?: PageParams) =>
    api
      .get<Paged<VisitResponse>>('/api/visits/mine', { params: pageParams(params) })
      .then((response) => response.data),
  /** ADMIN | CONCIERGE. */
  recipients: (apartmentId: number) =>
    api
      .get<RecipientResponse[]>('/api/visits/recipients', { params: { apartmentId } })
      .then((response) => response.data),
  get: (id: number) =>
    api.get<VisitResponse>(`/api/visits/${id}`).then((response) => response.data),
  /** ADMIN | CONCIERGE. */
  register: (payload: VisitPayload) =>
    api.post<VisitResponse>('/api/visits', payload).then((response) => response.data),
  /** ADMIN | CONCIERGE. */
  notify: (id: number, residentIds: number[]) =>
    api
      .post<VisitResponse>(`/api/visits/${id}/notify`, { residentIds })
      .then((response) => response.data),
  /** ADMIN | CONCIERGE. */
  updateStatus: (id: number, payload: VisitStatusPayload) =>
    api
      .patch<VisitResponse>(`/api/visits/${id}/status`, payload)
      .then((response) => response.data),
  /** USER que reside en la vivienda: anuncia una visita y obtiene su código (QR). */
  preauthorize: (payload: VisitPreauthorizePayload) =>
    api.post<VisitResponse>('/api/visits/preauthorize', payload).then((response) => response.data),
  /** USER: anula una preautorización que aún no se ha usado. */
  cancelPreauthorization: (id: number) =>
    api.delete<VisitResponse>(`/api/visits/${id}/preauthorization`).then((response) => response.data),
  /** ADMIN | CONCIERGE: visita a la que pertenece un código escaneado. */
  byAccessCode: (code: string) =>
    api
      .get<VisitResponse>(`/api/visits/access/${encodeURIComponent(code)}`)
      .then((response) => response.data),
  /** ADMIN | CONCIERGE: registra el ingreso de una visita preautorizada (un solo uso). */
  checkIn: (code: string) =>
    api
      .post<VisitResponse>(`/api/visits/access/${encodeURIComponent(code)}/check-in`)
      .then((response) => response.data),
};
