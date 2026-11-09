import React from 'react';
import { View, ViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type ScreenProps = ViewProps & {
  children: React.ReactNode;
  edges?: ('top' | 'right' | 'bottom' | 'left')[];
};

export function Screen({ children, className, edges = ['top', 'left', 'right'], ...props }: ScreenProps) {
  return (
    <SafeAreaView edges={edges} className="flex-1 bg-ink-50 dark:bg-ink-950">
      <View className={`flex-1 ${className ?? ''}`} {...props}>
        {children}
      </View>
    </SafeAreaView>
  );
}
