import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { usersApi } from '@/api/admin';
import { getApiErrorMessage } from '@/api/axios';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Screen } from '@/components/ui/Screen';
import { LIMITS, digitsOnly, validators } from '@/lib/validation';

type FormState = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  documentNumber: string;
  password: string;
};

const emptyForm: FormState = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  documentNumber: '',
  password: '',
};

export default function CreateStaffScreen() {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
    setSubmitError(null);
  };

  const validate = () => {
    const nextErrors: Partial<Record<keyof FormState, string>> = {};
    if (!form.firstName.trim()) nextErrors.firstName = 'El nombre es obligatorio.';
    if (!form.lastName.trim()) nextErrors.lastName = 'Los apellidos son obligatorios.';
    const emailError = validators.email(form.email);
    if (emailError) nextErrors.email = emailError;
    const passwordError = validators.password(form.password);
    if (passwordError) nextErrors.password = passwordError;
    const phoneError = validators.phone(form.phone);
    if (phoneError) nextErrors.phone = phoneError;
    const documentError = validators.document(form.documentNumber);
    if (documentError) nextErrors.documentNumber = documentError;
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    setSaving(true);
    setSubmitError(null);
    try {
      const email = form.email.trim().toLowerCase();
      const name = `${form.firstName.trim()} ${form.lastName.trim()}`.trim();
      await usersApi.create({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email,
        phone: form.phone || null,
        documentNumber: form.documentNumber || null,
        password: form.password,
        roles: ['CONCIERGE'],
      });
      Alert.alert('Conserje creado', `${name} ya puede iniciar sesión con ${email}.`, [
        { text: 'Aceptar', onPress: () => router.back() },
      ]);
    } catch (error) {
      setSubmitError(getApiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        behavior="padding"
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 32 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="flex-row items-start justify-between gap-3">
            <View className="flex-1">
              <Text className="text-2xl font-extrabold text-ink-900 dark:text-ink-50">
                Crear conserje
              </Text>
              <Text className="mt-1 text-sm text-ink-500 dark:text-ink-400">
                Alta directa de personal de portería.
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Volver"
              onPress={() => router.back()}
              className="h-10 w-10 items-center justify-center rounded-full bg-ink-100 active:opacity-80 dark:bg-ink-800"
            >
              <Ionicons name="arrow-back" size={20} color="#6f87ab" />
            </Pressable>
          </View>

          <View className="mt-5 rounded-3xl border border-ink-200 bg-white p-5 dark:border-ink-800 dark:bg-ink-900">
            <View className="gap-4">
              <View className="flex-row gap-3">
                <Input
                  label="Nombre"
                  value={form.firstName}
                  onChangeText={(value) => update('firstName', value)}
                  placeholder="Javier"
                  autoCapitalize="words"
                  error={errors.firstName}
                  containerClassName="flex-1"
                />
                <Input
                  label="Apellidos"
                  value={form.lastName}
                  onChangeText={(value) => update('lastName', value)}
                  placeholder="Salinas"
                  autoCapitalize="words"
                  error={errors.lastName}
                  containerClassName="flex-1"
                />
              </View>

              <Input
                label="Email"
                icon="mail-outline"
                value={form.email}
                onChangeText={(value) => update('email', value)}
                placeholder="conserje@citofonia.local"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                error={errors.email}
              />

              <View className="flex-row gap-3">
                <Input
                  label="Teléfono"
                  icon="call-outline"
                  digitsOnly
                  value={form.phone}
                  onChangeText={(value) => update('phone', digitsOnly(value, LIMITS.phone.max))}
                  maxLength={LIMITS.phone.max}
                  placeholder="3001234567"
                  error={errors.phone}
                  containerClassName="flex-1"
                />
                <Input
                  label="Cédula"
                  icon="card-outline"
                  digitsOnly
                  value={form.documentNumber}
                  onChangeText={(value) => update('documentNumber', digitsOnly(value, LIMITS.document.max))}
                  maxLength={LIMITS.document.max}
                  placeholder="1000123456"
                  error={errors.documentNumber}
                  containerClassName="flex-1"
                />
              </View>

              <Input
                label="Contraseña inicial"
                icon="lock-closed-outline"
                value={form.password}
                onChangeText={(value) => update('password', value)}
                placeholder="Mínimo 8 caracteres"
                secureToggle
                autoCapitalize="none"
                hint="Cuenta habilitada, con rol de conserjería y sin apartamento."
                error={errors.password}
              />

              {submitError ? (
                <View className="flex-row items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 dark:border-rose-500/30 dark:bg-rose-500/10">
                  <Ionicons name="alert-circle" size={18} color="#e11d48" />
                  <Text className="flex-1 text-sm text-rose-700 dark:text-rose-300">
                    {submitError}
                  </Text>
                </View>
              ) : null}
            </View>

            <View className="mt-5">
              <Button
                title="Crear conserje"
                icon="person-add-outline"
                onPress={submit}
                loading={saving}
                fullWidth
              />
            </View>
          </View>

          <View className="mt-4 flex-row items-start gap-2 rounded-2xl border border-brand-100 bg-brand-50 px-4 py-3 dark:border-brand-500/20 dark:bg-brand-500/10">
            <Ionicons name="information-circle-outline" size={18} color="#1d6af0" />
            <Text className="flex-1 text-xs leading-5 text-brand-700 dark:text-brand-200">
              El conserje podrá iniciar sesión de inmediato con el email y la contraseña indicados.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
