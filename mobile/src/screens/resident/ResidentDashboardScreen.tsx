import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { correspondenceApi } from '@/api/correspondence';
import { notificationsApi } from '@/api/notifications';
import { visitsApi } from '@/api/visits';
import { ConnectionDot } from '@/components/mailbox/ConnectionDot';
import { CorrespondenceDetailSheet } from '@/components/resident/CorrespondenceDetailSheet';
import { ActionTile } from '@/components/shared/ActionTile';
import { CorrespondenceCard } from '@/components/shared/CorrespondenceCard';
import { ProfileActions } from '@/components/shared/ProfileActions';
import { StatTile } from '@/components/shared/StatTile';
import { VisitCard } from '@/components/shared/VisitCard';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Skeleton, SkeletonList } from '@/components/ui/Skeleton';
import { useAuth } from '@/context/AuthContext';
import { useCall } from '@/context/CallContext';
import { useMailbox } from '@/context/MailboxContext';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { useResponsive } from '@/hooks/useResponsive';
import { relativeTime } from '@/lib/format';
import { OPEN_CORRESPONDENCE_STATUSES, housingProfileLabels } from '@/lib/status';
import { requestNewVisit } from '@/lib/intents';
import { isPassExpired } from '@/lib/visitPass';
import type { CorrespondenceResponse } from '@/types';

function SeeAll({ onPress }: { onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" hitSlop={10} onPress={onPress} className="active:opacity-60">
      <Text className="text-sm font-bold text-brand-700 dark:text-brand-300 md:text-base">Ver todo</Text>
    </Pressable>
  );
}

export default function ResidentDashboardScreen() {
  const { user } = useAuth();
  const { stats, messages, refresh: refreshMail } = useMailbox();
  const { startCall, busy: inCall } = useCall();
  const { gutter, isTablet } = useResponsive();
  const [detail, setDetail] = useState<CorrespondenceResponse | null>(null);

  const loader = useCallback(async () => {
    const [preferences, visits, mail] = await Promise.all([
      notificationsApi.preferences(),
      visitsApi.mine({ size: 30 }),
      correspondenceApi.mine({ size: 30 }),
    ]);
    return {
      preferences,
      expected: visits.content.filter((v) => v.status === 'PREAUTHORIZED' && !isPassExpired(v)),
      visits: visits.content.filter((v) => v.status !== 'PREAUTHORIZED'),
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
  // Solo quien reside en la vivienda recibe y autoriza visitas (lo valida el backend).
  const canAuthorize = prefs?.visits ?? false;
  const firstLoad = loading && !data;

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{
          padding: gutter,
          paddingBottom: 40,
          gap: 20,
          width: '100%',
          maxWidth: 900,
          alignSelf: 'center',
        }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4267f2" />}
      >
        <ScreenHeader
          eyebrow="Residente"
          title={`Hola, ${user?.firstName ?? 'vecino'}`}
          right={<ProfileActions />}
        />

        {error ? <ErrorBanner message={error} onRetry={refresh} /> : null}

        {/* Estado de la vivienda: informativo, plano. */}
        <Card>
          <View className="flex-row items-center gap-4">
            <View className="h-14 w-14 items-center justify-center rounded-2xl bg-brand-100 dark:bg-brand-500/20">
              <Ionicons name="home" size={28} color="#4267f2" />
            </View>
            <View className="flex-1">
              <Text className="text-xs font-bold uppercase tracking-widest text-ink-500 dark:text-ink-400 md:text-sm">
                Mi apartamento
              </Text>
              {firstLoad ? (
                <View className="mt-2 gap-2">
                  <Skeleton width={120} height={24} />
                  <Skeleton width={180} height={14} />
                </View>
              ) : (
                <>
                  <Text className="text-3xl font-extrabold text-ink-950 dark:text-white md:text-4xl">
                    {apartment ?? 'Sin asignar'}
                  </Text>
                  {prefs ? (
                    <Text className="text-sm text-ink-600 dark:text-ink-300 md:text-base">
                      {housingProfileLabels[prefs.profile]}
                    </Text>
                  ) : null}
                </>
              )}
            </View>
            <ConnectionDot />
          </View>
          {prefs ? (
            <View className="mt-4 flex-row flex-wrap gap-2">
              <Badge label="Avisos generales" tone={prefs.general ? 'success' : 'neutral'} icon={prefs.general ? 'checkmark' : 'close'} />
              <Badge label="Visitas" tone={prefs.visits ? 'success' : 'neutral'} icon={prefs.visits ? 'checkmark' : 'close'} />
              <Badge label="Paquetes" tone={prefs.deliveries ? 'success' : 'neutral'} icon={prefs.deliveries ? 'checkmark' : 'close'} />
            </View>
          ) : null}
          {prefs && !prefs.visits ? (
            <Text className="mt-3 text-[13px] leading-5 text-ink-600 dark:text-ink-300 md:text-[15px]">
              Las visitas y los paquetes solo se notifican a quienes residen en la vivienda.
            </Text>
          ) : null}
        </Card>

        {/* Accesos rápidos: interactivos, con elevación. */}
        <View className="flex-row flex-wrap gap-3">
          <ActionTile
            label="Llamar a portería"
            hint={inCall ? 'Llamada en curso' : 'Citófono directo · urgencias'}
            icon="call"
            disabled={inCall}
            onPress={() => startCall({ kind: 'portal', name: 'Portería' })}
          />
          <ActionTile
            label="Autorizar visita"
            hint={canAuthorize || firstLoad ? 'Genera un QR de acceso' : 'Solo para quien reside aquí'}
            icon="qr-code"
            tone="navy"
            disabled={!canAuthorize}
            onPress={() => {
              requestNewVisit();
              router.push('/resident/visits');
            }}
          />
        </View>

        <View className="flex-row flex-wrap gap-3">
          <StatTile
            label="Paquetes en recepción"
            value={data ? data.pendingMail.length : '—'}
            icon="cube"
            tone="amber"
            onPress={() => router.push('/resident/correspondence')}
          />
          <StatTile
            label="Visitas por llegar"
            value={data ? data.expected.length : '—'}
            icon="qr-code"
            tone="brand"
            onPress={() => router.push('/resident/visits')}
          />
          <StatTile
            label="Mensajes sin leer"
            value={stats.unread}
            icon="mail-unread"
            tone="rose"
            onPress={() => router.push('/resident/mailbox')}
          />
        </View>

        {latestMessage ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Abrir buzón: ${latestMessage.subject}`}
            onPress={() => router.push('/resident/mailbox')}
            className="rounded-3xl border border-brand-400 bg-brand-600 p-5 shadow-md shadow-ink-950/50 active:scale-[0.98] active:bg-brand-700"
          >
            <View className="flex-row items-center gap-2">
              <Ionicons name={latestMessage.read ? 'mail-open' : 'mail-unread'} size={18} color="#ffffff" />
              <Text className="text-xs font-bold uppercase tracking-widest text-brand-100 md:text-sm">
                {latestMessage.read ? 'Último mensaje' : 'Nuevo mensaje'}
              </Text>
              <Text className="ml-auto text-xs font-semibold text-brand-100 md:text-sm">
                {relativeTime(latestMessage.createdAt)}
              </Text>
            </View>
            <Text className="mt-2 text-lg font-extrabold text-white md:text-xl" numberOfLines={2}>
              {latestMessage.subject}
            </Text>
            <Text className="mt-1 text-sm leading-5 text-brand-50 md:text-base md:leading-6" numberOfLines={2}>
              {latestMessage.body}
            </Text>
          </Pressable>
        ) : null}

        <View>
          <SectionHeader
            title="Paquetes por recoger"
            action={<SeeAll onPress={() => router.push('/resident/correspondence')} />}
          />
          {firstLoad ? (
            <SkeletonList count={1} />
          ) : data && data.pendingMail.length > 0 ? (
            <View className={`gap-3 ${isTablet ? 'flex-row flex-wrap' : ''}`}>
              {data.pendingMail.slice(0, isTablet ? 4 : 2).map((item) => (
                <Pressable
                  key={item.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Ver detalle de ${item.description || 'paquete'}`}
                  onPress={() => setDetail(item)}
                  style={isTablet ? { width: '48.8%' } : undefined}
                  className="active:opacity-70"
                >
                  <CorrespondenceCard item={item} showApartment={false} residentView />
                </Pressable>
              ))}
            </View>
          ) : (
            <EmptyState
              icon="cube-outline"
              title="Nada por recoger"
              description="Te avisaremos cuando llegue un paquete a portería."
            />
          )}
        </View>

        <View>
          <SectionHeader title="Últimas visitas" action={<SeeAll onPress={() => router.push('/resident/visits')} />} />
          {firstLoad ? (
            <SkeletonList count={2} />
          ) : data && data.visits.length > 0 ? (
            <View className={`gap-3 ${isTablet ? 'flex-row flex-wrap' : ''}`}>
              {data.visits.slice(0, isTablet ? 4 : 3).map((visit) => (
                <View key={visit.id} style={isTablet ? { width: '48.8%' } : undefined}>
                  <VisitCard visit={visit} showApartment={false} />
                </View>
              ))}
            </View>
          ) : (
            <EmptyState
              icon="people-outline"
              title="Aún no has recibido visitas"
              description="Las visitas que registre portería aparecerán aquí."
            />
          )}
        </View>
      </ScrollView>

      <CorrespondenceDetailSheet item={detail} onClose={() => setDetail(null)} />
    </Screen>
  );
}
