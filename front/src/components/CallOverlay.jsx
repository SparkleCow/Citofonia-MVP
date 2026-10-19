import { useEffect, useRef } from 'react'
import { useCall } from '../context/call-context'
import { PhoneIcon } from './icons'

/** Timbrado del navegador mientras suena una llamada (WebAudio). */
function useRingtone(active) {
  useEffect(() => {
    if (!active) return undefined
    let context
    let interval
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext
      if (!AudioContextClass) return undefined
      context = new AudioContextClass()
      const beep = () => {
        const oscillator = context.createOscillator()
        const gain = context.createGain()
        oscillator.frequency.value = 880
        oscillator.connect(gain)
        gain.connect(context.destination)
        gain.gain.setValueAtTime(0.0001, context.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.12, context.currentTime + 0.05)
        gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.5)
        oscillator.start()
        oscillator.stop(context.currentTime + 0.55)
      }
      context.resume?.().catch(() => {})
      beep()
      interval = setInterval(beep, 1600)
    } catch {
      /* sin audio disponible */
    }
    return () => {
      if (interval) clearInterval(interval)
      try {
        context?.close?.()
      } catch {
        /* ya cerrado */
      }
    }
  }, [active])
}

const STATUS_LABELS = {
  incoming: 'Llamada entrante',
  outgoing: 'Llamando',
  connecting: 'Conectando',
  active: 'En llamada',
}

export default function CallOverlay() {
  const { call, remoteStream, error, acceptCall, rejectCall, hangup, toggleMute, clearError } = useCall()
  const audioRef = useRef(null)

  useRingtone(call?.phase === 'ringing')

  useEffect(() => {
    const element = audioRef.current
    if (element && remoteStream) {
      element.srcObject = remoteStream
      element.play().catch(() => {})
    }
  }, [remoteStream])

  if (!call) {
    return error ? (
      <div className="call-overlay">
        <div className="call-card">
          <p className="call-status">Llamada</p>
          <p className="call-peer">{error}</p>
          <button type="button" className="btn btn-ghost" onClick={clearError}>
            Cerrar
          </button>
        </div>
      </div>
    ) : null
  }

  const incoming = call.direction === 'incoming'
  const ringing = call.phase === 'ringing'
  const active = call.phase === 'active'
  const initial = (call.peerName || '?').charAt(0).toUpperCase()

  return (
    <div className="call-overlay" role="dialog" aria-modal="true">
      <div className={`call-card ${incoming && ringing ? 'call-card-incoming' : ''}`}>
        <span className="call-avatar" aria-hidden="true">
          {initial}
        </span>
        <p className="call-status">
          {incoming ? (ringing ? STATUS_LABELS.incoming : STATUS_LABELS.connecting) : null}
          {!incoming && ringing ? STATUS_LABELS.outgoing : null}
          {!incoming && call.phase === 'connecting' ? STATUS_LABELS.connecting : null}
          {active ? STATUS_LABELS.active : null}
        </p>
        <p className="call-peer">{call.peerName}</p>
        {call.peerApartment && <p className="call-peer-meta">Vivienda {call.peerApartment}</p>}
        {!incoming && ringing && (
          <p className="call-peer-meta">
            {call.portal ? 'Esperando respuesta de porteria...' : 'Esperando respuesta del residente...'}
          </p>
        )}
        {error && <p className="call-error">{error}</p>}

        <audio ref={audioRef} autoPlay playsInline />

        <div className="call-actions">
          {incoming && ringing ? (
            <>
              <button type="button" className="btn btn-success" onClick={acceptCall}>
                <PhoneIcon />
                Aceptar
              </button>
              <button type="button" className="btn btn-danger" onClick={rejectCall}>
                Rechazar
              </button>
            </>
          ) : (
            <>
              {active && (
                <button type="button" className="btn btn-ghost" onClick={toggleMute}>
                  {call.muted ? 'Activar micro' : 'Silenciar'}
                </button>
              )}
              <button type="button" className="btn btn-danger" onClick={hangup}>
                {active ? 'Colgar' : 'Cancelar'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
