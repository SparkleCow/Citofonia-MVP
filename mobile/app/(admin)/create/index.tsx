import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useState } from 'react';
import { usersApi } from '@/services/adminApi';
import { s } from '@/theme/styles';
import { colors, spacing, radius } from '@/theme';

export default function CreateConcierge() {
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', documentNumber: '', password: '' });
  const [loading, setLoading] = useState(false);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.firstName || !form.lastName || !form.email || !form.password) {
      return Alert.alert('Faltan datos', 'Completa los campos obligatorios');
    }
    setLoading(true);
    try {
      await usersApi.create({ ...form, roles: ['CONCIERGE'] });
      Alert.alert('Creado', 'Cuenta de conserje habilitada correctamente', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || 'No se pudo crear');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={[s.container, { paddingBottom: spacing.xxxl }]}>
        <View style={s.header}>
          <View>
            <Text style={s.title}>Crear conserje</Text>
            <Text style={s.subtitle}>Cuenta habilitada directamente</Text>
          </View>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={s.link}>Volver</Text>
          </TouchableOpacity>
        </View>

        <View style={{ backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.xl, gap: spacing.md }}>
          <View>
            <Text style={{ color: colors.text, marginBottom: 6 }}>Nombre *</Text>
            <TextInput style={{ borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, color: colors.text, backgroundColor: colors.surface }} value={form.firstName} onChangeText={(v) => set('firstName', v)} />
          </View>
          <View>
            <Text style={{ color: colors.text, marginBottom: 6 }}>Apellido *</Text>
            <TextInput style={{ borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, color: colors.text, backgroundColor: colors.surface }} value={form.lastName} onChangeText={(v) => set('lastName', v)} />
          </View>
          <View>
            <Text style={{ color: colors.text, marginBottom: 6 }}>Email *</Text>
            <TextInput style={{ borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, color: colors.text, backgroundColor: colors.surface }} autoCapitalize="none" keyboardType="email-address" value={form.email} onChangeText={(v) => set('email', v)} />
          </View>
          <View>
            <Text style={{ color: colors.text, marginBottom: 6 }}>Teléfono</Text>
            <TextInput style={{ borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, color: colors.text, backgroundColor: colors.surface }} keyboardType="phone-pad" value={form.phone} onChangeText={(v) => set('phone', v)} />
          </View>
          <View>
            <Text style={{ color: colors.text, marginBottom: 6 }}>Documento</Text>
            <TextInput style={{ borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, color: colors.text, backgroundColor: colors.surface }} value={form.documentNumber} onChangeText={(v) => set('documentNumber', v)} />
          </View>
          <View>
            <Text style={{ color: colors.text, marginBottom: 6 }}>Contraseña *</Text>
            <TextInput style={{ borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, color: colors.text, backgroundColor: colors.surface }} secureTextEntry value={form.password} onChangeText={(v) => set('password', v)} />
          </View>

          <TouchableOpacity style={{ backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: spacing.lg, alignItems: 'center', marginTop: spacing.md }} onPress={submit} disabled={loading}>
            <Text style={{ color: '#fff', fontWeight: '700' }}>{loading ? 'Creando...' : 'Crear conserje'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
