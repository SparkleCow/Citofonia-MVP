import React, { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';
import { correspondenceApi } from '@/api/correspondence';
import { CorrespondenceFormSheet } from '@/components/concierge/CorrespondenceFormSheet';
import { CorrespondenceCard } from '@/components/shared/CorrespondenceCard';
import { RecipientPickerSheet } from '@/components/shared/RecipientPickerSheet';
import { ResponsiveList } from '@/components/shared/ResponsiveList';
import { Button } from '@/components/ui/Button';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { FilterChips } from '@/components/ui/FilterChips';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SearchBar } from '@/components/ui/SearchBar';
import { useCall } from '@/context/CallContext';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { useRowAction } from '@/hooks/useRowAction';
import { OPEN_CORRESPONDENCE_STATUSES } from '@/lib/status';
import type { CorrespondenceResponse } from '@/types';

type Filter = 'OPEN' | 'DESK' | 'DONE' | 'ALL';

const isOpen = (item: CorrespondenceResponse) => OPEN_CORRESPONDENCE_STATUSES.includes(item.status);

export default function ConciergeCorrespondenceScreen() {
  const loader = useCallback(
    () => correspondenceApi.list({ size: 100 }).then((page) => page.content),
    [],
  );
  const { data, setData, loading, refreshing, error, refresh } = useAsyncResource(loader);
  const { busyKey, error: actionError, run } = useRowAction();
  const { startCall, busy: inCall } = useCall();
  const [filter, setFilter] = useState<Filter>('OPEN');
  const [query, setQuery] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [notifyTarget, setNotifyTarget] = useState<CorrespondenceResponse | null>(null);

  const items = useMemo(() => data ?? [], [data]);

  const replace = (updated: CorrespondenceResponse) =>
    setData((current) => (current ?? []).map((item) => (item.id === updated.id ? updated : item)));

  const counts = useMemo(
    () => ({
      OPEN: items.filter(isOpen).length,
      DESK: items.filter((i) => isOpen(i) && i.delivery === 'PORTERIA').length,
      DONE: items.filter((i) => !isOpen(i)).length,
      ALL: items.length,
    }),
    [items],
  );

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return items.filter((item) => {
      const byStatus =
        filter === 'ALL' ||
        (filter === 'OPEN' && isOpen(item)) ||
        (filter === 'DESK' && isOpen(item) && item.delivery === 'PORTERIA') ||
        (filter === 'DONE' && !isOpen(item));
      if (!byStatus) return false;
      if (!term) return true;
      return [item.apartmentIdentifier, item.description, item.carrier, item.trackingNumber, item.recipientName]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(term));
    });
  }, [items, filter, query]);

  const renderActions = (item: CorrespondenceResponse) => {
    if (!isOpen(item)) return null;
    const busy = (s: string) => busyKey === `${item.id}-${s}`;
    return (
      <>
        <Button
          title="Llamar"
          icon="call"
          disabled={inCall}
          onPress={() =>
            startCall({
              kind: 'apartment',
              apartmentId: item.apartmentId,
              name: `Apto. ${item.apartmentIdentifier}`,
              apartment: item.apartmentIdentifier,
              correspondenceId: item.id,
            })
          }
          className="flex-1"
        />
        <Button
          title={item.status === 'PENDING' ? 'Mensaje' : 'Reavisar'}
          icon="notifications-outline"
          variant="secondary"
          onPress={() => setNotifyTarget(item)}
          className="flex-1"
        />
        {item.delivery !== 'PORTERIA' ? (
          <Button
            title="En portería"
            icon="shield-outline"
            variant="secondary"
            loading={busy('HOLD')}
            onPress={() =>
              run(`${item.id}-HOLD`, async () => replace(await correspondenceApi.hold(item.id)))
            }
            className="flex-1"
          />
        ) : null}
        <Button
          title="Entregada"
          icon="checkmark-done"
          variant="success"
          loading={busy('DELIVERED')}
          onPress={() =>
            run(`${item.id}-DELIVERED`, async () =>
              replace(
                await correspondenceApi.updateStatus(item.id, {
                  status: 'DELIVERED',
                  delivery: item.delivery ?? null,
                }),
              ),
            )
          }
          className="flex-1"
        />
        <Button
          title="Devolver"
          icon="return-up-back"
          variant="ghost"
          loading={busy('RETURNED')}
          onPress={() =>
            run(
              `${item.id}-RETURNED`,
              async () =>
                replace(await correspondenceApi.updateStatus(item.id, { status: 'RETURNED' })),
              {
                title: 'Devolver correspondencia',
                message: `Se marcará como devuelta al remitente (${item.apartmentIdentifier}).`,
                confirmLabel: 'Devolver',
                destructive: true,
              },
            )
          }
        />
      </>
    );
  };

  return (
    <Screen>
      <ResponsiveList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        loading={loading}
        refreshing={refreshing}
        onRefresh={refresh}
        emptyIcon="cube-outline"
        emptyTitle={query ? 'Sin resultados' : 'Nada por entregar'}
        emptyDescription={query ? 'Prueba con otra vivienda o guía.' : 'Registra paquetes y cartas al recibirlos.'}
        header={
          <View className="gap-4">
            <ScreenHeader
              eyebrow="Portería"
              title="Correspondencia"
              subtitle={`${counts.OPEN} por entregar · ${counts.DESK} en portería`}
              right={<Button title="Nueva" icon="add" size="lg" onPress={() => setFormOpen(true)} />}
            />
            <SearchBar value={query} onChangeText={setQuery} placeholder="Vivienda, guía, transportista..." />
            <FilterChips<Filter>
              value={filter}
              onChange={setFilter}
              options={[
                { key: 'OPEN', label: 'Por entregar', count: counts.OPEN },
                { key: 'DESK', label: 'En portería', count: counts.DESK },
                { key: 'DONE', label: 'Cerradas', count: counts.DONE },
                { key: 'ALL', label: 'Todas', count: counts.ALL },
              ]}
            />
            {error ? <ErrorBanner message={error} onRetry={refresh} /> : null}
            {actionError ? <ErrorBanner message={actionError} /> : null}
          </View>
        }
        renderItem={(item) => <CorrespondenceCard item={item} actions={renderActions(item)} />}
      />

      <CorrespondenceFormSheet
        visible={formOpen}
        onClose={() => setFormOpen(false)}
        onCreated={(item) => {
          setData((current) => [item, ...(current ?? [])]);
          setTimeout(() => setNotifyTarget(item), 400);
        }}
      />

      <RecipientPickerSheet
        visible={notifyTarget != null}
        onClose={() => setNotifyTarget(null)}
        title="Avisar llegada"
        subtitle={notifyTarget ? `Vivienda ${notifyTarget.apartmentIdentifier}` : undefined}
        loadRecipients={() => correspondenceApi.recipients(notifyTarget?.apartmentId ?? 0)}
        onConfirm={async (ids) => {
          if (notifyTarget) replace(await correspondenceApi.notify(notifyTarget.id, ids));
        }}
      />
    </Screen>
  );
}
