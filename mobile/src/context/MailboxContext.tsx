import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState } from 'react-native';
import { mailboxApi } from '@/api/mailbox';
import { getApiErrorMessage } from '@/api/axios';
import { MAILBOX_DESTINATION, stomp, type ConnectionStatus } from '@/realtime/stomp';
import type { MailboxItem, MailNotification, MailStats } from '@/types';

type MailboxContextValue = {
  stats: MailStats;
  messages: MailboxItem[];
  loading: boolean;
  error: string | null;
  /** Estado de la conexión en tiempo real. */
  connection: ConnectionStatus;
  /** Último mensaje recibido por WebSocket (para avisos en pantalla). */
  lastIncoming: MailNotification | null;
  refresh: () => Promise<void>;
  markRead: (id: number) => Promise<void>;
  markAllRead: () => Promise<void>;
};

const MailboxContext = createContext<MailboxContextValue | undefined>(undefined);

/**
 * Buzón del usuario autenticado, alimentado por WebSocket (STOMP).
 * Sin polling: la carga HTTP ocurre al montar, al (re)conectar y bajo demanda.
 */
export function MailboxProvider({ children }: { children: React.ReactNode }) {
  const [stats, setStats] = useState<MailStats>({ total: 0, unread: 0 });
  const [messages, setMessages] = useState<MailboxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connection, setConnection] = useState<ConnectionStatus>(stomp.getStatus());
  const [lastIncoming, setLastIncoming] = useState<MailNotification | null>(null);
  const mounted = useRef(true);
  const messagesRef = useRef<MailboxItem[]>([]);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  /** Trae buzón y contadores; solo actualiza estado tras la respuesta. */
  const load = useCallback(
    () =>
      Promise.all([mailboxApi.messages(), mailboxApi.stats()])
        .then(([items, next]) => {
          if (!mounted.current) return;
          setMessages(items);
          setStats(next);
          setError(null);
        })
        .catch((err) => {
          if (mounted.current) setError(getApiErrorMessage(err, 'No se pudo cargar el buzón.'));
        })
        .finally(() => {
          if (mounted.current) setLoading(false);
        }),
    [],
  );

  /** Recarga a petición del usuario (muestra el indicador de carga). */
  const refresh = useCallback(async () => {
    setLoading(true);
    await load();
  }, [load]);

  const markRead = useCallback(
    async (id: number) => {
      const target = messagesRef.current.find((item) => item.id === id);
      if (!target || target.read) return;
      const readAt = new Date().toISOString();
      setMessages((current) =>
        current.map((item) => (item.id === id ? { ...item, read: true, readAt } : item)),
      );
      setStats((current) => ({ ...current, unread: Math.max(0, current.unread - 1) }));
      try {
        const updated = await mailboxApi.markRead(id);
        if (mounted.current) {
          setMessages((current) => current.map((item) => (item.id === id ? updated : item)));
        }
      } catch {
        await refresh();
      }
    },
    [refresh],
  );

  const markAllRead = useCallback(async () => {
    const next = await mailboxApi.markAllRead();
    if (!mounted.current) return;
    setStats(next);
    const readAt = new Date().toISOString();
    setMessages((current) =>
      current.map((item) => (item.read ? item : { ...item, read: true, readAt })),
    );
  }, []);

  useEffect(() => {
    mounted.current = true;

    // Carga inicial y resincronización tras cada (re)conexión del socket.
    const offConnect = stomp.onConnect(() => void load());
    const offStatus = stomp.onStatus(setConnection);
    const offMailbox = stomp.subscribe<MailNotification>(MAILBOX_DESTINATION, (notification) => {
      if (!mounted.current) return;
      setLastIncoming(notification);
      // El contador llega ya calculado; el cuerpo del mensaje se trae una sola vez.
      setStats((current) => ({ total: current.total + 1, unread: notification.unread }));
      void mailboxApi
        .messages()
        .then((items) => mounted.current && setMessages(items))
        .catch(() => undefined);
    });

    stomp.acquire();
    void load();

    // Al volver a primer plano, reconecta si el SO cerró el socket (evento, no polling).
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') stomp.reconnect();
    });

    return () => {
      mounted.current = false;
      appState.remove();
      offMailbox();
      offStatus();
      offConnect();
      void stomp.release();
    };
  }, [load]);

  const value = useMemo<MailboxContextValue>(
    () => ({
      stats,
      messages,
      loading,
      error,
      connection,
      lastIncoming,
      refresh,
      markRead,
      markAllRead,
    }),
    [stats, messages, loading, error, connection, lastIncoming, refresh, markRead, markAllRead],
  );

  return <MailboxContext.Provider value={value}>{children}</MailboxContext.Provider>;
}

export function useMailbox() {
  const context = useContext(MailboxContext);
  if (!context) throw new Error('useMailbox debe usarse dentro de MailboxProvider');
  return context;
}
