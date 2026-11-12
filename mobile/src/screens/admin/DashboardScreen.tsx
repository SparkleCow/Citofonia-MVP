import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { adminApi } from '@/api/admin';
import { getApiErrorMessage } from '@/api/axios';
import { CallRow } from '@/components/admin/CallRow';
import { ActionButton } from '@/components/admin/ActionButton';
import { MetricCard } from '@/components/admin/MetricCard';
import { EmergencyButton } from '@/components/emergency/EmergencyButton';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { useAuth } from '@/context/AuthContext';
import { formatLongDate, relativeTime } from '@/lib/format';
import type { ActivityItem, AdminDashboardResponse } from '@/types';

type QuickAction = {
  label: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  path: string;
  tone: 'brand' | 'navy' | 'amber';
};

const quickActions: QuickAction[] = [
  { label: 'Usuarios', description: 'Residentes y personal', icon: 'people', path: '/admin/residents', tone: 'brand' },
  { label: 'Apartamentos', description: 'Unidades y residentes', icon: 'business', path: '/admin/apartments', tone: 'brand' },
  { label: 'Pendientes', description: 'Aprobar registros', icon: 'time', path: '/admin/pending', tone: 'amber' },
  { label: 'Redactar mensaje', description: 'Avisos y mensajes', icon: 'create', path: '/admin/mail', tone: 'navy' },
  { label: 'Mi buzón', description: 'Mensajes recibidos', icon: 'file-tray-full', path: '/admin/inbox', tone: 'navy' },
  { label: 'Llamar', description: 'Citófono', icon: 'call', path: '/admin/calls', tone: 'navy' },
];

const ACTIVITY_ICON: Record<ActivityItem['type'], keyof typeof Ionicons.glyphMap> = {
  VISIT: 'walk-outline',
  PACKAGE: 'cube-outline',
  EMERGENCY: 'warning',
  REGISTRATION: 'person-add-outline',
};

export default function DashboardScreen() {
  const { user } = useAuth();
  const [data, setData] = useState<AdminDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    setError(null);
    try {
      const dashboard = await adminApi.dashboard();
      setData(dashboard);
    } catch (loadError) {
      setError(getApiErrorMessage(loadError));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    adminApi
      .dashboard()
      .then(setData)
      .catch((loadError) => setError(getApiErrorMessage(loadError)))
      .finally(() => setLoading(false));
  }, []);

  const go = (path: string) => router.push(path as never);
  const firstName = user?.firstName || user?.email?.split('@')[0] || 'administrador';

  return (
    <Screen edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load(true)}
            tintColor="#4267f2"
            colors={['#4267f2']}
          />
        }
      >
        <View className="mb-6 flex-row items-center justify-between gap-4">
          <View className="flex-1">
            <Text className="text-xs font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-300">
              {formatLongDate()}
            </Text>
            <Text numberOfLines={1} className="mt-1 text-2xl font-extrabold text-ink-900 dark:text-ink-50">
              Hola, {firstName}
            </Text>
            <Text className="mt-0.5 text-sm text-ink-500 dark:text-ink-400">
              Esto es lo que ocurre en tu edificio hoy.
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Abrir perfil y ajustes"
            onPress={() => go('/admin/more')}
          >
            <Avatar firstName={user?.firstName} lastName={user?.lastName} size="lg" />
          </Pressable>
        </View>

        {error ? (
          <View className="mb-5">
            <ErrorBanner message={`No se pudieron cargar las métricas: ${error}`} onRetry={() => load()} />
          </View>
        ) : null}

        <SectionHeader title="Resumen" subtitle="Datos del edificio (solo lectura)" />
        {loading ? (
          <View className="items-center justify-center py-10">
            <ActivityIndicator color="#4267f2" />
            <Text className="mt-3 text-sm text-ink-600 dark:text-ink-300">Cargando métricas…</Text>
          </View>
        ) : (
          <View className="flex-row flex-wrap gap-2.5">
            <MetricCard label="Apartamentos" value={data?.apartmentsTotal ?? '—'} detail={`${data?.activeIntercoms ?? 0} con residentes`} icon="business" tone="brand" />
            <MetricCard label="Residentes" value={data?.residentsActive ?? '—'} detail={`${data?.residentsTotal ?? 0} en total`} icon="people" tone="brand" />
            <MetricCard label="Conserjes" value={data?.conciergesTotal ?? '—'} detail="Personal activo" icon="shield-checkmark" tone="brand" />
            <MetricCard label="Pendientes" value={data?.pendingTotal ?? '—'} detail="Registros por aprobar" icon="time" tone={data?.pendingTotal ? 'amber' : 'brand'} />
            <MetricCard label="Visitas activas" value={data?.visitsActive ?? '—'} detail="En portería o dentro" icon="walk" tone="brand" />
            <MetricCard label="Paquetes" value={data?.packagesPending ?? '—'} detail="Por entregar" icon="cube" tone="brand" />
            <MetricCard label="Llamadas hoy" value={data?.callsToday ?? '—'} detail={`${data?.alertsToday ?? 0} alertas`} icon="call" tone="brand" />
            <MetricCard label="Emergencias" value={data?.activeEmergencies ?? '—'} detail="Activas ahora" icon="warning" tone={data?.activeEmergencies ? 'rose' : 'brand'} />
          </View>
        )}

        <View className="mt-6">
          <SectionHeader title="Acciones" subtitle="Toca para abrir" />
          <View className="flex-row flex-wrap gap-3">
            {quickActions.map((action) => (
              <ActionButton
                key={action.label}
                label={action.label}
                description={action.description}
                icon={action.icon}
                tone={action.tone}
                onPress={() => go(action.path)}
              />
            ))}
            <EmergencyButton historyPath="/admin/emergencies">
              {({ onPress, active }) => (
                <ActionButton
                  label={active ? 'Emergencia activa' : 'Emergencia'}
                  description={active ? 'Ver la alerta' : 'Activar alerta general'}
                  icon="warning"
                  tone="rose"
                  onPress={onPress}
                />
              )}
            </EmergencyButton>
          </View>
        </View>

        <View className="mt-6">
          <SectionHeader title="Actividad reciente" subtitle="Visitas, paquetes, registros y emergencias" />
          {data?.recentActivity?.length ? (
            <View className="overflow-hidden rounded-2xl border border-ink-200 bg-white dark:border-ink-800 dark:bg-ink-900">
              {data.recentActivity.map((item, index) => (
                <View
                  key={`${item.type}-${item.at}-${index}`}
                  className={`flex-row items-center gap-3 px-4 py-3 ${index > 0 ? 'border-t border-ink-100 dark:border-ink-800' : ''}`}
                >
                  <Ionicons name={ACTIVITY_ICON[item.type]} size={18} color={item.type === 'EMERGENCY' ? '#e0405a' : '#4a5c98'} />
                  <View className="flex-1">
                    <Text className="text-sm font-bold text-ink-950 dark:text-white" numberOfLines={1}>{item.title}</Text>
                    <Text className="text-xs text-ink-600 dark:text-ink-300" numberOfLines={1}>{item.subtitle}</Text>
                  </View>
                  <Text className="text-xs text-ink-500 dark:text-ink-400">{relativeTime(item.at)}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text className="text-sm text-ink-600 dark:text-ink-300">Sin actividad reciente.</Text>
          )}
        </View>

        <View className="mt-6">
          <SectionHeader
            title="Últimas llamadas"
            subtitle="Actividad reciente del citófono"
            action={
              <Pressable onPress={() => go('/admin/events')}>
                <Text className="text-sm font-bold text-brand-600 dark:text-brand-300">Ver todo</Text>
              </Pressable>
            }
          />
          {data?.recentCalls?.length ? (
            <View className="gap-2.5">
              {data.recentCalls.slice(0, 4).map((call) => (
                <CallRow key={call.callId} call={call} />
              ))}
            </View>
          ) : (
            <EmptyState
              icon="call-outline"
              title="Sin llamadas recientes"
              description="Cuando alguien use el citófono, la actividad aparecerá aquí."
            />
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}
