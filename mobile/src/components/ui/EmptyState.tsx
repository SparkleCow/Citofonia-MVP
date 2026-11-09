import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Text, View } from 'react-native';

type EmptyStateProps = {
  title: string;
  description?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  action?: React.ReactNode;
};

export function EmptyState({
  title,
  description,
  icon = 'sparkles-outline',
  action,
}: EmptyStateProps) {
  return (
    <View className="items-center justify-center rounded-3xl border border-dashed border-ink-200 bg-white/70 px-6 py-12 dark:border-ink-800 dark:bg-ink-900/60">
      <View className="h-14 w-14 items-center justify-center rounded-2xl bg-brand-100 dark:bg-brand-500/20">
        <Ionicons name={icon} size={26} color="#3389fb" />
      </View>
      <Text className="mt-4 text-base font-bold text-ink-900 dark:text-ink-50">{title}</Text>
      {description ? (
        <Text className="mt-1.5 max-w-[280px] text-center text-sm leading-5 text-ink-500 dark:text-ink-400">
          {description}
        </Text>
      ) : null}
      {action ? <View className="mt-5">{action}</View> : null}
    </View>
  );
}
