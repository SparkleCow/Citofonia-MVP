import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, Text, TextInput, TextInputProps, View } from 'react-native';
import { useTheme } from '@/context/ThemeContext';

type InputProps = TextInputProps & {
  label?: string;
  error?: string | null;
  hint?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  secureToggle?: boolean;
  containerClassName?: string;
  /** Solo acepta dígitos (teclado numérico y filtrado al pegar/escribir). */
  digitsOnly?: boolean;
};

export function Input({
  label,
  error,
  hint,
  icon,
  secureToggle = false,
  secureTextEntry,
  containerClassName,
  digitsOnly = false,
  onChangeText,
  onFocus,
  onBlur,
  ...props
}: InputProps) {
  const { isDark } = useTheme();
  const [focused, setFocused] = useState(false);
  const [visible, setVisible] = useState(false);
  const secure = secureToggle ? !visible : secureTextEntry;

  return (
    <View className={`gap-1.5 ${containerClassName ?? ''}`}>
      {label ? (
        <Text className="text-sm font-semibold text-ink-700 dark:text-ink-200">{label}</Text>
      ) : null}
      <View
        className={`flex-row items-center gap-2.5 rounded-2xl border bg-white px-4 dark:bg-ink-900 ${
          error
            ? 'border-rose-400 dark:border-rose-500'
            : focused
              ? 'border-brand-500 dark:border-brand-400'
              : 'border-ink-200 dark:border-ink-800'
        }`}
      >
        {icon ? (
          <Ionicons
            name={icon}
            size={19}
            color={error ? '#f43f5e' : focused ? '#3389fb' : isDark ? '#6f87ab' : '#93a8c7'}
          />
        ) : null}
        <TextInput
          className="min-h-[50px] flex-1 py-3 text-[15px] text-ink-900 dark:text-ink-50"
          placeholderTextColor={isDark ? '#526b8e' : '#93a8c7'}
          secureTextEntry={secure}
          {...(digitsOnly ? { keyboardType: 'number-pad', inputMode: 'numeric' as const } : null)}
          onChangeText={(text) => onChangeText?.(digitsOnly ? text.replace(/\D+/g, '') : text)}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          {...props}
        />
        {secureToggle ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            hitSlop={10}
            onPress={() => setVisible((current) => !current)}
          >
            <Ionicons
              name={visible ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={isDark ? '#6f87ab' : '#6f87ab'}
            />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Text className="text-xs font-medium text-rose-600 dark:text-rose-400">{error}</Text>
      ) : hint ? (
        <Text className="text-xs text-ink-500 dark:text-ink-400">{hint}</Text>
      ) : null}
    </View>
  );
}
