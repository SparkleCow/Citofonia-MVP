import { StyleSheet } from 'react-native';
import { colors, radius, spacing } from './index';

export const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  screen: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl, backgroundColor: colors.bg },
  container: { flex: 1, backgroundColor: colors.bg, padding: spacing.xl },
  card: { width: '100%', maxWidth: 420, backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.xxl },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, color: colors.text, backgroundColor: colors.surface, marginBottom: spacing.lg },
  label: { color: colors.text, marginBottom: spacing.xs },
  btn: { backgroundColor: colors.primary, padding: spacing.lg, borderRadius: radius.md, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '600' },
  title: { color: colors.text, fontSize: 24, fontWeight: '700' },
  subtitle: { color: colors.subtext, marginTop: spacing.xs },
  link: { color: colors.primary, fontWeight: '600' },
  error: { color: colors.danger, marginBottom: spacing.md },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xxl, flexWrap: 'wrap', gap: spacing.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg },
  panel: { flexGrow: 1, flexBasis: '30%', minWidth: 280, backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.xl },
  panelText: { color: colors.subtext },
});
