/**
 * URL del backend en desarrollo.
 *
 * Si no hay VITE_API_URL, se usa el mismo host desde el que se ha abierto el
 * front (localhost o la IP de la LAN) y el puerto del backend. Asi funciona
 * igual abriendo http://localhost:5173 que http://192.168.100.132:5173.
 */
const CONFIGURED_BASE = (import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '')
const BACKEND_PORT = import.meta.env.VITE_API_PORT || '8080'

export function apiBaseUrl() {
  if (CONFIGURED_BASE) return CONFIGURED_BASE

  const { protocol, hostname, port } = window.location
  const backendPort = port === BACKEND_PORT ? port : BACKEND_PORT
  return `${protocol}//${hostname}:${backendPort}`
}

export function websocketUrl(path = '/ws') {
  return `${apiBaseUrl().replace(/^http/, 'ws')}${path}`
}
