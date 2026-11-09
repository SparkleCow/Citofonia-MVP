import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { goBack } from '@/lib/navigation';
import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { apartmentsApi } from '@/api/apartments';
import { usersApi } from '@/api/admin';
import { getApiErrorMessage } from '@/api/axios';
import { UserFormModal, kindOf } from '@/components/admin/UserFormModal';
import { Sheet } from '@/components/ui/Sheet';
import { useCall } from '@/context/CallContext';
import { ApartmentFormModal } from '@/components/admin/ApartmentFormModal';
import { ResponsiveList } from '@/components/shared/ResponsiveList';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { FilterChips } from '@/components/ui/FilterChips';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SearchBar } from '@/components/ui/SearchBar';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { useRowAction } from '@/hooks/useRowAction';
import { fullName } from '@/lib/format';
import { normalizeText } from '@/lib/validation';
import type { ApartmentResident, ApartmentResponse, UserResponse } from '@/types';

type Filter = 'ALL' | 'OCCUPIED' | 'EMPTY';

type ApartmentCardProps = {
  apartment: ApartmentResponse;
  deleting: boolean;
  busyKey: string | null;
  onEdit: () => void;
  onDelete: () => void;
  onAddResident: () => void;
  onRemoveResident: (resident: ApartmentResident) => void;
};

function ApartmentCard({
  apartment,
  deleting,
  busyKey,
  onEdit,
  onDelete,
  onAddResident,
  onRemoveResident,
}: ApartmentCardProps) {
  const [expanded, setExpanded] = useState(false);
  const { startCall, busy } = useCall();
  const residents = apartment.residents;

  return (
    <View className="flex-1 rounded-3xl border border-ink-200 bg-white p-4 dark:border-ink-800 dark:bg-ink-900">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Editar apartamento ${apartment.identifier}`}
        onPress={onEdit}
        className="flex-row items-center gap-3 active:opacity-80"
      >
        <View className="h-14 w-14 items-center justify-center rounded-2xl bg-brand-100 dark:bg-brand-500/20">
          <Text className="text-xl font-extrabold text-brand-800 dark:text-brand-200" numberOfLines={1}>
            {apartment.identifier}
          </Text>
        </View>
        <View className="flex-1">
          <Text className="text-base font-bold text-ink-950 dark:text-white" numberOfLines={1}>
            {apartment.block || 'Sin torre'}
          </Text>
          <Text className="text-[13px] text-ink-600 dark:text-ink-300">
            {apartment.floor != null ? `Piso ${apartment.floor}` : 'Piso sin definir'}
          </Text>
        </View>
        <Badge
          label={`${apartment.residentCount} resid.`}
          tone={apartment.residentCount > 0 ? 'success' : 'neutral'}
          icon="people-outline"
        />
      </Pressable>

      {apartment.notes ? (
        <Text className="mt-2 text-[13px] italic text-ink-700 dark:text-ink-200" numberOfLines={2}>
          “{apartment.notes}”
        </Text>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        onPress={() => setExpanded((value) => !value)}
        className="mt-3 min-h-[44px] flex-row items-center justify-between rounded-xl bg-ink-100 px-3 active:opacity-80 dark:bg-ink-800"
      >
        <Text className="text-sm font-bold text-ink-800 dark:text-ink-100">
          {expanded ? 'Ocultar residentes' : `Ver residentes (${residents.length})`}
        </Text>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color="#526b8e" />
      </Pressable>

      {expanded ? (
        <View className="mt-2 gap-2">
          {residents.length === 0 ? (
            <Text className="px-1 py-2 text-sm text-ink-600 dark:text-ink-300">
              Este apartamento no tiene residentes.
            </Text>
          ) : (
            residents.map((resident) => {
              const name = fullName(resident.firstName, resident.lastName);
              return (
                <View key={resident.id} className="gap-2 rounded-xl border border-ink-200 p-3 dark:border-ink-800">
                  <View className="flex-row items-center gap-3">
                    <Avatar firstName={resident.firstName} lastName={resident.lastName} size="sm" />
                    <View className="flex-1">
                      <Text className="text-sm font-bold text-ink-950 dark:text-white" numberOfLines={1}>
                        {name}
                      </Text>
                      <Text className="text-xs text-ink-600 dark:text-ink-300" numberOfLines={1}>
                        {resident.email}
                      </Text>
                    </View>
                    {!resident.enabled ? <Badge label="Inactivo" tone="danger" /> : null}
                  </View>
                  <View className="flex-row gap-2">
                    <Button
                      title="Llamar"
                      icon="call-outline"
                      variant="secondary"
                      size="sm"
                      disabled={busy || !resident.enabled}
                      onPress={() =>
                        startCall({ kind: 'user', email: resident.email, name, apartment: apartment.identifier })
                      }
                      className="flex-1"
                    />
                    <Button
                      title="Mensaje"
                      icon="mail-outline"
                      variant="secondary"
                      size="sm"
                      disabled={!resident.enabled}
                      onPress={() => router.push({ pathname: '/admin/mail', params: { to: String(resident.id) } })}
                      className="flex-1"
                    />
                    <Button
                      title="Quitar"
                      icon="person-remove-outline"
                      variant="ghost"
                      size="sm"
                      loading={busyKey === `rm-${resident.id}`}
                      onPress={() => onRemoveResident(resident)}
                    />
                  </View>
                </View>
              );
            })
          )}
          <Button title="Agregar residente" icon="person-add-outline" variant="secondary" size="sm" onPress={onAddResident} />
          {residents.length > 0 ? (
            <Button
              title="Abrir en Residentes"
              icon="open-outline"
              variant="ghost"
              size="sm"
              onPress={() =>
                router.push({ pathname: '/admin/residents', params: { apartmentId: String(apartment.id) } })
              }
            />
          ) : null}
        </View>
      ) : null}

      <View className="mt-3 flex-row gap-2">
        <Button title="Editar" icon="create-outline" variant="secondary" size="sm" onPress={onEdit} className="flex-1" />
        <Button
          title="Eliminar"
          icon="trash-outline"
          variant="danger"
          size="sm"
          loading={deleting}
          onPress={onDelete}
          className="flex-1"
        />
      </View>
    </View>
  );
}

/** Vincular un residente existente sin vivienda o crear uno nuevo en el apartamento. */
function AddResidentSheet({
  apartment,
  onClose,
  onLinked,
  onCreateNew,
}: {
  apartment: ApartmentResponse | null;
  onClose: () => void;
  onLinked: () => void;
  onCreateNew: () => void;
}) {
  const [candidates, setCandidates] = useState<UserResponse[] | null>(null);
  const [query, setQuery] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadedFor, setLoadedFor] = useState<number | null>(null);

  if (apartment && loadedFor !== apartment.id) {
    setLoadedFor(apartment.id);
    setCandidates(null);
    setQuery('');
    setError(null);
    usersApi
      .search({ role: 'USER', size: 500 })
      .then((page) =>
        setCandidates(
          page.content.filter((u) => kindOf(u) === 'USER' && u.approved !== false && u.apartmentId !== apartment.id),
        ),
      )
      .catch((err) => setError(getApiErrorMessage(err)));
  }

  const term = normalizeText(query);
  const list = (candidates ?? [])
    .filter((u) => !term || normalizeText(`${fullName(u.firstName, u.lastName)} ${u.email}`).includes(term))
    // Primero los que no tienen vivienda.
    .sort((a, b) => Number(a.apartmentId != null) - Number(b.apartmentId != null));

  const link = async (user: UserResponse) => {
    if (!apartment) return;
    setBusyId(user.id);
    setError(null);
    try {
      const linked = await usersApi.assignApartment(user.id, apartment.id);
      // Al quitarle la vivienda se desactivó: al darle una nueva se reactiva.
      if (!linked.enabled) await usersApi.enable(user.id);
      onLinked();
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Sheet
      visible={apartment != null}
      onClose={onClose}
      title={`Agregar residente al ${apartment?.identifier ?? ''}`}
      subtitle="Vincula un residente existente o crea uno nuevo."
      footer={<Button title="Crear residente nuevo" icon="person-add" size="lg" onPress={onCreateNew} fullWidth />}
    >
      {error ? <ErrorBanner message={error} /> : null}
      <SearchBar value={query} onChangeText={setQuery} placeholder="Buscar residente por nombre o email…" />
      {candidates == null && !error ? (
        <Text className="text-sm text-ink-600 dark:text-ink-300">Cargando residentes…</Text>
      ) : list.length === 0 ? (
        <Text className="text-sm text-ink-600 dark:text-ink-300">No hay residentes para vincular. Crea uno nuevo.</Text>
      ) : (
        list.slice(0, 30).map((user) => (
          <View key={user.id} className="flex-row items-center gap-3 rounded-xl border border-ink-200 p-3 dark:border-ink-800">
            <Avatar firstName={user.firstName} lastName={user.lastName} size="sm" />
            <View className="flex-1">
              <Text className="text-sm font-bold text-ink-950 dark:text-white" numberOfLines={1}>
                {fullName(user.firstName, user.lastName)}
              </Text>
              <Text className="text-xs text-ink-600 dark:text-ink-300" numberOfLines={1}>
                {user.apartmentIdentifier ? `Ahora en apto. ${user.apartmentIdentifier} (se moverá)` : 'Sin apartamento'}
              </Text>
            </View>
            <Button title="Vincular" size="sm" loading={busyId === user.id} onPress={() => void link(user)} />
          </View>
        ))
      )}
    </Sheet>
  );
}

/** CRUD de apartamentos (solo ADMIN crea, edita y elimina) con vista de residentes por unidad. */
export default function ApartmentsScreen() {
  const loader = useCallback(() => apartmentsApi.list(0, 200).then((page) => page.content), []);
  const { data, setData, loading, refreshing, error, refresh } = useAsyncResource(loader);
  const { busyKey, error: actionError, run } = useRowAction();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('ALL');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ApartmentResponse | null>(null);
  const [addingTo, setAddingTo] = useState<ApartmentResponse | null>(null);
  const [creatingIn, setCreatingIn] = useState<ApartmentResponse | null>(null);

  const apartments = useMemo(() => data ?? [], [data]);

  const counts = useMemo(
    () => ({
      ALL: apartments.length,
      OCCUPIED: apartments.filter((a) => a.residentCount > 0).length,
      EMPTY: apartments.filter((a) => a.residentCount === 0).length,
    }),
    [apartments],
  );

  const filtered = useMemo(() => {
    const term = normalizeText(query);
    return apartments
      .filter((a) => filter === 'ALL' || (filter === 'OCCUPIED' ? a.residentCount > 0 : a.residentCount === 0))
      .filter(
        (a) =>
          !term ||
          normalizeText(
            `${a.identifier} ${a.block ?? ''} ${a.notes ?? ''} ${a.residents
              .map((r) => `${fullName(r.firstName, r.lastName)} ${r.email}`)
              .join(' ')}`,
          ).includes(term),
      )
      .sort((a, b) => a.identifier.localeCompare(b.identifier, 'es', { numeric: true }));
  }, [apartments, query, filter]);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (apartment: ApartmentResponse) => {
    setEditing(apartment);
    setFormOpen(true);
  };

  const onSaved = (saved: ApartmentResponse) =>
    setData((current) => {
      const list = current ?? [];
      return list.some((a) => a.id === saved.id)
        ? list.map((a) => (a.id === saved.id ? saved : a))
        : [saved, ...list];
    });

  const remove = (apartment: ApartmentResponse) =>
    run(
      `del-${apartment.id}`,
      async () => {
        await apartmentsApi.remove(apartment.id);
        setData((current) => (current ?? []).filter((a) => a.id !== apartment.id));
      },
      {
        title: 'Eliminar apartamento',
        message:
          apartment.residentCount > 0
            ? `El apartamento ${apartment.identifier} tiene ${apartment.residentCount} residente(s). Si el servidor lo permite, quedarán sin vivienda.`
            : `Se eliminará el apartamento ${apartment.identifier}.`,
        confirmLabel: 'Eliminar',
        destructive: true,
      },
    );

  return (
    <Screen>
      <ResponsiveList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        loading={loading}
        refreshing={refreshing}
        onRefresh={refresh}
        emptyIcon="business-outline"
        emptyTitle={query || filter !== 'ALL' ? 'Sin resultados' : 'No hay apartamentos'}
        emptyDescription={
          query || filter !== 'ALL' ? 'Prueba con otro filtro o búsqueda.' : 'Crea el primero con el botón superior.'
        }
        header={
          <View className="gap-4">
            <ScreenHeader
              eyebrow="Administración"
              title="Apartamentos"
              subtitle={`${apartments.length} unidades · ${counts.OCCUPIED} ocupadas`}
              right={
                <>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Volver"
                    onPress={() => goBack('/admin/more')}
                    className="h-12 w-12 items-center justify-center rounded-full bg-ink-100 active:opacity-70 dark:bg-ink-800"
                  >
                    <Ionicons name="arrow-back" size={22} color="#526b8e" />
                  </Pressable>
                  <Button title="Nuevo" icon="add" size="lg" onPress={openCreate} />
                </>
              }
            />
            <SearchBar value={query} onChangeText={setQuery} placeholder="Número, torre o nombre de residente…" />
            <FilterChips<Filter>
              value={filter}
              onChange={setFilter}
              options={[
                { key: 'ALL', label: 'Todos', count: counts.ALL },
                { key: 'OCCUPIED', label: 'Con residentes', count: counts.OCCUPIED },
                { key: 'EMPTY', label: 'Vacíos', count: counts.EMPTY },
              ]}
            />
            {error ? <ErrorBanner message={error} onRetry={refresh} /> : null}
            {actionError ? <ErrorBanner message={actionError} /> : null}
          </View>
        }
        renderItem={(apartment) => (
          <ApartmentCard
            apartment={apartment}
            busyKey={busyKey}
            onAddResident={() => setAddingTo(apartment)}
            onRemoveResident={(resident) =>
              void run(
                `rm-${resident.id}`,
                async () => {
                  await usersApi.assignApartment(resident.id, null);
                  await refresh();
                },
                {
                  title: 'Quitar del apartamento',
                  message: `${fullName(resident.firstName, resident.lastName)} quedará sin vivienda y su cuenta se desactivará hasta que le asignes otra.`,
                  confirmLabel: 'Quitar',
                  destructive: true,
                },
              )
            }
            deleting={busyKey === `del-${apartment.id}`}
            onEdit={() => openEdit(apartment)}
            onDelete={() => void remove(apartment)}
          />
        )}
      />

      <AddResidentSheet
        apartment={addingTo}
        onClose={() => setAddingTo(null)}
        onLinked={() => void refresh()}
        onCreateNew={() => {
          setCreatingIn(addingTo);
          setAddingTo(null);
        }}
      />

      <UserFormModal
        visible={creatingIn != null}
        mode="create"
        role="USER"
        presetApartment={creatingIn ? { id: creatingIn.id, identifier: creatingIn.identifier, block: creatingIn.block } : null}
        apartments={apartments}
        onClose={() => setCreatingIn(null)}
        onSaved={() => void refresh()}
      />

      <ApartmentFormModal
        visible={formOpen}
        apartment={editing}
        onClose={() => setFormOpen(false)}
        onSaved={onSaved}
      />
    </Screen>
  );
}
