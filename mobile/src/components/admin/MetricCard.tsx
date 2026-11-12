import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Text, View } from 'react-native';

type Tone = 'brand' | 'emerald' | 'amber' | 'violet' | 'rose';

type MetricCardProps = {
  label: string;
  value: string | number;
  icon: keyof typeof Ionicons.glyphMap;
  tone?: Tone;
  detail?: string;
};

/**
 * Indicador de SOLO LECTURA. Se distingue de los botones por ser plano:
 * fondo tenue, barra de color a la izquierda, sin sombra, sin chevron y no pulsable.
 */
const toneClasses: Record<Tone, { accent: string; value: string; icon: string }> = {
  brand: { accent: 'border-brand-500', value: 'text-brand-800 dark:text-brand-200', icon: '#4267f2' },
  emerald: { accent: 'border-emerald-500', value: 'text-emerald-800 dark:text-emerald-300', icon: '#12a372' },
  amber: { accent: 'border-amber-500', value: 'text-amber-800 dark:text-amber-300', icon: '#e2880e' },
  violet: { accent: 'border-violet-500', value: 'text-violet-800 dark:text-violet-300', icon: '#7654f0' },
  rose: { accent: 'border-rose-600', value: 'text-rose-700 dark:text-rose-300', icon: '#e0405a' },
};

export function MetricCard({ label, value, icon, tone = 'brand', detail }: MetricCardProps) {
  const palette = toneClasses[tone];
  return (
    <View
      accessible
      accessibilityRole="summary"
      accessibilityLabel={`${label}: ${value}${detail ? `. ${detail}` : ''}`}
      className={`min-h-[84px] min-w-[150px] flex-1 rounded-xl border-l-4 bg-ink-100 px-3.5 py-3 dark:bg-ink-800/70 ${palette.accent}`}
    >
      <View className="flex-row items-center gap-1.5">
        <Ionicons name={icon} size={13} color={palette.icon} />
        <Text className="flex-1 text-[11px] font-bold uppercase tracking-wider text-ink-600 dark:text-ink-300" numberOfLines={1}>
          {label}
        </Text>
      </View>
      <Text className={`mt-1 text-3xl font-extrabold ${palette.value}`}>{value}</Text>
      {detail ? (
        <Text className="text-[11px] text-ink-600 dark:text-ink-300" numberOfLines={1}>
          {detail}
        </Text>
      ) : null}
    </View>
  );
}
