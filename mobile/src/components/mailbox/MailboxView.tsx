import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, ScrollView, Text, View } from 'react-native';
import { getApiErrorMessage } from '@/api/axios';
import { MailboxMessageRow } from '@/components/mailbox/MailboxMessageRow';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { FilterChips } from '@/components/ui/FilterChips';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useMailbox } from '@/context/MailboxContext';
import { useResponsive } from '@/hooks/useResponsive';
import { formatDateTime } from '@/lib/format';
import type { MailboxItem } from '@/types';

type Filter = 'ALL' | 'UNREAD';

type MailboxViewProps = {
  eyebrow?: string;
  /** Elemento a la derecha de la cabecera (p. ej. botón volver). */
  headerRight?: React.ReactNode;
};

function MessageDetail({ item }: { item: MailboxItem }) {
  return (
    <ScrollView contentContainerStyle={{ padding: 24 }}>
      <Text className="text-2xl font-extrabold text-ink-950 dark:text-white">{item.subject}</Text>
      <View className="mt-3 flex-row flex-wrap items-center gap-x-4 gap-y-1">
        <View className="flex-row items-center gap-1.5">
          <Ionicons name="person-circle-outline" size={16} color="#526b8e" />
          <Text className="text-sm text-ink-700 dark:text-ink-200">{item.senderEmail}</Text>
        </View>
        <View className="flex-row items-center gap-1.5">
          <Ionicons name="time-outline" size={16} color="#526b8e" />
          <Text className="text-sm text-ink-700 dark:text-ink-200">{formatDateTime(item.createdAt)}</Text>
        </View>
      </View>
      <View className="my-5 h-px bg-ink-200 dark:bg-ink-800" />
      <Text className="text-base leading-7 text-ink-900 dark:text-ink-50">{item.body}</Text>
    </ScrollView>
  );
}

/**
 * Buzón de mensajes/notificaciones del usuario autenticado.
 * Funciona para cualquier rol: el backend filtra por el usuario del token.
 * Smartphone: lista con mensajes desplegables. Tablet: lista + panel de lectura.
 */
export function MailboxView({ eyebrow = 'Buzón', headerRight }: MailboxViewProps) {
  const { messages, stats, loading, error, refresh, markRead, markAllRead } = useMailbox();
  const { isTablet, gutter } = useResponsive();
  const [filter, setFilter] = useState<Filter>('ALL');
  const [activeId, setActiveId] = useState<number | null>(null);
  const [markingAll, setMarkingAll] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const visible = useMemo(
    () => (filter === 'UNREAD' ? messages.filter((item) => !item.read) : messages),
    [messages, filter],
  );
  const active = messages.find((item) => item.id === activeId) ?? null;

  const open = (item: MailboxItem) => {
    setActiveId((current) => (!isTablet && current === item.id ? null : item.id));
    if (!item.read) void markRead(item.id);
  };

  const onMarkAll = async () => {
    setMarkingAll(true);
    setActionError(null);
    try {
      await markAllRead();
    } catch (err) {
      setActionError(getApiErrorMessage(err));
    } finally {
      setMarkingAll(false);
    }
  };

  const header = (
    <View className="gap-4 pb-2 pt-3">
      <ScreenHeader
        eyebrow={eyebrow}
        title="Mensajes"
        subtitle={
          stats.unread > 0
            ? `${stats.unread} sin leer de ${stats.total}`
            : stats.total > 0
              ? 'Todo al día'
              : 'Aquí llegarán los avisos de administración y portería'
        }
        right={headerRight}
      />
      <View className="flex-row flex-wrap items-center justify-between gap-3">
        <FilterChips<Filter>
          value={filter}
          onChange={setFilter}
          options={[
            { key: 'ALL', label: 'Todos', count: stats.total },
            { key: 'UNREAD', label: 'Sin leer', count: stats.unread },
          ]}
        />
        {stats.unread > 0 ? (
          <Button
            title="Marcar todo leído"
            icon="checkmark-done"
            variant="secondary"
            onPress={onMarkAll}
            loading={markingAll}
          />
        ) : null}
      </View>
      {error ? <ErrorBanner message={error} onRetry={refresh} /> : null}
      {actionError ? <ErrorBanner message={actionError} /> : null}
    </View>
  );

  const list = (
    <FlatList
      data={visible}
      keyExtractor={(item) => String(item.id)}
      contentContainerStyle={{ paddingHorizontal: gutter, paddingBottom: 32, gap: 10 }}
      ListHeaderComponent={header}
      ListEmptyComponent={
        loading && messages.length === 0 ? (
          <ActivityIndicator className="mt-12" size="large" color="#1d6af0" />
        ) : (
          <EmptyState
            icon="mail-open-outline"
            title={filter === 'UNREAD' ? 'Nada pendiente' : 'Buzón vacío'}
            description={
              filter === 'UNREAD' ? 'Has leído todos tus mensajes.' : 'Todavía no has recibido mensajes.'
            }
          />
        )
      }
      renderItem={({ item }) => (
        <MailboxMessageRow
          item={item}
          selected={isTablet && item.id === activeId}
          expanded={!isTablet && item.id === activeId}
          onPress={() => open(item)}
        />
      )}
      refreshControl={
        <RefreshControl refreshing={loading && messages.length > 0} onRefresh={refresh} tintColor="#1d6af0" />
      }
      showsVerticalScrollIndicator={false}
    />
  );

  if (!isTablet) return list;

  return (
    <View className="flex-1 flex-row">
      <View className="w-[42%] max-w-[460px] border-r border-ink-200 dark:border-ink-800">{list}</View>
      <View className="flex-1 bg-white dark:bg-ink-900">
        {active ? (
          <MessageDetail item={active} />
        ) : (
          <View className="flex-1 items-center justify-center p-10">
            <Ionicons name="mail-open-outline" size={48} color="#93a8c7" />
            <Text className="mt-3 text-base font-semibold text-ink-600 dark:text-ink-300">
              Selecciona un mensaje para leerlo
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}
