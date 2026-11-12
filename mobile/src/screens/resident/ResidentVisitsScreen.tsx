import { useFocusEffect } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';
import { visitsApi } from '@/api/visits';
import { PreauthorizeVisitSheet } from '@/components/resident/PreauthorizeVisitSheet';
import { VisitPassSheet } from '@/components/resident/VisitPassSheet';
import { ResponsiveList } from '@/components/shared/ResponsiveList';
import { VisitCard } from '@/components/shared/VisitCard';
import { Button } from '@/components/ui/Button';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { FilterChips } from '@/components/ui/FilterChips';
import { Input } from '@/components/ui/Input';
import { OptionPills } from '@/components/ui/OptionPills';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { addDays, isSameDay, maskDate, parseDateInput, startOfDay } from '@/lib/dates';
import { consumeNewVisitRequest } from '@/lib/intents';
import { isPassExpired } from '@/lib/visitPass';
import type { VisitResponse } from '@/types';

type Section = 'AUTHORIZED' | 'HISTORY';
type Range = 'ALL' | 'TODAY' | 'WEEK' | 'MONTH' | 'DAY';

/** Visitas del residente: autorizaciones con QR e historial filtrable por fecha. */
export default function ResidentVisitsScreen() {
  const loader = useCallback(() => visitsApi.mine({ size: 100 }).then((page) => page.content), []);
  const { data, setData, loading, refreshing, error, refresh } = useAsyncResource(loader);

  const [section, setSection] = useState<Section>('AUTHORIZED');
  const [range, setRange] = useState<Range>('ALL');
  const [day, setDay] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [pass, setPass] = useState<VisitResponse | null>(null);

  // Acceso rápido "Autorizar visita" del inicio: abre el formulario al enfocar la pestaña.
  useFocusEffect(
    useCallback(() => {
      if (!consumeNewVisitRequest()) return;
      setSection('AUTHORIZED');
      setFormOpen(true);
    }, []),
  );

  const visits = useMemo(() => data ?? [], [data]);

  const authorized = useMemo(
    () =>
      visits
        .filter((v) => v.status === 'PREAUTHORIZED' && !isPassExpired(v))
        .sort((a, b) => (a.expectedAt ?? '').localeCompare(b.expectedAt ?? '')),
    [visits],
  );
  const history = useMemo(
    () => visits.filter((v) => v.status !== 'PREAUTHORIZED' || isPassExpired(v)),
    [visits],
  );

  const selectedDay = parseDateInput(day);
  const filteredHistory = useMemo(() => {
    if (range === 'ALL') return history;
    const today = startOfDay(new Date());
    return history.filter((visit) => {
      const at = new Date(visit.entryAt ?? visit.createdAt ?? 0);
      if (range === 'TODAY') return isSameDay(at, today);
      if (range === 'WEEK') return at >= addDays(today, -6);
      if (range === 'MONTH') return at >= addDays(today, -29);
      return selectedDay ? isSameDay(at, selectedDay) : true;
    });
  }, [history, range, selectedDay]);

  const replace = (updated: VisitResponse) =>
    setData((current) => (current ?? []).map((item) => (item.id === updated.id ? updated : item)));

  const showingAuthorized = section === 'AUTHORIZED';
  const newButton = <Button title="Autorizar visita" icon="qr-code" onPress={() => setFormOpen(true)} />;

  return (
    <Screen>
      <ResponsiveList
        data={showingAuthorized ? authorized : filteredHistory}
        keyExtractor={(item) => String(item.id)}
        loading={loading}
        refreshing={refreshing}
        onRefresh={refresh}
        emptyIcon={showingAuthorized ? 'qr-code-outline' : 'people-outline'}
        emptyTitle={
          showingAuthorized
            ? 'Sin visitas autorizadas'
            : range === 'ALL'
              ? 'Sin visitas'
              : 'Sin visitas en esas fechas'
        }
        emptyDescription={
          showingAuthorized
            ? 'Autoriza a tu visitante y envíale un QR para que entre sin esperas.'
            : range === 'ALL'
              ? 'Cuando portería registre una visita para tu vivienda aparecerá aquí.'
              : 'Prueba con otro rango o quita el filtro.'
        }
        emptyAction={showingAuthorized ? newButton : undefined}
        header={
          <View className="gap-4">
            <ScreenHeader
              eyebrow="Mi vivienda"
              title="Visitas"
              subtitle={
                authorized.length
                  ? `${authorized.length} ${authorized.length === 1 ? 'autorizada' : 'autorizadas'} por llegar`
                  : 'Autoriza y consulta tus visitas'
              }
              right={<Button title="Autorizar" icon="add" size="lg" onPress={() => setFormOpen(true)} />}
            />
            <OptionPills<Section>
              value={section}
              onChange={setSection}
              options={[
                { key: 'AUTHORIZED', label: `Autorizadas (${authorized.length})` },
                { key: 'HISTORY', label: `Historial (${history.length})` },
              ]}
            />
            {!showingAuthorized ? (
              <>
                <FilterChips<Range>
                  value={range}
                  onChange={setRange}
                  options={[
                    { key: 'ALL', label: 'Todo' },
                    { key: 'TODAY', label: 'Hoy' },
                    { key: 'WEEK', label: '7 días' },
                    { key: 'MONTH', label: '30 días' },
                    { key: 'DAY', label: 'Un día' },
                  ]}
                />
                {range === 'DAY' ? (
                  <Input
                    label="Fecha"
                    icon="calendar-outline"
                    placeholder="DD/MM/AAAA"
                    value={day}
                    onChangeText={(text) => setDay(maskDate(text))}
                    keyboardType="number-pad"
                    inputMode="numeric"
                    maxLength={10}
                    error={day.length === 10 && !selectedDay ? 'Fecha no válida.' : null}
                    hint="Escribe el día que quieres consultar."
                  />
                ) : null}
              </>
            ) : null}
            {error ? <ErrorBanner message={error} onRetry={refresh} /> : null}
          </View>
        }
        renderItem={(visit) => (
          <VisitCard
            visit={visit}
            showApartment={false}
            actions={
              visit.status === 'PREAUTHORIZED' && !isPassExpired(visit) ? (
                <Button title="Ver QR" icon="qr-code" onPress={() => setPass(visit)} fullWidth />
              ) : undefined
            }
          />
        )}
      />

      <PreauthorizeVisitSheet
        visible={formOpen}
        onClose={() => setFormOpen(false)}
        onCreated={(visit) => {
          setData((current) => [visit, ...(current ?? [])]);
          setSection('AUTHORIZED');
          // Espera a que se cierre la hoja del formulario antes de abrir el pase (iOS).
          setTimeout(() => setPass(visit), 400);
        }}
      />
      <VisitPassSheet visit={pass} onClose={() => setPass(null)} onCancelled={replace} />
    </Screen>
  );
}
