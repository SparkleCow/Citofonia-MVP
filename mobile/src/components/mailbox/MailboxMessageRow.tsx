import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { relativeTime } from '@/lib/format';
import type { MailboxItem } from '@/types';

type MailboxMessageRowProps = {
  item: MailboxItem;
  selected?: boolean;
  expanded?: boolean;
  onPress: () => void;
};

export function MailboxMessageRow({ item, selected, expanded, onPress }: MailboxMessageRowProps) {
  const unread = !item.read;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected, expanded }}
      accessibilityLabel={`${unread ? 'No leído. ' : ''}${item.subject}, de ${item.senderEmail}`}
      onPress={onPress}
      className={`rounded-2xl border px-4 py-3.5 active:opacity-80 ${
        selected
          ? 'border-brand-600 bg-brand-50 dark:bg-brand-500/15'
          : unread
            ? 'border-brand-200 bg-white dark:border-brand-500/40 dark:bg-ink-900'
            : 'border-ink-200 bg-white/70 dark:border-ink-800 dark:bg-ink-900/60'
      }`}
    >
      <View className="flex-row items-start gap-3">
        <View className={`mt-1.5 h-2.5 w-2.5 rounded-full ${unread ? 'bg-brand-600' : 'bg-transparent'}`} />
        <View className="flex-1">
          <View className="flex-row items-center gap-2">
            <Text
              className={`flex-1 text-[15px] ${
                unread ? 'font-extrabold text-ink-950 dark:text-white' : 'font-semibold text-ink-800 dark:text-ink-100'
              }`}
              numberOfLines={expanded ? undefined : 1}
            >
              {item.subject}
            </Text>
            <Text className="text-xs font-medium text-ink-600 dark:text-ink-300">
              {relativeTime(item.createdAt)}
            </Text>
          </View>
          <Text className="mt-0.5 text-[13px] text-ink-600 dark:text-ink-300" numberOfLines={1}>
            {item.senderEmail}
          </Text>
          <Text
            className={`mt-1.5 text-sm leading-5 ${expanded ? 'text-ink-900 dark:text-ink-50' : 'text-ink-700 dark:text-ink-200'}`}
            numberOfLines={expanded ? undefined : 2}
          >
            {item.body}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}
