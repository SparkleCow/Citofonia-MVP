import { Ionicons } from '@expo/vector-icons';
import React, { useCallback } from 'react';
import { Pressable, Text, View } from 'react-native';
import { emergenciesApi } from '@/api/emergencies';
import { EmergencyButton } from '@/components/emergency/EmergencyButton';
import { ResponsiveList } from '@/components/shared/ResponsiveList';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useEmergency } from '@/context/EmergencyContext';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { useRowAction } from '@/hooks/useRowAction';
import { formatDateTime } from '@/lib/format';
import { goBack } from '@/lib/navigation';
import type { EmergencyResponse } from '@/types';

type EmergenciesScreenProps = {
  /** Ruta a la que volver si no hay historial de navegación. */
  fallback: string;
};

/** Historial de emergencias (ADMIN / CONCIERGE) con opción de resolver las activas. */
export function EmergenciesScreen({ fallback }: EmergenciesScreenProps) {
  const { resolve, active } = useEmergency();
  const loader = useCallback(() => emergenciesApi.history(0, 100).then((page) => page.content), []);
  const { data, setData, loading, refreshing, error, refresh } = useAsyncResource(loader);
  const { busyKey, error: actionError, run } = useRowAction();

  // Las alertas que llegan en vivo se reflejan sin recargar.
  const history = data ?? [];
  const items: EmergencyResponse[] = [
    ...active.filter((a) => !history.some((d) => d.id === a.id)),
    ...history,
  ];

  return (
    <Screen>
      <ResponsiveList
        data={items}
        keyExtractor={(item) => String(item.id)}
        loading={loading}
        refreshing={refreshing}
        onRefresh={refresh}
        emptyIcon="shield-checkmark-outline"
        emptyTitle="Sin emergencias registradas"
        emptyDescription="Cuando alguien active la alerta general quedará registrada aquí."
        header={
          <View className="gap-4">
            <ScreenHeader
              eyebrow="Seguridad"
              title="Emergencias"
              subtitle={`${items.filter((e) => e.status === 'ACTIVE').length} activa(s)`}
              right={
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Volver"
                  onPress={() => goBack(fallback)}
                  className="h-12 w-12 items-center justify-center rounded-full bg-ink-100 active:opacity-70 dark:bg-ink-800"
                >
                  <Ionicons name="arrow-back" size={22} color="#4a5c98" />
                </Pressable>
              }
            />
            <EmergencyButton />
            {error ? <ErrorBanner message={error} onRetry={refresh} /> : null}
            {actionError ? <ErrorBanner message={actionError} /> : null}
          </View>
        }
        renderItem={(item) => {
          const isActive = item.status === 'ACTIVE';
          return (
            <View
              className={`flex-1 rounded-2xl border p-4 ${
                isActive
                  ? 'border-rose-400 bg-rose-50 dark:border-rose-500/50 dark:bg-rose-500/10'
                  : 'border-ink-200 bg-white dark:border-ink-800 dark:bg-ink-900'
              }`}
            >
              <View className="flex-row items-center gap-2">
                <Ionicons name="warning" size={18} color={isActive ? '#e0405a' : '#6377b5'} />
                <Text className="flex-1 text-base font-bold text-ink-950 dark:text-white" numberOfLines={2}>
                  {item.message || 'Alerta general'}
                </Text>
                <Badge label={isActive ? 'Activa' : 'Resuelta'} tone={isActive ? 'danger' : 'success'} />
              </View>
              <Text className="mt-2 text-[13px] text-ink-700 dark:text-ink-200">
                Activada por <Text className="font-bold">{item.triggeredByName}</Text>
                {item.triggeredFromApartment ? ` (apto. ${item.triggeredFromApartment})` : ''} ·{' '}
                {formatDateTime(item.createdAt)}
              </Text>
              <Text className="text-[13px] text-ink-600 dark:text-ink-300">{item.notifiedCount} persona(s) avisadas</Text>
              {!isActive ? (
                <Text className="mt-1 text-[13px] text-ink-600 dark:text-ink-300">
                  Resuelta por {item.resolvedByEmail ?? '—'} · {formatDateTime(item.resolvedAt)}
                  {item.resolutionNotes ? `\n“${item.resolutionNotes}”` : ''}
                </Text>
              ) : (
                <View className="mt-3">
                  <Button
                    title="Marcar como resuelta"
                    icon="checkmark-circle"
                    variant="success"
                    loading={busyKey === `r-${item.id}`}
                    onPress={() =>
                      run(
                        `r-${item.id}`,
                        async () => {
                          const updated = await resolve(item.id);
                          setData((current) => (current ?? []).map((e) => (e.id === updated.id ? updated : e)));
                        },
                        {
                          title: 'Resolver emergencia',
                          message: 'Se avisará a todos de que la alerta ha terminado.',
                          confirmLabel: 'Resolver',
                        },
                      )
                    }
                    fullWidth
                  />
                </View>
              )}
            </View>
          );
        }}
      />
    </Screen>
  );
}
