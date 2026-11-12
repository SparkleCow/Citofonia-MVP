import { Ionicons } from '@expo/vector-icons';
import type { ErrorBoundaryProps } from 'expo-router';
import React from 'react';
import { Text, View } from 'react-native';
import { Button } from '@/components/ui/Button';

/**
 * Fallback de ruta (`export { RouteError as ErrorBoundary }` en cada layout):
 * si una pantalla falla al renderizar, muestra un mensaje con reintento en lugar
 * de desmontarse o dejar la pantalla en blanco.
 */
export function RouteError({ error, retry }: ErrorBoundaryProps) {
  return (
    <View className="flex-1 items-center justify-center gap-4 bg-ink-50 p-8 dark:bg-ink-950">
      <Ionicons name="alert-circle" size={48} color="#e0405a" />
      <Text className="text-center text-xl font-extrabold text-ink-950 dark:text-white">
        No se pudo mostrar esta pantalla
      </Text>
      <Text className="max-w-[320px] text-center text-sm text-ink-700 dark:text-ink-200">{error.message}</Text>
      <Button title="Reintentar" icon="refresh" size="lg" onPress={() => void retry()} />
    </View>
  );
}
