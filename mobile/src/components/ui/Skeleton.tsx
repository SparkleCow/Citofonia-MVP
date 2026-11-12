import React, { useEffect, useState } from 'react';
import { Animated, View, type DimensionValue } from 'react-native';

type SkeletonProps = {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  className?: string;
};

/** Bloque pulsante que ocupa el lugar del contenido mientras carga. */
export function Skeleton({ width = '100%', height = 16, radius = 10, className }: SkeletonProps) {
  const [opacity] = useState(() => new Animated.Value(0.45));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 650, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.45, duration: 650, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      className={`bg-ink-200 dark:bg-ink-800 ${className ?? ''}`}
      style={{ width, height, borderRadius: radius, opacity }}
    />
  );
}

/** Silueta de una tarjeta de listado (visita, paquete, mensaje). */
export function SkeletonCard() {
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel="Cargando"
      className="flex-1 rounded-3xl bg-ink-100 p-4 dark:bg-ink-900"
    >
      <View className="flex-row items-center gap-3">
        <Skeleton width={48} height={48} radius={16} />
        <View className="flex-1 gap-2">
          <Skeleton width="70%" height={16} />
          <Skeleton width="45%" height={12} />
        </View>
        <Skeleton width={64} height={22} radius={11} />
      </View>
      <View className="mt-4 gap-2">
        <Skeleton width="85%" height={12} />
        <Skeleton width="60%" height={12} />
      </View>
    </View>
  );
}

export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <View className="gap-3">
      {Array.from({ length: count }, (_, index) => (
        <SkeletonCard key={index} />
      ))}
    </View>
  );
}
