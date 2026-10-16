// Cliente HTTP minimo para la API de Citofonia.
// Usa rutas relativas "/api/..." que Vite redirige al backend (ver vite.config.js).

const BASE = '/api'

export function getToken() {
  try {
    const raw = localStorage.getItem('citofonia.session')
    return raw ? JSON.parse(raw).token : null
  } catch {
    return null
  }
}

/**
 * Realiza una peticion a la API.
 * @param {string} path ruta relativa, ej. "/auth/login"
 * @param {{method?: string, body?: any, auth?: boolean}} options
 * @throws {Error} con .status y .fieldErrors cuando la respuesta no es 2xx
 */
export async function api(path, { method = 'GET', body, auth = true } = {}) {
  const headers = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  const token = getToken()
  if (auth && token) headers['Authorization'] = `Bearer ${token}`

  const response = await fetch(BASE + path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined
  })

  const text = await response.text()
  let data = null
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = text
    }
  }

  if (!response.ok) {
    const message =
      (data && (data.message || data.error)) || `Error ${response.status}`
    const error = new Error(message)
    error.status = response.status
    error.fieldErrors = data && data.fieldErrors
    throw error
  }

  return data
}

export const Api = {
  // Auth
  login: (email, password) => api('/auth/login', { method: 'POST', body: { email, password }, auth: false }),
  me: () => api('/auth/me'),
  registerClient: (payload) => api('/auth/register', { method: 'POST', body: payload, auth: false }),
  registerSecurity: (payload) => api('/auth/register/security', { method: 'POST', body: payload, auth: false }),

  // Codigos de registro (admin)
  listCodes: () => api('/admin/registration-codes'),
  generateClientCode: () => api('/admin/registration-codes/client', { method: 'POST' }),
  generateSecurityCode: () => api('/admin/registration-codes/security', { method: 'POST' }),

  // Usuarios (admin)
  listUsers: (page = 0, size = 50) => api(`/users?page=${page}&size=${size}`),
  createUser: (payload) => api('/users', { method: 'POST', body: payload }),
  enableUser: (id) => api(`/users/${id}/enable`, { method: 'PATCH' }),
  disableUser: (id) => api(`/users/${id}/disable`, { method: 'PATCH' }),
  deleteUser: (id) => api(`/users/${id}`, { method: 'DELETE' }),
  assignApartment: (id, apartmentId) =>
    api(`/users/${id}/apartment`, { method: 'PATCH', body: { apartmentId } }),

  // Apartamentos
  listApartments: (page = 0, size = 50) => api(`/apartments?page=${page}&size=${size}`),
  createApartment: (payload) => api('/apartments', { method: 'POST', body: payload }),
  deleteApartment: (id) => api(`/apartments/${id}`, { method: 'DELETE' })
}
