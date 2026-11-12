import type { Ionicons } from '@expo/vector-icons';
import type { BadgeTone } from '@/components/ui/Badge';
import type {
  CorrespondenceDelivery,
  CorrespondenceStatus,
  CorrespondenceType,
  HousingProfile,
  VisitStatus,
} from '@/types';

type IconName = keyof typeof Ionicons.glyphMap;

export const visitStatusMeta: Record<VisitStatus, { label: string; tone: BadgeTone; icon: IconName }> = {
  PREAUTHORIZED: { label: 'Preautorizada', tone: 'violet', icon: 'qr-code-outline' },
  PENDING: { label: 'Pendiente', tone: 'warning', icon: 'hourglass-outline' },
  NOTIFIED: { label: 'Avisada', tone: 'info', icon: 'notifications-outline' },
  ADMITTED: { label: 'Autorizada', tone: 'success', icon: 'checkmark-circle-outline' },
  REJECTED: { label: 'Rechazada', tone: 'danger', icon: 'close-circle-outline' },
  CLOSED: { label: 'Salida', tone: 'neutral', icon: 'exit-outline' },
};

export const correspondenceStatusMeta: Record<
  CorrespondenceStatus,
  { label: string; tone: BadgeTone; icon: IconName }
> = {
  PENDING: { label: 'Pendiente', tone: 'warning', icon: 'hourglass-outline' },
  NOTIFIED: { label: 'Avisada', tone: 'info', icon: 'notifications-outline' },
  DELIVERED: { label: 'Entregada', tone: 'success', icon: 'checkmark-done-outline' },
  RETURNED: { label: 'Devuelta', tone: 'danger', icon: 'return-up-back-outline' },
};

/** Lo que ve el residente: su paquete está en portería o ya lo tiene. */
export const residentCorrespondenceStatusMeta: Record<
  CorrespondenceStatus,
  { label: string; tone: BadgeTone; icon: IconName }
> = {
  PENDING: { label: 'En recepción', tone: 'warning', icon: 'file-tray-full-outline' },
  NOTIFIED: { label: 'En recepción', tone: 'warning', icon: 'file-tray-full-outline' },
  DELIVERED: { label: 'Entregado', tone: 'success', icon: 'checkmark-done-outline' },
  RETURNED: { label: 'Devuelto', tone: 'danger', icon: 'return-up-back-outline' },
};

export const correspondenceTypeMeta: Record<CorrespondenceType, { label: string; icon: IconName }> = {
  PAQUETE: { label: 'Paquete', icon: 'cube-outline' },
  CARTA: { label: 'Carta', icon: 'mail-outline' },
  DOCUMENTO: { label: 'Documento', icon: 'document-text-outline' },
  OTRO: { label: 'Otro', icon: 'pricetag-outline' },
};

export const deliveryLabels: Record<CorrespondenceDelivery, string> = {
  APARTAMENTO: 'En el apartamento',
  PORTERIA: 'En portería',
};

export const housingProfileLabels: Record<HousingProfile, string> = {
  RESIDENT: 'Residente en la vivienda',
  OWNER_ABSENT: 'Propietario no residente',
  NON_RESIDENT: 'Sin residencia',
  NONE: 'Sin vivienda asignada',
};

/** Visitas que siguen requiriendo acción de portería. */
export const OPEN_VISIT_STATUSES: VisitStatus[] = ['PENDING', 'NOTIFIED', 'ADMITTED'];
/** Correspondencia aún no recogida. */
export const OPEN_CORRESPONDENCE_STATUSES: CorrespondenceStatus[] = ['PENDING', 'NOTIFIED'];
