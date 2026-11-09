import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { getApiErrorMessage } from '@/api/axios';

type Confirm = { title: string; message: string; confirmLabel: string; destructive?: boolean };

/**
 * Ejecuta acciones sobre un elemento de lista controlando qué fila está ocupada
 * y mostrando el error del backend. Admite confirmación previa.
 */
export function useRowAction() {
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async (key: string, action: () => Promise<void>, confirm?: Confirm) => {
    const execute = async () => {
      setBusyKey(key);
      setError(null);
      try {
        await action();
      } catch (err) {
        setError(getApiErrorMessage(err));
      } finally {
        setBusyKey(null);
      }
    };

    if (!confirm) return execute();

    Alert.alert(confirm.title, confirm.message, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: confirm.confirmLabel,
        style: confirm.destructive ? 'destructive' : 'default',
        onPress: () => void execute(),
      },
    ]);
  }, []);

  return { busyKey, error, clearError: () => setError(null), run };
}
