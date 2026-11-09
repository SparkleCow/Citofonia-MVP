import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Text, View } from 'react-native';
import { Badge } from '@/components/ui/Badge';
import { InfoRow } from '@/components/ui/InfoRow';
import { formatDateTime, relativeTime } from '@/lib/format';
import { visitStatusMeta } from '@/lib/status';
import type { VisitResponse } from '@/types';

type VisitCardProps = {
  visit: VisitResponse;
  /** Muestra la vivienda (portería) o la oculta (residente, ya es la suya). */
  showApartment?: boolean;
  /** Botones de acción (solo portería). */
  actions?: React.ReactNode;
};

export function VisitCard({ visit, showApartment = true, actions }: VisitCardProps) {
  const status = visitStatusMeta[visit.status];
  return (
    <View className="flex-1 rounded-3xl border border-ink-200 bg-white p-4 dark:border-ink-800 dark:bg-ink-900">
      <View className="flex-row items-start gap-3">
        <View className="h-12 w-12 items-center justify-center rounded-2xl bg-brand-100 dark:bg-brand-500/20">
          <Ionicons name="person-outline" size={22} color="#1d6af0" />
        </View>
        <View className="flex-1">
          <Text className="text-[17px] font-bold text-ink-950 dark:text-white" numberOfLines={1}>
            {visit.visitorName}
          </Text>
          <Text className="mt-0.5 text-[13px] text-ink-600 dark:text-ink-300">
            {showApartment ? `${visit.apartmentIdentifier} · ` : ''}
            {relativeTime(visit.entryAt ?? visit.createdAt)}
          </Text>
        </View>
        <Badge label={status.label} tone={status.tone} icon={status.icon} />
      </View>

      <View className="mt-3 gap-1.5">
        <InfoRow icon="chatbox-ellipses-outline" label="Motivo" value={visit.reason} />
        <InfoRow icon="card-outline" label="Cédula" value={visit.visitorDocument} />
        <InfoRow icon="briefcase-outline" label="Empresa" value={visit.visitorCompany} />
        <InfoRow icon="call-outline" label="Teléfono" value={visit.visitorPhone} />
        <InfoRow icon="log-in-outline" label="Entrada" value={visit.entryAt ? formatDateTime(visit.entryAt) : null} />
        <InfoRow icon="log-out-outline" label="Salida" value={visit.exitAt ? formatDateTime(visit.exitAt) : null} />
        {visit.notes ? (
          <Text className="mt-1 text-[13px] italic text-ink-700 dark:text-ink-200">“{visit.notes}”</Text>
        ) : null}
      </View>

      {actions ? <View className="mt-4 flex-row flex-wrap gap-2">{actions}</View> : null}
    </View>
  );
}
