import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { getApiErrorMessage } from '@/api/axios';
import { Button } from '@/components/ui/Button';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { Sheet } from '@/components/ui/Sheet';
import { fullName } from '@/lib/format';
import type { RecipientResponse } from '@/types';

type RecipientPickerSheetProps = {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  /** Carga los residentes elegibles (visitas o correspondencia). */
  loadRecipients: () => Promise<RecipientResponse[]>;
  onConfirm: (residentIds: number[]) => Promise<void>;
  confirmLabel?: string;
};

/** Selección múltiple de residentes a notificar. Preselecciona a todos. */
export function RecipientPickerSheet({
  visible,
  onClose,
  title,
  subtitle,
  loadRecipients,
  onConfirm,
  confirmLabel = 'Notificar',
}: RecipientPickerSheetProps) {
  const [recipients, setRecipients] = useState<RecipientResponse[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cada apertura empieza de cero (ajuste de estado en render, sin efecto en cascada).
  const [wasVisible, setWasVisible] = useState(false);
  const [attempt, setAttempt] = useState(0);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) {
      setRecipients([]);
      setSelected(new Set());
      setError(null);
      setLoading(true);
    }
  }

  useEffect(() => {
    if (!visible) return;
    let alive = true;
    loadRecipients()
      .then((list) => {
        if (!alive) return;
        setRecipients(list);
        setSelected(new Set(list.map((item) => item.id)));
      })
      .catch((err) => alive && setError(getApiErrorMessage(err)))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
    // loadRecipients cambia en cada render del padre; se recarga solo al abrir o reintentar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, attempt]);

  const toggle = (id: number) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const confirm = async () => {
    if (selected.size === 0) {
      setError('Selecciona al menos un residente.');
      return;
    }
    setSending(true);
    setError(null);
    try {
      await onConfirm([...selected]);
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSending(false);
    }
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      footer={
        <>
          <Button title="Cancelar" variant="secondary" onPress={onClose} className="flex-1" size="lg" />
          <Button
            title={`${confirmLabel}${selected.size ? ` (${selected.size})` : ''}`}
            icon="notifications"
            onPress={confirm}
            loading={sending}
            disabled={loading || recipients.length === 0}
            className="flex-1"
            size="lg"
          />
        </>
      }
    >
      {error ? (
        <ErrorBanner
          message={error}
          onRetry={() => {
            setError(null);
            setLoading(true);
            setAttempt((value) => value + 1);
          }}
        />
      ) : null}
      {loading ? (
        <ActivityIndicator size="large" color="#1d6af0" />
      ) : recipients.length === 0 && !error ? (
        <Text className="text-center text-[15px] text-ink-600 dark:text-ink-300">
          Esta vivienda no tiene residentes que puedan recibir avisos.
        </Text>
      ) : (
        <View className="gap-2">
          {recipients.map((recipient) => {
            const checked = selected.has(recipient.id);
            return (
              <Pressable
                key={recipient.id}
                accessibilityRole="checkbox"
                accessibilityState={{ checked }}
                onPress={() => toggle(recipient.id)}
                className={`min-h-[60px] flex-row items-center gap-3 rounded-2xl border px-4 py-3 active:opacity-80 ${
                  checked
                    ? 'border-brand-600 bg-brand-50 dark:bg-brand-500/15'
                    : 'border-ink-200 bg-white dark:border-ink-700 dark:bg-ink-900'
                }`}
              >
                <View
                  className={`h-7 w-7 items-center justify-center rounded-lg border-2 ${
                    checked ? 'border-brand-600 bg-brand-600' : 'border-ink-400'
                  }`}
                >
                  {checked ? <Ionicons name="checkmark" size={18} color="#ffffff" /> : null}
                </View>
                <View className="flex-1">
                  <Text className="text-base font-bold text-ink-950 dark:text-white">
                    {fullName(recipient.firstName, recipient.lastName)}
                  </Text>
                  <Text className="text-[13px] text-ink-600 dark:text-ink-300">
                    {recipient.email}
                    {recipient.owner ? ' · Propietario' : ''}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
    </Sheet>
  );
}
