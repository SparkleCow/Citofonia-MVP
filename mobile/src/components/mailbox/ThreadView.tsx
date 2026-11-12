import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { getApiErrorMessage } from '@/api/axios';
import { mailApi } from '@/api/mail';
import type { Person } from '@/components/mailbox/types';
import { Avatar } from '@/components/ui/Avatar';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { useMailbox } from '@/context/MailboxContext';
import { useTheme } from '@/context/ThemeContext';
import { formatDateTime, fullName } from '@/lib/format';

type ThreadViewProps = {
  person: Person;
  /** Si es false, no se muestra el compositor (rol solo receptor). */
  canSend: boolean;
  /** Botón volver (solo smartphone). */
  onBack?: () => void;
};

type Bubble = {
  key: string;
  mine: boolean;
  subject?: string;
  body: string;
  at: string;
  unread?: boolean;
};

const MAX_BODY = 4000;

/** El backend exige asunto: se deriva del inicio del mensaje. */
function subjectFrom(body: string) {
  const firstLine = body.trim().split('\n')[0] ?? '';
  return firstLine.length > 60 ? `${firstLine.slice(0, 57)}…` : firstLine;
}

/**
 * Conversación con una persona. Los mensajes recibidos llegan en vivo por WebSocket;
 * el envío usa `POST /api/admin/mail` (solo ADMIN) y el backend lo empuja al destinatario.
 * Los enviados se muestran solo en esta sesión: el backend no expone "enviados".
 */
export function ThreadView({ person, canSend, onBack }: ThreadViewProps) {
  const { messages, markRead } = useMailbox();
  const { isDark } = useTheme();
  const scroll = useRef<{ scrollToEnd: (options?: { animated?: boolean }) => void } | null>(null);
  const [sent, setSent] = useState<Bubble[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const email = person.email.toLowerCase();

  // El padre monta un ThreadView por persona (key={person.id}): el hilo local empieza vacío.

  const received = useMemo(
    () => messages.filter((m) => m.senderEmail.toLowerCase() === email),
    [messages, email],
  );

  // Abrir el hilo marca como leído lo recibido, incluido lo que llegue en vivo después.
  useEffect(() => {
    received.filter((m) => !m.read).forEach((m) => void markRead(m.id));
  }, [received, markRead]);

  const bubbles = useMemo<Bubble[]>(() => {
    const incoming = received.map<Bubble>((m) => ({
      key: `in-${m.id}`,
      mine: false,
      subject: m.subject !== subjectFrom(m.body) ? m.subject : undefined,
      body: m.body,
      at: m.createdAt,
      unread: !m.read,
    }));
    return [...incoming, ...sent].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
  }, [received, sent]);

  const send = async () => {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setError(null);
    try {
      await mailApi.send({
        subject: subjectFrom(body),
        body,
        audience: 'CUSTOM',
        recipientIds: [person.id],
      });
      setSent((current) => [
        ...current,
        { key: `out-${Date.now()}`, mine: true, body, at: new Date().toISOString() },
      ]);
      setDraft('');
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSending(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior="padding"
      className="flex-1 bg-ink-50 dark:bg-ink-950"
    >
      <View className="flex-row items-center gap-3 border-b border-ink-200 bg-white px-4 py-3 dark:border-ink-800 dark:bg-ink-900">
        {onBack ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Volver"
            onPress={onBack}
            className="h-12 w-12 items-center justify-center rounded-full bg-ink-100 active:opacity-70 dark:bg-ink-800"
          >
            <Ionicons name="arrow-back" size={22} color="#4a5c98" />
          </Pressable>
        ) : null}
        <Avatar firstName={person.firstName} lastName={person.lastName} size="md" />
        <View className="flex-1">
          <Text className="text-base font-extrabold text-ink-950 dark:text-white" numberOfLines={1}>
            {fullName(person.firstName, person.lastName)}
          </Text>
          <Text className="text-xs text-ink-600 dark:text-ink-300" numberOfLines={1}>
            {person.caption ? `Apto. ${person.caption} · ` : ''}
            {person.email}
          </Text>
        </View>
      </View>

      <ScrollView
        ref={(node) => {
          scroll.current = node;
        }}
        contentContainerStyle={{ padding: 16, gap: 10, flexGrow: 1 }}
        onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}
        keyboardShouldPersistTaps="handled"
      >
        {bubbles.length === 0 ? (
          <View className="flex-1 items-center justify-center py-16">
            <Ionicons name="chatbubbles-outline" size={44} color="#8496cf" />
            <Text className="mt-3 max-w-[280px] text-center text-[15px] text-ink-600 dark:text-ink-300">
              {canSend
                ? 'Aún no hay mensajes. Escribe el primero abajo.'
                : 'No has recibido mensajes de esta persona.'}
            </Text>
          </View>
        ) : (
          bubbles.map((bubble) => (
            <View
              key={bubble.key}
              className={`max-w-[85%] rounded-3xl px-4 py-3 ${
                bubble.mine
                  ? 'self-end rounded-br-md bg-brand-700'
                  : `self-start rounded-bl-md border bg-white dark:bg-ink-900 ${
                      bubble.unread ? 'border-brand-400' : 'border-ink-200 dark:border-ink-800'
                    }`
              }`}
            >
              {bubble.subject ? (
                <Text
                  className={`mb-1 text-sm font-extrabold ${bubble.mine ? 'text-white' : 'text-ink-950 dark:text-white'}`}
                >
                  {bubble.subject}
                </Text>
              ) : null}
              <Text
                className={`text-[15px] leading-6 ${bubble.mine ? 'text-white' : 'text-ink-900 dark:text-ink-50'}`}
              >
                {bubble.body}
              </Text>
              <Text className={`mt-1 text-[11px] ${bubble.mine ? 'text-brand-100' : 'text-ink-500 dark:text-ink-400'}`}>
                {formatDateTime(bubble.at)}
                {bubble.mine ? ' · Enviado' : ''}
              </Text>
            </View>
          ))
        )}
      </ScrollView>

      {canSend ? (
        <View className="gap-2 border-t border-ink-200 bg-white px-4 py-3 dark:border-ink-800 dark:bg-ink-900">
          {error ? <ErrorBanner message={error} /> : null}
          <View className="flex-row items-end gap-2">
            <TextInput
              value={draft}
              onChangeText={(value) => {
                setDraft(value);
                setError(null);
              }}
              placeholder="Escribe un mensaje…"
              placeholderTextColor={isDark ? '#6377b5' : '#6377b5'}
              multiline
              maxLength={MAX_BODY}
              accessibilityLabel="Mensaje"
              className="max-h-[140px] min-h-[52px] flex-1 rounded-2xl border border-ink-300 bg-white px-4 py-3 text-[15px] text-ink-950 dark:border-ink-700 dark:bg-ink-950 dark:text-white"
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Enviar mensaje"
              accessibilityState={{ disabled: !draft.trim() || sending }}
              disabled={!draft.trim() || sending}
              onPress={send}
              className={`h-[52px] w-[52px] items-center justify-center rounded-2xl bg-brand-600 active:bg-brand-700 ${
                !draft.trim() || sending ? 'opacity-50' : ''
              }`}
            >
              <Ionicons name={sending ? 'hourglass-outline' : 'send'} size={22} color="#ffffff" />
            </Pressable>
          </View>
        </View>
      ) : (
        <View className="flex-row items-center gap-2 border-t border-ink-200 bg-white px-4 py-4 dark:border-ink-800 dark:bg-ink-900">
          <Ionicons name="lock-closed-outline" size={18} color="#4a5c98" />
          <Text className="flex-1 text-sm text-ink-700 dark:text-ink-200">
            Tu rol solo permite recibir mensajes.
          </Text>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}
