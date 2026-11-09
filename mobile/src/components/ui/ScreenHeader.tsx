import React from 'react';
import { Text, View } from 'react-native';

type ScreenHeaderProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
};

export function ScreenHeader({ eyebrow, title, subtitle, right }: ScreenHeaderProps) {
  return (
    <View className="flex-row items-start justify-between gap-3">
      <View className="flex-1">
        {eyebrow ? (
          <Text className="text-xs font-bold uppercase tracking-widest text-brand-700 dark:text-brand-300">
            {eyebrow}
          </Text>
        ) : null}
        <Text className="mt-1 text-[28px] font-extrabold leading-9 text-ink-950 dark:text-white">
          {title}
        </Text>
        {subtitle ? (
          <Text className="mt-1 text-[15px] text-ink-600 dark:text-ink-300">{subtitle}</Text>
        ) : null}
      </View>
      {right ? <View className="flex-row items-center gap-2">{right}</View> : null}
    </View>
  );
}
