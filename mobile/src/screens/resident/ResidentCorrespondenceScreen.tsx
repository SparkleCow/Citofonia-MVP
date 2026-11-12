import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { correspondenceApi } from '@/api/correspondence';
import { CorrespondenceDetailSheet } from '@/components/resident/CorrespondenceDetailSheet';
import { CorrespondenceCard } from '@/components/shared/CorrespondenceCard';
import { ResponsiveList } from '@/components/shared/ResponsiveList';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { FilterChips } from '@/components/ui/FilterChips';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { OPEN_CORRESPONDENCE_STATUSES } from '@/lib/status';
import type { CorrespondenceResponse } from '@/types';

type Filter = 'RECEPTION' | 'DELIVERED' | 'ALL';

const EMPTY: Record<Filter, { title: string; description: string }> = {
  RECEPTION: { title: 'Nada por recoger', description: 'Te avisaremos cuando llegue algo para tu vivienda.' },
  DELIVERED: { title: 'Sin entregas todavía', description: 'Aquí verás los paquetes que ya recogiste.' },
  ALL: { title: 'Sin correspondencia', description: 'Portería aún no ha registrado paquetes para tu vivienda.' },
};

/** Paquetes y correspondencia de la vivienda del residente (solo lectura). */
export default function ResidentCorrespondenceScreen() {
  const loader = useCallback(
    () => correspondenceApi.mine({ size: 100 }).then((page) => page.content),
    [],
  );
  const { data, loading, refreshing, error, refresh } = useAsyncResource(loader);
  const [filter, setFilter] = useState<Filter>('RECEPTION');
  const [detail, setDetail] = useState<CorrespondenceResponse | null>(null);

  const items = useMemo(() => data ?? [], [data]);
  const groups = useMemo(
    () => ({
      RECEPTION: items.filter((c) => OPEN_CORRESPONDENCE_STATUSES.includes(c.status)),
      DELIVERED: items.filter((c) => c.status === 'DELIVERED'),
      ALL: items,
    }),
    [items],
  );

  return (
    <Screen>
      <ResponsiveList
        data={groups[filter]}
        keyExtractor={(item) => String(item.id)}
        loading={loading}
        refreshing={refreshing}
        onRefresh={refresh}
        emptyIcon="cube-outline"
        emptyTitle={EMPTY[filter].title}
        emptyDescription={EMPTY[filter].description}
        header={
          <View className="gap-4">
            <ScreenHeader
              eyebrow="Mi vivienda"
              title="Paquetes"
              subtitle={
                loading
                  ? 'Cargando…'
                  : groups.RECEPTION.length
                    ? `${groups.RECEPTION.length} en recepción`
                    : 'Todo recogido'
              }
            />
            <FilterChips<Filter>
              value={filter}
              onChange={setFilter}
              options={[
                { key: 'RECEPTION', label: 'En recepción', count: groups.RECEPTION.length },
                { key: 'DELIVERED', label: 'Entregados', count: groups.DELIVERED.length },
                { key: 'ALL', label: 'Todos', count: items.length },
              ]}
            />
            {error ? <ErrorBanner message={error} onRetry={refresh} /> : null}
          </View>
        }
        renderItem={(item) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Ver detalle de ${item.description || 'paquete'}`}
            onPress={() => setDetail(item)}
            className="flex-1 active:opacity-70"
          >
            <CorrespondenceCard item={item} showApartment={false} residentView />
          </Pressable>
        )}
      />
      <CorrespondenceDetailSheet item={detail} onClose={() => setDetail(null)} />
    </Screen>
  );
}
