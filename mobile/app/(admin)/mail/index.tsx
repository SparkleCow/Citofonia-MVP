import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useState } from 'react';
import { mailApi } from '@/services/adminApi';
import { s } from '@/theme/styles';
import { colors, spacing, radius } from '@/theme';

export default function SendMail() {
  const [form, setForm] = useState({ subject: '', body: '', audience: 'ALL' });
  const [loading, setLoading] = useState(false);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const send = async () => {
    if (!form.subject || !form.body) return Alert.alert('Faltan datos', 'Asunto y mensaje obligatorios');
    setLoading(true);
    try {
      const res = await mailApi.send(form);
      Alert.alert('Enviado', `Mensaje enviado a ${res.recipientCount} destinatarios`, [{ text: 'OK', onPress: () => router.back() }]);
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || 'No se pudo enviar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={[s.container, { paddingBottom: spacing.xxxl }]}>
        <View style={s.header}>
          <View>
            <Text style={s.title}>Enviar mensaje</Text>
            <Text style={s.subtitle}>Al buzón del edificio</Text>
          </View>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={s.link}>Volver</Text>
          </TouchableOpacity>
        </View>

        <View style={{ backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.xl, gap: spacing.md }}>
          <View>
            <Text style={{ color: colors.text, marginBottom: 6 }}>Asunto *</Text>
            <TextInput style={{ borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, color: colors.text, backgroundColor: colors.surface }} value={form.subject} onChangeText={(v) => set('subject', v)} />
          </View>
          <View>
            <Text style={{ color: colors.text, marginBottom: 6 }}>Mensaje *</Text>
            <TextInput style={{ borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, color: colors.text, backgroundColor: colors.surface, minHeight: 140, textAlignVertical: 'top' }} multiline value={form.body} onChangeText={(v) => set('body', v)} />
          </View>
          <View>
            <Text style={{ color: colors.text, marginBottom: 8 }}>Destinatarios</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              {['ALL', 'RESIDENTS', 'CONCIERGE'].map((a) => (
                <TouchableOpacity key={a} onPress={() => set('audience', a)} style={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.md, backgroundColor: form.audience === a ? colors.primary : colors.surface, borderWidth: 1, borderColor: form.audience === a ? colors.primary : colors.border }}>
                  <Text style={{ color: form.audience === a ? '#fff' : colors.text }}>{a === 'ALL' ? 'Todos' : a === 'RESIDENTS' ? 'Residentes' : 'Conserjería'}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity style={{ backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: spacing.lg, alignItems: 'center', marginTop: spacing.md }} onPress={send} disabled={loading}>
            <Text style={{ color: '#fff', fontWeight: '700' }}>{loading ? 'Enviando...' : 'Enviar mensaje'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
