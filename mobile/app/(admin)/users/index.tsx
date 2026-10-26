import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { usersApi } from '@/services/adminApi';
import { s } from '@/theme/styles';
import { colors, spacing } from '@/theme';
import { SectionHeader } from '@/components/admin/SectionHeader';
import { Badge } from '@/components/admin/Badge';
import { Ionicons } from '@expo/vector-icons';

export default function UsersList() {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const [users, setUsers] = useState<any[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');

  const load = async (p = 0) => {
    setLoading(true);
    try {
      const data = await usersApi.list(p, 20);
      setUsers(data.content || []);
      setTotalPages(data.page?.totalPages || 0);
      setPage(data.page?.number || p);
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || 'No se pudieron cargar usuarios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(0); }, []);

  const filtered = users.filter((u) => {
    if (!q.trim()) return true;
    const t = q.toLowerCase();
    return `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(t);
  });

  const toggleEnable = async (u: any) => {
    try {
      if (u.enabled) await usersApi.disable(u.id); else await usersApi.enable(u.id);
      await load(page);
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || 'Acción no permitida');
    }
  };

  const remove = async (u: any) => {
    Alert.alert('Eliminar usuario', `¿Eliminar a ${u.firstName} ${u.lastName}?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => {
        try { await usersApi.remove(u.id); await load(page); } catch (e: any) { Alert.alert('Error', e?.response?.data?.message || 'No se pudo eliminar'); }
      }},
    ]);
  };

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={[s.container, { paddingBottom: spacing.xxxl }]}>
        <View style={s.header}>
          <View>
            <Text style={s.title}>Usuarios</Text>
            <Text style={s.subtitle}>Gestión de cuentas del edificio</Text>
          </View>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={s.link}>Volver</Text>
          </TouchableOpacity>
        </View>

        <View style={{ flexDirection: 'row', backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.lg, alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xl }}>
          <Ionicons name="search" size={18} color={colors.subtext} />
          <TextInput value={q} onChangeText={setQ} placeholder="Buscar por nombre o email" placeholderTextColor={colors.subtext} style={{ flex: 1, color: colors.text, paddingVertical: spacing.md }} />
        </View>

        {filtered.map((u) => (
          <View key={u.id} style={{ backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.xl, marginBottom: spacing.lg }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: spacing.md }}>
              <View style={{ flex: 1, minWidth: 220 }}>
                <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>{u.firstName} {u.lastName}</Text>
                <Text style={{ color: colors.subtext }}>{u.email}</Text>
                <Text style={{ color: colors.subtext }}>{u.phone || 'Sin teléfono'}</Text>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
                {(u.roles || []).map((r: string) => <Badge key={r} text={r} />)}
                <Badge text={u.enabled ? 'Habilitado' : 'Deshabilitado'} tone={u.enabled ? 'ok' : 'muted'} />
                {u.apartmentIdentifier ? <Badge text={u.apartmentIdentifier} tone="default" /> : null}
              </View>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.lg }}>
              <TouchableOpacity style={{ backgroundColor: colors.surface, borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderWidth: 1, borderColor: colors.border }} onPress={() => toggleEnable(u)}>
                <Text style={{ color: colors.text }}>{u.enabled ? 'Deshabilitar' : 'Habilitar'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ backgroundColor: 'rgba(239,68,68,0.18)', borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm }} onPress={() => remove(u)}>
                <Text style={{ color: '#fecaca' }}>Eliminar</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
