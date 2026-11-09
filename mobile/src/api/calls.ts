import api from '@/api/axios';
import type {
  CallApartmentOption,
  CallResidentItem,
  CallStaffItem,
  ResidentDirectoryItem,
} from '@/types';

/** `CallDirectoryController` — `/api/calls` (la señalización va por STOMP). */
export const callsApi = {
  /** ADMIN | CONCIERGE: directorio de residentes para llamar. */
  residents: () =>
    api.get<ResidentDirectoryItem[]>('/api/calls/residents').then((response) => response.data),
  /** ADMIN. */
  staff: () => api.get<CallStaffItem[]>('/api/calls/staff').then((response) => response.data),
  /** ADMIN. */
  apartments: () =>
    api.get<CallApartmentOption[]>('/api/calls/apartments').then((response) => response.data),
  /** ADMIN. */
  apartmentResidents: (id: number) =>
    api
      .get<CallResidentItem[]>(`/api/calls/apartments/${id}/residents`)
      .then((response) => response.data),
};
