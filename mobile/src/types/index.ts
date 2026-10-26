export type Role = 'ADMIN' | 'CONCIERGE' | 'USER';

export interface UserSession {
  id?: number;
  email: string;
  firstName?: string;
  lastName?: string;
  roles: Role[];
  apartmentIdentifier?: string;
  apartmentId?: number;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone: string;
  documentNumber?: string;
  registrationCode: string;
  apartmentId?: number;
  owner?: boolean;
  occupiesApartment?: boolean;
}
