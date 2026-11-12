import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Vibration } from 'react-native';
import { emergenciesApi } from '@/api/emergencies';
import { EmergencyOverlay } from '@/components/emergency/EmergencyOverlay';
import { useAuth } from '@/context/AuthContext';
import {
  ensureNotificationPermission,
  notifyEmergencyLocally,
  registerPushToken,
  setupNotifications,
} from '@/realtime/notifications';
import { stomp } from '@/realtime/stomp';
import type { EmergencyBroadcast, EmergencyResponse } from '@/types';

const EMERGENCY_TOPIC = '/topic/emergencies';
/** Vibración continua hasta que el usuario confirme (Android repite; iOS vibra una vez). */
const VIBRATION_PATTERN = [0, 800, 400, 800, 400];

type EmergencyContextValue = {
  active: EmergencyResponse[];
  /** Activa la alerta general; el código se valida en el servidor. */
  trigger: (code: string, message?: string) => Promise<EmergencyResponse>;
  resolve: (id: number, notes?: string) => Promise<EmergencyResponse>;
  /** Abre el aviso a pantalla completa de la alerta más reciente. */
  showAlert: () => void;
  canResolve: boolean;
  /** Solo portería/conserjería y administración pueden emitir la alerta masiva. */
  canTrigger: boolean;
};

const EmergencyContext = createContext<EmergencyContextValue | undefined>(undefined);

/**
 * Emergencias en tiempo real para cualquier rol: escucha `/topic/emergencies`,
 * recupera las activas al conectar y avisa con pantalla roja, vibración y notificación local.
 */
export function EmergencyProvider({ children }: { children: React.ReactNode }) {
  const { user, hasRole } = useAuth();
  const [active, setActive] = useState<EmergencyResponse[]>([]);
  const [visibleId, setVisibleId] = useState<number | null>(null);
  const seen = useRef(new Set<number>());

  const startAlarm = useCallback((emergency: EmergencyResponse) => {
    // Quien la activa ya lo sabe: no se le alarma a sí mismo.
    if (emergency.triggeredByEmail === user?.email) return;
    Vibration.vibrate(VIBRATION_PATTERN, true);
    void notifyEmergencyLocally(
      'EMERGENCIA en el edificio',
      emergency.message || `Alerta activada por ${emergency.triggeredByName}`,
    );
  }, [user?.email]);

  const applyActive = useCallback(
    (list: EmergencyResponse[]) => {
      setActive(list);
      const fresh = list.find((e) => !seen.current.has(e.id));
      list.forEach((e) => seen.current.add(e.id));
      if (fresh) {
        setVisibleId(fresh.id);
        startAlarm(fresh);
      }
    },
    [startAlarm],
  );

  /** Alertas activas al conectar/reconectar (sin red se mantiene el último estado). */
  const refresh = useCallback(
    () => emergenciesApi.active().then(applyActive).catch(() => undefined),
    [applyActive],
  );

  useEffect(() => {
    void setupNotifications();
    void ensureNotificationPermission().then((granted) => {
      if (granted) void registerPushToken();
    });

    stomp.acquire();
    const offConnect = stomp.onConnect(() => void refresh());
    const off = stomp.subscribe<EmergencyBroadcast>(EMERGENCY_TOPIC, ({ type, emergency }) => {
      if (type === 'TRIGGERED') {
        seen.current.add(emergency.id);
        setActive((current) => [emergency, ...current.filter((e) => e.id !== emergency.id)]);
        setVisibleId(emergency.id);
        startAlarm(emergency);
      } else {
        setActive((current) => current.filter((e) => e.id !== emergency.id));
        setVisibleId((current) => (current === emergency.id ? null : current));
      }
    });
    void refresh();

    return () => {
      Vibration.cancel();
      off();
      offConnect();
      void stomp.release();
    };
  }, [refresh, startAlarm]);

  // Sin alertas activas no debe seguir vibrando.
  useEffect(() => {
    if (active.length === 0) Vibration.cancel();
  }, [active.length]);

  const canTrigger = hasRole('ADMIN', 'CONCIERGE');

  const trigger = useCallback(async (code: string, message?: string) => {
    if (!canTrigger) throw new Error('Tu rol no puede activar la alerta general.');
    const created = await emergenciesApi.trigger(code, message);
    seen.current.add(created.id);
    setActive((current) => [created, ...current.filter((e) => e.id !== created.id)]);
    return created;
  }, [canTrigger]);

  const resolve = useCallback(async (id: number, notes?: string) => {
    const resolved = await emergenciesApi.resolve(id, notes);
    setActive((current) => current.filter((e) => e.id !== id));
    setVisibleId((current) => (current === id ? null : current));
    return resolved;
  }, []);

  const acknowledge = useCallback(() => {
    Vibration.cancel();
    setVisibleId(null);
  }, []);

  const showAlert = useCallback(() => {
    if (active[0]) setVisibleId(active[0].id);
  }, [active]);

  const canResolve = canTrigger;
  const visible = active.find((e) => e.id === visibleId) ?? null;

  const value = useMemo<EmergencyContextValue>(
    () => ({ active, trigger, resolve, showAlert, canResolve, canTrigger }),
    [active, trigger, resolve, showAlert, canResolve, canTrigger],
  );

  return (
    <EmergencyContext.Provider value={value}>
      {children}
      <EmergencyOverlay
        emergency={visible}
        ownAlert={visible?.triggeredByEmail === user?.email}
        canResolve={canResolve}
        onAcknowledge={acknowledge}
        onResolve={resolve}
      />
    </EmergencyContext.Provider>
  );
}

export function useEmergency() {
  const context = useContext(EmergencyContext);
  if (!context) throw new Error('useEmergency debe usarse dentro de EmergencyProvider');
  return context;
}
