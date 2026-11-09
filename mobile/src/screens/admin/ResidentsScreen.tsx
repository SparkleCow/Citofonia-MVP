import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { apartmentsApi, usersApi } from '@/api/admin';
import { UserFormModal, kindOf, type UserKind } from '@/components/admin/UserFormModal';
import { ResponsiveList } from '@/components/shared/ResponsiveList';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { FilterChips } from '@/components/ui/FilterChips';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SearchBar } from '@/components/ui/SearchBar';
import { useAuth } from '@/context/AuthContext';
import { useCall } from '@/context/CallContext';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { useRowAction } from '@/hooks/useRowAction';
import { fullName } from '@/lib/format';
import { normalizeText } from '@/lib/validation';
import type { ApartmentOption, UserResponse } from '@/types';

type KindFilter = 'ALL' | UserKind;
type StatusFilter = 'ALL' | 'ACTIVE' | 'DISABLED';

const KIND_BADGE: Record<UserKind, { label: string; tone: 'brand' | 'info' | 'violet' }> = {
  USER: { label: 'Residente', tone: 'brand' },
  CONCIERGE: { label: 'Conserje', tone: 'info' },
  ADMIN: { label: 'Administrador', tone: 'violet' },
};

function IconAction({
  icon,
  label,
  onPress,
  tone = 'neutral',
  disabled,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  tone?: 'neutral' | 'danger' | 'success';
  disabled?: boolean;
}) {
  const colors = {
    neutral: { wrap: 'border-ink-300 dark:border-ink-600', icon: '#3d5270' },
    danger: { wrap: 'border-rose-300 dark:border-rose-500/50', icon: '#e11d48' },
    success: { wrap: 'border-emerald-300 dark:border-emerald-500/50', icon: '#047857' },
  }[tone];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      className={`min-h-[44px] flex-1 flex-row items-center justify-center gap-1.5 rounded-xl border bg-white px-2 active:bg-ink-100 dark:bg-ink-900 dark:active:bg-ink-800 ${colors.wrap} ${
        disabled ? 'opacity-40' : ''
      }`}
    >
      <Ionicons name={icon} size={17} color={colors.icon} />
      <Text className="text-xs font-bold text-ink-800 dark:text-ink-100" numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

/** Gestión de usuarios: residentes, conserjería y administración. */
export default function ResidentsScreen() {
  const { user: me } = useAuth();
  const { startCall, busy } = useCall();
  const { apartmentId: apartmentParam } = useLocalSearchParams<{ apartmentId?: string }>();

  const loader = useCallback(async () => {
    const [users, apartments] = await Promise.all([usersApi.list(0, 500), apartmentsApi.options()]);
    return { users: users.content.filter((u) => !u.deleted), apartments };
  }, []);
  const { data, setData, loading, refreshing, error, refresh } = useAsyncResource(loader);
  const { busyKey, error: actionError, run } = useRowAction();

  const [query, setQuery] = useState('');
  const [kind, setKind] = useState<KindFilter>('ALL');
  const [status, setStatus] = useState<StatusFilter>('ALL');
  const [apartmentFilter, setApartmentFilter] = useState<number | null>(
    apartmentParam ? Number(apartmentParam) : null,
  );
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<UserResponse | null>(null);
  const [createKind, setCreateKind] = useState<UserKind>('USER');

  const [lastParam, setLastParam] = useState(apartmentParam);
  if (apartmentParam !== lastParam) {
    setLastParam(apartmentParam);
    if (apartmentParam) {
      setApartmentFilter(Number(apartmentParam));
      setKind('USER');
    }
  }

  const all = data?.users ?? [];
  const apartments: ApartmentOption[] = data?.apartments ?? [];
  const approved = all.filter((u) => u.approved !== false);
  const pendingCount = all.length - approved.length;

  const counts = useMemo(
    () => ({
      ALL: approved.length,
      USER: approved.filter((u) => kindOf(u) === 'USER').length,
      CONCIERGE: approved.filter((u) => kindOf(u) === 'CONCIERGE').length,
      ADMIN: approved.filter((u) => kindOf(u) === 'ADMIN').length,
    }),
    [approved],
  );

  const visible = useMemo(() => {
    const term = normalizeText(query);
    return approved
      .filter((u) => kind === 'ALL' || kindOf(u) === kind)
      .filter((u) => status === 'ALL' || (status === 'ACTIVE' ? u.enabled : !u.enabled))
      .filter((u) => apartmentFilter == null || u.apartmentId === apartmentFilter)
      .filter(
        (u) =>
          !term ||
          normalizeText(`${fullName(u.firstName, u.lastName)} ${u.email} ${u.apartmentIdentifier ?? ''} ${u.phone ?? ''}`).includes(term),
      )
      .sort((a, b) => fullName(a.firstName, a.lastName).localeCompare(fullName(b.firstName, b.lastName), 'es'));
  }, [approved, query, kind, status, apartmentFilter]);

  const replace = (saved: UserResponse) =>
    setData((current) =>
      current
        ? {
            ...current,
            users: current.users.some((u) => u.id === saved.id)
              ? current.users.map((u) => (u.id === saved.id ? { ...u, ...saved } : u))
              : [saved, ...current.users],
          }
        : current,
    );

  const openCreate = () => {
    setEditing(null);
    setCreateKind(kind === 'ALL' ? 'USER' : kind);
    setFormOpen(true);
  };

  const toggle = (u: UserResponse) =>
    run(
      `t-${u.id}`,
      async () => replace(u.enabled ? await usersApi.disable(u.id) : await usersApi.enable(u.id)),
      u.enabled
        ? {
            title: 'Desactivar usuario',
            message: `${fullName(u.firstName, u.lastName)} no podrá iniciar sesión hasta que lo actives de nuevo.`,
            confirmLabel: 'Desactivar',
            destructive: true,
          }
        : undefined,
    );

  const remove = (u: UserResponse) =>
    run(
      `d-${u.id}`,
      async () => {
        await usersApi.remove(u.id);
        setData((current) => (current ? { ...current, users: current.users.filter((x) => x.id !== u.id) } : current));
      },
      {
        title: 'Eliminar usuario',
        message: `Se eliminará la cuenta de ${fullName(u.firstName, u.lastName)}. Su historial se conserva.`,
        confirmLabel: 'Eliminar',
        destructive: true,
      },
    );

  return (
    <Screen>
      <ResponsiveList
        data={visible}
        keyExtractor={(u) => String(u.id)}
        loading={loading}
        refreshing={refreshing}
        onRefresh={refresh}
        emptyIcon={query ? 'search-outline' : 'people-outline'}
        emptyTitle={query ? 'Sin resultados' : 'No hay usuarios con estos filtros'}
        emptyDescription="Prueba con otro nombre, apartamento o filtro."
        header={
          <View className="gap-3">
            <ScreenHeader
              eyebrow="Administración"
              title="Usuarios"
              subtitle={`${counts.USER} residentes · ${counts.CONCIERGE} conserjes · ${counts.ADMIN} admin.`}
              right={<Button title="Nuevo" icon="person-add" size="lg" onPress={openCreate} />}
            />
            {pendingCount > 0 ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push('/admin/pending')}
                className="min-h-[52px] flex-row items-center gap-3 rounded-2xl border border-amber-300 bg-amber-50 px-4 active:opacity-80 dark:border-amber-500/40 dark:bg-amber-500/10"
              >
                <Ionicons name="time" size={20} color="#b45309" />
                <Text className="flex-1 text-sm font-bold text-amber-900 dark:text-amber-200">
                  {pendingCount} registro(s) esperando aprobación
                </Text>
                <Text className="text-sm font-extrabold text-amber-800 dark:text-amber-200">Revisar</Text>
              </Pressable>
            ) : null}
            <SearchBar value={query} onChangeText={setQuery} placeholder="Nombre, email, teléfono o apartamento…" />
            <FilterChips<KindFilter>
              value={kind}
              onChange={setKind}
              options={[
                { key: 'ALL', label: 'Todos', count: counts.ALL },
                { key: 'USER', label: 'Residentes', count: counts.USER },
                { key: 'CONCIERGE', label: 'Conserjes', count: counts.CONCIERGE },
                { key: 'ADMIN', label: 'Administradores', count: counts.ADMIN },
              ]}
            />
            <FilterChips<StatusFilter>
              value={status}
              onChange={setStatus}
              options={[
                { key: 'ALL', label: 'Cualquier estado' },
                { key: 'ACTIVE', label: 'Activos' },
                { key: 'DISABLED', label: 'Inactivos' },
              ]}
            />
            <FilterChips<string>
              value={apartmentFilter != null ? String(apartmentFilter) : 'ALL'}
              onChange={(key) => setApartmentFilter(key === 'ALL' ? null : Number(key))}
              options={[
                { key: 'ALL', label: 'Todos los aptos.' },
                ...apartments.map((a) => ({ key: String(a.id), label: `Apto. ${a.identifier}` })),
              ]}
            />
            {error ? <ErrorBanner message={error} onRetry={refresh} /> : null}
            {actionError ? <ErrorBanner message={actionError} /> : null}
          </View>
        }
        renderItem={(u) => {
          const userKind = kindOf(u);
          const isSelf = u.id === me?.id;
          const badge = KIND_BADGE[userKind];
          const name = fullName(u.firstName, u.lastName);
          return (
            <View className="flex-1 rounded-2xl border border-ink-200 bg-white p-4 dark:border-ink-800 dark:bg-ink-900">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Editar ${name}`}
                onPress={() => {
                  setEditing(u);
                  setFormOpen(true);
                }}
                className="flex-row items-center gap-3 active:opacity-80"
              >
                <Avatar firstName={u.firstName} lastName={u.lastName} />
                <View className="flex-1">
                  <Text className="text-base font-bold text-ink-950 dark:text-white" numberOfLines={1}>
                    {name}
                    {isSelf ? ' (tú)' : ''}
                  </Text>
                  <Text className="text-xs text-ink-600 dark:text-ink-300" numberOfLines={1}>
                    {u.email}
                  </Text>
                </View>
                <Ionicons name="create-outline" size={20} color="#6f87ab" />
              </Pressable>
              <View className="mt-2 flex-row flex-wrap gap-1.5">
                <Badge label={badge.label} tone={badge.tone} />
                {userKind === 'USER' ? (
                  <>
                    <Badge label={u.apartmentIdentifier ? `Apto. ${u.apartmentIdentifier}` : 'Sin apartamento'} tone={u.apartmentIdentifier ? 'neutral' : 'warning'} icon="home-outline" />
                    <Badge label={u.owner ? (u.occupiesApartment ? 'Propietario' : 'Propietario ausente') : 'Arrendatario'} tone="neutral" />
                  </>
                ) : null}
                {!u.enabled ? <Badge label="Inactivo" tone="danger" /> : null}
              </View>
              <View className="mt-3 flex-row gap-2">
                {userKind === 'USER' ? (
                  <IconAction
                    icon="call-outline"
                    label="Llamar"
                    disabled={busy || !u.enabled}
                    onPress={() => startCall({ kind: 'user', email: u.email, name, apartment: u.apartmentIdentifier })}
                  />
                ) : null}
                <IconAction
                  icon="mail-outline"
                  label="Mensaje"
                  disabled={isSelf || !u.enabled}
                  onPress={() => router.push({ pathname: '/admin/mail', params: { to: String(u.id) } })}
                />
                <IconAction
                  icon="power"
                  label={u.enabled ? 'Desactivar' : 'Activar'}
                  tone={u.enabled ? 'neutral' : 'success'}
                  disabled={isSelf || busyKey === `t-${u.id}`}
                  onPress={() => void toggle(u)}
                />
                <IconAction
                  icon="trash-outline"
                  label="Eliminar"
                  tone="danger"
                  disabled={isSelf || busyKey === `d-${u.id}`}
                  onPress={() => void remove(u)}
                />
              </View>
            </View>
          );
        }}
      />

      <UserFormModal
        visible={formOpen}
        mode={editing ? 'edit' : 'create'}
        role={createKind}
        presetApartment={!editing && apartmentFilter != null ? apartments.find((a) => a.id === apartmentFilter) ?? null : null}
        user={editing}
        apartments={apartments}
        onClose={() => setFormOpen(false)}
        onSaved={replace}
      />
    </Screen>
  );
}
