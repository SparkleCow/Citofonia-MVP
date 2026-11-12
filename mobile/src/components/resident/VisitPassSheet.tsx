import React, { useRef, useState } from 'react';
import { Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { getApiErrorMessage } from '@/api/axios';
import { visitsApi } from '@/api/visits';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { InfoRow } from '@/components/ui/InfoRow';
import { Sheet } from '@/components/ui/Sheet';
import { useResponsive } from '@/hooks/useResponsive';
import { useRowAction } from '@/hooks/useRowAction';
import { formatDateTime } from '@/lib/format';
import { sharePass, type QrHandle } from '@/lib/sharePass';
import { formatAccessCode, visitPassMessage, visitPassPayload } from '@/lib/visitPass';
import type { VisitResponse } from '@/types';

type VisitPassSheetProps = {
  visit: VisitResponse | null;
  onClose: () => void;
  /** La autorización se anuló: la lista debe reflejar el nuevo estado. */
  onCancelled: (visit: VisitResponse) => void;
};

/** Pase de una visita preautorizada: QR para enviar al visitante y opción de anularlo. */
export function VisitPassSheet({ visit, onClose, onCancelled }: VisitPassSheetProps) {
  const { width, isTablet } = useResponsive();
  const qr = useRef<QrHandle | null>(null);
  const [sharing, setSharing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);
  const { busyKey, error: cancelError, run } = useRowAction();

  const code = visit?.accessCode ?? '';
  const when = formatDateTime(visit?.expectedAt ?? visit?.entryAt);
  const size = Math.min(isTablet ? 280 : 240, width - 120);

  const close = () => {
    setNotice(null);
    setShareError(null);
    onClose();
  };

  const share = async () => {
    if (!visit) return;
    setSharing(true);
    setShareError(null);
    setNotice(null);
    try {
      const result = await sharePass(code, visitPassMessage(visit, when), qr.current);
      if (result === 'copied') setNotice('Copiamos el mensaje con el código. Pégalo en el chat de tu visitante.');
    } catch (err) {
      // El usuario cerró la hoja de compartir: no es un error.
      if (!(err instanceof Error && err.name === 'AbortError')) setShareError(getApiErrorMessage(err));
    } finally {
      setSharing(false);
    }
  };

  const cancel = () => {
    if (!visit) return;
    void run(
      `cancel-${visit.id}`,
      async () => {
        onCancelled(await visitsApi.cancelPreauthorization(visit.id));
        close();
      },
      {
        title: 'Anular autorización',
        message: `El código de ${visit.visitorName} dejará de funcionar.`,
        confirmLabel: 'Anular',
        destructive: true,
      },
    );
  };

  return (
    <Sheet
      visible={visit != null}
      onClose={close}
      title="Pase de visita"
      subtitle="Envíalo a tu visitante. Es de un solo uso."
      footer={
        <>
          <Button
            title="Anular"
            icon="close-circle-outline"
            variant="secondary"
            loading={visit != null && busyKey === `cancel-${visit.id}`}
            onPress={cancel}
            className="flex-1"
          />
          <Button title="Enviar" icon="share-social" loading={sharing} onPress={share} className="flex-1" />
        </>
      }
    >
      {visit ? (
        <>
          {shareError ? <ErrorBanner message={shareError} /> : null}
          {cancelError ? <ErrorBanner message={cancelError} /> : null}

          <View className="items-center gap-4">
            {/* Fondo blanco fijo: el QR debe leerse igual en modo oscuro. */}
            <View accessibilityLabel={`Código QR de la visita de ${visit.visitorName}`} className="rounded-3xl bg-white p-5">
              <QRCode
                value={visitPassPayload(code)}
                size={size}
                color="#090d24"
                backgroundColor="#ffffff"
                ecl="M"
                getRef={(ref) => {
                  qr.current = ref as QrHandle | null;
                }}
              />
            </View>
            <View className="items-center">
              <Text className="text-xs font-bold uppercase tracking-widest text-ink-500 dark:text-ink-400">
                Código manual
              </Text>
              <Text selectable className="mt-1 text-2xl font-extrabold tracking-widest text-ink-950 dark:text-white">
                {formatAccessCode(code)}
              </Text>
            </View>
          </View>

          {notice ? (
            <Text className="text-center text-sm font-semibold text-emerald-700 dark:text-emerald-300">{notice}</Text>
          ) : null}

          <View className="gap-2 rounded-3xl bg-ink-100 p-4 dark:bg-ink-800">
            <View className="flex-row items-center justify-between gap-3">
              <Text className="flex-1 text-lg font-bold text-ink-950 dark:text-white" numberOfLines={1}>
                {visit.visitorName}
              </Text>
              <Badge label={`Apto. ${visit.apartmentIdentifier}`} tone="info" icon="home-outline" />
            </View>
            <InfoRow icon="card-outline" label="Cédula" value={visit.visitorDocument} />
            <InfoRow icon="time-outline" label="Llegada estimada" value={when} />
            <InfoRow icon="chatbox-ellipses-outline" label="Motivo" value={visit.reason} />
          </View>
        </>
      ) : null}
    </Sheet>
  );
}
