import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { usersApi } from '@/services/adminApi';
import { s } from '@/theme/styles';
import { colors, spacing, radius } from '@/theme';
import { SectionHeader } from '@/components/admin/SectionHeader';
import { Badge } from '@/components/admin/Badge';

export default function Pending() {
  const [pending, setPending] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const data = await usersApi.pending(0, 50);
      setPending(data.content || []);
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || 'No se pudieron cargar pendientes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const enable = async (u: any) => {
    try {
      await usersApi.enable(u.id);
      Alert.alert('Habilitado', `${u.firstName} ya puede iniciar sesión`);
      await load();
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || 'No se pudo habilitar');
    }
  };

  const remove = async (u: any) => {
    Alert.alert('Eliminar', `¿Eliminar a ${u.firstName}?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => { try { await usersApi.remove(u.id); await load(); } catch (e: any) { Alert.alert('Error', e?.response?.data?.message); } } }
    ]);
  };

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={[s.container, { paddingBottom: spacing.xxxl }]}>
        <View style={s.header}>
          <View>
            <Text style={s.title}>Pendientes</Text>
            <Text style={s.subtitle}>Residentes aguardando habilitación</Text>
          </View>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={s.link}>Volver</Text>
          </TouchableOpacity>
        </View>

        {pending.length === 0 ? (
          <View style={{ alignItems: 'center', padding: spacing.xxxl }}>
            <Text style={{ color: colors.subtext }}>No hay cuentas pendientes</Text>
          </View>
        ) : pending.map((u) => (
          <View key={u.id} style={{ backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.xl, marginBottom: spacing.lg }}>
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>{u.firstName} {u.lastName}</Text>
            <Text style={{ color: colors.subtext }}>{u.email} • {u.phone || '-'}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.sm }}>
              {u.apartmentIdentifier ? <Badge text={u.apartmentIdentifier} /> : <Badge text="Sin vivienda" tone="muted" />}
              <Badge text={u.owner ? 'Propietario' : 'Inquilino'} tone={u.owner ? 'ok' : 'default'} />
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.lg }}>
              <TouchableOpacity style={{ backgroundColor: colors.primary, borderRadius: radius.md, paddingHorizontal: spacing.xl, paddingVertical: spacing.sm }} onPress={() => enable(u)}>
                <Text style={{ color: '#fff', fontWeight: '600' }}>Habilitar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ backgroundColor: 'rgba(239,68,68,0.18)', borderRadius: radius.md, paddingHorizontal: spacing.xl, paddingVertical: spacing.sm }} onPress={() => remove(u)}>
                <Text style={{ color: '#fecaca' }}>Eliminar</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
