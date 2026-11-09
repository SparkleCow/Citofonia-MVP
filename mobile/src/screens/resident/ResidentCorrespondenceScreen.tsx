import React, { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';
import { correspondenceApi } from '@/api/correspondence';
import { CorrespondenceCard } from '@/components/shared/CorrespondenceCard';
import { ResponsiveList } from '@/components/shared/ResponsiveList';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { FilterChips } from '@/components/ui/FilterChips';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { OPEN_CORRESPONDENCE_STATUSES } from '@/lib/status';

type Filter = 'PENDING' | 'ALL';

/** Correspondencia de la vivienda del residente (solo lectura). */
export default function ResidentCorrespondenceScreen() {
  const loader = useCallback(
    () => correspondenceApi.mine({ size: 50 }).then((page) => page.content),
    [],
  );
  const { data, loading, refreshing, error, refresh } = useAsyncResource(loader);
  const [filter, setFilter] = useState<Filter>('PENDING');

  const items = useMemo(() => data ?? [], [data]);
  const pending = useMemo(
    () => items.filter((c) => OPEN_CORRESPONDENCE_STATUSES.includes(c.status)),
    [items],
  );

  return (
    <Screen>
      <ResponsiveList
        data={filter === 'PENDING' ? pending : items}
        keyExtractor={(item) => String(item.id)}
        loading={loading}
        refreshing={refreshing}
        onRefresh={refresh}
        emptyIcon="cube-outline"
        emptyTitle={filter === 'PENDING' ? 'Nada por recoger' : 'Sin correspondencia'}
        emptyDescription="Te avisaremos cuando llegue algo para tu vivienda."
        header={
          <View className="gap-4">
            <ScreenHeader
              eyebrow="Mi vivienda"
              title="Correspondencia"
              subtitle={pending.length ? `${pending.length} por recoger` : 'Todo recogido'}
            />
            <FilterChips<Filter>
              value={filter}
              onChange={setFilter}
              options={[
                { key: 'PENDING', label: 'Por recoger', count: pending.length },
                { key: 'ALL', label: 'Historial', count: items.length },
              ]}
            />
            {error ? <ErrorBanner message={error} onRetry={refresh} /> : null}
          </View>
        }
        renderItem={(item) => <CorrespondenceCard item={item} showApartment={false} />}
      />
    </Screen>
  );
}
