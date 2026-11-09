import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { CallOverlay } from '@/components/calls/CallOverlay';
import { CALL_SIMULATION } from '@/config/env';
import { createCallMedia, isCallAudioAvailable, type CallMedia } from '@/realtime/callMedia';
import { CALLS_DESTINATION, stomp } from '@/realtime/stomp';
import type { CallEnvelope } from '@/types';

export type CallPhase = 'idle' | 'calling' | 'incoming' | 'connected' | 'ended';

/** Contexto opcional: el backend marca la visita/paquete como avisado por llamada. */
type CallReason = { visitId?: number | null; correspondenceId?: number | null };

export type CallTarget =
  | ({ kind: 'user'; email: string; name: string; apartment?: string | null } & CallReason)
  | ({ kind: 'apartment'; apartmentId: number; name: string; apartment: string } & CallReason);

export type CallState = {
  phase: CallPhase;
  direction: 'outgoing' | 'incoming';
  callId: string | null;
  peerName: string;
  peerApartment: string | null;
  /** Alerta general del edificio (botón de pánico). */
  alert: boolean;
  /** true si no se contactó al servidor: solo se ensaya la interfaz. */
  simulated: boolean;
  connectedAt: number | null;
  message: string | null;
};

const IDLE: CallState = {
  phase: 'idle',
  direction: 'outgoing',
  callId: null,
  peerName: '',
  peerApartment: null,
  alert: false,
  simulated: false,
  connectedAt: null,
  message: null,
};

const NO_ANSWER_MS = 45_000;
const SIMULATED_RING_MS = 2_500;

type CallContextValue = {
  call: CallState;
  /** Hay una llamada en curso (no se puede iniciar otra). */
  busy: boolean;
  /** Este dispositivo puede transmitir audio (WebRTC disponible). */
  audioAvailable: boolean;
  muted: boolean;
  toggleMute: () => void;
  startCall: (target: CallTarget) => void;
  answer: () => void;
  reject: () => void;
  hangUp: (message?: string) => void;
  dismiss: () => void;
};

const CallContext = createContext<CallContextValue | undefined>(undefined);

const newCallId = () =>
  `call-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

/**
 * Citofonía del cliente. Señalización real por STOMP (`/app/call.*` y
 * `/user/queue/calls`). Si no hay conexión, o `EXPO_PUBLIC_CALL_SIMULATION=1`,
 * la llamada se simula localmente y la interfaz lo indica. El audio queda
 * detrás de `callMedia` hasta contar con HTTPS y TURN.
 */
export function CallProvider({ children }: { children: React.ReactNode }) {
  const [call, setCallState] = useState<CallState>(IDLE);
  const [muted, setMuted] = useState(false);
  const callRef = useRef<CallState>(IDLE);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const media = useRef<CallMedia>(createCallMedia());
  const audioAvailable = useMemo(() => isCallAudioAvailable(), []);

  const setCall = useCallback((next: CallState) => {
    callRef.current = next;
    setCallState(next);
  }, []);

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  const finish = useCallback(
    (message: string | null) => {
      clearTimers();
      media.current.stop();
      setMuted(false);
      const current = callRef.current;
      setCall({ ...current, phase: 'ended', connectedAt: null, message });
    },
    [clearTimers, setCall],
  );

  const send = useCallback((destination: string, body: unknown): boolean => {
    try {
      stomp.publish(destination, body);
      return true;
    } catch {
      return false;
    }
  }, []);

  const sendSignal = useCallback(
    (kind: string, payload: unknown) => {
      const id = callRef.current.callId;
      if (id) send('/app/call.signal', { callId: id, kind, payload });
    },
    [send],
  );

  const connect = useCallback(
    (role: 'caller' | 'callee') => {
      setCall({ ...callRef.current, phase: 'connected', connectedAt: Date.now(), message: null });
      if (callRef.current.simulated) return;
      // Sesión de audio nueva por llamada.
      media.current.stop();
      media.current = createCallMedia();
      media.current.start(role, sendSignal).catch(() => {
        setCall({ ...callRef.current, message: 'Sin acceso al micrófono: la llamada sigue sin audio.' });
      });
    },
    [sendSignal, setCall],
  );

  const toggleMute = useCallback(() => {
    setMuted((current) => {
      media.current.setMuted(!current);
      return !current;
    });
  }, []);

  const hangUp = useCallback(
    (message?: string) => {
      const current = callRef.current;
      if (current.phase === 'idle' || current.phase === 'ended') return;
      if (current.callId && !current.simulated) send('/app/call.end', { callId: current.callId });
      finish(message ?? 'Llamada finalizada');
    },
    [finish, send],
  );

  const startCall = useCallback(
    (target: CallTarget) => {
      const phase = callRef.current.phase;
      if (phase !== 'idle' && phase !== 'ended') return;
      clearTimers();

      const callId = newCallId();
      const simulated = CALL_SIMULATION || !stomp.isConnected();
      setCall({
        phase: 'calling',
        direction: 'outgoing',
        callId,
        peerName: target.name,
        peerApartment: target.apartment ?? null,
        alert: false,
        simulated,
        connectedAt: null,
        message: null,
      });

      if (simulated) {
        timers.current.push(setTimeout(() => connect('caller'), SIMULATED_RING_MS));
        return;
      }

      const sent =
        target.kind === 'user'
          ? send('/app/call.invite', {
              callId,
              targetEmail: target.email,
              visitId: target.visitId ?? null,
              correspondenceId: target.correspondenceId ?? null,
            })
          : send('/app/call.apartment', {
              callId,
              apartmentId: target.apartmentId,
              visitId: target.visitId ?? null,
              correspondenceId: target.correspondenceId ?? null,
            });

      if (!sent) {
        finish('No se pudo enviar la llamada. Revisa la conexión.');
        return;
      }
      timers.current.push(setTimeout(() => hangUp('Sin respuesta'), NO_ANSWER_MS));
    },
    [clearTimers, connect, finish, hangUp, send, setCall],
  );

  const answer = useCallback(() => {
    const current = callRef.current;
    if (current.phase !== 'incoming' || !current.callId) return;
    if (!send('/app/call.accept', { callId: current.callId })) {
      finish('No se pudo atender la llamada. Revisa la conexión.');
      return;
    }
    connect('callee');
  }, [connect, finish, send]);

  const reject = useCallback(() => {
    const current = callRef.current;
    if (current.phase !== 'incoming') return;
    if (current.callId) send('/app/call.reject', { callId: current.callId });
    clearTimers();
    setCall(IDLE);
  }, [clearTimers, send, setCall]);

  const dismiss = useCallback(() => {
    clearTimers();
    setCall(IDLE);
  }, [clearTimers, setCall]);

  const onEnvelope = useCallback(
    (envelope: CallEnvelope) => {
      const current = callRef.current;
      switch (envelope.type) {
        case 'INVITE':
        case 'ALERT':
          if (current.phase !== 'idle' && current.phase !== 'ended') return;
          clearTimers();
          setCall({
            phase: 'incoming',
            direction: 'incoming',
            callId: envelope.callId,
            peerName: envelope.fromName || envelope.from || 'Llamada entrante',
            peerApartment: envelope.fromApartment,
            alert: envelope.type === 'ALERT',
            simulated: false,
            connectedAt: null,
            message: envelope.message,
          });
          break;
        case 'ACCEPT':
          if (envelope.callId === current.callId && current.phase === 'calling') {
            clearTimers();
            connect('caller');
          }
          break;
        case 'REJECT':
          if (envelope.callId === current.callId && current.phase === 'calling') {
            finish('Llamada rechazada');
          }
          break;
        case 'END':
          if (envelope.callId === current.callId && current.phase !== 'idle') {
            finish(envelope.message ?? 'La llamada finalizó');
          }
          break;
        case 'SIGNAL':
          if (envelope.callId === current.callId && envelope.kind) {
            void media.current.handleSignal(envelope.kind, envelope.payload).catch(() => undefined);
          }
          break;
        case 'ERROR':
          if (current.phase === 'calling') finish(envelope.message ?? 'No se pudo realizar la llamada');
          break;
      }
    },
    [clearTimers, connect, finish, setCall],
  );

  useEffect(() => {
    stomp.acquire();
    const off = stomp.subscribe<CallEnvelope>(CALLS_DESTINATION, onEnvelope);
    return () => {
      off();
      clearTimers();
      void stomp.release();
    };
  }, [onEnvelope, clearTimers]);

  const value = useMemo<CallContextValue>(
    () => ({
      call,
      busy: call.phase !== 'idle' && call.phase !== 'ended',
      audioAvailable,
      muted,
      toggleMute,
      startCall,
      answer,
      reject,
      hangUp,
      dismiss,
    }),
    [call, audioAvailable, muted, toggleMute, startCall, answer, reject, hangUp, dismiss],
  );

  return (
    <CallContext.Provider value={value}>
      {children}
      <CallOverlay
        call={call}
        audioAvailable={audioAvailable}
        muted={muted}
        onToggleMute={toggleMute}
        onAnswer={answer}
        onReject={reject}
        onHangUp={() => hangUp()}
        onDismiss={dismiss}
      />
    </CallContext.Provider>
  );
}

export function useCall() {
  const context = useContext(CallContext);
  if (!context) throw new Error('useCall debe usarse dentro de CallProvider');
  return context;
}
