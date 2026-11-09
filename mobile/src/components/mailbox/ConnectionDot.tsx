import React from 'react';
import { Text, View } from 'react-native';
import { useMailbox } from '@/context/MailboxContext';

const meta = {
  connected: { label: 'En vivo', dot: 'bg-emerald-500', text: 'text-emerald-700 dark:text-emerald-300' },
  connecting: { label: 'Conectando…', dot: 'bg-amber-500', text: 'text-amber-700 dark:text-amber-300' },
  disconnected: { label: 'Sin conexión', dot: 'bg-rose-500', text: 'text-rose-700 dark:text-rose-300' },
  idle: { label: 'Sin conexión', dot: 'bg-ink-400', text: 'text-ink-600 dark:text-ink-300' },
} as const;

/** Indicador del estado del WebSocket del buzón. */
export function ConnectionDot() {
  const { connection } = useMailbox();
  const current = meta[connection];
  return (
    <View
      accessibilityLabel={`Tiempo real: ${current.label}`}
      className="flex-row items-center gap-1.5 self-start rounded-full bg-white px-3 py-1.5 dark:bg-ink-900"
    >
      <View className={`h-2.5 w-2.5 rounded-full ${current.dot}`} />
      <Text className={`text-xs font-bold ${current.text}`}>{current.label}</Text>
    </View>
  );
}
