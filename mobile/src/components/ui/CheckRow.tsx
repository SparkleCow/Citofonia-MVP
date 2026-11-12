import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, Text, View } from 'react-native';

type CheckRowProps = {
  label: string;
  description?: string;
  checked: boolean;
  onToggle: () => void;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  /** Texto breve a la derecha (conteo, rol). */
  trailing?: string;
};

/** Casilla de verificación con área táctil completa (≥56 px). */
export function CheckRow({ label, description, checked, onToggle, disabled, icon, trailing }: CheckRowProps) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onToggle}
      className={`min-h-[56px] flex-row items-center gap-3 rounded-2xl border px-4 py-2.5 active:opacity-80 ${
        checked
          ? 'border-brand-600 bg-brand-50 dark:bg-brand-500/15'
          : 'border-ink-200 bg-white dark:border-ink-700 dark:bg-ink-900'
      } ${disabled ? 'opacity-45' : ''}`}
    >
      <View
        className={`h-7 w-7 items-center justify-center rounded-lg border-2 ${
          checked ? 'border-brand-600 bg-brand-600' : 'border-ink-400 dark:border-ink-500'
        }`}
      >
        {checked ? <Ionicons name="checkmark" size={18} color="#ffffff" /> : null}
      </View>
      {icon ? <Ionicons name={icon} size={20} color={checked ? '#4267f2' : '#4a5c98'} /> : null}
      <View className="flex-1">
        <Text className="text-[15px] font-bold text-ink-950 dark:text-white" numberOfLines={1}>
          {label}
        </Text>
        {description ? (
          <Text className="text-[13px] text-ink-600 dark:text-ink-300" numberOfLines={1}>
            {description}
          </Text>
        ) : null}
      </View>
      {trailing ? (
        <Text className="text-xs font-bold text-ink-600 dark:text-ink-300">{trailing}</Text>
      ) : null}
    </Pressable>
  );
}
