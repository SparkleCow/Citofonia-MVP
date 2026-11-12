export type Role = 'ADMIN' | 'CONCIERGE' | 'USER';

export type CallType = 'DIRECT' | 'APARTMENT' | 'PORTAL' | 'PANIC';

export type CallOutcome =
  | 'ANSWERED'
  | 'REJECTED'
  | 'NO_ANSWER'
  | 'ENDED_BY_PARTICIPANT'
  | 'DISCONNECTED'
  | 'CANCELLED';

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

export interface JwtResponse {
  token: string;
  type: string;
  email: string;
  roles: Role[];
}

export interface UserSession {
  id?: number;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string | null;
  documentNumber?: string | null;
  roles: Role[];
  apartmentId?: number | null;
  apartmentIdentifier?: string | null;
  owner?: boolean;
  occupiesApartment?: boolean;
  enabled?: boolean;
  deleted?: boolean;
  createdAt?: string;
  updatedAt?: string | null;
  createdByEmail?: string | null;
  updatedByEmail?: string | null;
  lastLoginAt?: string | null;
}

export interface PageMeta {
  size: number;
  number: number;
  totalElements: number;
  totalPages: number;
}

export interface Paged<T> {
  content: T[];
  page: PageMeta;
}

export type UserResponse = UserSession & {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  roles: Role[];
  enabled: boolean;
  deleted: boolean;
  /** false = registro pendiente de aprobación. */
  approved?: boolean;
};

export type UserStatusFilter = 'ACTIVE' | 'DISABLED' | 'PENDING';

export interface UserSearchParams {
  q?: string;
  role?: Role;
  apartmentId?: number;
  status?: UserStatusFilter;
  page?: number;
  size?: number;
}

export interface ApproveUserPayload {
  apartmentId?: number | null;
  owner?: boolean;
  occupiesApartment?: boolean;
}

export interface ApartmentOption {
  id: number;
  identifier: string;
  block?: string | null;
  floor?: number | null;
}

export interface ApartmentResident {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  roles: Role[];
  enabled: boolean;
}

export interface ApartmentResponse extends ApartmentOption {
  notes?: string | null;
  residentCount: number;
  residents: ApartmentResident[];
  createdAt?: string;
  updatedAt?: string | null;
}

export interface CallApartmentOption extends ApartmentOption {
  residentCount: number;
}

export interface CallResidentItem {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  apartmentIdentifier: string;
  owner: boolean;
  livesHere: boolean;
  enabled: boolean;
}

export interface CallStaffItem {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  roles: Role[];
}

export interface CallAuditResponse {
  id: number;
  callId: string;
  type: CallType;
  callerEmail: string;
  calleeEmail?: string | null;
  callerApartmentIdentifier?: string | null;
  targetApartmentIdentifier?: string | null;
  multiTarget: boolean;
  alert: boolean;
  startedAt: string;
  answeredAt?: string | null;
  endedAt?: string | null;
  outcome?: CallOutcome | null;
  endedByEmail?: string | null;
  endReason?: string | null;
}

export interface AdminDashboardResponse {
  apartmentsTotal: number;
  residentsTotal: number;
  residentsActive: number;
  usersTotal: number;
  pendingTotal: number;
  activeIntercoms: number;
  callsToday: number;
  alertsToday: number;
  recentCalls: CallAuditResponse[];
  conciergesTotal: number;
  visitsActive: number;
  packagesPending: number;
  activeEmergencies: number;
  recentActivity: ActivityItem[];
}

export interface ActivityItem {
  type: 'VISIT' | 'PACKAGE' | 'EMERGENCY' | 'REGISTRATION';
  title: string;
  subtitle: string;
  at: string;
}

export interface CreateUserPayload {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  documentNumber?: string | null;
  password: string;
  roles: Role[];
  apartmentId?: number | null;
  /** Residentes: true = propietario, false = arrendatario. */
  owner?: boolean;
  occupiesApartment?: boolean;
}

export interface UpdateUserPayload {
  firstName?: string;
  lastName?: string;
  phone?: string | null;
  documentNumber?: string | null;
  roles?: Role[];
  apartmentId?: number | null;
  owner?: boolean;
  occupiesApartment?: boolean;
}

/* ───────────── Visitas (VisitController) ───────────── */

export type VisitStatus = 'PREAUTHORIZED' | 'PENDING' | 'NOTIFIED' | 'ADMITTED' | 'REJECTED' | 'CLOSED';

export interface VisitPayload {
  apartmentId: number;
  visitorName: string;
  visitorDocument?: string | null;
  visitorPhone?: string | null;
  visitorCompany?: string | null;
  notes?: string | null;
  entryAt?: string | null;
  /** Motivo de la visita (las observaciones van en notes). */
  reason?: string | null;
}

export interface VisitResponse {
  id: number;
  apartmentId: number;
  apartmentIdentifier: string;
  visitorName: string;
  visitorDocument?: string | null;
  visitorPhone?: string | null;
  visitorCompany?: string | null;
  reason?: string | null;
  notes?: string | null;
  entryAt?: string | null;
  exitAt?: string | null;
  status: VisitStatus;
  notifiedAt?: string | null;
  notifiedTo: string[];
  registeredByEmail?: string | null;
  createdAt?: string | null;
  /** Código de acceso (QR) de una visita preautorizada por un residente. */
  accessCode?: string | null;
  /** Llegada estimada de una visita preautorizada. */
  expectedAt?: string | null;
}

/** `VisitPreauthorizeRequest`: visita que el residente anuncia para su vivienda. */
export interface VisitPreauthorizePayload {
  visitorName: string;
  /** Solo dígitos (6–12). */
  visitorDocument: string;
  expectedAt: string;
  reason?: string | null;
}

export interface VisitStatusPayload {
  status: VisitStatus;
  exitAt?: string | null;
}

/* ───────────── Correspondencia (CorrespondenceController) ───────────── */

export type CorrespondenceStatus = 'PENDING' | 'NOTIFIED' | 'DELIVERED' | 'RETURNED';
export type CorrespondenceType = 'PAQUETE' | 'CARTA' | 'DOCUMENTO' | 'OTRO';
export type CorrespondenceDelivery = 'APARTAMENTO' | 'PORTERIA';

export interface CorrespondencePayload {
  apartmentId: number;
  type: CorrespondenceType;
  description?: string | null;
  carrier?: string | null;
  trackingNumber?: string | null;
  recipientId?: number | null;
  delivery?: CorrespondenceDelivery | null;
  receivedAt?: string | null;
  notes?: string | null;
}

export interface CorrespondenceResponse {
  id: number;
  apartmentId: number;
  apartmentIdentifier: string;
  type: CorrespondenceType;
  description?: string | null;
  carrier?: string | null;
  trackingNumber?: string | null;
  recipientId?: number | null;
  recipientName?: string | null;
  recipientEmail?: string | null;
  delivery?: CorrespondenceDelivery | null;
  status: CorrespondenceStatus;
  receivedAt?: string | null;
  notifiedAt?: string | null;
  notifiedTo: string[];
  collectedAt?: string | null;
  notes?: string | null;
  registeredByEmail?: string | null;
  createdAt?: string | null;
  /** Fotos adjuntas: GET /api/attachments/{id}/content. */
  photoIds?: number[];
}

export interface CorrespondenceStatusPayload {
  status: CorrespondenceStatus;
  delivery?: CorrespondenceDelivery | null;
}

/** Respuesta común de `/recipients` en visitas y correspondencia. */
export interface RecipientResponse {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  apartmentIdentifier?: string | null;
  owner: boolean;
}

/* ───────────── Buzón (MailController) ───────────── */

export interface MailboxItem {
  id: number;
  messageId: number;
  subject: string;
  body: string;
  senderEmail: string;
  createdAt: string;
  read: boolean;
  readAt?: string | null;
}

export interface MailStats {
  total: number;
  unread: number;
}

/* ───────────── Notificaciones (NotificationController) ───────────── */

export type NotificationType = 'GENERAL' | 'VISIT' | 'DELIVERY';
export type HousingProfile = 'RESIDENT' | 'OWNER_ABSENT' | 'NON_RESIDENT' | 'NONE';

export interface NotificationPreferences {
  general: boolean;
  visits: boolean;
  deliveries: boolean;
  types: NotificationType[];
  profile: HousingProfile;
  apartmentIdentifier?: string | null;
}

/* ───────────── Adjuntos (AttachmentController) ───────────── */

export interface AttachmentResponse {
  id: number;
  originalFilename: string;
  contentType: string;
  size: number;
  relativePath: string;
  entityType: string;
  entityId?: number | null;
}

/* ───────────── Directorio de llamadas (CallDirectoryController) ───────────── */

export interface ResidentDirectoryItem {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  apartmentIdentifier?: string | null;
}

/* ───────────── Tiempo real (STOMP /user/queue/mailbox) ───────────── */

/** Payload que empuja el backend al recibir un mensaje (MailNotificationResponse). */
export interface MailNotification {
  id: number;
  messageId: number;
  subject: string;
  senderEmail: string;
  createdAt: string;
  unread: number;
}

/* ───────────── Citofonía (CallStompController / CallEnvelope) ───────────── */

export type CallEventType = 'INVITE' | 'ALERT' | 'ACCEPT' | 'REJECT' | 'SIGNAL' | 'END' | 'ERROR';

/** Evento que llega por `/user/queue/calls`. */
export interface CallEnvelope {
  type: CallEventType;
  callId: string | null;
  from: string | null;
  fromName: string | null;
  fromApartment: string | null;
  kind: string | null;
  payload: unknown;
  message: string | null;
}

/* ───────────── Emergencias (EmergencyController / /topic/emergencies) ───────────── */

export type EmergencyStatus = 'ACTIVE' | 'RESOLVED';

export interface EmergencyResponse {
  id: number;
  status: EmergencyStatus;
  message?: string | null;
  triggeredByEmail: string;
  triggeredByName: string;
  triggeredFromApartment?: string | null;
  createdAt: string;
  notifiedCount: number;
  resolvedAt?: string | null;
  resolvedByEmail?: string | null;
  resolutionNotes?: string | null;
}

export interface EmergencyBroadcast {
  type: 'TRIGGERED' | 'RESOLVED';
  emergency: EmergencyResponse;
}
