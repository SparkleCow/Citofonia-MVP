import React, { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';
import { visitsApi } from '@/api/visits';
import { ResponsiveList } from '@/components/shared/ResponsiveList';
import { VisitCard } from '@/components/shared/VisitCard';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { FilterChips } from '@/components/ui/FilterChips';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { OPEN_VISIT_STATUSES } from '@/lib/status';

type Filter = 'ALL' | 'OPEN';

/** Historial de visitas de la vivienda del residente (solo lectura). */
export default function ResidentVisitsScreen() {
  const loader = useCallback(() => visitsApi.mine({ size: 50 }).then((page) => page.content), []);
  const { data, loading, refreshing, error, refresh } = useAsyncResource(loader);
  const [filter, setFilter] = useState<Filter>('ALL');

  const visits = useMemo(() => data ?? [], [data]);
  const open = useMemo(() => visits.filter((v) => OPEN_VISIT_STATUSES.includes(v.status)), [visits]);

  return (
    <Screen>
      <ResponsiveList
        data={filter === 'OPEN' ? open : visits}
        keyExtractor={(item) => String(item.id)}
        loading={loading}
        refreshing={refreshing}
        onRefresh={refresh}
        emptyIcon="people-outline"
        emptyTitle="Sin visitas"
        emptyDescription="Cuando portería registre una visita para tu vivienda aparecerá aquí."
        header={
          <View className="gap-4">
            <ScreenHeader eyebrow="Mi vivienda" title="Visitas" subtitle="Registradas por portería" />
            <FilterChips<Filter>
              value={filter}
              onChange={setFilter}
              options={[
                { key: 'ALL', label: 'Todas', count: visits.length },
                { key: 'OPEN', label: 'En curso', count: open.length },
              ]}
            />
            {error ? <ErrorBanner message={error} onRetry={refresh} /> : null}
          </View>
        }
        renderItem={(visit) => <VisitCard visit={visit} showApartment={false} />}
      />
    </Screen>
  );
}
