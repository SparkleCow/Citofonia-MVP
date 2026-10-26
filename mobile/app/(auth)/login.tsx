import { useState } from 'react';
import { View, Text, TextInput, Pressable, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { s } from '@/theme/styles';

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    setErr(null);
    if (!email.trim() || !password) return setErr('Ingresa correo y contraseña');
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (e: any) {
      const st = e?.response?.status;
      if (st === 401) setErr('Credenciales incorrectas');
      else if (st === 403) setErr('Cuenta deshabilitada o pendiente de habilitación');
      else if (st === 429) setErr('Demasiados intentos');
      else setErr(e?.response?.data?.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.screen}>
        <ScrollView contentContainerStyle={s.center} keyboardShouldPersistTaps="handled">
          <View style={s.card}>
            <Text style={s.title}>Citofonía</Text>
            <Text style={s.subtitle}>Acceso al sistema</Text>

            <Text style={s.label}>Correo</Text>
            <TextInput style={s.input} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />

            <Text style={s.label}>Contraseña</Text>
            <TextInput style={s.input} value={password} onChangeText={setPassword} secureTextEntry />

            {err ? <Text style={s.error}>{err}</Text> : null}

            <Pressable style={s.btn} onPress={onSubmit} disabled={loading}>
              <Text style={s.btnText}>{loading ? 'Entrando...' : 'Entrar'}</Text>
            </Pressable>

            <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 16 }}>
              <Text style={{ color: '#cbd5f5' }}>¿No tienes cuenta? </Text>
              <Link href="/(auth)/register" asChild>
                <Pressable>
                  <Text style={s.link}>Regístrate</Text>
                </Pressable>
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
