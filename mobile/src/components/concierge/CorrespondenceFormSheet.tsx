import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useRef, useState } from 'react';
import { Image, Platform, Pressable, Text, View } from 'react-native';
import { attachmentsApi } from '@/api/attachments';
import { getApiErrorMessage } from '@/api/axios';
import { correspondenceApi } from '@/api/correspondence';
import { ApartmentSelect } from '@/components/shared/ApartmentSelect';
import { ResidentFinder } from '@/components/shared/ResidentFinder';
import { Button } from '@/components/ui/Button';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { Input } from '@/components/ui/Input';
import { OptionPills } from '@/components/ui/OptionPills';
import { Sheet } from '@/components/ui/Sheet';
import { fullName } from '@/lib/format';
import { correspondenceTypeMeta } from '@/lib/status';
import type {
  ApartmentOption,
  CorrespondenceDelivery,
  CorrespondenceResponse,
  CorrespondenceType,
  RecipientResponse,
} from '@/types';

type CorrespondenceFormSheetProps = {
  visible: boolean;
  onClose: () => void;
  onCreated: (item: CorrespondenceResponse) => void;
};

const TYPES = (Object.keys(correspondenceTypeMeta) as CorrespondenceType[]).map((key) => ({
  key,
  label: correspondenceTypeMeta[key].label,
  icon: correspondenceTypeMeta[key].icon,
}));

const empty = { description: '', carrier: '', trackingNumber: '', notes: '' };

type Photo = { uri: string; name: string; type: string; blob?: Blob | null };
const orNull = (value: string) => value.trim() || null;

export function CorrespondenceFormSheet({ visible, onClose, onCreated }: CorrespondenceFormSheetProps) {
  const [apartment, setApartment] = useState<ApartmentOption | null>(null);
  const [type, setType] = useState<CorrespondenceType>('PAQUETE');
  const [delivery, setDelivery] = useState<CorrespondenceDelivery>('PORTERIA');
  const [recipients, setRecipients] = useState<RecipientResponse[]>([]);
  const [recipientId, setRecipientId] = useState<string>('');
  const [form, setForm] = useState(empty);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  /** Residente elegido con el buscador: se marca como destinatario al cargar la vivienda. */
  const pendingRecipient = useRef<number | null>(null);

  const selectApartment = (next: ApartmentOption | null) => {
    setApartment(next);
    setRecipientId('');
    setRecipients([]);
  };

  useEffect(() => {
    if (!apartment) return;
    let cancelled = false;
    correspondenceApi
      .recipients(apartment.id)
      .then((list) => {
        if (cancelled) return;
        setRecipients(list);
        const wanted = pendingRecipient.current;
        pendingRecipient.current = null;
        if (wanted && list.some((r) => r.id === wanted)) setRecipientId(String(wanted));
      })
      .catch(() => {
        // El destinatario es opcional: si falla, se puede registrar igualmente.
      });
    return () => {
      cancelled = true;
    };
  }, [apartment]);

  const set = (key: keyof typeof empty) => (value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: '' }));
  };

  const pickPhoto = async (source: 'camera' | 'library') => {
    setPhotoError(null);
    try {
      const permission =
        source === 'camera'
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setPhotoError(
          source === 'camera'
            ? 'Sin permiso de cámara. Actívalo en los ajustes del sistema.'
            : 'Sin permiso de fotos. Actívalo en los ajustes del sistema.',
        );
        return;
      }
      const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.6 };
      const result =
        source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
      if (result.canceled || !result.assets[0]) return;
      const asset = result.assets[0];
      setPhoto({
        uri: asset.uri,
        name: asset.fileName || `paquete-${Date.now()}.jpg`,
        type: asset.mimeType || 'image/jpeg',
        blob: Platform.OS === 'web' ? (asset.file ?? null) : null,
      });
    } catch {
      setPhotoError('No se pudo abrir la cámara o la galería en este dispositivo.');
    }
  };

  const close = () => {
    setPhoto(null);
    setPhotoError(null);
    setApartment(null);
    setType('PAQUETE');
    setDelivery('PORTERIA');
    setForm(empty);
    setErrors({});
    setSubmitError(null);
    onClose();
  };

  const submit = async () => {
    if (!apartment) {
      setErrors({ apartmentId: 'Selecciona la vivienda.' });
      return;
    }
    setSaving(true);
    setSubmitError(null);
    try {
      const created = await correspondenceApi.register({
        apartmentId: apartment.id,
        type,
        delivery,
        recipientId: recipientId ? Number(recipientId) : null,
        description: orNull(form.description),
        carrier: orNull(form.carrier),
        trackingNumber: orNull(form.trackingNumber),
        notes: orNull(form.notes),
        receivedAt: new Date().toISOString(),
      });
      let result = created;
      if (photo) {
        try {
          const uploaded = await attachmentsApi.upload(photo, 'CORRESPONDENCE', created.id);
          result = { ...created, photoIds: [...(created.photoIds ?? []), uploaded.id] };
        } catch (uploadError) {
          // El paquete ya quedó registrado: se avisa sin perder el registro.
          setPhotoError(`Paquete registrado, pero la foto no se subió: ${getApiErrorMessage(uploadError)}`);
          onCreated(created);
          setSaving(false);
          return;
        }
      }
      onCreated(result);
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
      title="Registrar correspondencia"
      subtitle="Paquetes, cartas o documentos recibidos en portería."
      footer={
        <>
          <Button title="Cancelar" variant="secondary" size="lg" onPress={close} className="flex-1" />
          <Button title="Registrar" icon="cube" size="lg" onPress={submit} loading={saving} className="flex-1" />
        </>
      }
    >
      {submitError ? <ErrorBanner message={submitError} /> : null}
      <ApartmentSelect value={apartment} onChange={selectApartment} error={errors.apartmentId} />
      <ResidentFinder
        onPick={(picked, resident) => {
          pendingRecipient.current = resident.id;
          selectApartment(picked);
          setErrors((current) => ({ ...current, apartmentId: '' }));
        }}
      />
      <OptionPills<CorrespondenceType> label="Tipo" options={TYPES} value={type} onChange={setType} />
      {recipients.length > 0 ? (
        <OptionPills<string>
          label="Destinatario (opcional)"
          allowEmpty
          value={recipientId || null}
          onChange={setRecipientId}
          options={recipients.map((recipient) => ({
            key: String(recipient.id),
            label: fullName(recipient.firstName, recipient.lastName),
            icon: 'person-outline',
          }))}
        />
      ) : null}
      <OptionPills<CorrespondenceDelivery>
        label="Ubicación"
        value={delivery}
        onChange={setDelivery}
        options={[
          { key: 'PORTERIA', label: 'Queda en portería', icon: 'shield-outline' },
          { key: 'APARTAMENTO', label: 'Se sube al apto.', icon: 'home-outline' },
        ]}
      />
      <Input
        label="Descripción"
        icon="create-outline"
        value={form.description}
        onChangeText={set('description')}
        error={errors.description}
        maxLength={200}
        placeholder="Caja mediana, sobre..."
      />
      <Input
        label="Transportista"
        icon="car-outline"
        value={form.carrier}
        onChangeText={set('carrier')}
        error={errors.carrier}
        maxLength={120}
      />
      <Input
        label="Número de guía"
        icon="barcode-outline"
        value={form.trackingNumber}
        onChangeText={set('trackingNumber')}
        error={errors.trackingNumber}
        maxLength={64}
        autoCapitalize="characters"
      />
      <View className="gap-2">
        <Text className="text-sm font-semibold text-ink-800 dark:text-ink-100">Foto del paquete (opcional)</Text>
        {photo ? (
          <View className="flex-row items-center gap-3">
            <Image source={{ uri: photo.uri }} className="h-24 w-24 rounded-2xl bg-ink-100" accessibilityLabel="Foto del paquete" />
            <Pressable
              accessibilityRole="button"
              onPress={() => setPhoto(null)}
              className="min-h-[44px] justify-center rounded-xl px-3 active:bg-ink-100 dark:active:bg-ink-800"
            >
              <Text className="text-sm font-bold text-rose-700 dark:text-rose-300">Quitar foto</Text>
            </Pressable>
          </View>
        ) : (
          <View className="flex-row gap-2">
            {Platform.OS !== 'web' ? (
              <Button title="Tomar foto" icon="camera-outline" variant="secondary" onPress={() => void pickPhoto('camera')} className="flex-1" />
            ) : null}
            <Button title="Galería" icon="images-outline" variant="secondary" onPress={() => void pickPhoto('library')} className="flex-1" />
          </View>
        )}
        {photoError ? <Text className="text-xs font-medium text-rose-700 dark:text-rose-300">{photoError}</Text> : null}
      </View>
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
