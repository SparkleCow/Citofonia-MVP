import React from 'react';
import { Text, View } from 'react-native';

type AvatarProps = {
  firstName?: string | null;
  lastName?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
};

const sizes = {
  sm: 'h-9 w-9',
  md: 'h-11 w-11',
  lg: 'h-14 w-14',
};

const textSizes = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-lg',
};

export function initials(firstName?: string | null, lastName?: string | null) {
  return `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase() || '?';
}

export function Avatar({ firstName, lastName, size = 'md', className }: AvatarProps) {
  return (
    <View
      className={`items-center justify-center rounded-2xl bg-brand-100 dark:bg-brand-500/20 ${sizes[size]} ${className ?? ''}`}
    >
      <Text className={`font-bold text-brand-700 dark:text-brand-200 ${textSizes[size]}`}>
        {initials(firstName, lastName)}
      </Text>
    </View>
  );
}
