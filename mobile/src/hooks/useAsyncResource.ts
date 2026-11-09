import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { getApiErrorMessage } from '@/api/axios';

type Options = {
  /** Recarga al volver a enfocar la pantalla (por defecto true). */
  reloadOnFocus?: boolean;
};

/**
 * Carga un recurso remoto con estados de carga/refresco/error.
 * `loader` debe ser estable (useCallback) para evitar recargas en bucle.
 */
export function useAsyncResource<T>(loader: () => Promise<T>, { reloadOnFocus = true }: Options = {}) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loaded = useRef(false);

  const run = useCallback(
    async (mode: 'initial' | 'refresh' | 'silent') => {
      if (mode === 'initial') setLoading(true);
      if (mode === 'refresh') setRefreshing(true);
      try {
        const result = await loader();
        setData(result);
        setError(null);
        loaded.current = true;
      } catch (err) {
        setError(getApiErrorMessage(err));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [loader],
  );

  useFocusEffect(
    useCallback(() => {
      if (!loaded.current) {
        void run('initial');
      } else if (reloadOnFocus) {
        void run('silent');
      }
    }, [run, reloadOnFocus]),
  );

  return {
    data,
    setData,
    loading,
    refreshing,
    error,
    refresh: () => run('refresh'),
    reload: () => run('silent'),
  };
}
