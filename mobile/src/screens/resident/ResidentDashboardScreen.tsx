import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useCallback } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { correspondenceApi } from '@/api/correspondence';
import { notificationsApi } from '@/api/notifications';
import { visitsApi } from '@/api/visits';
import { CorrespondenceCard } from '@/components/shared/CorrespondenceCard';
import { ProfileActions } from '@/components/shared/ProfileActions';
import { EmergencyButton } from '@/components/emergency/EmergencyButton';
import { StatTile } from '@/components/shared/StatTile';
import { VisitCard } from '@/components/shared/VisitCard';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { useAuth } from '@/context/AuthContext';
import { useMailbox } from '@/context/MailboxContext';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { useResponsive } from '@/hooks/useResponsive';
import { relativeTime } from '@/lib/format';
import { OPEN_CORRESPONDENCE_STATUSES, housingProfileLabels } from '@/lib/status';

export default function ResidentDashboardScreen() {
  const { user } = useAuth();
  const { stats, messages, refresh: refreshMail } = useMailbox();
  const { gutter, isTablet } = useResponsive();

  const loader = useCallback(async () => {
    const [preferences, visits, mail] = await Promise.all([
      notificationsApi.preferences(),
      visitsApi.mine({ size: 5 }),
      correspondenceApi.mine({ size: 20 }),
    ]);
    return {
      preferences,
      visits: visits.content,
      pendingMail: mail.content.filter((c) => OPEN_CORRESPONDENCE_STATUSES.includes(c.status)),
    };
  }, []);
  const { data, loading, refreshing, error, refresh } = useAsyncResource(loader);

  const onRefresh = () => {
    void refresh();
    void refreshMail();
  };

  const prefs = data?.preferences;
  const latestMessage = messages.find((m) => !m.read) ?? messages[0];
  const apartment = prefs?.apartmentIdentifier ?? user?.apartmentIdentifier;

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{
          padding: gutter,
          paddingBottom: 40,
          gap: 18,
          width: '100%',
          maxWidth: 820,
          alignSelf: 'center',
        }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1d6af0" />}
      >
        <ScreenHeader
          eyebrow={apartment ? `Vivienda ${apartment}` : 'Residente'}
          title={`Hola, ${user?.firstName ?? 'vecino'}`}
          subtitle={prefs ? housingProfileLabels[prefs.profile] : undefined}
          right={<ProfileActions />}
        />

        {error ? <ErrorBanner message={error} onRetry={refresh} /> : null}

        <EmergencyButton />

        <View className="flex-row flex-wrap gap-3">
          <StatTile label="Sin leer" value={stats.unread} icon="mail-unread" tone="rose" onPress={() => router.push('/resident/mailbox')} />
          <StatTile
            label="Paquetes por recoger"
            value={data?.pendingMail.length ?? '—'}
            icon="cube"
            tone="amber"
            onPress={() => router.push('/resident/correspondence')}
          />
        </View>

        {latestMessage ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/resident/mailbox')}
            className="rounded-3xl bg-brand-700 p-5 active:opacity-90"
          >
            <View className="flex-row items-center gap-2">
              <Ionicons name={latestMessage.read ? 'mail-open' : 'mail-unread'} size={18} color="#ffffff" />
              <Text className="text-xs font-bold uppercase tracking-widest text-brand-100">
                {latestMessage.read ? 'Último mensaje' : 'Nuevo mensaje'}
              </Text>
              <Text className="ml-auto text-xs font-semibold text-brand-100">
                {relativeTime(latestMessage.createdAt)}
              </Text>
            </View>
            <Text className="mt-2 text-lg font-extrabold text-white" numberOfLines={2}>
              {latestMessage.subject}
            </Text>
            <Text className="mt-1 text-sm leading-5 text-brand-50" numberOfLines={2}>
              {latestMessage.body}
            </Text>
          </Pressable>
        ) : null}

        {loading && !data ? <ActivityIndicator size="large" color="#1d6af0" /> : null}

        {data && data.pendingMail.length > 0 ? (
          <View>
            <SectionHeader title="Te espera en portería" />
            <View className={`gap-3 ${isTablet ? 'flex-row flex-wrap' : ''}`}>
              {data.pendingMail.slice(0, isTablet ? 4 : 2).map((item) => (
                <View key={item.id} style={isTablet ? { width: '48.8%' } : undefined}>
                  <CorrespondenceCard item={item} showApartment={false} />
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {data ? (
          <View>
            <SectionHeader
              title="Últimas visitas"
              action={
                <Pressable accessibilityRole="button" hitSlop={10} onPress={() => router.push('/resident/visits')}>
                  <Text className="text-sm font-bold text-brand-700 dark:text-brand-300">Ver todas</Text>
                </Pressable>
              }
            />
            {data.visits.length === 0 ? (
              <Text className="text-sm text-ink-600 dark:text-ink-300">Aún no has recibido visitas.</Text>
            ) : (
              <View className="gap-3">
                {data.visits.slice(0, 3).map((visit) => (
                  <VisitCard key={visit.id} visit={visit} showApartment={false} />
                ))}
              </View>
            )}
          </View>
        ) : null}

        {prefs ? (
          <Card>
            <SectionHeader title="Avisos que recibes" subtitle="Según tu relación con la vivienda" />
            <View className="flex-row flex-wrap gap-2">
              <Badge label="Generales" tone={prefs.general ? 'success' : 'neutral'} icon={prefs.general ? 'checkmark' : 'close'} />
              <Badge label="Visitas" tone={prefs.visits ? 'success' : 'neutral'} icon={prefs.visits ? 'checkmark' : 'close'} />
              <Badge label="Domicilios" tone={prefs.deliveries ? 'success' : 'neutral'} icon={prefs.deliveries ? 'checkmark' : 'close'} />
            </View>
            {!prefs.visits ? (
              <Text className="mt-3 text-[13px] leading-5 text-ink-600 dark:text-ink-300">
                Las visitas y domicilios solo se notifican a quienes residen en la vivienda.
              </Text>
            ) : null}
          </Card>
        ) : null}
      </ScrollView>
    </Screen>
  );
}
