import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Text, View } from 'react-native';
import { Badge } from '@/components/ui/Badge';
import { callOutcomeLabels, callTypeLabels, formatDateTime, outcomeTone, relativeTime } from '@/lib/format';
import type { CallAuditResponse, CallType } from '@/types';

const callIcons: Record<CallType, keyof typeof Ionicons.glyphMap> = {
  DIRECT: 'call-outline',
  APARTMENT: 'business-outline',
  PORTAL: 'megaphone-outline',
  PANIC: 'warning-outline',
};

const callTones: Record<CallType, string> = {
  DIRECT: 'bg-brand-100 dark:bg-brand-500/20',
  APARTMENT: 'bg-emerald-100 dark:bg-emerald-500/20',
  PORTAL: 'bg-violet-100 dark:bg-violet-500/20',
  PANIC: 'bg-rose-100 dark:bg-rose-500/20',
};

const callIconColors: Record<CallType, string> = {
  DIRECT: '#1d6af0',
  APARTMENT: '#059669',
  PORTAL: '#7c3aed',
  PANIC: '#e11d48',
};

export function CallRow({ call, detailed = false }: { call: CallAuditResponse; detailed?: boolean }) {
  const title = call.calleeEmail || call.targetApartmentIdentifier || call.callerApartmentIdentifier || 'Llamada';
  const subtitle = detailed
    ? `${call.callerEmail} · ${formatDateTime(call.startedAt)}`
    : `${callTypeLabels[call.type]} · ${relativeTime(call.startedAt)}`;

  return (
    <View className="flex-row items-center gap-3 rounded-2xl border border-ink-200 bg-white px-3.5 py-3 dark:border-ink-800 dark:bg-ink-900">
      <View className={`h-10 w-10 items-center justify-center rounded-2xl ${callTones[call.type]}`}>
        <Ionicons name={callIcons[call.type]} size={19} color={callIconColors[call.type]} />
      </View>
      <View className="min-w-0 flex-1">
        <View className="flex-row items-center gap-2">
          <Text numberOfLines={1} className="flex-1 text-sm font-semibold text-ink-900 dark:text-ink-50">
            {title}
          </Text>
          {call.alert ? <Badge label="Alerta" tone="danger" /> : null}
        </View>
        <Text numberOfLines={1} className="mt-0.5 text-xs text-ink-500 dark:text-ink-400">
          {subtitle}
        </Text>
      </View>
      <Badge
        label={call.outcome ? callOutcomeLabels[call.outcome] : 'En curso'}
        tone={outcomeTone(call.outcome)}
      />
    </View>
  );
}
