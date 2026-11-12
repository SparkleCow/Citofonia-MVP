import React from 'react';
import { View, ViewProps } from 'react-native';

type CardProps = ViewProps & {
  children: React.ReactNode;
  padded?: boolean;
};

/** Tarjeta informativa: plana, fondo sutil y sin elevación (la elevación se reserva a lo pulsable). */
export function Card({ children, className, padded = true, ...props }: CardProps) {
  return (
    <View
      className={`rounded-3xl border border-ink-200 bg-ink-100 dark:border-ink-800 dark:bg-ink-900 ${
        padded ? 'p-5' : ''
      } ${className ?? ''}`}
      {...props}
    >
      {children}
    </View>
  );
}
