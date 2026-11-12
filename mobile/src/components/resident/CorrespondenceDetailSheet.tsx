import React from 'react';
import { Text, View } from 'react-native';
import { AuthImage } from '@/components/shared/AuthImage';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { InfoRow } from '@/components/ui/InfoRow';
import { Sheet } from '@/components/ui/Sheet';
import { useResponsive } from '@/hooks/useResponsive';
import { formatDateTime } from '@/lib/format';
import { correspondenceTypeMeta, deliveryLabels, residentCorrespondenceStatusMeta } from '@/lib/status';
import type { CorrespondenceResponse } from '@/types';

type CorrespondenceDetailSheetProps = {
  item: CorrespondenceResponse | null;
  onClose: () => void;
};

/** Detalle de un paquete: datos del registro y fotos tomadas por el vigilante. */
export function CorrespondenceDetailSheet({ item, onClose }: CorrespondenceDetailSheetProps) {
  const { width, isTablet } = useResponsive();
  const photos = item?.photoIds ?? [];
  // Una foto ocupa el ancho de la hoja; varias, en dos columnas.
  const sheetWidth = Math.min(width, isTablet ? 560 : width) - 40;
  const photoSize = photos.length > 1 ? Math.floor((sheetWidth - 10) / 2) : sheetWidth;

  return (
    <Sheet
      visible={item != null}
      onClose={onClose}
      title={item ? item.description || correspondenceTypeMeta[item.type].label : 'Paquete'}
      subtitle={item ? `Recibido el ${formatDateTime(item.receivedAt ?? item.createdAt)}` : undefined}
      footer={<Button title="Cerrar" variant="secondary" onPress={onClose} fullWidth />}
    >
      {item ? (
        <>
          <View className="flex-row flex-wrap gap-2">
            <Badge
              label={residentCorrespondenceStatusMeta[item.status].label}
              tone={residentCorrespondenceStatusMeta[item.status].tone}
              icon={residentCorrespondenceStatusMeta[item.status].icon}
            />
            <Badge label={correspondenceTypeMeta[item.type].label} icon={correspondenceTypeMeta[item.type].icon} />
          </View>

          {photos.length > 0 ? (
            <View className="flex-row flex-wrap" style={{ gap: 10 }}>
              {photos.map((id) => (
                <AuthImage key={id} attachmentId={id} size={photoSize} />
              ))}
            </View>
          ) : (
            <View className="items-center rounded-3xl bg-ink-100 px-5 py-8 dark:bg-ink-800">
              <Text className="text-center text-sm text-ink-600 dark:text-ink-300">
                Portería no adjuntó fotos de este paquete.
              </Text>
            </View>
          )}

          <View className="gap-2 rounded-3xl bg-ink-100 p-4 dark:bg-ink-800">
            <InfoRow icon="person-outline" label="Para" value={item.recipientName ?? 'Toda la vivienda'} />
            <InfoRow icon="car-outline" label="Transportista" value={item.carrier} />
            <InfoRow icon="barcode-outline" label="Guía" value={item.trackingNumber} />
            <InfoRow
              icon="location-outline"
              label="Ubicación"
              value={item.delivery ? deliveryLabels[item.delivery] : null}
            />
            <InfoRow
              icon="checkmark-done-outline"
              label="Entregado"
              value={item.collectedAt ? formatDateTime(item.collectedAt) : null}
            />
            <InfoRow icon="shield-checkmark-outline" label="Registró" value={item.registeredByEmail} />
            {item.notes ? (
              <Text className="mt-1 text-[13px] italic text-ink-700 dark:text-ink-200 md:text-[15px]">“{item.notes}”</Text>
            ) : null}
          </View>
        </>
      ) : null}
    </Sheet>
  );
}
