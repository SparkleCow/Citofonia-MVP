import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { useTheme } from '@/context/ThemeContext';

type SearchBarProps = {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
};

export function SearchBar({ value, onChangeText, placeholder = 'Buscar...' }: SearchBarProps) {
  const { isDark } = useTheme();

  return (
    <View className="flex-row items-center gap-2.5 rounded-2xl border border-ink-200 bg-white px-4 dark:border-ink-800 dark:bg-ink-900">
      <Ionicons name="search" size={19} color={isDark ? '#6377b5' : '#8496cf'} />
      <TextInput
        className="min-h-[50px] flex-1 text-[15px] text-ink-900 dark:text-ink-50"
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={isDark ? '#4a5c98' : '#8496cf'}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
      />
      {value.length > 0 ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Limpiar búsqueda"
          hitSlop={10}
          onPress={() => onChangeText('')}
        >
          <Ionicons name="close-circle" size={19} color={isDark ? '#4a5c98' : '#8496cf'} />
        </Pressable>
      ) : null}
    </View>
  );
}
