import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { usersApi } from '@/api/admin';
import { getApiErrorMessage } from '@/api/axios';
import { ApartmentSelect } from '@/components/shared/ApartmentSelect';
import { Button } from '@/components/ui/Button';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { Input } from '@/components/ui/Input';
import { OptionPills } from '@/components/ui/OptionPills';
import { Sheet } from '@/components/ui/Sheet';
import { LIMITS, digitsOnly, validators } from '@/lib/validation';
import type { ApartmentOption, Role, UserResponse } from '@/types';

/** Rol principal elegible en la UI (los admins del sistema también llevan USER). */
export type UserKind = 'USER' | 'CONCIERGE' | 'ADMIN';

type UserFormModalProps = {
  visible: boolean;
  mode: 'create' | 'edit';
  /** Rol inicial al crear (p. ej. desde la pestaña Personal o desde un apartamento). */
  role?: UserKind;
  /** Apartamento preseleccionado al crear un residente desde la ficha del apartamento. */
  presetApartment?: ApartmentOption | null;
  user?: UserResponse | null;
  apartments: ApartmentOption[];
  onClose: () => void;
  onSaved: (user: UserResponse) => void;
};

type FormState = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  documentNumber: string;
  password: string;
  kind: UserKind;
  apartment: ApartmentOption | null;
  owner: boolean;
  occupiesApartment: boolean;
};

type Errors = Partial<Record<keyof FormState, string>>;

export function kindOf(user: Pick<UserResponse, 'roles'>): UserKind {
  if (user.roles.includes('ADMIN')) return 'ADMIN';
  if (user.roles.includes('CONCIERGE')) return 'CONCIERGE';
  return 'USER';
}

/** Mantengo la convención del backend: los administradores conservan también USER. */
function rolesFor(kind: UserKind): Role[] {
  if (kind === 'ADMIN') return ['ADMIN', 'USER'];
  if (kind === 'CONCIERGE') return ['CONCIERGE'];
  return ['USER'];
}

/** Compatibilidad con pantallas existentes: solo los residentes llevan apartamento. */
export function needsApartment(user: Pick<UserResponse, 'roles'> | null | undefined, role?: Role) {
  if (user) return kindOf(user) === 'USER';
  return role === 'USER';
}

const KIND_LABEL: Record<UserKind, string> = {
  USER: 'residente',
  CONCIERGE: 'conserje',
  ADMIN: 'administrador',
};

export function UserFormModal({
  visible,
  mode,
  role = 'USER',
  presetApartment = null,
  user,
  apartments,
  onClose,
  onSaved,
}: UserFormModalProps) {
  const [form, setForm] = useState<FormState>(() => emptyForm(role, presetApartment));
  const [errors, setErrors] = useState<Errors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const editing = mode === 'edit' && user != null;
  const isResident = form.kind === 'USER';

  // Cada apertura reinicia el formulario durante el render (sin efecto en cascada).
  const openKey = visible ? `${mode}-${user?.id ?? 'new'}-${role}-${presetApartment?.id ?? ''}` : null;
  const [lastKey, setLastKey] = useState<string | null>(null);
  if (openKey !== lastKey) {
    setLastKey(openKey);
    if (openKey) resetForm();
  }

  function resetForm() {
    setErrors({});
    setSubmitError(null);
    if (editing) {
      const current = apartments.find((a) => a.id === user.apartmentId) ??
        (user.apartmentId ? { id: user.apartmentId, identifier: user.apartmentIdentifier ?? '' } : null);
      setForm({
        firstName: user.firstName ?? '',
        lastName: user.lastName ?? '',
        email: user.email ?? '',
        phone: digitsOnly(user.phone ?? ''),
        documentNumber: digitsOnly(user.documentNumber ?? ''),
        password: '',
        kind: kindOf(user),
        apartment: current,
        owner: Boolean(user.owner),
        occupiesApartment: user.occupiesApartment !== false,
      });
    } else {
      setForm(emptyForm(role, presetApartment));
    }
  }

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
    setSubmitError(null);
  };

  const validate = () => {
    const next: Errors = {};
    if (!form.firstName.trim()) next.firstName = 'El nombre es obligatorio.';
    if (!form.lastName.trim()) next.lastName = 'Los apellidos son obligatorios.';
    if (!editing) {
      const emailError = validators.email(form.email);
      if (emailError) next.email = emailError;
      const passwordError = validators.password(form.password);
      if (passwordError) next.password = passwordError;
    }
    const phoneError = validators.phone(form.phone);
    if (phoneError) next.phone = phoneError;
    const documentError = validators.document(form.documentNumber);
    if (documentError) next.documentNumber = documentError;
    if (isResident && !form.apartment) next.apartment = 'Los residentes deben tener apartamento.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    setSaving(true);
    setSubmitError(null);
    try {
      const base = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        phone: form.phone || null,
        documentNumber: form.documentNumber || null,
      };
      const residentFields = isResident
        ? {
            apartmentId: form.apartment?.id ?? null,
            owner: form.owner,
            occupiesApartment: form.owner ? form.occupiesApartment : true,
          }
        : {};

      let saved: UserResponse;
      if (editing) {
        // Para conserjes/admins nunca se envía apartamento: el backend lo libera al cambiar el rol.
        saved = await usersApi.update(user.id, { ...base, roles: rolesFor(form.kind), ...residentFields });
      } else {
        saved = await usersApi.create({
          ...base,
          email: form.email.trim().toLowerCase(),
          password: form.password,
          roles: rolesFor(form.kind),
          ...residentFields,
        });
      }
      onSaved(saved);
      onClose();
    } catch (error) {
      setSubmitError(getApiErrorMessage(error));
      const fieldErrors = (error as { fieldErrors?: Record<string, string> | null }).fieldErrors;
      if (fieldErrors) setErrors((current) => ({ ...current, ...fieldErrors }));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={editing ? `Editar ${KIND_LABEL[kindOf(user)]}` : `Nuevo ${KIND_LABEL[form.kind]}`}
      subtitle={
        editing
          ? user.email
          : isResident
            ? 'Cuenta activa vinculada a su apartamento.'
            : 'Personal del edificio: no necesita apartamento.'
      }
      footer={
        <>
          <Button title="Cancelar" variant="secondary" size="lg" onPress={onClose} disabled={saving} className="flex-1" />
          <Button
            title={editing ? 'Guardar' : 'Crear'}
            icon={editing ? 'checkmark' : 'person-add-outline'}
            size="lg"
            onPress={submit}
            loading={saving}
            className="flex-1"
          />
        </>
      }
    >
      {submitError ? <ErrorBanner message={submitError} /> : null}

      <OptionPills<UserKind>
        label="Rol"
        value={form.kind}
        onChange={(kind) => update('kind', kind)}
        options={[
          { key: 'USER', label: 'Residente', icon: 'home-outline' },
          { key: 'CONCIERGE', label: 'Conserje', icon: 'shield-outline' },
          { key: 'ADMIN', label: 'Administrador', icon: 'key-outline' },
        ]}
      />

      <Input
        label="Nombre *"
        value={form.firstName}
        onChangeText={(v) => update('firstName', v)}
        autoCapitalize="words"
        maxLength={120}
        error={errors.firstName}
      />
      <Input
        label="Apellidos *"
        value={form.lastName}
        onChangeText={(v) => update('lastName', v)}
        autoCapitalize="words"
        maxLength={120}
        error={errors.lastName}
      />
      <Input
        label="Email *"
        icon="mail-outline"
        value={form.email}
        onChangeText={(v) => update('email', v)}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        editable={!editing}
        hint={editing ? 'El email no se puede modificar.' : undefined}
        error={errors.email}
      />
      {!editing ? (
        <Input
          label="Contraseña inicial *"
          icon="lock-closed-outline"
          value={form.password}
          onChangeText={(v) => update('password', v)}
          placeholder="Mínimo 8 caracteres"
          secureToggle
          autoCapitalize="none"
          maxLength={72}
          error={errors.password}
        />
      ) : null}
      <Input
        label="Teléfono"
        icon="call-outline"
        digitsOnly
        value={form.phone}
        onChangeText={(v) => update('phone', digitsOnly(v, LIMITS.phone.max))}
        maxLength={LIMITS.phone.max}
        placeholder="3001234567"
        error={errors.phone}
      />
      <Input
        label="Cédula"
        icon="card-outline"
        digitsOnly
        value={form.documentNumber}
        onChangeText={(v) => update('documentNumber', digitsOnly(v, LIMITS.document.max))}
        maxLength={LIMITS.document.max}
        placeholder="1000123456"
        error={errors.documentNumber}
      />

      {isResident ? (
        <View className="gap-4 rounded-2xl border border-ink-200 p-4 dark:border-ink-800">
          <Text className="text-sm font-bold uppercase tracking-wider text-ink-600 dark:text-ink-300">Vivienda</Text>
          <ApartmentSelect
            value={form.apartment}
            onChange={(apartment) => update('apartment', apartment)}
            label="Apartamento *"
            error={errors.apartment}
          />
          <OptionPills<'TENANT' | 'OWNER'>
            label="Relación con la vivienda"
            value={form.owner ? 'OWNER' : 'TENANT'}
            onChange={(key) => update('owner', key === 'OWNER')}
            options={[
              { key: 'TENANT', label: 'Arrendatario', icon: 'key-outline' },
              { key: 'OWNER', label: 'Propietario', icon: 'ribbon-outline' },
            ]}
          />
          {form.owner ? (
            <OptionPills<'YES' | 'NO'>
              label="¿Reside en la vivienda?"
              value={form.occupiesApartment ? 'YES' : 'NO'}
              onChange={(key) => update('occupiesApartment', key === 'YES')}
              options={[
                { key: 'YES', label: 'Sí, vive aquí' },
                { key: 'NO', label: 'No (propietario ausente)' },
              ]}
            />
          ) : null}
        </View>
      ) : (
        <Text className="text-[13px] text-ink-600 dark:text-ink-300">
          Conserjes y administradores no se vinculan a ningún apartamento.
        </Text>
      )}
    </Sheet>
  );
}

function emptyForm(kind: UserKind, apartment: ApartmentOption | null): FormState {
  return {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    documentNumber: '',
    password: '',
    kind,
    apartment,
    owner: false,
    occupiesApartment: true,
  };
}
