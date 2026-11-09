import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
type Size = 'sm' | 'md' | 'lg';

type ButtonProps = {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  fullWidth?: boolean;
  className?: string;
};

const containerVariants: Record<Variant, string> = {
  primary: 'bg-brand-600 active:bg-brand-700',
  secondary:
    'bg-white border border-ink-200 active:bg-ink-100 dark:bg-ink-900 dark:border-ink-800 dark:active:bg-ink-800',
  ghost: 'bg-transparent active:bg-ink-100 dark:active:bg-ink-900',
  danger: 'bg-rose-600 active:bg-rose-700',
  success: 'bg-emerald-600 active:bg-emerald-700',
};

const textVariants: Record<Variant, string> = {
  primary: 'text-white',
  secondary: 'text-ink-800 dark:text-ink-100',
  ghost: 'text-brand-600 dark:text-brand-300',
  danger: 'text-white',
  success: 'text-white',
};

const sizeClasses: Record<Size, string> = {
  sm: 'min-h-[38px] px-3.5 rounded-xl gap-1.5',
  md: 'min-h-[48px] px-5 rounded-2xl gap-2',
  lg: 'min-h-[54px] px-6 rounded-2xl gap-2.5',
};

const textSizes: Record<Size, string> = {
  sm: 'text-sm',
  md: 'text-[15px]',
  lg: 'text-base',
};

const iconSizes: Record<Size, number> = { sm: 16, md: 18, lg: 20 };

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  rightIcon,
  fullWidth = false,
  className,
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const iconColor = variant === 'secondary' || variant === 'ghost' ? undefined : '#ffffff';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      onPress={onPress}
      disabled={isDisabled}
      className={`flex-row items-center justify-center ${containerVariants[variant]} ${sizeClasses[size]} ${
        fullWidth ? 'w-full' : ''
      } ${isDisabled ? 'opacity-55' : ''} ${className ?? ''}`}
    >
      {loading ? (
        <ActivityIndicator size="small" color={iconColor ?? '#3389fb'} />
      ) : (
        <View className="flex-row items-center justify-center gap-2">
          {icon ? <Ionicons name={icon} size={iconSizes[size]} color={iconColor} /> : null}
          <Text className={`font-semibold ${textVariants[variant]} ${textSizes[size]}`}>{title}</Text>
          {rightIcon ? <Ionicons name={rightIcon} size={iconSizes[size]} color={iconColor} /> : null}
        </View>
      )}
    </Pressable>
  );
}
