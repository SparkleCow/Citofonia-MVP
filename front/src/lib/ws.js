import { Client } from '@stomp/stompjs'

/**
 * Gestion de la conexion WebSocket (STOMP) con el backend.
 *
 * El cliente se conecta a `/ws` autenticando con el JWT en el frame CONNECT
 * y se suscribe a `/user/queue/mailbox`, la cola personal donde el backend
 * empuja los avisos de mensaje nuevo. Reconecta solo con el token actual.
 */

let client = null

function brokerUrl() {
  const base = import.meta.env.VITE_API_URL || 'http://localhost:8080'
  return `${base.replace(/^http/, 'ws')}/ws`
}

function authHeaders() {
  const token = localStorage.getItem('citofonia.token')
  return { Authorization: `Bearer ${token || ''}` }
}

export function connectMail({ onMail, onError } = {}) {
  if (client) return client

  client = new Client({
    brokerURL: brokerUrl(),
    reconnectDelay: 4000,
    heartbeatIncoming: 15000,
    heartbeatOutgoing: 15000,
    connectHeaders: authHeaders(),
    beforeConnect: () => {
      // Siempre con el token vigente (tras login o refresco).
      client.connectHeaders = authHeaders()
    },
    onConnect: () => {
      client.subscribe('/user/queue/mailbox', (frame) => {
        try {
          onMail?.(JSON.parse(frame.body))
        } catch {
          /* payload no valido: se ignora */
        }
      })
    },
    onStompError: (frame) => {
      // CONNECT rechazado (sin token o expirado): se reintenta al reconectar.
      onError?.(frame.headers?.message || 'Error del broker WebSocket')
    },
  })

  client.activate()
  return client
}

export function disconnectMail() {
  if (client) {
    const current = client
    client = null
    current.deactivate().catch(() => {})
  }
}

export function isMailConnected() {
  return Boolean(client?.connected)
}
