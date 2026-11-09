import { Ionicons } from '@expo/vector-icons';
import { Link, Redirect } from 'expo-router';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { ApiError } from '@/api/axios';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Screen } from '@/components/ui/Screen';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function friendlyError(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 401) return 'Email o contraseña incorrectos. Revisa los datos e inténtalo de nuevo.';
    // El servidor distingue "registro pendiente de aprobación" de "cuenta deshabilitada".
    if (error.status === 403) return error.message || 'Tu cuenta aún no está habilitada. Contacta con la administración.';
    if (error.status === 429) return 'Demasiados intentos. Espera unos minutos antes de volver a probar.';
    return error.message;
  }
  return error instanceof Error ? error.message : 'No se pudo iniciar sesión. Inténtalo de nuevo.';
}

export default function LoginScreen() {
  const { login, isAuth, user, homeFor } = useAuth();
  const { isDark } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (isAuth && user) {
    return <Redirect href={homeFor(user.roles) as never} />;
  }

  const validate = () => {
    let valid = true;
    if (!EMAIL_REGEX.test(email.trim())) {
      setEmailError('Introduce un email válido.');
      valid = false;
    }
    if (!password) {
      setPasswordError('Introduce tu contraseña.');
      valid = false;
    }
    return valid;
  };

  const onSubmit = async () => {
    setError(null);
    setEmailError(null);
    setPasswordError(null);
    if (!validate()) return;

    setLoading(true);
    try {
      await login(email, password);
    } catch (submitError) {
      setError(friendlyError(submitError));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen className="overflow-hidden">
      <View className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand-200/60 dark:bg-brand-700/20" />
      <View className="absolute -bottom-28 -left-24 h-80 w-80 rounded-full bg-sky-200/50 dark:bg-sky-800/20" />

      <KeyboardAvoidingView
        className="flex-1"
        behavior="padding"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="mx-auto w-full max-w-[440px]">
            <View className="mb-8 items-center">
              <View className="h-16 w-16 items-center justify-center rounded-[22px] bg-brand-600 shadow-soft">
                <Ionicons name="call" size={30} color="#ffffff" />
              </View>
              <Text className="mt-4 text-3xl font-extrabold tracking-tight text-ink-900 dark:text-ink-50">
                Citofonía Fácil
              </Text>
              <Text className="mt-1 text-center text-sm text-ink-500 dark:text-ink-400">
                La portería de tu edificio, siempre conectada.
              </Text>
            </View>

            <View className="rounded-[28px] border border-ink-200/80 bg-white/95 p-6 shadow-soft dark:border-ink-800 dark:bg-ink-900/95">
              <View className="mb-5">
                <View className="mb-2 self-start rounded-full bg-brand-100 px-3 py-1 dark:bg-brand-500/20">
                  <Text className="text-[11px] font-bold uppercase tracking-wider text-brand-700 dark:text-brand-200">
                    Acceso administración
                  </Text>
                </View>
                <Text className="text-2xl font-bold text-ink-900 dark:text-ink-50">Bienvenido</Text>
                <Text className="mt-1 text-sm leading-5 text-ink-500 dark:text-ink-400">
                  Accede al portal del edificio con tu email y contraseña.
                </Text>
              </View>

              <View className="gap-4">
                <Input
                  label="Email"
                  icon="mail-outline"
                  value={email}
                  onChangeText={(value) => {
                    setEmail(value);
                    setEmailError(null);
                    setError(null);
                  }}
                  placeholder="ejemplo@correo.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  returnKeyType="next"
                  error={emailError}
                />

                <Input
                  label="Contraseña"
                  icon="lock-closed-outline"
                  value={password}
                  onChangeText={(value) => {
                    setPassword(value);
                    setPasswordError(null);
                    setError(null);
                  }}
                  placeholder="Tu contraseña"
                  secureToggle
                  autoComplete="current-password"
                  returnKeyType="go"
                  onSubmitEditing={onSubmit}
                  error={passwordError}
                />

                {error ? (
                  <View className="flex-row items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 dark:border-rose-500/30 dark:bg-rose-500/10">
                    <Ionicons name="alert-circle" size={18} color="#e11d48" />
                    <Text className="flex-1 text-sm leading-5 text-rose-700 dark:text-rose-300">
                      {error}
                    </Text>
                  </View>
                ) : null}

                <Button
                  title={loading ? 'Entrando...' : 'Entrar'}
                  onPress={onSubmit}
                  loading={loading}
                  size="lg"
                  fullWidth
                  className="mt-1"
                />
              </View>

              <View className="mt-6 flex-row items-center justify-center gap-1">
                <Text className="text-sm text-ink-500 dark:text-ink-400">
                  ¿Todavía no tienes cuenta?
                </Text>
                <Link href="/(auth)/register" asChild>
                  <Pressable>
                    <Text className="text-sm font-bold text-brand-600 dark:text-brand-300">
                      Regístrate
                    </Text>
                  </Pressable>
                </Link>
              </View>
            </View>

            <View className="mt-5 flex-row items-center justify-center gap-4">
              <View className="flex-row items-center gap-1.5">
                <Ionicons name="shield-checkmark-outline" size={14} color={isDark ? '#6f87ab' : '#93a8c7'} />
                <Text className="text-[11px] text-ink-500 dark:text-ink-400">Sesión protegida</Text>
              </View>
              <View className="h-1 w-1 rounded-full bg-ink-300 dark:bg-ink-700" />
              <Text className="text-[11px] text-ink-500 dark:text-ink-400">Datos cifrados</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
