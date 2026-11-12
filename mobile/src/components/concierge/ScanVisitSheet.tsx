import { CameraView, useCameraPermissions } from 'expo-camera';
import React, { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Text, View } from 'react-native';
import { getApiErrorMessage } from '@/api/axios';
import { visitsApi } from '@/api/visits';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { InfoRow } from '@/components/ui/InfoRow';
import { Input } from '@/components/ui/Input';
import { Sheet } from '@/components/ui/Sheet';
import { formatDateTime } from '@/lib/format';
import { visitStatusMeta } from '@/lib/status';
import { ACCESS_CODE_LENGTH, formatAccessCode, parseAccessCode, sanitizeAccessCode } from '@/lib/visitPass';
import type { VisitResponse } from '@/types';

type ScanVisitSheetProps = {
  visible: boolean;
  onClose: () => void;
  /** Ingreso registrado: la visita pasa a "dentro". */
  onCheckedIn: (visit: VisitResponse) => void;
};

/**
 * Portería escanea el QR del visitante (o teclea el código), revisa los datos
 * que cargó el residente y registra el ingreso.
 */
export function ScanVisitSheet({ visible, onClose, onCheckedIn }: ScanVisitSheetProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [manual, setManual] = useState('');
  const [visit, setVisit] = useState<VisitResponse | null>(null);
  const [looking, setLooking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Evita consultas repetidas: la cámara emite el mismo QR varias veces por segundo.
  const locked = useRef(false);

  // Estado limpio en cada apertura (ajuste durante el render, sin efecto).
  const [wasVisible, setWasVisible] = useState(false);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) {
      setManual('');
      setVisit(null);
      setLooking(false);
      setSaving(false);
      setError(null);
    }
  }

  const close = () => {
    locked.current = false;
    onClose();
  };

  const lookup = useCallback(async (raw: string) => {
    if (locked.current) return;
    const code = parseAccessCode(raw);
    if (!code) {
      setError('Ese código no es un pase de visita de Citofonía.');
      return;
    }
    locked.current = true;
    setLooking(true);
    setError(null);
    try {
      setVisit(await visitsApi.byAccessCode(code));
    } catch (err) {
      setError(getApiErrorMessage(err));
      locked.current = false;
    } finally {
      setLooking(false);
    }
  }, []);

  const rescan = () => {
    locked.current = false;
    setVisit(null);
    setManual('');
    setError(null);
  };

  const checkIn = async () => {
    if (!visit?.accessCode) return;
    setSaving(true);
    setError(null);
    try {
      onCheckedIn(await visitsApi.checkIn(visit.accessCode));
      close();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const usable = visit?.status === 'PREAUTHORIZED';

  return (
    <Sheet
      visible={visible}
      onClose={close}
      title={visit ? 'Visita autorizada' : 'Escanear QR'}
      subtitle={visit ? 'Verifica la cédula antes de dar ingreso.' : 'Apunta al código que muestra el visitante.'}
      footer={
        visit ? (
          <>
            <Button title="Otro código" icon="scan-outline" variant="secondary" onPress={rescan} className="flex-1" />
            <Button
              title="Registrar ingreso"
              icon="log-in-outline"
              variant="success"
              loading={saving}
              disabled={!usable}
              onPress={checkIn}
              className="flex-1"
            />
          </>
        ) : (
          <Button title="Cerrar" variant="secondary" onPress={close} fullWidth />
        )
      }
    >
      {error ? <ErrorBanner message={error} /> : null}

      {visit ? (
        <View className="gap-3 rounded-3xl bg-ink-100 p-4 dark:bg-ink-800">
          <View className="flex-row items-start justify-between gap-3">
            <View className="flex-1">
              <Text className="text-2xl font-extrabold text-ink-950 dark:text-white md:text-3xl">{visit.visitorName}</Text>
              <Text className="mt-1 text-base font-semibold text-brand-700 dark:text-brand-300 md:text-lg">
                Apartamento {visit.apartmentIdentifier}
              </Text>
            </View>
            <Badge
              label={visitStatusMeta[visit.status].label}
              tone={visitStatusMeta[visit.status].tone}
              icon={visitStatusMeta[visit.status].icon}
            />
          </View>
          <InfoRow icon="card-outline" label="Cédula" value={visit.visitorDocument} />
          <InfoRow icon="time-outline" label="Llegada estimada" value={formatDateTime(visit.expectedAt)} />
          <InfoRow icon="chatbox-ellipses-outline" label="Motivo" value={visit.reason} />
          <InfoRow icon="person-outline" label="Autorizó" value={visit.registeredByEmail} />
          <InfoRow icon="key-outline" label="Código" value={formatAccessCode(visit.accessCode ?? '')} />
          {!usable ? (
            <Text className="text-sm font-semibold text-rose-700 dark:text-rose-300">
              {visit.status === 'REJECTED'
                ? 'El residente anuló esta autorización.'
                : 'Este código ya fue utilizado.'}
            </Text>
          ) : null}
        </View>
      ) : (
        <>
          <View className="aspect-square w-full max-w-[360px] items-center justify-center self-center overflow-hidden rounded-3xl bg-ink-950">
            {looking ? (
              <ActivityIndicator size="large" color="#ffffff" />
            ) : permission?.granted ? (
              <CameraView
                style={{ width: '100%', height: '100%' }}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                onBarcodeScanned={({ data }) => void lookup(data)}
              />
            ) : (
              <View className="items-center gap-3 px-6">
                <Text className="text-center text-sm text-ink-200">
                  {permission && !permission.canAskAgain
                    ? 'La cámara está bloqueada. Actívala en los ajustes o escribe el código.'
                    : 'Permite el uso de la cámara para leer el QR, o escribe el código.'}
                </Text>
                {permission && !permission.canAskAgain ? (
                  <Button title="Abrir ajustes" icon="settings-outline" variant="secondary" onPress={() => void Linking.openSettings()} />
                ) : (
                  <Button title="Activar cámara" icon="camera" onPress={() => void requestPermission()} />
                )}
              </View>
            )}
          </View>

          <View className="flex-row items-end gap-3">
            <Input
              containerClassName="flex-1"
              label="Código manual"
              icon="key-outline"
              placeholder="12 caracteres"
              value={manual}
              onChangeText={(text) => setManual(sanitizeAccessCode(text))}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={ACCESS_CODE_LENGTH}
              onSubmitEditing={() => void lookup(manual)}
              returnKeyType="search"
            />
            <Button
              title="Buscar"
              icon="search"
              size="lg"
              loading={looking}
              disabled={manual.length !== ACCESS_CODE_LENGTH}
              onPress={() => void lookup(manual)}
            />
          </View>
        </>
      )}
    </Sheet>
  );
}
