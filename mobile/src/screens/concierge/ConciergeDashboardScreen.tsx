import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, Text, View } from 'react-native';
import { callsApi } from '@/api/calls';
import { correspondenceApi } from '@/api/correspondence';
import { visitsApi } from '@/api/visits';
import { CorrespondenceFormSheet } from '@/components/concierge/CorrespondenceFormSheet';
import { VisitFormSheet } from '@/components/concierge/VisitFormSheet';
import { ProfileActions } from '@/components/shared/ProfileActions';
import { ActionTile } from '@/components/shared/ActionTile';
import { EmergencyButton } from '@/components/emergency/EmergencyButton';
import { StatTile } from '@/components/shared/StatTile';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SearchBar } from '@/components/ui/SearchBar';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { useAuth } from '@/context/AuthContext';
import { useMailbox } from '@/context/MailboxContext';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { useResponsive } from '@/hooks/useResponsive';
import { formatLongDate, fullName, relativeTime } from '@/lib/format';
import {
  OPEN_CORRESPONDENCE_STATUSES,
  OPEN_VISIT_STATUSES,
  correspondenceStatusMeta,
  correspondenceTypeMeta,
  visitStatusMeta,
} from '@/lib/status';

const PREVIEW = 5;

export default function ConciergeDashboardScreen() {
  const { user } = useAuth();
  const { stats } = useMailbox();
  const { isTablet, gutter } = useResponsive();
  const [visitForm, setVisitForm] = useState(false);
  const [mailForm, setMailForm] = useState(false);
  const [query, setQuery] = useState('');

  const loader = useCallback(async () => {
    const [visits, mail, residents] = await Promise.all([
      visitsApi.list({ size: 50 }),
      correspondenceApi.list({ size: 50 }),
      callsApi.residents(),
    ]);
    return {
      visits: visits.content.filter((v) => OPEN_VISIT_STATUSES.includes(v.status)),
      mail: mail.content.filter((c) => OPEN_CORRESPONDENCE_STATUSES.includes(c.status)),
      residents,
    };
  }, []);
  const { data, loading, refreshing, error, refresh, reload } = useAsyncResource(loader);

  const directory = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term || !data) return [];
    return data.residents
      .filter((r) =>
        [fullName(r.firstName, r.lastName), r.apartmentIdentifier, r.email]
          .filter(Boolean)
          .some((field) => String(field).toLowerCase().includes(term)),
      )
      .slice(0, 8);
  }, [data, query]);

  const visitsPanel = (
    <Card>
      <SectionHeader
        title="Visitas en curso"
        subtitle={`${data?.visits.length ?? 0} activas`}
        action={<Button title="Ver todas" variant="ghost" size="sm" onPress={() => router.push('/concierge/visits')} />}
      />
      {(data?.visits ?? []).slice(0, PREVIEW).map((visit) => {
        const meta = visitStatusMeta[visit.status];
        return (
          <View key={visit.id} className="flex-row items-center gap-3 border-t border-ink-100 py-3 dark:border-ink-800">
            <View className="flex-1">
              <Text className="text-[15px] font-bold text-ink-950 dark:text-white" numberOfLines={1}>
                {visit.visitorName}
              </Text>
              <Text className="text-[13px] text-ink-600 dark:text-ink-300">
                {visit.apartmentIdentifier} · {relativeTime(visit.entryAt ?? visit.createdAt)}
              </Text>
            </View>
            <Badge label={meta.label} tone={meta.tone} />
          </View>
        );
      })}
      {data && data.visits.length === 0 ? (
        <Text className="py-3 text-sm text-ink-600 dark:text-ink-300">No hay visitas activas.</Text>
      ) : null}
    </Card>
  );

  const mailPanel = (
    <Card>
      <SectionHeader
        title="Por entregar"
        subtitle={`${data?.mail.length ?? 0} pendientes`}
        action={
          <Button title="Ver todas" variant="ghost" size="sm" onPress={() => router.push('/concierge/correspondence')} />
        }
      />
      {(data?.mail ?? []).slice(0, PREVIEW).map((item) => {
        const meta = correspondenceStatusMeta[item.status];
        return (
          <View key={item.id} className="flex-row items-center gap-3 border-t border-ink-100 py-3 dark:border-ink-800">
            <Ionicons name={correspondenceTypeMeta[item.type].icon} size={20} color="#b45309" />
            <View className="flex-1">
              <Text className="text-[15px] font-bold text-ink-950 dark:text-white" numberOfLines={1}>
                {item.apartmentIdentifier} · {item.description || correspondenceTypeMeta[item.type].label}
              </Text>
              <Text className="text-[13px] text-ink-600 dark:text-ink-300">
                {item.carrier ?? 'Sin transportista'} · {relativeTime(item.receivedAt ?? item.createdAt)}
              </Text>
            </View>
            <Badge label={meta.label} tone={meta.tone} />
          </View>
        );
      })}
      {data && data.mail.length === 0 ? (
        <Text className="py-3 text-sm text-ink-600 dark:text-ink-300">Todo entregado.</Text>
      ) : null}
    </Card>
  );

  const directoryPanel = (
    <Card>
      <SectionHeader title="Directorio" subtitle="Busca residente o vivienda" />
      <SearchBar value={query} onChangeText={setQuery} placeholder="Nombre, apto. o correo" />
      {directory.map((resident) => (
        <View key={resident.id} className="mt-3 flex-row items-center gap-3">
          <Avatar firstName={resident.firstName} lastName={resident.lastName} size="sm" />
          <View className="flex-1">
            <Text className="text-[15px] font-bold text-ink-950 dark:text-white">
              {fullName(resident.firstName, resident.lastName)}
            </Text>
            <Text className="text-[13px] text-ink-600 dark:text-ink-300">{resident.email}</Text>
          </View>
          {resident.apartmentIdentifier ? <Badge label={resident.apartmentIdentifier} tone="brand" /> : null}
        </View>
      ))}
      {query.trim() && directory.length === 0 && data ? (
        <Text className="mt-3 text-sm text-ink-600 dark:text-ink-300">Sin coincidencias.</Text>
      ) : null}
    </Card>
  );

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ padding: gutter, paddingBottom: 40, gap: 18 }}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#1d6af0" />}
      >
        <ScreenHeader
          eyebrow={formatLongDate()}
          title={`Hola, ${user?.firstName ?? 'portería'}`}
          subtitle="Conserjería · Panel de control"
          right={<ProfileActions />}
        />

        {error ? <ErrorBanner message={error} onRetry={refresh} /> : null}

        <View className="flex-row flex-wrap gap-3">
          <ActionTile label="Registrar visita" hint="Entrada de visitantes" icon="person-add" onPress={() => setVisitForm(true)} />
          <ActionTile label="Registrar entrega" hint="Paquetes y correspondencia" icon="cube" tone="navy" onPress={() => setMailForm(true)} />
          <ActionTile label="Llamar" hint="Apartamento o residente" icon="call" tone="navy" onPress={() => router.push('/concierge/residents')} />
          <ActionTile label="Emergencias" hint="Historial y resolución" icon="shield-checkmark" tone="neutral" onPress={() => router.push('/concierge/emergencies')} />
        </View>

        <EmergencyButton />

        <View className="flex-row flex-wrap gap-2">
          <StatTile compact label="Visitas activas" value={data?.visits.length ?? '—'} icon="people" onPress={() => router.push('/concierge/visits')} />
          <StatTile compact label="Por entregar" value={data?.mail.length ?? '—'} icon="cube" tone="amber" onPress={() => router.push('/concierge/correspondence')} />
          <StatTile compact label="Sin leer" value={stats.unread} icon="mail-unread" tone="rose" onPress={() => router.push('/concierge/mailbox')} />
        </View>

        {loading && !data ? <ActivityIndicator size="large" color="#1d6af0" /> : null}

        {isTablet ? (
          <View className="flex-row items-start gap-4">
            <View className="flex-1 gap-4">{visitsPanel}</View>
            <View className="flex-1 gap-4">
              {mailPanel}
              {directoryPanel}
            </View>
          </View>
        ) : (
          <>
            {visitsPanel}
            {mailPanel}
            {directoryPanel}
          </>
        )}
      </ScrollView>

      <VisitFormSheet visible={visitForm} onClose={() => setVisitForm(false)} onCreated={() => void reload()} />
      <CorrespondenceFormSheet visible={mailForm} onClose={() => setMailForm(false)} onCreated={() => void reload()} />
    </Screen>
  );
}
