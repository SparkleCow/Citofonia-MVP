import React, { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';
import { visitsApi } from '@/api/visits';
import { VisitFormSheet } from '@/components/concierge/VisitFormSheet';
import { RecipientPickerSheet } from '@/components/shared/RecipientPickerSheet';
import { ResponsiveList } from '@/components/shared/ResponsiveList';
import { VisitCard } from '@/components/shared/VisitCard';
import { Button } from '@/components/ui/Button';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { FilterChips } from '@/components/ui/FilterChips';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SearchBar } from '@/components/ui/SearchBar';
import { useCall } from '@/context/CallContext';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { useRowAction } from '@/hooks/useRowAction';
import { OPEN_VISIT_STATUSES } from '@/lib/status';
import type { VisitResponse } from '@/types';

type Filter = 'OPEN' | 'PENDING' | 'ADMITTED' | 'ALL';

export default function ConciergeVisitsScreen() {
  const loader = useCallback(() => visitsApi.list({ size: 100 }).then((page) => page.content), []);
  const { data, setData, loading, refreshing, error, refresh } = useAsyncResource(loader);
  const { busyKey, error: actionError, run } = useRowAction();
  const { startCall, busy: inCall } = useCall();

  // Timbre al apartamento ligado a la visita: el backend la marca como avisada al contestar.
  const callFor = (visit: VisitResponse) =>
    startCall({
      kind: 'apartment',
      apartmentId: visit.apartmentId,
      name: `Apto. ${visit.apartmentIdentifier}`,
      apartment: visit.apartmentIdentifier,
      visitId: visit.id,
    });
  const [filter, setFilter] = useState<Filter>('OPEN');
  const [query, setQuery] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [notifyTarget, setNotifyTarget] = useState<VisitResponse | null>(null);

  const visits = useMemo(() => data ?? [], [data]);

  const replace = (updated: VisitResponse) =>
    setData((current) => (current ?? []).map((item) => (item.id === updated.id ? updated : item)));

  const counts = useMemo(
    () => ({
      OPEN: visits.filter((v) => OPEN_VISIT_STATUSES.includes(v.status)).length,
      PENDING: visits.filter((v) => v.status === 'PENDING' || v.status === 'NOTIFIED').length,
      ADMITTED: visits.filter((v) => v.status === 'ADMITTED').length,
      ALL: visits.length,
    }),
    [visits],
  );

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return visits.filter((visit) => {
      const byStatus =
        filter === 'ALL' ||
        (filter === 'OPEN' && OPEN_VISIT_STATUSES.includes(visit.status)) ||
        (filter === 'PENDING' && (visit.status === 'PENDING' || visit.status === 'NOTIFIED')) ||
        (filter === 'ADMITTED' && visit.status === 'ADMITTED');
      if (!byStatus) return false;
      if (!term) return true;
      return [visit.visitorName, visit.apartmentIdentifier, visit.visitorDocument, visit.visitorCompany]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(term));
    });
  }, [visits, filter, query]);

  const setStatus = (visit: VisitResponse, status: 'ADMITTED' | 'REJECTED' | 'CLOSED') =>
    run(
      `${visit.id}-${status}`,
      async () =>
        replace(
          await visitsApi.updateStatus(visit.id, {
            status,
            exitAt: status === 'CLOSED' ? new Date().toISOString() : null,
          }),
        ),
      status === 'REJECTED'
        ? {
            title: 'Rechazar visita',
            message: `¿Rechazar la entrada de ${visit.visitorName}?`,
            confirmLabel: 'Rechazar',
            destructive: true,
          }
        : undefined,
    );

  const renderActions = (visit: VisitResponse) => {
    const busy = (s: string) => busyKey === `${visit.id}-${s}`;
    switch (visit.status) {
      case 'PENDING':
      case 'NOTIFIED':
        return (
          <>
            <Button title="Llamar" icon="call" onPress={() => callFor(visit)} disabled={inCall} className="flex-1" />
            <Button
              title={visit.status === 'PENDING' ? 'Mensaje' : 'Reavisar'}
              icon="notifications-outline"
              variant="secondary"
              onPress={() => setNotifyTarget(visit)}
              className="flex-1"
            />
            <Button title="Autorizar" icon="checkmark" variant="success" loading={busy('ADMITTED')} onPress={() => setStatus(visit, 'ADMITTED')} className="flex-1" />
            <Button title="Rechazar" icon="close" variant="danger" loading={busy('REJECTED')} onPress={() => setStatus(visit, 'REJECTED')} className="flex-1" />
          </>
        );
      case 'ADMITTED':
        return (
          <Button
            title="Registrar salida"
            icon="exit-outline"
            variant="secondary"
            loading={busy('CLOSED')}
            onPress={() => setStatus(visit, 'CLOSED')}
            fullWidth
          />
        );
      default:
        return null;
    }
  };

  return (
    <Screen>
      <ResponsiveList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        loading={loading}
        refreshing={refreshing}
        onRefresh={refresh}
        emptyIcon="people-outline"
        emptyTitle={query ? 'Sin resultados' : 'No hay visitas'}
        emptyDescription={query ? 'Prueba con otro nombre o vivienda.' : 'Registra la próxima visita con el botón superior.'}
        header={
          <View className="gap-4">
            <ScreenHeader
              eyebrow="Portería"
              title="Visitas"
              subtitle={`${counts.OPEN} en curso`}
              right={<Button title="Nueva" icon="add" size="lg" onPress={() => setFormOpen(true)} />}
            />
            <SearchBar value={query} onChangeText={setQuery} placeholder="Visitante, vivienda, documento..." />
            <FilterChips<Filter>
              value={filter}
              onChange={setFilter}
              options={[
                { key: 'OPEN', label: 'En curso', count: counts.OPEN },
                { key: 'PENDING', label: 'Por autorizar', count: counts.PENDING },
                { key: 'ADMITTED', label: 'Dentro', count: counts.ADMITTED },
                { key: 'ALL', label: 'Todas', count: counts.ALL },
              ]}
            />
            {error ? <ErrorBanner message={error} onRetry={refresh} /> : null}
            {actionError ? <ErrorBanner message={actionError} /> : null}
          </View>
        }
        renderItem={(visit) => <VisitCard visit={visit} actions={renderActions(visit)} />}
      />

      <VisitFormSheet
        visible={formOpen}
        onClose={() => setFormOpen(false)}
        onCreated={(visit) => {
          setData((current) => [visit, ...(current ?? [])]);
          // Espera a que se cierre la hoja del formulario antes de abrir la de aviso (iOS).
          setTimeout(() => setNotifyTarget(visit), 400);
        }}
      />

      <RecipientPickerSheet
        visible={notifyTarget != null}
        onClose={() => setNotifyTarget(null)}
        title="Avisar a residentes"
        subtitle={notifyTarget ? `${notifyTarget.visitorName} → ${notifyTarget.apartmentIdentifier}` : undefined}
        loadRecipients={() => visitsApi.recipients(notifyTarget?.apartmentId ?? 0)}
        onConfirm={async (ids) => {
          if (notifyTarget) replace(await visitsApi.notify(notifyTarget.id, ids));
        }}
      />
    </Screen>
  );
}
