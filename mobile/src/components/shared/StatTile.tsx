import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, Text, View } from 'react-native';

type Tone = 'brand' | 'amber' | 'rose' | 'emerald';

const tones: Record<Tone, { bg: string; icon: string }> = {
  brand: { bg: 'bg-brand-100 dark:bg-brand-500/20', icon: '#4267f2' },
  amber: { bg: 'bg-amber-100 dark:bg-amber-500/20', icon: '#e2880e' },
  rose: { bg: 'bg-rose-100 dark:bg-rose-500/20', icon: '#e0405a' },
  emerald: { bg: 'bg-emerald-100 dark:bg-emerald-500/20', icon: '#12a372' },
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
        className="min-h-[48px] min-w-[92px] flex-1 gap-1.5 rounded-2xl border border-ink-200 bg-ink-100 px-3 py-2.5 active:opacity-70 md:flex-row md:items-center md:gap-2 dark:border-ink-800 dark:bg-ink-900"
      >
        <View className="flex-row items-center gap-2">
          <View className={`h-8 w-8 items-center justify-center rounded-xl ${palette.bg}`}>
            <Ionicons name={icon} size={16} color={palette.icon} />
          </View>
          <Text className="text-lg font-extrabold text-ink-950 dark:text-white">{value}</Text>
        </View>
        <Text className="text-xs font-semibold leading-4 text-ink-600 md:flex-1 md:text-sm dark:text-ink-300" numberOfLines={2}>
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
      className="min-w-[140px] flex-1 rounded-3xl border border-ink-200 bg-ink-100 p-4 active:opacity-70 dark:border-ink-800 dark:bg-ink-900"
    >
      <View className="flex-row items-center justify-between">
        <View className={`h-11 w-11 items-center justify-center rounded-2xl ${palette.bg}`}>
          <Ionicons name={icon} size={22} color={palette.icon} />
        </View>
        {onPress ? <Ionicons name="chevron-forward" size={18} color="#6377b5" /> : null}
      </View>
      <Text className="mt-3 text-3xl font-extrabold md:text-4xl text-ink-950 dark:text-white">{value}</Text>
      <Text className="mt-0.5 text-sm font-semibold text-ink-600 md:text-base dark:text-ink-300">{label}</Text>
    </Pressable>
  );
}
