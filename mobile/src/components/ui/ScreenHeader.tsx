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
    <View className="flex-row flex-wrap items-start justify-between gap-3">
      <View className="min-w-[140px] flex-1">
        {eyebrow ? (
          <Text className="text-xs font-bold uppercase md:text-sm tracking-widest text-brand-700 dark:text-brand-300">
            {eyebrow}
          </Text>
        ) : null}
        <Text className="mt-1 text-2xl font-extrabold leading-8 md:text-[34px] md:leading-[42px] text-ink-950 dark:text-white">
          {title}
        </Text>
        {subtitle ? (
          <Text className="mt-1 text-[15px] text-ink-600 md:text-[17px] dark:text-ink-300">{subtitle}</Text>
        ) : null}
      </View>
      {right ? <View className="flex-row items-center gap-2">{right}</View> : null}
    </View>
  );
}
