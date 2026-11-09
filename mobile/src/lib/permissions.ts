import type { Role } from '@/types';

/**
 * Capacidades del buzón por rol, según el backend:
 *  - Enviar: `POST /api/admin/mail` es solo ADMIN.
 *  - Directorio: `/api/apartments/{id}/residents` es ADMIN | CONCIERGE.
 *  - Personal de conserjería: `/api/calls/staff` es solo ADMIN.
 * Si el backend abre el envío a otros roles, basta cambiar `canSend`.
 */
export function mailCapabilities(roles: Role[] = []) {
  const admin = roles.includes('ADMIN');
  const concierge = roles.includes('CONCIERGE');
  return {
    canSend: admin,
    canBrowseDirectory: admin || concierge,
    canListStaff: admin,
  };
}

export type MailCapabilities = ReturnType<typeof mailCapabilities>;
