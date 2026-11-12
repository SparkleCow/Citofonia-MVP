import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Text, View } from 'react-native';

export type BadgeTone = 'brand' | 'success' | 'warning' | 'danger' | 'neutral' | 'info' | 'violet';

type BadgeProps = {
  label: string;
  tone?: BadgeTone;
  icon?: keyof typeof Ionicons.glyphMap;
  className?: string;
};

const tones: Record<BadgeTone, { wrap: string; text: string; icon: string }> = {
  brand: {
    wrap: 'bg-brand-100 dark:bg-brand-500/20',
    text: 'text-brand-700 dark:text-brand-200',
    icon: '#4267f2',
  },
  success: {
    wrap: 'bg-emerald-100 dark:bg-emerald-500/20',
    text: 'text-emerald-700 dark:text-emerald-300',
    icon: '#12a372',
  },
  warning: {
    wrap: 'bg-amber-100 dark:bg-amber-500/20',
    text: 'text-amber-700 dark:text-amber-300',
    icon: '#e2880e',
  },
  danger: {
    wrap: 'bg-rose-100 dark:bg-rose-500/20',
    text: 'text-rose-700 dark:text-rose-300',
    icon: '#e0405a',
  },
  neutral: {
    wrap: 'bg-ink-100 dark:bg-ink-800',
    text: 'text-ink-600 dark:text-ink-300',
    icon: '#4a5c98',
  },
  info: {
    wrap: 'bg-sky-100 dark:bg-sky-500/20',
    text: 'text-sky-700 dark:text-sky-300',
    icon: '#1996d6',
  },
  violet: {
    wrap: 'bg-violet-100 dark:bg-violet-500/20',
    text: 'text-violet-700 dark:text-violet-300',
    icon: '#7654f0',
  },
};

export function Badge({ label, tone = 'neutral', icon, className }: BadgeProps) {
  const palette = tones[tone];
  return (
    <View className={`flex-row items-center gap-1 rounded-full px-2.5 py-1 ${palette.wrap} ${className ?? ''}`}>
      {icon ? <Ionicons name={icon} size={12} color={palette.icon} /> : null}
      <Text className={`text-[11px] font-semibold md:text-[13px] ${palette.text}`}>{label}</Text>
    </View>
  );
}
