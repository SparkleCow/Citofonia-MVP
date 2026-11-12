import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { usersApi } from '@/api/admin';
import { getApiErrorMessage } from '@/api/axios';
import { ApartmentSelect } from '@/components/shared/ApartmentSelect';
import { ResponsiveList } from '@/components/shared/ResponsiveList';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { InfoRow } from '@/components/ui/InfoRow';
import { OptionPills } from '@/components/ui/OptionPills';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Sheet } from '@/components/ui/Sheet';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { useRowAction } from '@/hooks/useRowAction';
import { formatDateTime, fullName } from '@/lib/format';
import { goBack } from '@/lib/navigation';
import type { ApartmentOption, UserResponse } from '@/types';

/** Aprobación: el residente sale activo, con apartamento y su relación con la vivienda. */
function ApproveSheet({
  user,
  onClose,
  onApproved,
}: {
  user: UserResponse | null;
  onClose: () => void;
  onApproved: (user: UserResponse) => void;
}) {
  const [apartment, setApartment] = useState<ApartmentOption | null>(null);
  const [owner, setOwner] = useState(false);
  const [occupies, setOccupies] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUserId, setLastUserId] = useState<number | null>(null);

  // Al abrir con otro usuario se precargan los datos que dio al registrarse.
  if (user && user.id !== lastUserId) {
    setLastUserId(user.id);
    setApartment(user.apartmentId ? { id: user.apartmentId, identifier: user.apartmentIdentifier ?? '' } : null);
    setOwner(Boolean(user.owner));
    setOccupies(user.occupiesApartment !== false);
    setError(null);
  }

  const approve = async () => {
    if (!user) return;
    if (!apartment) {
      setError('Asigna un apartamento: los residentes deben tener vivienda.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const saved = await usersApi.approve(user.id, {
        apartmentId: apartment.id,
        owner,
        occupiesApartment: owner ? occupies : true,
      });
      onApproved(saved);
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet
      visible={user != null}
      onClose={onClose}
      title="Aprobar registro"
      subtitle={user ? `${fullName(user.firstName, user.lastName)} · ${user.email}` : undefined}
      footer={
        <>
          <Button title="Cancelar" variant="secondary" size="lg" onPress={onClose} className="flex-1" />
          <Button title="Aprobar y activar" icon="checkmark-circle" variant="success" size="lg" loading={saving} onPress={approve} className="flex-1" />
        </>
      }
    >
      {error ? <ErrorBanner message={error} /> : null}
      <ApartmentSelect value={apartment} onChange={setApartment} label="Apartamento *" />
      <OptionPills<'TENANT' | 'OWNER'>
        label="Relación con la vivienda"
        value={owner ? 'OWNER' : 'TENANT'}
        onChange={(key) => setOwner(key === 'OWNER')}
        options={[
          { key: 'TENANT', label: 'Arrendatario', icon: 'key-outline' },
          { key: 'OWNER', label: 'Propietario', icon: 'ribbon-outline' },
        ]}
      />
      {owner ? (
        <OptionPills<'YES' | 'NO'>
          label="¿Reside en la vivienda?"
          value={occupies ? 'YES' : 'NO'}
          onChange={(key) => setOccupies(key === 'YES')}
          options={[
            { key: 'YES', label: 'Sí, vive aquí' },
            { key: 'NO', label: 'No (propietario ausente)' },
          ]}
        />
      ) : null}
    </Sheet>
  );
}

/** Registros de residentes pendientes de aprobación. Hasta aprobarse no pueden iniciar sesión. */
export default function PendingScreen() {
  const loader = useCallback(() => usersApi.pending(0, 100).then((page) => page.content), []);
  const { data, setData, loading, refreshing, error, refresh } = useAsyncResource(loader);
  const { busyKey, error: actionError, run } = useRowAction();
  const [approving, setApproving] = useState<UserResponse | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const pending = data ?? [];
  const drop = (id: number) => setData((current) => (current ?? []).filter((u) => u.id !== id));

  return (
    <Screen>
      <ResponsiveList
        data={pending}
        keyExtractor={(u) => String(u.id)}
        loading={loading}
        refreshing={refreshing}
        onRefresh={refresh}
        emptyIcon="checkmark-done-outline"
        emptyTitle="Todo al día"
        emptyDescription="No hay registros esperando aprobación."
        header={
          <View className="gap-3">
            <ScreenHeader
              eyebrow="Administración"
              title="Solicitudes pendientes"
              subtitle={`${pending.length} registro(s) esperando aprobación`}
              right={
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Volver"
                  onPress={() => goBack('/admin/more')}
                  className="h-12 w-12 items-center justify-center rounded-full bg-ink-100 active:opacity-70 dark:bg-ink-800"
                >
                  <Ionicons name="arrow-back" size={22} color="#4a5c98" />
                </Pressable>
              }
            />
            <Text className="text-[13px] text-ink-600 dark:text-ink-300">
              Las cuentas registradas desde la app quedan inactivas hasta que las apruebes.
            </Text>
            {notice ? (
              <View className="flex-row items-center gap-2 rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 dark:border-emerald-500/40 dark:bg-emerald-500/10">
                <Ionicons name="checkmark-circle" size={20} color="#12a372" />
                <Text className="flex-1 text-sm font-semibold text-emerald-900 dark:text-emerald-200">{notice}</Text>
              </View>
            ) : null}
            {error ? <ErrorBanner message={error} onRetry={refresh} /> : null}
            {actionError ? <ErrorBanner message={actionError} /> : null}
          </View>
        }
        renderItem={(u) => (
          <View className="flex-1 rounded-2xl border border-ink-200 bg-white p-4 dark:border-ink-800 dark:bg-ink-900">
            <View className="flex-row items-center gap-3">
              <Avatar firstName={u.firstName} lastName={u.lastName} />
              <View className="flex-1">
                <Text className="text-base font-bold text-ink-950 dark:text-white" numberOfLines={1}>
                  {fullName(u.firstName, u.lastName)}
                </Text>
                <Text className="text-xs text-ink-600 dark:text-ink-300" numberOfLines={1}>
                  {u.email}
                </Text>
              </View>
              <Badge label="Pendiente" tone="warning" icon="time-outline" />
            </View>
            <View className="mt-3 gap-1.5">
              <InfoRow icon="home-outline" label="Apartamento solicitado" value={u.apartmentIdentifier ?? 'No indicado'} />
              <InfoRow icon="ribbon-outline" label="Declara ser" value={u.owner ? 'Propietario' : 'Arrendatario'} />
              <InfoRow icon="call-outline" label="Teléfono" value={u.phone} />
              <InfoRow icon="card-outline" label="Cédula" value={u.documentNumber} />
              <InfoRow icon="calendar-outline" label="Registrado" value={formatDateTime(u.createdAt)} />
            </View>
            <View className="mt-4 flex-row gap-2">
              <Button
                title="Rechazar"
                icon="close"
                variant="secondary"
                loading={busyKey === `r-${u.id}`}
                onPress={() =>
                  run(
                    `r-${u.id}`,
                    async () => {
                      await usersApi.reject(u.id);
                      drop(u.id);
                      setNotice(`Registro de ${fullName(u.firstName, u.lastName)} rechazado.`);
                    },
                    {
                      title: 'Rechazar registro',
                      message: `La cuenta de ${fullName(u.firstName, u.lastName)} no podrá acceder.`,
                      confirmLabel: 'Rechazar',
                      destructive: true,
                    },
                  )
                }
                className="flex-1"
              />
              <Button title="Aprobar" icon="checkmark" variant="success" onPress={() => setApproving(u)} className="flex-1" />
            </View>
          </View>
        )}
      />

      <ApproveSheet
        user={approving}
        onClose={() => setApproving(null)}
        onApproved={(saved) => {
          drop(saved.id);
          setNotice(`${fullName(saved.firstName, saved.lastName)} ya puede iniciar sesión (apto. ${saved.apartmentIdentifier}).`);
        }}
      />
    </Screen>
  );
}
