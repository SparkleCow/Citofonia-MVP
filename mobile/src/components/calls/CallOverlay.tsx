import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { CallState } from '@/context/CallContext';

const ENDED_VISIBLE_MS = 2_000;

function formatElapsed(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const minutes = String(Math.floor(total / 60)).padStart(2, '0');
  const seconds = String(total % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

type RoundButtonProps = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  onPress: () => void;
};

function RoundButton({ label, icon, color, onPress }: RoundButtonProps) {
  // Círculo y texto forman un único objetivo táctil (tocar la etiqueta también funciona).
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      className="items-center gap-2 active:opacity-80"
    >
      <View className={`h-20 w-20 items-center justify-center rounded-full ${color}`}>
        <Ionicons name={icon} size={34} color="#ffffff" />
      </View>
      <Text className="text-sm font-bold text-white">{label}</Text>
    </Pressable>
  );
}

/** Pantalla de llamada a pantalla completa (saliente, entrante, en curso y finalizada). */
type CallOverlayProps = {
  call: CallState;
  audioAvailable: boolean;
  muted: boolean;
  onToggleMute: () => void;
  onAnswer: () => void;
  onReject: () => void;
  onHangUp: () => void;
  onDismiss: () => void;
};

export function CallOverlay({
  call,
  audioAvailable,
  muted,
  onToggleMute,
  onAnswer: answer,
  onReject: reject,
  onHangUp,
  onDismiss: dismiss,
}: CallOverlayProps) {
  const hangUp = () => onHangUp();
  const insets = useSafeAreaInsets();
  const [now, setNow] = useState(() => Date.now());
  const visible = call.phase !== 'idle';

  // Cronómetro de la llamada en curso.
  useEffect(() => {
    if (call.phase !== 'connected') return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [call.phase]);

  // La pantalla de "finalizada" se cierra sola.
  useEffect(() => {
    if (call.phase !== 'ended') return;
    const id = setTimeout(dismiss, ENDED_VISIBLE_MS);
    return () => clearTimeout(id);
  }, [call.phase, dismiss]);

  const status =
    call.phase === 'calling'
      ? 'Llamando…'
      : call.phase === 'incoming'
        ? call.alert
          ? 'Alerta general del edificio'
          : 'Llamada entrante'
        : call.phase === 'connected'
          ? formatElapsed(now - (call.connectedAt ?? now))
          : (call.message ?? 'Llamada finalizada');

  return (
    <Modal visible={visible} animationType="fade" transparent={false} statusBarTranslucent onRequestClose={() => hangUp()}>
      <View
        className={`flex-1 items-center justify-between px-6 ${call.alert ? 'bg-rose-900' : 'bg-ink-950'}`}
        style={{ paddingTop: insets.top + 48, paddingBottom: insets.bottom + 40 }}
      >
        <View className="items-center">
          {call.simulated ? (
            <View className="mb-6 rounded-full bg-amber-400 px-4 py-1.5">
              <Text className="text-xs font-extrabold uppercase tracking-wider text-ink-950">
                Modo simulación · no se contactó al residente
              </Text>
            </View>
          ) : null}
          <View className="h-28 w-28 items-center justify-center rounded-full bg-brand-700">
            <Ionicons name={call.alert ? 'warning' : 'person'} size={54} color="#ffffff" />
          </View>
          <Text className="mt-6 text-center text-3xl font-extrabold text-white" numberOfLines={2}>
            {call.peerName}
          </Text>
          {call.peerApartment ? (
            <Text className="mt-1 text-lg font-semibold text-brand-100">Apto. {call.peerApartment}</Text>
          ) : null}
          <Text className="mt-4 text-xl font-bold text-white/90">{status}</Text>
          {call.phase === 'connected' && call.message ? (
            <Text className="mt-3 max-w-[300px] text-center text-sm text-amber-200">{call.message}</Text>
          ) : null}
          {call.phase === 'connected' && !audioAvailable && !call.simulated ? (
            <Text className="mt-3 max-w-[300px] text-center text-sm text-ink-200">
              Este dispositivo no puede transmitir audio (Expo Go no incluye WebRTC: usa un development build).
              La llamada quedó registrada y la otra parte fue avisada.
            </Text>
          ) : null}
        </View>

        <View className="flex-row items-center justify-center gap-14">
          {call.phase === 'incoming' ? (
            <>
              <RoundButton label="Rechazar" icon="call" color="bg-rose-600" onPress={reject} />
              <RoundButton label="Contestar" icon="call" color="bg-emerald-600" onPress={answer} />
            </>
          ) : call.phase === 'ended' ? (
            <RoundButton label="Cerrar" icon="close" color="bg-ink-600" onPress={dismiss} />
          ) : (
            <>
              {call.phase === 'connected' && audioAvailable && !call.simulated ? (
                <RoundButton
                  label={muted ? 'Activar mic.' : 'Silenciar'}
                  icon={muted ? 'mic-off' : 'mic'}
                  color={muted ? 'bg-amber-600' : 'bg-ink-600'}
                  onPress={onToggleMute}
                />
              ) : null}
              <RoundButton label="Colgar" icon="call" color="bg-rose-600" onPress={() => hangUp()} />
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}
