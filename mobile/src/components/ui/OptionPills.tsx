import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, Text, View } from 'react-native';

export type PillOption<K extends string> = {
  key: K;
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
};

type OptionPillsProps<K extends string> = {
  label?: string;
  options: PillOption<K>[];
  value: K | null;
  onChange: (key: K) => void;
  /** Permite desmarcar la opción seleccionada. */
  allowEmpty?: boolean;
};

/** Selección única con botones grandes (radio). */
export function OptionPills<K extends string>({
  label,
  options,
  value,
  onChange,
  allowEmpty,
}: OptionPillsProps<K>) {
  return (
    <View className="gap-1.5">
      {label ? <Text className="text-sm font-semibold text-ink-800 dark:text-ink-100">{label}</Text> : null}
      <View className="flex-row flex-wrap gap-2">
        {options.map((option) => {
          const selected = option.key === value;
          return (
            <Pressable
              key={option.key}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              onPress={() => (selected && allowEmpty ? onChange('' as K) : onChange(option.key))}
              className={`min-h-[48px] flex-row items-center gap-2 rounded-2xl border-2 px-4 active:opacity-80 ${
                selected
                  ? 'border-brand-600 bg-brand-50 dark:bg-brand-500/15'
                  : 'border-ink-200 bg-white dark:border-ink-700 dark:bg-ink-900'
              }`}
            >
              {option.icon ? (
                <Ionicons name={option.icon} size={18} color={selected ? '#1854dc' : '#526b8e'} />
              ) : null}
              <Text
                className={`text-[15px] font-bold ${
                  selected ? 'text-brand-800 dark:text-brand-200' : 'text-ink-800 dark:text-ink-100'
                }`}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
