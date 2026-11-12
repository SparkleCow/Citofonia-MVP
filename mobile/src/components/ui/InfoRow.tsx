import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Text, View } from 'react-native';

type InfoRowProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string | null;
};

export function InfoRow({ icon, label, value }: InfoRowProps) {
  if (!value) return null;
  return (
    <View className="flex-row items-center gap-2">
      <Ionicons name={icon} size={15} color="#6377b5" />
      <Text className="text-[13px] text-ink-600 md:text-[15px] dark:text-ink-300">
        {label}: <Text className="font-semibold text-ink-900 dark:text-ink-50">{value}</Text>
      </Text>
    </View>
  );
}
