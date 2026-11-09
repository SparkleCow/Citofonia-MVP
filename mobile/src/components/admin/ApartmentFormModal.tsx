import React, { useState } from 'react';
import { apartmentsApi } from '@/api/apartments';
import { getApiErrorMessage } from '@/api/axios';
import { Button } from '@/components/ui/Button';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { Input } from '@/components/ui/Input';
import { Sheet } from '@/components/ui/Sheet';
import { LIMITS, digitsOnly, validators } from '@/lib/validation';
import type { ApartmentResponse } from '@/types';

type ApartmentFormModalProps = {
  visible: boolean;
  apartment?: ApartmentResponse | null;
  onClose: () => void;
  onSaved: (apartment: ApartmentResponse) => void;
};

type FormState = { identifier: string; block: string; floor: string; notes: string };
type Errors = Partial<Record<keyof FormState, string>>;

const emptyForm: FormState = { identifier: '', block: '', floor: '', notes: '' };

export function ApartmentFormModal({ visible, apartment, onClose, onSaved }: ApartmentFormModalProps) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<Errors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const editing = apartment != null;

  // Cada apertura (o cambio de apartamento) reinicia el formulario durante el render.
  const openKey = visible ? `apt-${apartment?.id ?? 'new'}` : null;
  const [lastKey, setLastKey] = useState<string | null>(null);
  if (openKey !== lastKey) {
    setLastKey(openKey);
    if (openKey) {
      setErrors({});
      setSubmitError(null);
      setForm(
        apartment
          ? {
              identifier: apartment.identifier,
              block: apartment.block ?? '',
              floor: apartment.floor != null ? String(apartment.floor) : '',
              notes: apartment.notes ?? '',
            }
          : emptyForm,
      );
    }
  }

  const update = (key: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
    setSubmitError(null);
  };

  const validate = () => {
    const next: Errors = {};
    // Un identificador heredado (p. ej. "A-101") se respeta mientras no se modifique.
    const unchangedLegacy = editing && form.identifier === apartment.identifier;
    const idError = unchangedLegacy ? null : validators.apartmentNumber(form.identifier);
    if (idError) next.identifier = idError;
    const floorError = validators.floor(form.floor);
    if (floorError) next.floor = floorError;
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    setSaving(true);
    setSubmitError(null);
    try {
      const payload = {
        identifier: form.identifier.trim(),
        block: form.block.trim() || null,
        floor: form.floor ? Number(form.floor) : null,
        notes: form.notes.trim() || null,
      };
      const saved = editing
        ? await apartmentsApi.update(apartment.id, payload)
        : await apartmentsApi.create(payload);
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
      title={editing ? 'Editar apartamento' : 'Nuevo apartamento'}
      subtitle={editing ? `Apartamento ${apartment.identifier}` : 'Unidad residencial del edificio.'}
      footer={
        <>
          <Button title="Cancelar" variant="secondary" size="lg" onPress={onClose} disabled={saving} className="flex-1" />
          <Button
            title={editing ? 'Guardar' : 'Crear'}
            icon={editing ? 'checkmark' : 'add'}
            size="lg"
            onPress={submit}
            loading={saving}
            className="flex-1"
          />
        </>
      }
    >
      {submitError ? <ErrorBanner message={submitError} /> : null}
      <Input
        label="Número de apartamento *"
        icon="home-outline"
        digitsOnly
        value={form.identifier}
        onChangeText={(v) => update('identifier', digitsOnly(v, LIMITS.apartment.max))}
        maxLength={LIMITS.apartment.max}
        placeholder="101"
        hint={
          editing && !/^\d+$/.test(apartment.identifier) && form.identifier === apartment.identifier
            ? 'Identificador heredado; si lo cambias solo admite números.'
            : 'Solo números.'
        }
        error={errors.identifier}
      />
      <Input
        label="Torre / bloque"
        icon="business-outline"
        value={form.block}
        onChangeText={(v) => update('block', v)}
        maxLength={60}
        placeholder="Torre A"
        error={errors.block}
      />
      <Input
        label="Piso"
        icon="layers-outline"
        digitsOnly
        value={form.floor}
        onChangeText={(v) => update('floor', digitsOnly(v, 3))}
        maxLength={3}
        placeholder="1"
        hint={`Solo números (0–${LIMITS.floor.max}).`}
        error={errors.floor}
      />
      <Input
        label="Notas"
        value={form.notes}
        onChangeText={(v) => update('notes', v)}
        maxLength={200}
        multiline
        textAlignVertical="top"
        style={{ minHeight: 90, paddingTop: 14 }}
        error={errors.notes}
      />
    </Sheet>
  );
}
