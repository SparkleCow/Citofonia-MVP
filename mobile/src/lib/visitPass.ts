import type { VisitResponse } from '@/types';

/** Prefijo del contenido del QR: distingue un pase de Citofonía de cualquier otro código. */
const PREFIX = 'CITOFONIA-VISITA:';
/** Mismo alfabeto que el backend (sin 0/O/1/I/L). */
const CODE_PATTERN = /[2-9A-HJ-NP-Z]{12}/;
export const ACCESS_CODE_LENGTH = 12;

/** El backend acepta el código hasta 12 h después de la llegada estimada. */
const GRACE_MS = 12 * 60 * 60 * 1000;

/** Pase preautorizado que ya no sirve porque pasó su ventana de validez. */
export function isPassExpired(visit: VisitResponse, now: number = Date.now()) {
  if (visit.status !== 'PREAUTHORIZED' || !visit.expectedAt) return false;
  return now > new Date(visit.expectedAt).getTime() + GRACE_MS;
}

export function visitPassPayload(code: string) {
  return `${PREFIX}${code}`;
}

/** Extrae el código de acceso de un QR escaneado o de un texto escrito a mano. */
export function parseAccessCode(raw: string): string | null {
  const match = CODE_PATTERN.exec(raw.trim().toUpperCase().replace(/[\s-]+/g, ''));
  return match ? match[0] : null;
}

/** Limpia lo tecleado: mayúsculas y solo caracteres del alfabeto del código. */
export function sanitizeAccessCode(raw: string) {
  return raw
    .toUpperCase()
    .replace(/[^2-9A-HJ-NP-Z]/g, '')
    .slice(0, ACCESS_CODE_LENGTH);
}

/** `ABCD-EFGH-JKMN`: más fácil de leer y dictar. */
export function formatAccessCode(code: string) {
  return code.match(/.{1,4}/g)?.join('-') ?? code;
}

export function visitPassMessage(visit: VisitResponse, when: string) {
  return [
    `Hola ${visit.visitorName}, te autoricé el ingreso al apartamento ${visit.apartmentIdentifier}.`,
    `Llegada estimada: ${when}.`,
    `Muestra este código en portería: ${formatAccessCode(visit.accessCode ?? '')}`,
  ].join('\n');
}
