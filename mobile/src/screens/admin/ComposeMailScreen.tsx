import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { goBack } from '@/lib/navigation';
import React, { useCallback, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Alert, KeyboardAvoidingView, Pressable, ScrollView, Text, View } from 'react-native';
import { apartmentsApi } from '@/api/apartments';
import { usersApi } from '@/api/admin';
import { getApiErrorMessage } from '@/api/axios';
import { mailApi, type SendMailPayload } from '@/api/mail';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { CheckRow } from '@/components/ui/CheckRow';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { Input } from '@/components/ui/Input';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SearchBar } from '@/components/ui/SearchBar';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { useResponsive } from '@/hooks/useResponsive';
import { fullName, roleLabels } from '@/lib/format';
import { normalizeText } from '@/lib/validation';
import type { ApartmentResponse, Role, UserResponse } from '@/types';

const PREVIEW = 6;
const SUBJECT_MAX = 160;
const BODY_MAX = 4000;

const primaryRole = (user: UserResponse): Role =>
  user.roles.includes('ADMIN') ? 'ADMIN' : user.roles.includes('CONCIERGE') ? 'CONCIERGE' : 'USER';

function toggled<T>(set: Set<T>, value: T) {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

/**
 * Redactar mensaje (ADMIN). Destinatarios con casillas: Todos, por rol, por apartamento
 * o por usuario. Se envía por `POST /api/admin/mail`; el backend lo entrega en vivo
 * por WebSocket (`/user/queue/mailbox`) a quien esté conectado.
 */
export default function ComposeMailScreen() {
  const { isTablet, gutter } = useResponsive();
  const { user: me } = useAuth();
  // `?to=<id>` preselecciona un destinatario (desde Usuarios o un apartamento).
  const { to } = useLocalSearchParams<{ to?: string }>();
  const loader = useCallback(async () => {
    const [users, apartments] = await Promise.all([usersApi.list(0, 500), apartmentsApi.list(0, 200)]);
    // Mismas reglas que el servidor: cuentas aprobadas y activas, nunca el propio remitente.
    return {
      users: users.content.filter((u) => !u.deleted && u.enabled && u.approved !== false && u.id !== me?.id),
      apartments: apartments.content,
    };
  }, [me?.id]);
  const { data, loading, error, reload } = useAsyncResource(loader);

  const [everyone, setEveryone] = useState(false);
  const [allResidents, setAllResidents] = useState(false);
  const [allStaff, setAllStaff] = useState(false);
  const [apartmentIds, setApartmentIds] = useState<Set<number>>(new Set());
  const [userIds, setUserIds] = useState<Set<number>>(() => new Set(to ? [Number(to)] : []));
  const [apartmentQuery, setApartmentQuery] = useState('');
  const [userQuery, setUserQuery] = useState('');
  const [showAllApartments, setShowAllApartments] = useState(false);
  const [showAllUsers, setShowAllUsers] = useState(false);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const users = useMemo(() => data?.users ?? [], [data]);
  const apartments = useMemo(() => data?.apartments ?? [], [data]);

  // Residentes "puros": los administradores también llevan el rol USER.
  const residentUsers = useMemo(() => users.filter((u) => primaryRole(u) === 'USER'), [users]);
  const staffUsers = useMemo(() => users.filter((u) => u.roles.includes('CONCIERGE')), [users]);

  /** Resolución de destinatarios: qué peticiones se envían y a cuántas personas llega. */
  const plan = useMemo(() => {
    if (everyone) {
      return { requests: [{ audience: 'ALL' }] as Pick<SendMailPayload, 'audience' | 'recipientIds'>[], count: users.length };
    }

    const covered = new Set<number>();
    const requests: Pick<SendMailPayload, 'audience' | 'recipientIds'>[] = [];
    // Ambos grupos viajan como un único mensaje (audiencia RESIDENTS_CONCIERGE).
    if (allResidents && allStaff) requests.push({ audience: 'RESIDENTS_CONCIERGE' });
    else if (allResidents) requests.push({ audience: 'RESIDENTS' });
    else if (allStaff) requests.push({ audience: 'CONCIERGE' });
    if (allResidents) residentUsers.forEach((u) => covered.add(u.id));
    if (allStaff) staffUsers.forEach((u) => covered.add(u.id));

    const custom = new Set<number>(userIds);
    apartments
      .filter((a) => apartmentIds.has(a.id))
      .forEach((a) => a.residents.filter((r) => r.enabled).forEach((r) => custom.add(r.id)));
    const valid = new Set(users.map((u) => u.id));
    const extra = [...custom].filter((id) => !covered.has(id) && valid.has(id));
    if (extra.length > 0) requests.push({ audience: 'CUSTOM', recipientIds: extra });

    return { requests, count: covered.size + extra.length };
  }, [everyone, allResidents, allStaff, userIds, apartmentIds, apartments, residentUsers, staffUsers, users]);

  const filteredApartments = useMemo(() => {
    const term = normalizeText(apartmentQuery);
    return apartments.filter(
      (a) => !term || normalizeText(`${a.identifier} ${a.block ?? ''}`).includes(term),
    );
  }, [apartments, apartmentQuery]);

  const filteredUsers = useMemo(() => {
    const term = normalizeText(userQuery);
    return users.filter(
      (u) =>
        !term ||
        normalizeText(`${fullName(u.firstName, u.lastName)} ${u.email} ${u.apartmentIdentifier ?? ''}`).includes(term),
    );
  }, [users, userQuery]);

  const visibleApartments = showAllApartments ? filteredApartments : filteredApartments.slice(0, PREVIEW);
  const visibleUsers = showAllUsers ? filteredUsers : filteredUsers.slice(0, PREVIEW);

  const send = async () => {
    const cleanSubject = subject.trim();
    const cleanBody = body.trim();
    if (plan.requests.length === 0) {
      setSubmitError('Selecciona al menos un destinatario.');
      return;
    }
    if (!cleanSubject || !cleanBody) {
      setSubmitError('El asunto y el mensaje son obligatorios.');
      return;
    }

    setSending(true);
    setSubmitError(null);
    let delivered = 0;
    try {
      for (const request of plan.requests) {
        const response = await mailApi.send({ subject: cleanSubject, body: cleanBody, ...request });
        delivered += response.recipientCount;
      }
      Alert.alert('Mensaje enviado', `Se entregó en ${delivered} buzón(es).`, [
        { text: 'Aceptar', onPress: () => goBack('/admin/more') },
      ]);
    } catch (err) {
      setSubmitError(
        delivered > 0
          ? `Se entregó a ${delivered} buzón(es), pero una parte falló: ${getApiErrorMessage(err)}`
          : getApiErrorMessage(err),
      );
    } finally {
      setSending(false);
    }
  };

  const recipients = (
    <View className="gap-3 rounded-3xl border border-ink-200 bg-white p-4 dark:border-ink-800 dark:bg-ink-900">
      <View className="flex-row items-center justify-between gap-2">
        <Text className="text-lg font-extrabold text-ink-950 dark:text-white">Destinatarios</Text>
        <Badge label={`${plan.count} seleccionado${plan.count === 1 ? '' : 's'}`} tone={plan.count ? 'brand' : 'neutral'} icon="people-outline" />
      </View>

      <CheckRow
        icon="globe-outline"
        label="Todos"
        description="Todos los usuarios activos excepto tú"
        trailing={data ? String(users.length) : undefined}
        checked={everyone}
        onToggle={() => setEveryone((v) => !v)}
      />
      <CheckRow
        icon="home-outline"
        label="Todos los residentes"
        trailing={data ? String(residentUsers.length) : undefined}
        checked={everyone || allResidents}
        disabled={everyone}
        onToggle={() => setAllResidents((v) => !v)}
      />
      <CheckRow
        icon="shield-checkmark-outline"
        label="Toda la conserjería"
        trailing={data ? String(staffUsers.length) : undefined}
        checked={everyone || allStaff}
        disabled={everyone}
        onToggle={() => setAllStaff((v) => !v)}
      />

      <View className="mt-2 gap-2">
        <Text className="text-sm font-bold uppercase tracking-wider text-ink-600 dark:text-ink-300">
          Por apartamento
        </Text>
        <SearchBar value={apartmentQuery} onChangeText={setApartmentQuery} placeholder="Número o torre…" />
        {visibleApartments.map((apartment: ApartmentResponse) => (
          <CheckRow
            key={apartment.id}
            icon="business-outline"
            label={`Apartamento ${apartment.identifier}`}
            description={apartment.block ?? undefined}
            trailing={`${apartment.residents.filter((r) => r.enabled).length} resid.`}
            checked={everyone || apartmentIds.has(apartment.id)}
            disabled={everyone}
            onToggle={() => setApartmentIds((current) => toggled(current, apartment.id))}
          />
        ))}
        {filteredApartments.length === 0 && data ? (
          <Text className="text-sm text-ink-600 dark:text-ink-300">Sin apartamentos que coincidan.</Text>
        ) : null}
        {filteredApartments.length > PREVIEW ? (
          <Button
            title={showAllApartments ? 'Ver menos' : `Ver todos (${filteredApartments.length})`}
            variant="ghost"
            size="sm"
            onPress={() => setShowAllApartments((v) => !v)}
          />
        ) : null}
      </View>

      <View className="mt-2 gap-2">
        <Text className="text-sm font-bold uppercase tracking-wider text-ink-600 dark:text-ink-300">
          Por usuario
        </Text>
        <SearchBar value={userQuery} onChangeText={setUserQuery} placeholder="Nombre, correo o apartamento…" />
        {visibleUsers.map((user) => (
          <CheckRow
            key={user.id}
            icon="person-outline"
            label={fullName(user.firstName, user.lastName)}
            description={user.email}
            trailing={roleLabels[primaryRole(user)]}
            checked={everyone || userIds.has(user.id)}
            disabled={everyone}
            onToggle={() => setUserIds((current) => toggled(current, user.id))}
          />
        ))}
        {filteredUsers.length === 0 && data ? (
          <Text className="text-sm text-ink-600 dark:text-ink-300">Sin usuarios que coincidan.</Text>
        ) : null}
        {filteredUsers.length > PREVIEW ? (
          <Button
            title={showAllUsers ? 'Ver menos' : `Ver todos (${filteredUsers.length})`}
            variant="ghost"
            size="sm"
            onPress={() => setShowAllUsers((v) => !v)}
          />
        ) : null}
      </View>
    </View>
  );

  const message = (
    <View className="gap-4 rounded-3xl border border-ink-200 bg-white p-4 dark:border-ink-800 dark:bg-ink-900">
      <Text className="text-lg font-extrabold text-ink-950 dark:text-white">Mensaje</Text>
      <Input
        label="Asunto"
        icon="create-outline"
        value={subject}
        onChangeText={(v) => {
          setSubject(v);
          setSubmitError(null);
        }}
        placeholder="Corte de agua el martes"
        maxLength={SUBJECT_MAX}
      />
      <Input
        label="Contenido"
        value={body}
        onChangeText={(v) => {
          setBody(v);
          setSubmitError(null);
        }}
        placeholder="Escribe el contenido del aviso…"
        multiline
        textAlignVertical="top"
        style={{ minHeight: 160, paddingTop: 14 }}
        maxLength={BODY_MAX}
        hint={`${body.length}/${BODY_MAX} caracteres`}
      />
      {submitError ? <ErrorBanner message={submitError} /> : null}
      <Button
        title={plan.count ? `Enviar a ${plan.count} destinatario${plan.count === 1 ? '' : 's'}` : 'Enviar mensaje'}
        icon="send"
        size="lg"
        onPress={send}
        loading={sending}
        disabled={plan.count === 0}
        fullWidth
      />
      <View className="flex-row items-start gap-2 rounded-2xl bg-brand-50 px-4 py-3 dark:bg-brand-500/10">
        <Ionicons name="flash-outline" size={18} color="#1854dc" />
        <Text className="flex-1 text-xs leading-5 text-brand-800 dark:text-brand-200">
          Llega al buzón de cada destinatario y, si tiene la app abierta, se muestra al instante por WebSocket.
        </Text>
      </View>
    </View>
  );

  return (
    <Screen>
      <KeyboardAvoidingView behavior="padding" className="flex-1">
        <ScrollView
          contentContainerStyle={{ padding: gutter, paddingBottom: 40, gap: 16 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <ScreenHeader
            eyebrow="Administración"
            title="Redactar mensaje"
            subtitle="Elige quién lo recibe y escribe el aviso."
            right={
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Volver"
                onPress={() => goBack('/admin/more')}
                className="h-12 w-12 items-center justify-center rounded-full bg-ink-100 active:opacity-70 dark:bg-ink-800"
              >
                <Ionicons name="arrow-back" size={22} color="#526b8e" />
              </Pressable>
            }
          />
          {error ? <ErrorBanner message={error} onRetry={reload} /> : null}
          {loading && !data ? <Text className="text-sm text-ink-600 dark:text-ink-300">Cargando destinatarios…</Text> : null}

          {isTablet ? (
            <View className="flex-row items-start gap-4">
              <View className="flex-[1.1]">{recipients}</View>
              <View className="flex-1">{message}</View>
            </View>
          ) : (
            <>
              {recipients}
              {message}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
