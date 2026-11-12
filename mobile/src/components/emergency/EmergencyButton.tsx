import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, Text } from 'react-native';
import { getApiErrorMessage } from '@/api/axios';
import { Button } from '@/components/ui/Button';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { Input } from '@/components/ui/Input';
import { Sheet } from '@/components/ui/Sheet';
import { useEmergency } from '@/context/EmergencyContext';
import { digitsOnly } from '@/lib/validation';

type TriggerProps = {
  onPress: () => void;
  /** Hay una alerta en curso: el botón la muestra en lugar de crear otra. */
  active: boolean;
};

type EmergencyButtonProps = {
  /** Ruta del historial de alertas; se ofrece como enlace dentro de la hoja. */
  historyPath?: string;
  /** Botón propio (tile, acción…). Sin él se pinta la píldora "SOS". */
  children?: (props: TriggerProps) => React.ReactNode;
};

/**
 * Alerta general (solo ADMIN/CONCIERGE). Un toque abre directamente el código de
 * seguridad, que solo valida el servidor (nunca está en la app).
 */
export function EmergencyButton({ historyPath, children }: EmergencyButtonProps) {
  const { trigger, active, showAlert, canTrigger } = useEmergency();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Exclusivo de portería/conserjería y administración.
  if (!canTrigger) return null;

  const close = () => {
    setOpen(false);
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
  const onPress = hasActive ? showAlert : () => setOpen(true);

  return (
    <>
      {children ? (
        children({ onPress, active: hasActive })
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={hasActive ? 'Ver emergencia activa' : 'Activar alerta de emergencia'}
          onPress={onPress}
          className={`h-12 flex-row items-center gap-2 self-start rounded-full border px-4 shadow-md shadow-ink-950/50 active:scale-95 ${
            hasActive ? 'border-rose-300 bg-rose-700 active:bg-rose-800' : 'border-rose-400 bg-rose-600 active:bg-rose-700'
          }`}
        >
          <Ionicons name="warning" size={20} color="#ffffff" />
          <Text className="text-sm font-extrabold text-white">{hasActive ? 'Emergencia activa' : 'Activar alerta'}</Text>
        </Pressable>
      )}

      <Sheet
        visible={open}
        onClose={close}
        title="Alerta de emergencia"
        subtitle="Introduce el código para avisar a todo el edificio. Queda registrado quién la activa."
        footer={
          <>
            <Button title="Cancelar" variant="secondary" size="lg" onPress={close} className="flex-1" />
            <Button title="Activar alerta" variant="danger" size="lg" icon="warning" loading={sending} onPress={submit} className="flex-1" />
          </>
        }
      >
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
          onSubmitEditing={submit}
        />
        <Input
          label="¿Qué ocurre? (opcional)"
          value={message}
          onChangeText={setMessage}
          maxLength={200}
          placeholder="Incendio en el sótano"
        />
        {historyPath ? (
          <Button
            title="Ver historial de alertas"
            variant="ghost"
            size="sm"
            icon="time-outline"
            onPress={() => {
              close();
              router.push(historyPath as never);
            }}
          />
        ) : null}
      </Sheet>
    </>
  );
}
