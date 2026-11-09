import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, Text, View } from 'react-native';

type IconButtonProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  badge?: number;
};

/** Botón circular de 48px (objetivo táctil mínimo) con badge opcional. */
export function IconButton({ icon, label, onPress, badge }: IconButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={badge ? `${label}, ${badge} sin leer` : label}
      onPress={onPress}
      className="h-12 w-12 items-center justify-center rounded-full border border-ink-200 bg-white active:bg-ink-100 dark:border-ink-700 dark:bg-ink-900 dark:active:bg-ink-800"
    >
      <Ionicons name={icon} size={22} color="#3d5270" />
      {badge ? (
        <View className="absolute -right-1 -top-1 min-w-[20px] items-center rounded-full border-2 border-white bg-rose-600 px-1 dark:border-ink-950">
          <Text className="text-[11px] font-bold text-white">{badge > 99 ? '99+' : badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}
