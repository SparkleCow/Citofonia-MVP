import React, { useState } from 'react';
import { getApiErrorMessage } from '@/api/axios';
import { visitsApi } from '@/api/visits';
import { ApartmentSelect } from '@/components/shared/ApartmentSelect';
import { ResidentFinder } from '@/components/shared/ResidentFinder';
import { Button } from '@/components/ui/Button';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { Input } from '@/components/ui/Input';
import { Sheet } from '@/components/ui/Sheet';
import { LIMITS, validators } from '@/lib/validation';
import type { ApartmentOption, VisitResponse } from '@/types';

type VisitFormSheetProps = {
  visible: boolean;
  onClose: () => void;
  onCreated: (visit: VisitResponse) => void;
};

const empty = { visitorName: '', visitorDocument: '', visitorPhone: '', visitorCompany: '', reason: '', notes: '' };

const orNull = (value: string) => value.trim() || null;

export function VisitFormSheet({ visible, onClose, onCreated }: VisitFormSheetProps) {
  const [apartment, setApartment] = useState<ApartmentOption | null>(null);
  const [form, setForm] = useState(empty);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const set = (key: keyof typeof empty) => (value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: '' }));
  };

  const close = () => {
    setApartment(null);
    setForm(empty);
    setErrors({});
    setSubmitError(null);
    onClose();
  };

  const submit = async () => {
    const nextErrors: Record<string, string> = {};
    if (!apartment) nextErrors.apartmentId = 'Selecciona la vivienda.';
    if (!form.visitorName.trim()) nextErrors.visitorName = 'Indica el nombre del visitante.';
    const documentError = validators.document(form.visitorDocument);
    if (documentError) nextErrors.visitorDocument = documentError;
    const phoneError = validators.phone(form.visitorPhone);
    if (phoneError) nextErrors.visitorPhone = phoneError;
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0 || !apartment) return;

    setSaving(true);
    setSubmitError(null);
    try {
      const visit = await visitsApi.register({
        apartmentId: apartment.id,
        visitorName: form.visitorName.trim(),
        visitorDocument: orNull(form.visitorDocument),
        visitorPhone: orNull(form.visitorPhone),
        visitorCompany: orNull(form.visitorCompany),
        reason: orNull(form.reason),
        notes: orNull(form.notes),
        entryAt: new Date().toISOString(),
      });
      onCreated(visit);
      close();
    } catch (err) {
      setSubmitError(getApiErrorMessage(err));
      const fieldErrors = (err as { fieldErrors?: Record<string, string> | null }).fieldErrors;
      if (fieldErrors) setErrors(fieldErrors);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet
      visible={visible}
      onClose={close}
      title="Registrar visita"
      subtitle="La entrada se registra con la hora actual."
      footer={
        <>
          <Button title="Cancelar" variant="secondary" size="lg" onPress={close} className="flex-1" />
          <Button title="Registrar" icon="person-add" size="lg" onPress={submit} loading={saving} className="flex-1" />
        </>
      }
    >
      {submitError ? <ErrorBanner message={submitError} /> : null}
      <ApartmentSelect value={apartment} onChange={setApartment} error={errors.apartmentId} />
      <ResidentFinder
        onPick={(picked) => {
          setApartment(picked);
          setErrors((current) => ({ ...current, apartmentId: '' }));
        }}
      />
      <Input
        label="Nombre del visitante *"
        icon="person-outline"
        value={form.visitorName}
        onChangeText={set('visitorName')}
        error={errors.visitorName}
        maxLength={120}
        autoCapitalize="words"
      />
      <Input
        label="Cédula"
        icon="card-outline"
        digitsOnly
        value={form.visitorDocument}
        onChangeText={set('visitorDocument')}
        error={errors.visitorDocument}
        maxLength={LIMITS.document.max}
      />
      <Input
        label="Teléfono"
        icon="call-outline"
        digitsOnly
        value={form.visitorPhone}
        onChangeText={set('visitorPhone')}
        error={errors.visitorPhone}
        maxLength={LIMITS.phone.max}
      />
      <Input
        label="Empresa"
        icon="briefcase-outline"
        value={form.visitorCompany}
        onChangeText={set('visitorCompany')}
        error={errors.visitorCompany}
        maxLength={120}
      />
      <Input
        label="Motivo de la visita"
        icon="chatbox-ellipses-outline"
        value={form.reason}
        onChangeText={set('reason')}
        error={errors.reason}
        maxLength={200}
        placeholder="Entrega, reparación, visita familiar…"
      />
      <Input
        label="Observaciones"
        value={form.notes}
        onChangeText={set('notes')}
        error={errors.notes}
        maxLength={500}
        multiline
        textAlignVertical="top"
        style={{ minHeight: 90, paddingTop: 14 }}
      />
    </Sheet>
  );
}
