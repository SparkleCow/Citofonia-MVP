import type { BadgeTone } from '@/components/ui/Badge';
import type { CallOutcome, CallType, Role } from '@/types';

const dateTimeFormatter = new Intl.DateTimeFormat('es-ES', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

const timeFormatter = new Intl.DateTimeFormat('es-ES', {
  hour: '2-digit',
  minute: '2-digit',
});

const dateFormatter = new Intl.DateTimeFormat('es-ES', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});

export function formatDateTime(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return dateTimeFormatter.format(date);
}

export function formatTime(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return timeFormatter.format(date);
}

export function formatLongDate(value: Date = new Date()) {
  const formatted = dateFormatter.format(value);
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

export function relativeTime(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60_000);

  if (minutes < 1) return 'Ahora mismo';
  if (minutes < 60) return `Hace ${minutes} min`;
  if (minutes < 1_440) return `Hace ${Math.floor(minutes / 60)} h`;
  if (minutes < 10_080) return `Hace ${Math.floor(minutes / 1_440)} d`;
  return formatDateTime(value);
}

export function fullName(firstName?: string | null, lastName?: string | null) {
  return [firstName, lastName].filter(Boolean).join(' ') || 'Sin nombre';
}

export const callTypeLabels: Record<CallType, string> = {
  DIRECT: 'Directa',
  APARTMENT: 'Apartamento',
  PORTAL: 'Portería',
  PANIC: 'Pánico',
};

export const callOutcomeLabels: Record<CallOutcome, string> = {
  ANSWERED: 'Atendida',
  REJECTED: 'Rechazada',
  NO_ANSWER: 'Sin respuesta',
  ENDED_BY_PARTICIPANT: 'Finalizada',
  DISCONNECTED: 'Desconectada',
  CANCELLED: 'Cancelada',
};

export function outcomeTone(outcome?: CallOutcome | null): BadgeTone {
  switch (outcome) {
    case 'ANSWERED':
      return 'success';
    case 'REJECTED':
      return 'danger';
    case 'NO_ANSWER':
      return 'warning';
    case 'CANCELLED':
      return 'neutral';
    case 'DISCONNECTED':
      return 'info';
    default:
      return 'neutral';
  }
}

export const roleLabels: Record<Role, string> = {
  ADMIN: 'Administración',
  CONCIERGE: 'Conserjería',
  USER: 'Residente',
};

export function roleTone(role?: Role | null): BadgeTone {
  switch (role) {
    case 'ADMIN':
      return 'violet';
    case 'CONCIERGE':
      return 'info';
    default:
      return 'brand';
  }
}

export function initialsOf(firstName?: string | null, lastName?: string | null) {
  return `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase() || '?';
}
