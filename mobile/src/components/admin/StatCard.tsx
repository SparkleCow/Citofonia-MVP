import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, radius, spacing } from '@/theme';

export function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <View style={styles.card}>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 140,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    alignItems: 'center',
    gap: 4,
  },
  value: { color: colors.text, fontSize: 28, fontWeight: '800' },
  label: { color: colors.subtext, fontSize: 13 },
});
