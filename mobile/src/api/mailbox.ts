import api from '@/api/axios';
import type { MailboxItem, MailStats } from '@/types';

/** `MailController` — `/api/mail` (buzón propio, cualquier rol autenticado). */
export const mailboxApi = {
  messages: () =>
    api.get<MailboxItem[]>('/api/mail/messages').then((response) => response.data),
  stats: () => api.get<MailStats>('/api/mail/stats').then((response) => response.data),
  markRead: (id: number) =>
    api.patch<MailboxItem>(`/api/mail/messages/${id}/read`).then((response) => response.data),
  markAllRead: () => api.post<MailStats>('/api/mail/read-all').then((response) => response.data),
};
