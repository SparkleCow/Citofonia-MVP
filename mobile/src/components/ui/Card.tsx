import React from 'react';
import { View, ViewProps } from 'react-native';

type CardProps = ViewProps & {
  children: React.ReactNode;
  padded?: boolean;
};

export function Card({ children, className, padded = true, ...props }: CardProps) {
  return (
    <View
      className={`rounded-3xl border border-ink-200 bg-white dark:border-ink-800 dark:bg-ink-900 ${
        padded ? 'p-5' : ''
      } ${className ?? ''}`}
      {...props}
    >
      {children}
    </View>
  );
}
