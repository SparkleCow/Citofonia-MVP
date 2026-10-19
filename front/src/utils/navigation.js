/**
 * Ruta principal a la que se redirige segun el rol del usuario autenticado.
 */
export function homePathForRoles(roles = []) {
  if (roles.includes('ADMIN')) return '/administracion'
  if (roles.includes('SECURITY')) return '/vigilancia'
  if (roles.includes('USER')) return '/residente'
  return '/login'
}
