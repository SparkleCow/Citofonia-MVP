import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { getApiErrorMessage } from '@/api/axios';
import { visitsApi } from '@/api/visits';
import { Button } from '@/components/ui/Button';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { Input } from '@/components/ui/Input';
import { Sheet } from '@/components/ui/Sheet';
import {
  addDays,
  isSameDay,
  maskDate,
  maskTime,
  parseDateInput,
  parseTimeInput,
  toDateInput,
  toTimeInput,
} from '@/lib/dates';
import { LIMITS, validators } from '@/lib/validation';
import type { VisitResponse } from '@/types';

/** El backend admite hasta 30 días de antelación. */
const MAX_ADVANCE_DAYS = 30;

type Errors = { name?: string | null; document?: string | null; date?: string | null; time?: string | null };

type PreauthorizeVisitSheetProps = {
  visible: boolean;
  onClose: () => void;
  onCreated: (visit: VisitResponse) => void;
};

/** Hora por defecto: la próxima hora en punto. */
function defaultWhen() {
  const next = new Date();
  next.setHours(next.getHours() + 1, 0, 0, 0);
  return next;
}

function DayChip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      className={`min-h-[44px] justify-center rounded-full px-4 active:scale-95 ${
        selected ? 'bg-brand-600' : 'border border-ink-300 bg-white dark:border-ink-600 dark:bg-ink-800'
      }`}
    >
      <Text className={`text-sm font-bold ${selected ? 'text-white' : 'text-ink-800 dark:text-ink-100'}`}>{label}</Text>
    </Pressable>
  );
}

/** Formulario con el que el residente anuncia una visita y obtiene su pase QR. */
export function PreauthorizeVisitSheet({ visible, onClose, onCreated }: PreauthorizeVisitSheetProps) {
  const [name, setName] = useState('');
  const [document, setDocument] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [reason, setReason] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Formulario limpio en cada apertura (ajuste de estado durante el render, sin efecto).
  const [wasVisible, setWasVisible] = useState(false);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) {
      const when = defaultWhen();
      setName('');
      setDocument('');
      setDate(toDateInput(when));
      setTime(toTimeInput(when));
      setReason('');
      setErrors({});
      setSubmitError(null);
    }
  }

  const today = new Date();
  const tomorrow = addDays(today, 1);
  const parsedDate = parseDateInput(date);

  const validate = (): { errors: Errors; expectedAt: Date | null } => {
    const next: Errors = {};
    const trimmed = name.trim();
    if (trimmed.length < 3) next.name = 'Escribe el nombre completo del visitante.';
    next.document = validators.document(document, { required: true });

    const day = parseDateInput(date);
    const minutes = parseTimeInput(time);
    if (!day) next.date = 'Fecha no válida (DD/MM/AAAA).';
    if (minutes == null) next.time = 'Hora no válida (HH:MM, 24 h).';

    let expectedAt: Date | null = null;
    if (day && minutes != null) {
      expectedAt = new Date(day.getFullYear(), day.getMonth(), day.getDate(), Math.floor(minutes / 60), minutes % 60);
      const now = new Date();
      if (expectedAt.getTime() < now.getTime() - 5 * 60_000) {
        if (isSameDay(expectedAt, now)) next.time = 'Esa hora ya pasó.';
        else next.date = 'La fecha no puede estar en el pasado.';
      } else if (expectedAt.getTime() > addDays(now, MAX_ADVANCE_DAYS).getTime()) {
        next.date = `Máximo ${MAX_ADVANCE_DAYS} días de antelación.`;
      }
    }
    return { errors: next, expectedAt };
  };

  const submit = async () => {
    const result = validate();
    setErrors(result.errors);
    if (Object.values(result.errors).some(Boolean) || !result.expectedAt) return;

    setSaving(true);
    setSubmitError(null);
    try {
      const visit = await visitsApi.preauthorize({
        visitorName: name.trim(),
        visitorDocument: document,
        expectedAt: result.expectedAt.toISOString(),
        reason: reason.trim() || null,
      });
      onCreated(visit);
      onClose();
    } catch (err) {
      setSubmitError(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Autorizar visita"
      subtitle="Generaremos un código QR para que tu visitante lo muestre en portería."
      footer={
        <>
          <Button title="Cancelar" variant="secondary" onPress={onClose} className="flex-1" />
          <Button title="Generar QR" icon="qr-code" loading={saving} onPress={submit} className="flex-1" />
        </>
      }
    >
      {submitError ? <ErrorBanner message={submitError} /> : null}

      <Input
        label="Nombre del visitante"
        icon="person-outline"
        placeholder="Nombre y apellido"
        value={name}
        onChangeText={setName}
        maxLength={120}
        autoCapitalize="words"
        error={errors.name}
      />
      <Input
        label="Cédula"
        icon="card-outline"
        placeholder="Solo números"
        value={document}
        onChangeText={setDocument}
        digitsOnly
        maxLength={LIMITS.document.max}
        error={errors.document}
      />

      <View className="gap-2">
        <Text className="text-sm font-semibold text-ink-700 dark:text-ink-200">¿Cuándo llega?</Text>
        <View className="flex-row gap-2">
          <DayChip
            label="Hoy"
            selected={!!parsedDate && isSameDay(parsedDate, today)}
            onPress={() => setDate(toDateInput(today))}
          />
          <DayChip
            label="Mañana"
            selected={!!parsedDate && isSameDay(parsedDate, tomorrow)}
            onPress={() => setDate(toDateInput(tomorrow))}
          />
        </View>
        <View className="flex-row gap-3">
          <Input
            containerClassName="flex-1"
            label="Fecha"
            icon="calendar-outline"
            placeholder="DD/MM/AAAA"
            value={date}
            onChangeText={(text) => setDate(maskDate(text))}
            keyboardType="number-pad"
            inputMode="numeric"
            maxLength={10}
            error={errors.date}
          />
          <Input
            containerClassName="flex-1"
            label="Hora"
            icon="time-outline"
            placeholder="HH:MM"
            value={time}
            onChangeText={(text) => setTime(maskTime(text))}
            keyboardType="number-pad"
            inputMode="numeric"
            maxLength={5}
            error={errors.time}
          />
        </View>
      </View>

      <Input
        label="Motivo (opcional)"
        icon="chatbox-ellipses-outline"
        placeholder="Ej. cena familiar, técnico de internet"
        value={reason}
        onChangeText={setReason}
        maxLength={200}
      />
    </Sheet>
  );
}
