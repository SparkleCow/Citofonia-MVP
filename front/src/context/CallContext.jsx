import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ensureRealtimeConnection, sendRealtime, subscribeRealtime } from '../lib/ws'
import { useAuth } from './auth-context'
import { CallContext } from './call-context'

/** Servidores ICE: STUN publico suficiente para P2P en la misma red/LAN. */
const ICE_SERVERS = [{ urls: 'stun:stun.l.google.com:19302' }]

function displayName(person) {
  if (!person) return ''
  const name = `${person.firstName || ''} ${person.lastName || ''}`.trim()
  return name || person.email || ''
}

function micError(error) {
  if (error?.name === 'NotAllowedError' || error?.name === 'SecurityError') {
    return 'Permiso de microfono denegado: activalo en el navegador para poder llamar.'
  }
  if (error?.name === 'NotFoundError') {
    return 'No se ha encontrado ningun microfono en este dispositivo.'
  }
  return error?.message || 'No se pudo preparar el audio de la llamada.'
}

/**
 * Llamadas de audio (WebRTC) entre conserjeria y residentes.
 *
 * El backend actua de centralita: la invitacion, la aceptacion y el
 * intercambio SDP/ICE viajan por STOMP (`/app/call.*` y
 * `/user/queue/calls`); el audio va directo entre navegadores.
 */
export function CallProvider({ children }) {
  const { isAuthenticated } = useAuth()
  const [call, setCall] = useState(null)
  const [remoteStream, setRemoteStream] = useState(null)
  const [error, setError] = useState(null)

  const pcRef = useRef(null)
  const localStreamRef = useRef(null)
  const pendingIceRef = useRef([])
  const callRef = useRef(null)

  useEffect(() => {
    callRef.current = call
  }, [call])

  const cleanup = useCallback(() => {
    const pc = pcRef.current
    if (pc) {
      pc.onicecandidate = null
      pc.ontrack = null
      try {
        pc.close()
      } catch {
        /* ya cerrada */
      }
    }
    pcRef.current = null
    localStreamRef.current?.getTracks().forEach((track) => track.stop())
    localStreamRef.current = null
    pendingIceRef.current = []
    setRemoteStream(null)
    setCall(null)
  }, [])

  const trySend = useCallback((destination, body) => {
    try {
      sendRealtime(destination, body)
    } catch {
      /* sin conexion: la llamada caducara sola */
    }
  }, [])

  const prepareMedia = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
    localStreamRef.current = stream
    return stream
  }, [])

  const createPeer = useCallback((callId) => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        trySend('/app/call.signal', {
          callId,
          kind: 'ice',
          payload: event.candidate.toJSON(),
        })
      }
    }
    pc.ontrack = (event) => {
      setRemoteStream(event.streams[0])
      setCall((prev) => (prev ? { ...prev, phase: 'active' } : prev))
    }
    pcRef.current = pc
    return pc
  }, [trySend])

  const flushPendingIce = useCallback(async (pc) => {
    const pending = pendingIceRef.current
    pendingIceRef.current = []
    for (const candidate of pending) {
      try {
        await pc.addIceCandidate(candidate)
      } catch {
        /* candidato no aplicable */
      }
    }
  }, [])

  /** Arranca una llamada saliente (directa a un residente, a una vivienda o a porteria). */
  const beginCall = useCallback(async ({ peerEmail, peerName, peerApartment, portal = false, apartment = false, alert = false, destination, body }) => {
    if (callRef.current) return
    setError(null)
    const callId = crypto.randomUUID()
    try {
      const stream = await prepareMedia()
      const pc = createPeer(callId)
      stream.getTracks().forEach((track) => pc.addTrack(track, stream))
      setCall({
        callId,
        direction: 'outgoing',
        peerEmail,
        peerName,
        peerApartment,
        portal,
        apartment,
        alert,
        phase: 'ringing',
        muted: false,
      })
      sendRealtime(destination, { callId, ...body })
    } catch (err) {
      cleanup()
      setError(micError(err))
    }
  }, [cleanup, createPeer, prepareMedia])

  /**
   * Consergeria llama a un residente.
   * @param {object} resident datos del residente (email, nombre, vivienda)
   * @param {object} options motivo de la llamada: visitId o correspondenceId
   */
  const startCall = useCallback((resident, options = {}) => beginCall({
    peerEmail: resident.email,
    peerName: displayName(resident),
    peerApartment: resident.apartmentIdentifier || null,
    destination: '/app/call.invite',
    body: {
      targetEmail: resident.email,
      visitId: options.visitId ?? null,
      correspondenceId: options.correspondenceId ?? null,
    },
  }), [beginCall])

  /**
   * Consergeria llama a una vivienda entera: timbra a la vez a todos los
   * residentes que residen en ella y el primero que contesta atiende.
   * @param {number} apartmentId vivienda a la que se llama
   * @param {string} apartmentIdentifier identificador visible de la vivienda
   * @param {object} options motivo de la llamada: visitId o correspondenceId
   */
  const startApartmentCall = useCallback((apartmentId, apartmentIdentifier, options = {}) => beginCall({
    peerEmail: null,
    peerName: `Apartamento ${apartmentIdentifier || ''}`.trim(),
    peerApartment: apartmentIdentifier || null,
    apartment: true,
    destination: '/app/call.apartment',
    body: {
      apartmentId,
      visitId: options.visitId ?? null,
      correspondenceId: options.correspondenceId ?? null,
    },
  }), [beginCall])

  /** El residente llama a porteria: timbra a toda la conserjeria conectada. */
  const startPortalCall = useCallback(() => beginCall({
    peerEmail: null,
    peerName: 'Porteria',
    peerApartment: null,
    portal: true,
    destination: '/app/call.portal',
    body: {},
  }), [beginCall])

  /**
   * Alerta general del edificio (boton de panico): avisa a TODOS los residentes
   * a la vez. El backend exige el codigo de autorizacion; el primero que
   * acepta la alerta atiende la llamada.
   * @param {string} code codigo de autorizacion de la alerta
   */
  const startPanicAlert = useCallback((code) => beginCall({
    peerEmail: null,
    peerName: 'Todos los residentes',
    peerApartment: null,
    alert: true,
    destination: '/app/call.panic',
    body: { code },
  }), [beginCall])

  /** El residente acepta la llamada entrante. */
  const acceptCall = useCallback(async () => {
    const current = callRef.current
    if (!current || current.direction !== 'incoming') return
    setError(null)
    try {
      const stream = await prepareMedia()
      const pc = createPeer(current.callId)
      stream.getTracks().forEach((track) => pc.addTrack(track, stream))
      setCall((prev) => ({ ...prev, phase: 'connecting' }))
      sendRealtime('/app/call.accept', { callId: current.callId })
    } catch (err) {
      trySend('/app/call.reject', { callId: current.callId })
      cleanup()
      setError(micError(err))
    }
  }, [cleanup, createPeer, prepareMedia, trySend])

  /** El residente rechaza la llamada entrante. */
  const rejectCall = useCallback(() => {
    const current = callRef.current
    if (current) trySend('/app/call.reject', { callId: current.callId })
    cleanup()
  }, [cleanup, trySend])

  /** Cuelga o cancela una llamada en curso. */
  const hangup = useCallback(() => {
    const current = callRef.current
    if (current) trySend('/app/call.end', { callId: current.callId })
    cleanup()
  }, [cleanup, trySend])

  const toggleMute = useCallback(() => {
    const stream = localStreamRef.current
    if (!stream) return
    const nextMuted = !callRef.current?.muted
    stream.getAudioTracks().forEach((track) => {
      track.enabled = !nextMuted
    })
    setCall((prev) => (prev ? { ...prev, muted: nextMuted } : prev))
  }, [])

  const clearError = useCallback(() => setError(null), [])

  /** Unica via de entrada de la senalizacion: eventos de la cola de calls. */
  const handleEnvelope = useCallback(async (envelope) => {
    switch (envelope.type) {
      case 'INVITE': {
        if (callRef.current) {
          trySend('/app/call.reject', { callId: envelope.callId })
          return
        }
        setError(null)
        setCall({
          callId: envelope.callId,
          direction: 'incoming',
          peerEmail: envelope.from,
          peerName: envelope.fromName || envelope.from,
          peerApartment: envelope.fromApartment || null,
          phase: 'ringing',
          muted: false,
        })
        return
      }
      case 'ALERT': {
        if (callRef.current) {
          trySend('/app/call.reject', { callId: envelope.callId })
          return
        }
        setError(null)
        setCall({
          callId: envelope.callId,
          direction: 'incoming',
          peerEmail: envelope.from,
          peerName: envelope.fromName || envelope.from,
          peerApartment: envelope.fromApartment || null,
          alert: true,
          phase: 'ringing',
          muted: false,
        })
        return
      }
      case 'ACCEPT': {
        const current = callRef.current
        const pc = pcRef.current
        if (!current || !pc || current.callId !== envelope.callId) return
        setCall((prev) => (prev ? { ...prev, phase: 'connecting' } : prev))
        const offer = await pc.createOffer({ offerToReceiveAudio: true })
        await pc.setLocalDescription(offer)
        sendRealtime('/app/call.signal', {
          callId: current.callId,
          kind: 'offer',
          payload: { type: offer.type, sdp: offer.sdp },
        })
        return
      }
      case 'REJECT': {
        cleanup()
        setError('La llamada ha sido rechazada.')
        return
      }
      case 'SIGNAL': {
        const current = callRef.current
        const pc = pcRef.current
        if (!current || !pc || current.callId !== envelope.callId) return
        try {
          if (envelope.kind === 'ice') {
            if (pc.remoteDescription) await pc.addIceCandidate(envelope.payload)
            else pendingIceRef.current.push(envelope.payload)
          } else if (envelope.kind === 'offer') {
            await pc.setRemoteDescription(envelope.payload)
            await flushPendingIce(pc)
            const answer = await pc.createAnswer()
            await pc.setLocalDescription(answer)
            sendRealtime('/app/call.signal', {
              callId: current.callId,
              kind: 'answer',
              payload: { type: answer.type, sdp: answer.sdp },
            })
          } else if (envelope.kind === 'answer') {
            await pc.setRemoteDescription(envelope.payload)
            await flushPendingIce(pc)
          }
        } catch (err) {
          setError(err.message || 'Fallo al negociar el audio de la llamada.')
        }
        return
      }
      case 'END': {
        if (callRef.current) {
          cleanup()
          setError(envelope.message || 'La llamada ha finalizado.')
        }
        return
      }
      case 'ERROR': {
        setError(envelope.message || 'No se pudo gestionar la llamada.')
        if (callRef.current?.phase === 'ringing') cleanup()
        return
      }
      default:
    }
  }, [cleanup, flushPendingIce, trySend])

  useEffect(() => {
    if (!isAuthenticated) return undefined
    ensureRealtimeConnection()
    return subscribeRealtime('calls', (envelope) => {
      handleEnvelope(envelope)
    })
  }, [isAuthenticated, handleEnvelope])

  // Cierre defensivo: si el usuario cuelga la pestana con una llamada abierta.
  useEffect(() => () => cleanup(), [cleanup])

  const value = useMemo(
    () => ({
      call,
      remoteStream,
      error,
      busy: Boolean(call),
      startCall,
      startApartmentCall,
      startPortalCall,
      startPanicAlert,
      acceptCall,
      rejectCall,
      hangup,
      toggleMute,
      clearError,
    }),
    [
      call,
      remoteStream,
      error,
      startCall,
      startApartmentCall,
      startPortalCall,
      startPanicAlert,
      acceptCall,
      rejectCall,
      hangup,
      toggleMute,
      clearError,
    ],
  )

  return <CallContext.Provider value={value}>{children}</CallContext.Provider>
}
