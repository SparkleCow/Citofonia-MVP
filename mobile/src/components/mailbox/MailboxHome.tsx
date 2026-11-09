import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';
import { apartmentsApi } from '@/api/apartments';
import { getApiErrorMessage } from '@/api/axios';
import { ConnectionDot } from '@/components/mailbox/ConnectionDot';
import type { MailTarget } from '@/components/mailbox/types';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SearchBar } from '@/components/ui/SearchBar';
import { useMailbox } from '@/context/MailboxContext';
import { useResponsive } from '@/hooks/useResponsive';
import type { MailCapabilities } from '@/lib/permissions';
import type { ApartmentOption } from '@/types';

const COLUMNS = 3;

type MailboxHomeProps = {
  eyebrow?: string;
  caps: MailCapabilities;
  headerRight?: React.ReactNode;
  /** Abre la pantalla de redacción (solo roles que pueden enviar). */
  onCompose?: () => void;
  selected: MailTarget | null;
  onOpen: (target: MailTarget) => void;
};

/** Pantalla principal del buzón: botón de Conserjería + cuadrícula de apartamentos. */
export function MailboxHome({ eyebrow, caps, headerRight, onCompose, selected, onOpen }: MailboxHomeProps) {
  const { stats, error: mailboxError, refresh } = useMailbox();
  const { gutter } = useResponsive();
  const [apartments, setApartments] = useState<ApartmentOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const fetchApartments = useCallback(
    () =>
      apartmentsApi
        .options()
        .then((list) => {
          setApartments(list);
          setError(null);
        })
        .catch((err) => setError(getApiErrorMessage(err)))
        .finally(() => setLoading(false)),
    [],
  );

  useEffect(() => {
    void fetchApartments();
  }, [fetchApartments]);

  const load = () => {
    setLoading(true);
    void fetchApartments();
  };

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return apartments;
    return apartments.filter((a) =>
      [a.identifier, a.block].filter(Boolean).some((f) => String(f).toLowerCase().includes(term)),
    );
  }, [apartments, query]);

  // Hasta el hueco final de la última fila para que las columnas queden alineadas.
  const data = useMemo(() => {
    const padding = (COLUMNS - (filtered.length % COLUMNS)) % COLUMNS;
    return [...filtered, ...Array.from({ length: padding }, () => null)];
  }, [filtered]);

  const heroActive = selected?.type === 'staff' || (selected?.type === 'inbox' && !caps.canListStaff);

  const header = (
    <View className="gap-4 pb-3 pt-3">
      <ScreenHeader
        eyebrow={eyebrow}
        title="Buzón"
        subtitle={stats.unread > 0 ? `${stats.unread} sin leer` : 'Todo al día'}
        right={headerRight}
      />
      <ConnectionDot />
      {mailboxError ? <ErrorBanner message={mailboxError} onRetry={refresh} /> : null}

      {caps.canSend && onCompose ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Redactar mensaje"
          onPress={onCompose}
          className="min-h-[60px] flex-row items-center justify-center gap-3 rounded-2xl bg-emerald-600 px-5 active:bg-emerald-700"
        >
          <Ionicons name="create" size={24} color="#ffffff" />
          <Text className="text-lg font-extrabold text-white">Redactar mensaje</Text>
        </Pressable>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Conserjería${stats.unread && !caps.canListStaff ? `, ${stats.unread} sin leer` : ''}`}
        onPress={() => onOpen({ type: caps.canListStaff ? 'staff' : 'inbox' })}
        className={`min-h-[96px] flex-row items-center gap-4 rounded-3xl px-5 py-4 active:opacity-90 ${
          heroActive ? 'bg-brand-800' : 'bg-brand-700'
        }`}
      >
        <View className="h-14 w-14 items-center justify-center rounded-2xl bg-white/20">
          <Ionicons name="shield-checkmark" size={30} color="#ffffff" />
        </View>
        <View className="flex-1">
          <Text className="text-2xl font-extrabold text-white">Conserjería</Text>
          <Text className="mt-0.5 text-sm text-brand-100">
            {caps.canListStaff ? 'Escribe al personal de portería' : 'Mensajes de administración y portería'}
          </Text>
        </View>
        {!caps.canListStaff && stats.unread > 0 ? (
          <View className="min-w-[30px] items-center rounded-full bg-rose-600 px-2 py-1">
            <Text className="text-sm font-bold text-white">{stats.unread}</Text>
          </View>
        ) : (
          <Ionicons name="chevron-forward" size={26} color="#ffffff" />
        )}
      </Pressable>

      {caps.canListStaff ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => onOpen({ type: 'inbox' })}
          className={`min-h-[56px] flex-row items-center gap-3 rounded-2xl border px-4 active:opacity-80 ${
            selected?.type === 'inbox'
              ? 'border-brand-600 bg-brand-50 dark:bg-brand-500/15'
              : 'border-ink-200 bg-white dark:border-ink-800 dark:bg-ink-900'
          }`}
        >
          <Ionicons name="file-tray-full-outline" size={22} color="#1854dc" />
          <Text className="flex-1 text-base font-bold text-ink-900 dark:text-ink-50">Todos mis mensajes</Text>
          {stats.unread > 0 ? (
            <View className="min-w-[26px] items-center rounded-full bg-rose-600 px-2 py-0.5">
              <Text className="text-xs font-bold text-white">{stats.unread}</Text>
            </View>
          ) : null}
        </Pressable>
      ) : null}

      <View className="mt-1">
        <Text className="mb-2 text-lg font-bold text-ink-900 dark:text-ink-50">Apartamentos</Text>
        <SearchBar value={query} onChangeText={setQuery} placeholder="Buscar apartamento o torre…" />
      </View>
      {error ? <ErrorBanner message={error} onRetry={load} /> : null}
    </View>
  );

  return (
    <FlatList
      data={data}
      numColumns={COLUMNS}
      keyExtractor={(item, index) => (item ? String(item.id) : `pad-${index}`)}
      contentContainerStyle={{ paddingHorizontal: gutter, paddingBottom: 32, gap: 10 }}
      columnWrapperStyle={{ gap: 10 }}
      ListHeaderComponent={header}
      keyboardShouldPersistTaps="handled"
      ListEmptyComponent={
        loading ? (
          <ActivityIndicator className="mt-8" size="large" color="#1d6af0" />
        ) : (
          <EmptyState
            icon="business-outline"
            title="Sin apartamentos"
            description={query ? 'Ningún apartamento coincide con la búsqueda.' : 'Aún no hay viviendas registradas.'}
          />
        )
      }
      renderItem={({ item }) => {
        if (!item) return <View style={{ flex: 1 }} />;
        const active = selected?.type === 'apartment' && selected.apartment.id === item.id;
        return (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Apartamento ${item.identifier}${item.block ? `, ${item.block}` : ''}`}
            onPress={() => onOpen({ type: 'apartment', apartment: item })}
            style={{ flex: 1 }}
            className={`min-h-[84px] items-center justify-center rounded-2xl border px-2 py-3 active:opacity-80 ${
              active
                ? 'border-brand-600 bg-brand-50 dark:bg-brand-500/15'
                : 'border-ink-200 bg-white dark:border-ink-800 dark:bg-ink-900'
            }`}
          >
            <Ionicons name="home" size={18} color={active ? '#1854dc' : '#526b8e'} />
            <Text className="mt-1 text-lg font-extrabold text-ink-950 dark:text-white" numberOfLines={1}>
              {item.identifier}
            </Text>
            {item.block ? (
              <Text className="text-[11px] font-medium text-ink-600 dark:text-ink-300" numberOfLines={1}>
                {item.block}
              </Text>
            ) : null}
          </Pressable>
        );
      }}
      showsVerticalScrollIndicator={false}
    />
  );
}
