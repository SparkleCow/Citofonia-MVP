import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { colors, radius, spacing } from '@/theme';

type Props = {
  title: string;
  subtitle?: string;
  onPress?: () => void;
  icon?: React.ReactNode;
  disabled?: boolean;
  variant?: 'primary' | 'surface' | 'ghost';
};

export function ActionCard({ title, subtitle, onPress, icon, disabled, variant = 'surface' }: Props) {
  const bg = variant === 'primary' ? colors.primary : colors.card;
  const border = variant === 'primary' ? colors.primary : colors.border;
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      disabled={disabled}
      style={[styles.card, { backgroundColor: bg, borderColor: border, opacity: disabled ? 0.5 : 1 }]}
    >
      <View style={styles.row}>
        {icon ? <View style={styles.iconWrap}>{icon}</View> : null}
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: variant === 'primary' ? '#fff' : colors.text }]}>{title}</Text>
          {subtitle ? <Text style={[styles.subtitle, { color: variant === 'primary' ? '#eef6ff' : colors.subtext }]}>{subtitle}</Text> : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.xl,
    minHeight: 92,
    justifyContent: 'center',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: 'rgba(79,157,235,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 18, fontWeight: '700' },
  subtitle: { marginTop: 4, fontSize: 14 },
});
