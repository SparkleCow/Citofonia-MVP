import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, Text, View } from 'react-native';

type Tone = 'primary' | 'navy' | 'neutral';

const tones: Record<Tone, { wrap: string; icon: string; iconBg: string; text: string }> = {
  primary: { wrap: 'bg-brand-600 active:bg-brand-700', icon: '#ffffff', iconBg: 'bg-white/20', text: 'text-white' },
  navy: { wrap: 'bg-ink-800 active:bg-ink-900 dark:bg-ink-700', icon: '#ffffff', iconBg: 'bg-white/15', text: 'text-white' },
  neutral: {
    wrap: 'border-2 border-ink-300 bg-white active:bg-ink-100 dark:border-ink-600 dark:bg-ink-900 dark:active:bg-ink-800',
    icon: '#1854dc',
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
};

/** Acción principal de portería: objetivo táctil de ≥96 px y texto de alto contraste. */
export function ActionTile({ label, hint, icon, tone = 'primary', onPress }: ActionTileProps) {
  const palette = tones[tone];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      className={`min-h-[96px] min-w-[150px] flex-1 justify-between rounded-3xl p-4 ${palette.wrap}`}
    >
      <View className={`h-12 w-12 items-center justify-center rounded-2xl ${palette.iconBg}`}>
        <Ionicons name={icon} size={26} color={palette.icon} />
      </View>
      <View className="mt-3">
        <Text className={`text-lg font-extrabold ${palette.text}`}>{label}</Text>
        {hint ? (
          <Text className={`mt-0.5 text-[13px] ${tone === 'neutral' ? 'text-ink-600 dark:text-ink-300' : 'text-white/85'}`}>
            {hint}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}
