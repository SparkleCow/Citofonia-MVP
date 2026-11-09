import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, Text, View } from 'react-native';

type ErrorBannerProps = {
  message: string;
  onRetry?: () => void;
};

export function ErrorBanner({ message, onRetry }: ErrorBannerProps) {
  return (
    <View
      accessibilityRole="alert"
      className="flex-row items-center gap-3 rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 dark:border-rose-500/40 dark:bg-rose-500/10"
    >
      <Ionicons name="alert-circle" size={20} color="#e11d48" />
      <Text className="flex-1 text-sm font-medium text-rose-800 dark:text-rose-200">{message}</Text>
      {onRetry ? (
        <Pressable
          accessibilityRole="button"
          onPress={onRetry}
          hitSlop={8}
          className="min-h-[40px] justify-center rounded-xl px-3 active:bg-rose-100 dark:active:bg-rose-500/20"
        >
          <Text className="text-sm font-bold text-rose-700 dark:text-rose-300">Reintentar</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
