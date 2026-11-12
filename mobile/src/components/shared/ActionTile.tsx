import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, Text, View } from 'react-native';

type Tone = 'primary' | 'navy' | 'neutral' | 'danger';

const tones: Record<Tone, { wrap: string; icon: string; iconBg: string; text: string }> = {
  primary: { wrap: 'border border-brand-400 bg-brand-600 shadow-md shadow-ink-950/50 active:bg-brand-700', icon: '#ffffff', iconBg: 'bg-white/20', text: 'text-white' },
  navy: { wrap: 'border border-ink-500 bg-ink-800 shadow-md shadow-ink-950/50 active:bg-ink-900 dark:bg-ink-700', icon: '#ffffff', iconBg: 'bg-white/15', text: 'text-white' },
  danger: { wrap: 'border border-rose-400 bg-rose-600 shadow-md shadow-ink-950/50 active:bg-rose-700', icon: '#ffffff', iconBg: 'bg-white/20', text: 'text-white' },
  neutral: {
    wrap: 'border-2 border-ink-300 bg-white shadow-sm shadow-ink-950/30 active:bg-ink-100 dark:border-ink-500 dark:bg-ink-800 dark:active:bg-ink-700',
    icon: '#4267f2',
    iconBg: 'bg-brand-100 dark:bg-brand-500/20',
    text: 'text-ink-950 dark:text-white',
  },
};

type ActionTileProps = {
  label: string;
  hint?: string;
  icon: keyof typeof Ionicons.glyphMap;
  tone?: Tone;
  onPress: () => void;
  disabled?: boolean;
};

/** Acción principal de portería: objetivo táctil de ≥96 px y texto de alto contraste. */
export function ActionTile({ label, hint, icon, tone = 'primary', onPress, disabled = false }: ActionTileProps) {
  const palette = tones[tone];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      className={`${disabled ? 'opacity-50 ' : ''}min-h-[96px] min-w-[136px] flex-1 justify-between rounded-3xl p-3.5 md:p-4 active:scale-[0.97] ${palette.wrap}`}
    >
      <View className={`h-12 w-12 items-center justify-center rounded-2xl ${palette.iconBg}`}>
        <Ionicons name={icon} size={26} color={palette.icon} />
      </View>
      <View className="mt-3">
        <Text className={`text-base font-extrabold leading-5 md:text-xl md:leading-7 ${palette.text}`}>{label}</Text>
        {hint ? (
          <Text className={`mt-0.5 text-xs leading-4 md:text-[15px] md:leading-5 ${tone === 'neutral' ? 'text-ink-600 dark:text-ink-300' : 'text-white/85'}`}>
            {hint}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}
