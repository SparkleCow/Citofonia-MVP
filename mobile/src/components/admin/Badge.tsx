import { View, Text, StyleSheet } from 'react-native';
import { colors, radius } from '@/theme';

export function Badge({ text, tone = 'default' }: { text: string; tone?: 'default' | 'ok' | 'warn' | 'muted' }) {
  const map = {
    default: { bg: 'rgba(79,157,235,0.18)', color: '#bfdbfe' },
    ok: { bg: 'rgba(34,197,94,0.18)', color: '#86efac' },
    warn: { bg: 'rgba(245,158,11,0.18)', color: '#fde68a' },
    muted: { bg: 'rgba(148,163,184,0.18)', color: '#cbd5f5' },
  };
  const c = map[tone];
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]}>
      <Text style={[styles.text, { color: c.color }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  text: { fontSize: 12, fontWeight: '600' },
});
