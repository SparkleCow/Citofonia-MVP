import { useState } from 'react';
import { View, Text, TextInput, Pressable, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { s } from '@/theme/styles';

export default function Register() {
  const { register } = useAuth();
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', password: '', phone: '', documentNumber: '', registrationCode: '', apartmentId: ''
  });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const onSubmit = async () => {
    setErr(null);
    if (!form.firstName || !form.lastName || !form.email || !form.password || !form.phone || !form.registrationCode) return setErr('Campos obligatorios incompletos');
    setLoading(true);
    try {
      const payload: any = { ...form };
      if (payload.apartmentId) payload.apartmentId = Number(payload.apartmentId);
      payload.owner = true; payload.occupiesApartment = true;
      await register(payload);
      setOk(true);
    } catch (e: any) {
      const st = e?.response?.status;
      if (st === 409) setErr('Correo ya registrado');
      else if (st === 400) setErr(e?.response?.data?.message || 'Código inválido');
      else setErr(e?.response?.data?.message || 'Error al registrar');
    } finally {
      setLoading(false);
    }
  };

  if (ok) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.center}>
          <View style={s.card}>
            <Text style={s.title}>Registro enviado</Text>
            <Text style={s.subtitle}>Cuenta creada. Espera habilitación por administración.</Text>
            <Link href="/(auth)/login" asChild>
              <Pressable style={[s.btn, { marginTop: 16 }]}>
                <Text style={s.btnText}>Volver al login</Text>
              </Pressable>
            </Link>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.screen}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 16 }} keyboardShouldPersistTaps="handled">
          <View style={[s.card, { maxWidth: 520, alignSelf: 'center' }]}>
            <Text style={s.title}>Registro de residente</Text>
            <Text style={s.subtitle}>Usa el código de registro del edificio</Text>

            <Text style={s.label}>Nombre *</Text>
            <TextInput style={s.input} onChangeText={v => set('firstName', v)} />
            <Text style={s.label}>Apellido *</Text>
            <TextInput style={s.input} onChangeText={v => set('lastName', v)} />
            <Text style={s.label}>Correo *</Text>
            <TextInput style={s.input} autoCapitalize="none" keyboardType="email-address" onChangeText={v => set('email', v)} />
            <Text style={s.label}>Contraseña *</Text>
            <TextInput style={s.input} secureTextEntry onChangeText={v => set('password', v)} />
            <Text style={s.label}>Teléfono *</Text>
            <TextInput style={s.input} keyboardType="phone-pad" onChangeText={v => set('phone', v)} />
            <Text style={s.label}>Documento</Text>
            <TextInput style={s.input} onChangeText={v => set('documentNumber', v)} />
            <Text style={s.label}>Código de registro *</Text>
            <TextInput style={s.input} autoCapitalize="none" onChangeText={v => set('registrationCode', v)} />
            <Text style={s.label}>ID Apartamento</Text>
            <TextInput style={s.input} keyboardType="numeric" onChangeText={v => set('apartmentId', v)} />
            {err ? <Text style={s.error}>{err}</Text> : null}
            <Pressable style={s.btn} onPress={onSubmit} disabled={loading}>
              <Text style={s.btnText}>{loading ? 'Registrando...' : 'Registrarse'}</Text>
            </Pressable>
            <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 16 }}>
              <Text style={{ color: '#cbd5f5' }}>¿Ya tienes cuenta? </Text>
              <Link href="/(auth)/login" asChild>
                <Pressable>
                  <Text style={s.link}>Iniciar sesión</Text>
                </Pressable>
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
