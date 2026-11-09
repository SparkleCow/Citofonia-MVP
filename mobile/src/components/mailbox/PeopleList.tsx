import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';
import { apartmentsApi } from '@/api/apartments';
import { callsApi } from '@/api/calls';
import type { MailTarget, Person } from '@/components/mailbox/types';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SearchBar } from '@/components/ui/SearchBar';
import { useMailbox } from '@/context/MailboxContext';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { useResponsive } from '@/hooks/useResponsive';
import { fullName } from '@/lib/format';

type PeopleListProps = {
  target: Exclude<MailTarget, { type: 'inbox' }>;
  selectedId?: number | null;
  onSelect: (person: Person) => void;
  onBack: () => void;
};

async function loadPeople(target: PeopleListProps['target']): Promise<Person[]> {
  if (target.type === 'staff') {
    const staff = await callsApi.staff();
    return staff
      .filter((s) => s.roles.includes('CONCIERGE'))
      .map((s) => ({ id: s.id, firstName: s.firstName, lastName: s.lastName, email: s.email }));
  }
  const residents = await apartmentsApi.residents(target.apartment.id);
  return residents
    .filter((r) => r.enabled && r.roles.includes('USER'))
    .map((r) => ({
      id: r.id,
      firstName: r.firstName,
      lastName: r.lastName,
      email: r.email,
      caption: target.apartment.identifier,
    }));
}

/** Residentes de un apartamento o conserjes, para abrir la conversación. */
export function PeopleList({ target, selectedId, onSelect, onBack }: PeopleListProps) {
  const { messages } = useMailbox();
  const { gutter } = useResponsive();
  const [query, setQuery] = useState('');
  const loader = useCallback(() => loadPeople(target), [target]);
  const { data, loading, error, reload } = useAsyncResource(loader, { reloadOnFocus: false });

  const unreadBySender = useMemo(() => {
    const map = new Map<string, number>();
    messages.forEach((m) => {
      if (!m.read) map.set(m.senderEmail.toLowerCase(), (map.get(m.senderEmail.toLowerCase()) ?? 0) + 1);
    });
    return map;
  }, [messages]);

  const people = useMemo(() => {
    const term = query.trim().toLowerCase();
    return (data ?? []).filter(
      (p) => !term || `${fullName(p.firstName, p.lastName)} ${p.email}`.toLowerCase().includes(term),
    );
  }, [data, query]);

  const title = target.type === 'staff' ? 'Conserjería' : `Apartamento ${target.apartment.identifier}`;
  const subtitle =
    target.type === 'staff'
      ? 'Personal de portería'
      : [target.apartment.block, target.apartment.floor != null ? `Piso ${target.apartment.floor}` : null]
          .filter(Boolean)
          .join(' · ') || 'Residentes de la vivienda';

  return (
    <FlatList
      data={people}
      keyExtractor={(p) => String(p.id)}
      contentContainerStyle={{ paddingHorizontal: gutter, paddingBottom: 32, gap: 10 }}
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={
        <View className="gap-4 pb-2 pt-3">
          <ScreenHeader
            eyebrow="Destinatario"
            title={title}
            subtitle={subtitle}
            right={
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Volver"
                onPress={onBack}
                className="h-12 w-12 items-center justify-center rounded-full bg-ink-100 active:opacity-70 dark:bg-ink-800"
              >
                <Ionicons name="arrow-back" size={22} color="#526b8e" />
              </Pressable>
            }
          />
          {(data?.length ?? 0) > 6 ? (
            <SearchBar value={query} onChangeText={setQuery} placeholder="Buscar por nombre o correo…" />
          ) : null}
          {error ? <ErrorBanner message={error} onRetry={reload} /> : null}
        </View>
      }
      ListEmptyComponent={
        loading ? (
          <ActivityIndicator className="mt-8" size="large" color="#1d6af0" />
        ) : (
          <EmptyState
            icon="people-outline"
            title="Sin destinatarios"
            description={
              target.type === 'staff'
                ? 'No hay conserjes activos.'
                : 'Esta vivienda no tiene residentes activos.'
            }
          />
        )
      }
      renderItem={({ item }) => {
        const unread = unreadBySender.get(item.email.toLowerCase()) ?? 0;
        const active = item.id === selectedId;
        return (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Conversación con ${fullName(item.firstName, item.lastName)}${unread ? `, ${unread} sin leer` : ''}`}
            onPress={() => onSelect(item)}
            className={`min-h-[68px] flex-row items-center gap-3 rounded-2xl border px-4 py-3 active:opacity-80 ${
              active
                ? 'border-brand-600 bg-brand-50 dark:bg-brand-500/15'
                : 'border-ink-200 bg-white dark:border-ink-800 dark:bg-ink-900'
            }`}
          >
            <Avatar firstName={item.firstName} lastName={item.lastName} size="lg" />
            <View className="flex-1">
              <Text className="text-base font-bold text-ink-950 dark:text-white" numberOfLines={1}>
                {fullName(item.firstName, item.lastName)}
              </Text>
              <Text className="text-[13px] text-ink-600 dark:text-ink-300" numberOfLines={1}>
                {item.email}
              </Text>
            </View>
            {unread > 0 ? (
              <View className="min-w-[26px] items-center rounded-full bg-rose-600 px-2 py-0.5">
                <Text className="text-xs font-bold text-white">{unread}</Text>
              </View>
            ) : (
              <Ionicons name="chevron-forward" size={20} color="#6f87ab" />
            )}
          </Pressable>
        );
      }}
      showsVerticalScrollIndicator={false}
    />
  );
}
