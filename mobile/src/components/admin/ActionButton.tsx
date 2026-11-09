import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, Text, View } from 'react-native';

type Tone = 'brand' | 'navy' | 'amber';

type ActionButtonProps = {
  label: string;
  description?: string;
  icon: keyof typeof Ionicons.glyphMap;
  tone?: Tone;
  onPress: () => void;
};

/** Botones de acción: relleno sólido, sombra, chevron y respuesta al toque. */
const fills: Record<Tone, string> = {
  brand: 'bg-brand-700',
  navy: 'bg-ink-800 dark:bg-ink-700',
  /** Solo para avisos que requieren atención (p. ej. pendientes). */
  amber: 'bg-amber-700',
};

const shadow = {
  shadowColor: '#0b1020',
  shadowOffset: { width: 0, height: 5 },
  shadowOpacity: 0.28,
  shadowRadius: 8,
  elevation: 6,
} as const;

export function ActionButton({ label, description, icon, tone = 'brand', onPress }: ActionButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={description ? `${label}. ${description}` : label}
      onPress={onPress}
      android_ripple={{ color: 'rgba(255,255,255,0.3)' }}
      style={({ pressed }) => [shadow, { transform: [{ scale: pressed ? 0.97 : 1 }], opacity: pressed ? 0.92 : 1 }]}
      className={`min-h-[84px] min-w-[160px] flex-1 flex-row items-center gap-3 rounded-3xl px-4 py-3 ${fills[tone]}`}
    >
      <View className="h-12 w-12 items-center justify-center rounded-2xl bg-white/20">
        <Ionicons name={icon} size={26} color="#ffffff" />
      </View>
      <View className="flex-1">
        <Text className="text-base font-extrabold text-white" numberOfLines={1}>
          {label}
        </Text>
        {description ? (
          <Text className="text-xs text-white/85" numberOfLines={1}>
            {description}
          </Text>
        ) : null}
      </View>
      <Ionicons name="chevron-forward-circle" size={26} color="#ffffff" />
    </Pressable>
  );
}
