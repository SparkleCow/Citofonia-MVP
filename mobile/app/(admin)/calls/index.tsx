import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { callsApi } from '@/services/adminApi';
import { s } from '@/theme/styles';
import { colors, spacing, radius } from '@/theme';
import { Badge } from '@/components/admin/Badge';

export default function Calls() {
  const [staff, setStaff] = useState<any[]>([]);
  const [apartments, setApartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [sList, aList] = await Promise.all([callsApi.staff(), callsApi.apartments()]);
        setStaff(sList || []);
        setApartments(aList || []);
      } catch (e: any) {
        Alert.alert('Error', e?.response?.data?.message || 'No se pudo cargar directorio');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={[s.container, { paddingBottom: spacing.xxxl }]}>
        <View style={s.header}>
          <View>
            <Text style={s.title}>Llamar</Text>
            <Text style={s.subtitle}>Citófono • Listo para WebRTC</Text>
          </View>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={s.link}>Volver</Text>
          </TouchableOpacity>
        </View>

        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: spacing.lg }}>Portería / Personal</Text>
        {staff.map((m) => (
          <View key={m.id} style={{ backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.xl, marginBottom: spacing.lg, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: spacing.md }}>
            <View>
              <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700' }}>{m.firstName} {m.lastName}</Text>
              <Text style={{ color: colors.subtext }}>{m.email}</Text>
              <View style={{ flexDirection: 'row', gap: spacing.xs, marginTop: spacing.xs }}>
                {(m.roles || []).map((r: string) => <Badge key={r} text={r} />)}
              </View>
            </View>
            <TouchableOpacity style={{ backgroundColor: colors.primary, borderRadius: radius.md, paddingHorizontal: spacing.xl, paddingVertical: spacing.sm }}>
              <Text style={{ color: '#fff', fontWeight: '600' }}>Llamar</Text>
            </TouchableOpacity>
          </View>
        ))}

        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700', marginTop: spacing.xl, marginBottom: spacing.lg }}>Apartamentos</Text>
        {apartments.map((a) => (
          <View key={a.id} style={{ backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.xl, marginBottom: spacing.lg, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: spacing.md }}>
            <View>
              <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700' }}>{a.identifier}</Text>
              <Text style={{ color: colors.subtext }}>{a.block ? `Bloque ${a.block}` : ''} {a.residentCount} residente(s)</Text>
            </View>
            <TouchableOpacity style={{ backgroundColor: colors.primary, borderRadius: radius.md, paddingHorizontal: spacing.xl, paddingVertical: spacing.sm }}>
              <Text style={{ color: '#fff', fontWeight: '600' }}>Llamar a vivienda</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
