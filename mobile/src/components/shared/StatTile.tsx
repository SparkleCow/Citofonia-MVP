import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, Text, View } from 'react-native';

type Tone = 'brand' | 'amber' | 'rose' | 'emerald';

const tones: Record<Tone, { bg: string; icon: string }> = {
  brand: { bg: 'bg-brand-100 dark:bg-brand-500/20', icon: '#1854dc' },
  amber: { bg: 'bg-amber-100 dark:bg-amber-500/20', icon: '#b45309' },
  rose: { bg: 'bg-rose-100 dark:bg-rose-500/20', icon: '#be123c' },
  emerald: { bg: 'bg-emerald-100 dark:bg-emerald-500/20', icon: '#047857' },
};

type StatTileProps = {
  label: string;
  value: number | string;
  icon: keyof typeof Ionicons.glyphMap;
  tone?: Tone;
  onPress?: () => void;
  /** Versión reducida en una línea (portería). */
  compact?: boolean;
};

export function StatTile({ label, value, icon, tone = 'brand', onPress, compact = false }: StatTileProps) {
  const palette = tones[tone];

  if (compact) {
    return (
      <Pressable
        accessibilityRole={onPress ? 'button' : undefined}
        accessibilityLabel={`${label}: ${value}`}
        disabled={!onPress}
        onPress={onPress}
        className="min-h-[48px] flex-1 flex-row items-center gap-2 rounded-2xl border border-ink-200 bg-white px-3 py-2 active:opacity-80 dark:border-ink-800 dark:bg-ink-900"
      >
        <View className={`h-8 w-8 items-center justify-center rounded-xl ${palette.bg}`}>
          <Ionicons name={icon} size={16} color={palette.icon} />
        </View>
        <Text className="text-lg font-extrabold text-ink-950 dark:text-white">{value}</Text>
        <Text className="flex-1 text-xs font-semibold text-ink-600 dark:text-ink-300" numberOfLines={1}>
          {label}
        </Text>
      </Pressable>
    );
  }

  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${label}: ${value}`}
      disabled={!onPress}
      onPress={onPress}
      className="min-w-[140px] flex-1 rounded-3xl border border-ink-200 bg-white p-4 active:opacity-80 dark:border-ink-800 dark:bg-ink-900"
    >
      <View className={`h-11 w-11 items-center justify-center rounded-2xl ${palette.bg}`}>
        <Ionicons name={icon} size={22} color={palette.icon} />
      </View>
      <Text className="mt-3 text-3xl font-extrabold text-ink-950 dark:text-white">{value}</Text>
      <Text className="mt-0.5 text-sm font-semibold text-ink-600 dark:text-ink-300">{label}</Text>
    </Pressable>
  );
}
