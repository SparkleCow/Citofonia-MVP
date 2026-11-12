import { View, Text, StyleSheet } from 'react-native';

export function Badge({ text, tone = 'default' }: { text: string; tone?: 'default' | 'ok' | 'warn' | 'muted' }) {
  const map = {
    default: { bg: 'rgba(66,103,242,0.18)', color: '#bdd0ff' },
    ok: { bg: 'rgba(18,163,114,0.18)', color: '#6ad7ab' },
    warn: { bg: 'rgba(226,136,14,0.18)', color: '#fdd88a' },
    muted: { bg: 'rgba(148,163,184,0.18)', color: '#b3c1e6' },
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
