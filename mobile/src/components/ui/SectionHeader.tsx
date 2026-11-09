import React from 'react';
import { Text, View } from 'react-native';

type SectionHeaderProps = {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
};

export function SectionHeader({ title, subtitle, action }: SectionHeaderProps) {
  return (
    <View className="mb-3 flex-row items-end justify-between gap-3">
      <View className="flex-1">
        <Text className="text-lg font-bold text-ink-900 dark:text-ink-50">{title}</Text>
        {subtitle ? (
          <Text className="mt-0.5 text-sm text-ink-500 dark:text-ink-400">{subtitle}</Text>
        ) : null}
      </View>
      {action}
    </View>
  );
}
