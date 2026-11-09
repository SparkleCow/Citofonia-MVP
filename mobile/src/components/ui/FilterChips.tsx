import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

export type ChipOption<K extends string> = { key: K; label: string; count?: number };

type FilterChipsProps<K extends string> = {
  options: ChipOption<K>[];
  value: K;
  onChange: (key: K) => void;
};

export function FilterChips<K extends string>({ options, value, onChange }: FilterChipsProps<K>) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
      {options.map((option) => {
        const selected = option.key === value;
        return (
          <Pressable
            key={option.key}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.key)}
            className={`min-h-[44px] flex-row items-center gap-2 rounded-full border px-4 active:opacity-80 ${
              selected
                ? 'border-brand-600 bg-brand-600'
                : 'border-ink-200 bg-white dark:border-ink-700 dark:bg-ink-900'
            }`}
          >
            <Text
              className={`text-sm font-bold ${selected ? 'text-white' : 'text-ink-800 dark:text-ink-100'}`}
            >
              {option.label}
            </Text>
            {option.count != null ? (
              <View
                className={`min-w-[22px] items-center rounded-full px-1.5 py-0.5 ${
                  selected ? 'bg-white/25' : 'bg-ink-100 dark:bg-ink-800'
                }`}
              >
                <Text
                  className={`text-xs font-bold ${selected ? 'text-white' : 'text-ink-700 dark:text-ink-200'}`}
                >
                  {option.count}
                </Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
