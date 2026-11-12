import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Text, View } from 'react-native';
import { AuthImage } from '@/components/shared/AuthImage';
import { Badge } from '@/components/ui/Badge';
import { InfoRow } from '@/components/ui/InfoRow';
import { formatDateTime, relativeTime } from '@/lib/format';
import {
  correspondenceStatusMeta,
  correspondenceTypeMeta,
  deliveryLabels,
  residentCorrespondenceStatusMeta,
} from '@/lib/status';
import type { CorrespondenceResponse } from '@/types';

type CorrespondenceCardProps = {
  item: CorrespondenceResponse;
  showApartment?: boolean;
  actions?: React.ReactNode;
  /** Vista del residente: estados "En recepción" / "Entregado" y fotos en el detalle. */
  residentView?: boolean;
};

export function CorrespondenceCard({ item, showApartment = true, actions, residentView = false }: CorrespondenceCardProps) {
  const status = (residentView ? residentCorrespondenceStatusMeta : correspondenceStatusMeta)[item.status];
  const type = correspondenceTypeMeta[item.type];
  return (
    <View className="flex-1 rounded-3xl bg-ink-100 dark:bg-ink-900 p-4">
      <View className="flex-row items-start gap-3">
        <View className="h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 dark:bg-amber-500/20">
          <Ionicons name={type.icon} size={22} color="#e2880e" />
        </View>
        <View className="flex-1">
          <Text className="text-[17px] font-bold md:text-[19px] text-ink-950 dark:text-white" numberOfLines={1}>
            {item.description || type.label}
          </Text>
          <Text className="mt-0.5 text-[13px] text-ink-600 md:text-[15px] dark:text-ink-300">
            {showApartment ? `${item.apartmentIdentifier} · ` : ''}
            {type.label} · {relativeTime(item.receivedAt ?? item.createdAt)}
          </Text>
        </View>
        <Badge label={status.label} tone={status.tone} icon={status.icon} />
      </View>

      <View className="mt-3 gap-1.5">
        <InfoRow icon="person-outline" label="Para" value={item.recipientName} />
        <InfoRow icon="car-outline" label="Transportista" value={item.carrier} />
        <InfoRow icon="barcode-outline" label="Guía" value={item.trackingNumber} />
        <InfoRow icon="location-outline" label="Ubicación" value={item.delivery ? deliveryLabels[item.delivery] : null} />
        <InfoRow
          icon="checkmark-done-outline"
          label="Recogida"
          value={item.collectedAt ? formatDateTime(item.collectedAt) : null}
        />
        {item.notes ? (
          <Text className="mt-1 text-[13px] italic text-ink-700 dark:text-ink-200">“{item.notes}”</Text>
        ) : null}
      </View>

      {residentView && item.photoIds && item.photoIds.length > 0 ? (
        <View className="mt-3 flex-row items-center gap-1.5">
          <Ionicons name="images-outline" size={15} color="#6377b5" />
          <Text className="text-[13px] font-semibold text-ink-600 dark:text-ink-300 md:text-[15px]">
            {item.photoIds.length === 1 ? '1 foto' : `${item.photoIds.length} fotos`} · toca para ver
          </Text>
        </View>
      ) : null}

      {!residentView && item.photoIds && item.photoIds.length > 0 ? (
        <View className="mt-3 flex-row flex-wrap gap-2">
          {item.photoIds.map((id) => (
            <AuthImage key={id} attachmentId={id} />
          ))}
        </View>
      ) : null}

      {actions ? <View className="mt-4 flex-row flex-wrap gap-2">{actions}</View> : null}
    </View>
  );
}
