import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { adminApi } from '@/api/admin';
import { getApiErrorMessage } from '@/api/axios';
import { CallRow } from '@/components/admin/CallRow';
import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import type { CallAuditResponse, CallType } from '@/types';

type Filter = 'ALL' | CallType | 'ALERTS';

const filters: { key: Filter; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'ALL', label: 'Todas', icon: 'list-outline' },
  { key: 'DIRECT', label: 'Directas', icon: 'call-outline' },
  { key: 'APARTMENT', label: 'Apartamentos', icon: 'business-outline' },
  { key: 'PORTAL', label: 'Portería', icon: 'megaphone-outline' },
  { key: 'PANIC', label: 'Pánico', icon: 'warning-outline' },
  { key: 'ALERTS', label: 'Alertas', icon: 'notifications-outline' },
];

const PAGE_SIZE = 30;

export default function EventsScreen() {
  const [calls, setCalls] = useState<CallAuditResponse[]>([]);
  const [filter, setFilter] = useState<Filter>('ALL');
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPage = useCallback(async (targetPage: number) => {
    const response = await adminApi.calls(targetPage, PAGE_SIZE);
    return response;
  }, []);

  const applyFirstPage = useCallback((response: Awaited<ReturnType<typeof fetchPage>>) => {
    setCalls(response.content ?? []);
    setPage(0);
    setTotal(response.page?.totalElements ?? 0);
    setHasMore(
      response.page ? response.page.number + 1 < response.page.totalPages : (response.content?.length ?? 0) === PAGE_SIZE,
    );
  }, []);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    setError(null);
    try {
      applyFirstPage(await fetchPage(0));
    } catch (loadError) {
      setError(getApiErrorMessage(loadError));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [fetchPage, applyFirstPage]);

  useEffect(() => {
    fetchPage(0)
      .then(applyFirstPage)
      .catch((loadError) => setError(getApiErrorMessage(loadError)))
      .finally(() => setLoading(false));
  }, [fetchPage, applyFirstPage]);

  const loadMore = useCallback(async () => {
    if (loadingMore || loading || refreshing || !hasMore) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const response = await fetchPage(nextPage);
      setCalls((current) => {
        const ids = new Set(current.map((call) => call.callId));
        return [...current, ...(response.content ?? []).filter((call) => !ids.has(call.callId))];
      });
      setPage(nextPage);
      setTotal(response.page?.totalElements ?? total);
      setHasMore(
        response.page
          ? response.page.number + 1 < response.page.totalPages
          : (response.content?.length ?? 0) === PAGE_SIZE,
      );
    } catch (loadError) {
      setError(getApiErrorMessage(loadError));
    } finally {
      setLoadingMore(false);
    }
  }, [fetchPage, hasMore, loading, loadingMore, page, refreshing, total]);

  const visibleCalls = useMemo(() => {
    return calls.filter((call) => {
      if (filter === 'ALL') return true;
      if (filter === 'ALERTS') return call.alert || call.type === 'PANIC';
      return call.type === filter;
    });
  }, [calls, filter]);

  return (
    <Screen edges={['top', 'left', 'right']}>
      <FlatList
        data={visibleCalls}
        keyExtractor={(item) => item.callId}
        renderItem={({ item }) => (
          <View className="mb-2.5">
            <CallRow call={item} detailed />
          </View>
        )}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load(true)}
            tintColor="#3389fb"
            colors={['#3389fb']}
          />
        }
        ListHeaderComponent={
          <View className="pb-4">
            <View className="pt-4">
              <Text className="text-2xl font-extrabold text-ink-900 dark:text-ink-50">Historial</Text>
              <Text className="mt-1 text-sm text-ink-500 dark:text-ink-400">
                Todas las llamadas y alertas del citófono
              </Text>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingTop: 16 }}
            >
              {filters.map((option) => {
                const selected = filter === option.key;
                return (
                  <Pressable
                    key={option.key}
                    onPress={() => setFilter(option.key)}
                    className={`flex-row items-center gap-1.5 rounded-full px-3.5 py-2 ${
                      selected ? 'bg-ink-900 dark:bg-ink-100' : 'bg-ink-100 dark:bg-ink-800'
                    }`}
                  >
                    <Ionicons
                      name={option.icon}
                      size={14}
                      color={selected ? '#ffffff' : '#6f87ab'}
                    />
                    <Text
                      className={`text-xs font-bold ${
                        selected ? 'text-white dark:text-ink-900' : 'text-ink-600 dark:text-ink-300'
                      }`}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <View className="mt-4 flex-row items-center justify-between">
              <Text className="text-xs font-semibold uppercase tracking-wider text-ink-500 dark:text-ink-400">
                {visibleCalls.length} de {total} registros
              </Text>
              {total > 0 ? (
                <Text className="text-xs text-ink-400 dark:text-ink-500">Actualizado ahora</Text>
              ) : null}
            </View>

            {error ? (
              <View className="mt-3 flex-row items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 dark:border-rose-500/30 dark:bg-rose-500/10">
                <Ionicons name="cloud-offline-outline" size={18} color="#e11d48" />
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-rose-700 dark:text-rose-300">
                    No se pudo cargar el historial
                  </Text>
                  <Text className="mt-0.5 text-xs text-rose-600 dark:text-rose-300/80">{error}</Text>
                </View>
                <Pressable onPress={() => load()}>
                  <Text className="text-xs font-bold text-rose-700 dark:text-rose-300">Reintentar</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <View className="items-center py-16">
              <ActivityIndicator size="large" color="#3389fb" />
              <Text className="mt-3 text-sm text-ink-500 dark:text-ink-400">Cargando historial...</Text>
            </View>
          ) : (
            <EmptyState
              icon="time-outline"
              title="Sin registros"
              description={
                filter === 'ALL'
                  ? 'Todavía no se han registrado llamadas en el edificio.'
                  : 'No hay llamadas que coincidan con este filtro.'
              }
            />
          )
        }
        ListFooterComponent={
          loadingMore ? (
            <View className="py-5">
              <ActivityIndicator color="#3389fb" />
            </View>
          ) : undefined
        }
      />
    </Screen>
  );
}
