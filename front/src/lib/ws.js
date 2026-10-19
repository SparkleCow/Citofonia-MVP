import { Client } from '@stomp/stompjs'

/**
 * Hub de la conexion WebSocket (STOMP) con el backend.
 *
 * Una unica conexion a `/ws` (autenticada con el JWT en el frame CONNECT)
 * sirve a todos los canales de la aplicacion: el buzon (`mailbox`) y las
 * llamadas (`calls`). Cada modulo se suscribe a su topico con
 * `subscribeRealtime` sin preocuparse por la reconexion: al conectar (o
 * reconectar) el hub vuelve a registrar todas las suscripciones activas.
 */

const DESTINATIONS = {
  mailbox: '/user/queue/mailbox',
  calls: '/user/queue/calls',
}

const DESTINATIONS_BY_TOPIC = { ...DESTINATIONS }

let client = null

/** Oyentes por topico: se avisa a todos cuando llega un mensaje. */
const listeners = new Map()

/** Suscripciones STOMP activas por topico (se rehacen al reconectar). */
const subscriptions = new Map()

function brokerUrl() {
  const base = import.meta.env.VITE_API_URL || 'http://localhost:8080'
  return `${base.replace(/^http/, 'ws')}/ws`
}

function authHeaders() {
  const token = localStorage.getItem('citofonia.token')
  return { Authorization: `Bearer ${token || ''}` }
}

function ensureSubscribed(topic) {
  if (!client?.connected || subscriptions.has(topic)) return
  const destination = DESTINATIONS_BY_TOPIC[topic]
  subscriptions.set(
    topic,
    client.subscribe(destination, (frame) => {
      let payload
      try {
        payload = JSON.parse(frame.body)
      } catch {
        return
      }
      listeners.get(topic)?.forEach((listener) => listener(payload))
    }),
  )
}

/** Abre la conexion si no esta abierta todavia (idempotente). */
export function ensureRealtimeConnection() {
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
      subscriptions.clear()
      Object.keys(DESTINATIONS_BY_TOPIC).forEach(ensureSubscribed)
    },
    onWebSocketClose: () => {
      // Las suscripciones mueren con la conexion: se rehacen en onConnect.
      subscriptions.clear()
    },
    onStompError: (frame) => {
      // CONNECT rechazado (sin token o expirado): se reintenta al reconectar.
      console.warn('STOMP error:', frame.headers?.message || 'broker')
    },
  })

  client.activate()
  return client
}

/**
 * Suscribe un oyente a un topico del usuario (`mailbox` o `calls`).
 * Devuelve la funcion para darse de baja.
 */
export function subscribeRealtime(topic, listener) {
  if (!DESTINATIONS_BY_TOPIC[topic]) {
    throw new Error(`Topico WebSocket desconocido: ${topic}`)
  }
  if (!listeners.has(topic)) listeners.set(topic, new Set())
  listeners.get(topic).add(listener)
  ensureSubscribed(topic)
  return () => {
    listeners.get(topic)?.delete(listener)
  }
}

/** Publica en un destino de aplicacion (`/app/...`). */
export function sendRealtime(destination, body) {
  if (!client?.connected) throw new Error('Sin conexion con el servidor')
  client.publish({ destination, body: JSON.stringify(body) })
}

export function isRealtimeConnected() {
  return Boolean(client?.connected)
}

/** Cierra la conexion y olvida las suscripciones (cierre de sesion). */
export function closeRealtime() {
  if (!client) return
  const current = client
  client = null
  subscriptions.clear()
  current.deactivate().catch(() => {})
}

export { DESTINATIONS }
