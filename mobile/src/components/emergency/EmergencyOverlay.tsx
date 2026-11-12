import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getApiErrorMessage } from '@/api/axios';
import { formatDateTime } from '@/lib/format';
import type { EmergencyResponse } from '@/types';

type EmergencyOverlayProps = {
  emergency: EmergencyResponse | null;
  /** La activó este mismo usuario. */
  ownAlert: boolean;
  canResolve: boolean;
  onAcknowledge: () => void;
  onResolve: (id: number, notes?: string) => Promise<unknown>;
};

/** Aviso de emergencia a pantalla completa (único uso del rojo como fondo en la app). */
export function EmergencyOverlay({ emergency, ownAlert, canResolve, onAcknowledge, onResolve }: EmergencyOverlayProps) {
  const insets = useSafeAreaInsets();
  const [notes, setNotes] = useState('');
  const [resolving, setResolving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!emergency) return null;

  const resolve = async () => {
    setResolving(true);
    setError(null);
    try {
      await onResolve(emergency.id, notes.trim() || undefined);
      setNotes('');
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setResolving(false);
    }
  };

  return (
    <Modal visible animationType="fade" statusBarTranslucent onRequestClose={onAcknowledge}>
      <View
        className="flex-1 justify-between bg-rose-700 px-6"
        style={{ paddingTop: insets.top + 32, paddingBottom: insets.bottom + 24 }}
        accessibilityRole="alert"
        accessibilityLiveRegion="assertive"
      >
        <View className="items-center">
          <View className="h-24 w-24 items-center justify-center rounded-full bg-white">
            <Ionicons name="warning" size={56} color="#e0405a" />
          </View>
          <Text className="mt-6 text-center text-4xl font-black tracking-wide text-white">EMERGENCIA</Text>
          <Text className="mt-2 text-center text-lg font-semibold text-rose-100">
            {ownAlert ? 'Has activado la alerta general' : 'Alerta general del edificio'}
          </Text>
          {emergency.message ? (
            <Text className="mt-6 text-center text-2xl font-bold text-white">{emergency.message}</Text>
          ) : null}
          <View className="mt-6 w-full max-w-[420px] gap-1 rounded-2xl bg-black/20 p-4">
            <Text className="text-base text-white">
              Activada por <Text className="font-bold">{emergency.triggeredByName}</Text>
              {emergency.triggeredFromApartment ? ` · Apto. ${emergency.triggeredFromApartment}` : ''}
            </Text>
            <Text className="text-sm text-rose-100">{formatDateTime(emergency.createdAt)}</Text>
            <Text className="text-sm text-rose-100">{emergency.notifiedCount} persona(s) avisadas</Text>
          </View>
          <Text className="mt-4 max-w-[420px] text-center text-base text-white">
            Mantén la calma y sigue las indicaciones de portería y del plan de emergencia.
          </Text>
        </View>

        <View className="w-full max-w-[420px] gap-3 self-center">
          {canResolve ? (
            <>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="Notas de resolución (opcional)"
                placeholderTextColor="#fbccd1"
                maxLength={300}
                accessibilityLabel="Notas de resolución"
                className="min-h-[48px] rounded-2xl border border-white/40 bg-black/15 px-4 text-base text-white"
              />
              {error ? <Text className="text-center text-sm font-semibold text-white">{error}</Text> : null}
              <Pressable
                accessibilityRole="button"
                onPress={resolve}
                disabled={resolving}
                className="min-h-[56px] flex-row items-center justify-center gap-2 rounded-2xl bg-white active:opacity-90"
              >
                {resolving ? (
                  <ActivityIndicator color="#e0405a" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={22} color="#12a372" />
                    <Text className="text-lg font-extrabold text-emerald-800">Marcar como resuelta</Text>
                  </>
                )}
              </Pressable>
            </>
          ) : null}
          <Pressable
            accessibilityRole="button"
            onPress={onAcknowledge}
            className="min-h-[56px] items-center justify-center rounded-2xl border-2 border-white active:bg-white/10"
          >
            <Text className="text-lg font-extrabold text-white">Entendido</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
