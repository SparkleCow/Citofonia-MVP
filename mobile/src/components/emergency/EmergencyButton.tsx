import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { getApiErrorMessage } from '@/api/axios';
import { Button } from '@/components/ui/Button';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { Input } from '@/components/ui/Input';
import { Sheet } from '@/components/ui/Sheet';
import { useEmergency } from '@/context/EmergencyContext';
import { digitsOnly } from '@/lib/validation';

type Step = 'confirm' | 'code';

type EmergencyButtonProps = {
  /** compact: botón en cabecera; full: tarjeta ancha. */
  variant?: 'compact' | 'full';
};

/**
 * Botón de emergencia: rojo y separado del resto de acciones. Pide confirmación y
 * después el código de seguridad, que solo valida el servidor (nunca está en la app).
 */
export function EmergencyButton({ variant = 'full' }: EmergencyButtonProps) {
  const { trigger, active, showAlert } = useEmergency();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>('confirm');
  const [code, setCode] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setOpen(false);
    setStep('confirm');
    setCode('');
    setMessage('');
    setError(null);
  };

  const submit = async () => {
    if (!code) {
      setError('Introduce el código de seguridad.');
      return;
    }
    setSending(true);
    setError(null);
    try {
      await trigger(code, message.trim() || undefined);
      close();
      showAlert();
    } catch (err) {
      setCode('');
      setError(getApiErrorMessage(err));
    } finally {
      setSending(false);
    }
  };

  const hasActive = active.length > 0;

  return (
    <>
      {hasActive ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Ver emergencia activa"
          onPress={showAlert}
          className="min-h-[56px] flex-row items-center gap-3 rounded-2xl bg-rose-700 px-4 active:bg-rose-800"
        >
          <Ionicons name="warning" size={24} color="#ffffff" />
          <View className="flex-1">
            <Text className="text-base font-extrabold text-white">Emergencia activa</Text>
            <Text className="text-xs text-rose-100" numberOfLines={1}>
              {active[0].message || `Activada por ${active[0].triggeredByName}`}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color="#ffffff" />
        </Pressable>
      ) : variant === 'compact' ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Botón de emergencia"
          onPress={() => setOpen(true)}
          className="h-12 flex-row items-center gap-2 rounded-full border-2 border-rose-600 bg-white px-4 active:bg-rose-50 dark:bg-ink-900"
        >
          <Ionicons name="warning" size={20} color="#e11d48" />
          <Text className="text-sm font-extrabold text-rose-700 dark:text-rose-300">SOS</Text>
        </Pressable>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Botón de emergencia: activar alerta general"
          onPress={() => setOpen(true)}
          className="min-h-[64px] flex-row items-center gap-3 rounded-2xl border-2 border-rose-600 bg-rose-50 px-4 active:bg-rose-100 dark:bg-rose-500/10"
        >
          <View className="h-11 w-11 items-center justify-center rounded-full bg-rose-600">
            <Ionicons name="warning" size={24} color="#ffffff" />
          </View>
          <View className="flex-1">
            <Text className="text-base font-extrabold text-rose-800 dark:text-rose-200">Emergencia</Text>
            <Text className="text-xs text-rose-700 dark:text-rose-300">Alerta general a todo el edificio</Text>
          </View>
        </Pressable>
      )}

      <Sheet
        visible={open}
        onClose={close}
        title={step === 'confirm' ? '¿Activar la alerta general?' : 'Código de seguridad'}
        subtitle={
          step === 'confirm'
            ? 'Se avisará de inmediato a todos los residentes, a conserjería y a administración.'
            : 'Introduce el código para confirmar. Queda registrado quién la activa.'
        }
        footer={
          step === 'confirm' ? (
            <>
              <Button title="Cancelar" variant="secondary" size="lg" onPress={close} className="flex-1" />
              <Button title="Continuar" variant="danger" size="lg" icon="warning" onPress={() => setStep('code')} className="flex-1" />
            </>
          ) : (
            <>
              <Button title="Atrás" variant="secondary" size="lg" onPress={() => setStep('confirm')} className="flex-1" />
              <Button title="Activar alerta" variant="danger" size="lg" icon="warning" loading={sending} onPress={submit} className="flex-1" />
            </>
          )
        }
      >
        {step === 'confirm' ? (
          <View className="flex-row items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-500/40 dark:bg-amber-500/10">
            <Ionicons name="information-circle" size={22} color="#b45309" />
            <Text className="flex-1 text-sm leading-5 text-amber-900 dark:text-amber-200">
              Úsala solo ante una emergencia real (incendio, intrusión, evacuación…). Los avisos falsos afectan a todo el edificio.
            </Text>
          </View>
        ) : (
          <>
            {error ? <ErrorBanner message={error} /> : null}
            <Input
              label="Código de seguridad"
              icon="key-outline"
              value={code}
              onChangeText={(value) => {
                setCode(digitsOnly(value, 8));
                setError(null);
              }}
              digitsOnly
              secureTextEntry
              maxLength={8}
              autoFocus
              placeholder="••••"
            />
            <Input
              label="¿Qué ocurre? (opcional)"
              value={message}
              onChangeText={setMessage}
              maxLength={200}
              placeholder="Incendio en el sótano"
            />
          </>
        )}
      </Sheet>
    </>
  );
}
