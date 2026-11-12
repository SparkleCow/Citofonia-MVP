import { Ionicons } from '@expo/vector-icons';
import { goBack } from '@/lib/navigation';
import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { apartmentsApi } from '@/api/apartments';
import { callsApi } from '@/api/calls';
import { ResponsiveList } from '@/components/shared/ResponsiveList';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { FilterChips } from '@/components/ui/FilterChips';
import { Input } from '@/components/ui/Input';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SearchBar } from '@/components/ui/SearchBar';
import { useAuth } from '@/context/AuthContext';
import { useCall } from '@/context/CallContext';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { fullName } from '@/lib/format';
import { LIMITS, digitsOnly, normalizeText } from '@/lib/validation';
import type { ApartmentOption, CallStaffItem, ResidentDirectoryItem } from '@/types';

type Segment = 'RESIDENTS' | 'APARTMENTS' | 'STAFF';

type Row =
  | { kind: 'resident'; key: string; resident: ResidentDirectoryItem }
  | { kind: 'apartment'; key: string; apartment: ApartmentOption; residents: ResidentDirectoryItem[] }
  | { kind: 'staff'; key: string; staff: CallStaffItem };

type CallDirectoryProps = {
  eyebrow: string;
  title: string;
  /** Botón volver (rutas que no son pestañas raíz). */
  showBack?: boolean;
};

/** Número de apartamento: coincide por prefijo ("10" → 101, 102…). */
const apartmentMatches = (identifier: string | null | undefined, digits: string) => {
  if (!digits) return true;
  const value = normalizeText(identifier ?? '');
  return value.startsWith(digits) || value.split(/[^0-9]+/).some((part) => part.startsWith(digits));
};

const nameMatches = (haystack: string, term: string) =>
  !term || term.split(/\s+/).every((word) => normalizeText(haystack).includes(word));

/**
 * Directorio de citofonía compartido por administración y portería.
 * Filtra por número de apartamento y por nombre; "Llamar" usa la señalización STOMP
 * (o la simulación local si no hay conexión).
 */
export function CallDirectory({ eyebrow, title, showBack = false }: CallDirectoryProps) {
  const { isAdmin } = useAuth();
  const { startCall, busy } = useCall();
  // Flujo principal: apartamento → residentes → llamar. "Residentes" es la búsqueda directa.
  const [segment, setSegment] = useState<Segment>('APARTMENTS');
  const [openApartment, setOpenApartment] = useState<number | null>(null);
  const [apartmentFilter, setApartmentFilter] = useState('');
  const [nameFilter, setNameFilter] = useState('');

  const loader = useCallback(async () => {
    const [residents, apartments, staff] = await Promise.all([
      callsApi.residents(),
      apartmentsApi.options(),
      isAdmin ? callsApi.staff() : Promise.resolve<CallStaffItem[]>([]),
    ]);
    return { residents, apartments, staff };
  }, [isAdmin]);
  const { data, loading, refreshing, error, refresh } = useAsyncResource(loader);

  const term = normalizeText(nameFilter);

  const rows = useMemo<Row[]>(() => {
    if (!data) return [];
    const byName = (a: string, b: string) => a.localeCompare(b, 'es', { numeric: true });

    if (segment === 'STAFF') {
      return data.staff
        .filter((s) => nameMatches(`${fullName(s.firstName, s.lastName)} ${s.email}`, term))
        .sort((a, b) => byName(fullName(a.firstName, a.lastName), fullName(b.firstName, b.lastName)))
        .map((staff) => ({ kind: 'staff', key: `s-${staff.id}`, staff }));
    }

    if (segment === 'APARTMENTS') {
      return data.apartments
        .filter((a) => apartmentMatches(a.identifier, apartmentFilter))
        .map((apartment) => ({
          apartment,
          residents: data.residents.filter((r) => r.apartmentIdentifier === apartment.identifier),
        }))
        .filter(
          ({ apartment, residents }) =>
            nameMatches(
              `${apartment.block ?? ''} ${residents.map((r) => fullName(r.firstName, r.lastName)).join(' ')}`,
              term,
            ),
        )
        .sort((a, b) => byName(a.apartment.identifier, b.apartment.identifier))
        .map(({ apartment, residents }) => ({
          kind: 'apartment',
          key: `a-${apartment.id}`,
          apartment,
          residents,
        }));
    }

    return data.residents
      .filter(
        (r) =>
          apartmentMatches(r.apartmentIdentifier, apartmentFilter) &&
          nameMatches(`${fullName(r.firstName, r.lastName)} ${r.email}`, term),
      )
      .sort(
        (a, b) =>
          byName(a.apartmentIdentifier ?? '', b.apartmentIdentifier ?? '') ||
          byName(fullName(a.firstName, a.lastName), fullName(b.firstName, b.lastName)),
      )
      .map((resident) => ({ kind: 'resident', key: `r-${resident.id}`, resident }));
  }, [data, segment, apartmentFilter, term]);

  const segments: { key: Segment; label: string; count?: number }[] = [
    { key: 'APARTMENTS', label: 'Apartamentos', count: data?.apartments.length },
    { key: 'RESIDENTS', label: 'Buscar residente', count: data?.residents.length },
    ...(isAdmin ? [{ key: 'STAFF' as const, label: 'Personal', count: data?.staff.length }] : []),
  ];

  const renderRow = (row: Row) => {
    if (row.kind === 'resident') {
      const { resident } = row;
      const name = fullName(resident.firstName, resident.lastName);
      return (
        <View className="flex-1 rounded-3xl border border-ink-200 bg-white p-4 dark:border-ink-800 dark:bg-ink-900">
          <View className="flex-row items-center gap-3">
            <Avatar firstName={resident.firstName} lastName={resident.lastName} size="lg" />
            <View className="flex-1">
              <Text className="text-[17px] font-bold text-ink-950 dark:text-white" numberOfLines={1}>
                {name}
              </Text>
              <Text className="text-[13px] text-ink-600 dark:text-ink-300" numberOfLines={1}>
                {resident.email}
              </Text>
            </View>
            {resident.apartmentIdentifier ? (
              <Badge label={`Apto. ${resident.apartmentIdentifier}`} tone="brand" icon="home-outline" />
            ) : null}
          </View>
          <View className="mt-3">
            <Button
              title="Llamar"
              icon="call"
              size="lg"
              disabled={busy}
              onPress={() =>
                startCall({ kind: 'user', email: resident.email, name, apartment: resident.apartmentIdentifier })
              }
              fullWidth
            />
          </View>
        </View>
      );
    }

    if (row.kind === 'apartment') {
      const { apartment, residents } = row;
      return (
        <View className="flex-1 rounded-3xl border border-ink-200 bg-white p-4 dark:border-ink-800 dark:bg-ink-900">
          <View className="flex-row items-center gap-3">
            <View className="h-14 w-14 items-center justify-center rounded-2xl bg-brand-100 dark:bg-brand-500/20">
              <Text className="text-xl font-extrabold text-brand-800 dark:text-brand-200" numberOfLines={1}>
                {apartment.identifier}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="text-[17px] font-bold text-ink-950 dark:text-white" numberOfLines={1}>
                Apartamento {apartment.identifier}
              </Text>
              <Text className="text-[13px] text-ink-600 dark:text-ink-300" numberOfLines={1}>
                {[apartment.block, apartment.floor != null ? `Piso ${apartment.floor}` : null]
                  .filter(Boolean)
                  .join(' · ') || 'Vivienda'}
              </Text>
            </View>
            <Badge
              label={`${residents.length} resid.`}
              tone={residents.length ? 'success' : 'neutral'}
              icon="people-outline"
            />
          </View>
          {residents.length === 0 ? (
            <Text className="mt-3 text-[13px] text-ink-600 dark:text-ink-300">Sin residentes: no se puede llamar.</Text>
          ) : openApartment === apartment.id ? (
            <View className="mt-3 gap-2">
              {residents.map((resident) => {
                const residentName = fullName(resident.firstName, resident.lastName);
                return (
                  <View
                    key={resident.id}
                    className="flex-row items-center gap-3 rounded-xl border border-ink-200 p-2.5 dark:border-ink-700"
                  >
                    <Avatar firstName={resident.firstName} lastName={resident.lastName} size="sm" />
                    <Text className="flex-1 text-[15px] font-bold text-ink-950 dark:text-white" numberOfLines={1}>
                      {residentName}
                    </Text>
                    <Button
                      title="Llamar"
                      icon="call"
                      disabled={busy}
                      onPress={() =>
                        startCall({ kind: 'user', email: resident.email, name: residentName, apartment: apartment.identifier })
                      }
                    />
                  </View>
                );
              })}
              <Button
                title="Llamar a todos (timbre al apartamento)"
                icon="notifications-outline"
                variant="secondary"
                disabled={busy}
                onPress={() =>
                  startCall({
                    kind: 'apartment',
                    apartmentId: apartment.id,
                    name: `Apartamento ${apartment.identifier}`,
                    apartment: apartment.identifier,
                  })
                }
                fullWidth
              />
            </View>
          ) : (
            <View className="mt-3">
              <Button
                title={`Ver residentes (${residents.length})`}
                icon="people-outline"
                size="lg"
                onPress={() => setOpenApartment(apartment.id)}
                fullWidth
              />
            </View>
          )}
        </View>
      );
    }

    const { staff } = row;
    const name = fullName(staff.firstName, staff.lastName);
    return (
      <View className="flex-1 rounded-3xl border border-ink-200 bg-white p-4 dark:border-ink-800 dark:bg-ink-900">
        <View className="flex-row items-center gap-3">
          <Avatar firstName={staff.firstName} lastName={staff.lastName} size="lg" />
          <View className="flex-1">
            <Text className="text-[17px] font-bold text-ink-950 dark:text-white" numberOfLines={1}>
              {name}
            </Text>
            <Text className="text-[13px] text-ink-600 dark:text-ink-300" numberOfLines={1}>
              {staff.email}
            </Text>
          </View>
          <Badge label={staff.roles.includes('ADMIN') ? 'Admin' : 'Conserjería'} tone="info" />
        </View>
        <View className="mt-3">
          <Button
            title="Llamar"
            icon="call"
            size="lg"
            disabled={busy}
            onPress={() => startCall({ kind: 'user', email: staff.email, name })}
            fullWidth
          />
        </View>
      </View>
    );
  };

  return (
    <Screen>
      <ResponsiveList
        data={rows}
        keyExtractor={(row) => row.key}
        loading={loading}
        refreshing={refreshing}
        onRefresh={refresh}
        emptyIcon="search-outline"
        emptyTitle="Sin resultados"
        emptyDescription="Ajusta el número de apartamento o el nombre."
        header={
          <View className="gap-4">
            <ScreenHeader
              eyebrow={eyebrow}
              title={title}
              subtitle={`${rows.length} resultado${rows.length === 1 ? '' : 's'}`}
              right={
                showBack ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Volver"
                    onPress={() => goBack('/admin/more')}
                    className="h-12 w-12 items-center justify-center rounded-full bg-ink-100 active:opacity-70 dark:bg-ink-800"
                  >
                    <Ionicons name="arrow-back" size={22} color="#4a5c98" />
                  </Pressable>
                ) : undefined
              }
            />
            <FilterChips<Segment> value={segment} onChange={setSegment} options={segments} />
            <View className="flex-row flex-wrap gap-3">
              {segment !== 'STAFF' ? (
                <Input
                  label="N.º de apartamento"
                  icon="home-outline"
                  digitsOnly
                  value={apartmentFilter}
                  onChangeText={(v) => setApartmentFilter(digitsOnly(v, LIMITS.apartment.max))}
                  maxLength={LIMITS.apartment.max}
                  placeholder="101"
                  containerClassName="min-w-[150px] flex-1"
                />
              ) : null}
              <View className="min-w-[220px] flex-[2] gap-1.5">
                <Text className="text-sm font-semibold text-ink-800 dark:text-ink-100">
                  {segment === 'APARTMENTS' ? 'Residente o torre' : 'Nombre'}
                </Text>
                <SearchBar value={nameFilter} onChangeText={setNameFilter} placeholder="Buscar por nombre…" />
              </View>
            </View>
            {error ? <ErrorBanner message={error} onRetry={refresh} /> : null}
          </View>
        }
        renderItem={renderRow}
      />
    </Screen>
  );
}
