import api from '@/api/axios';

/** ALL excluye al remitente (servidor). RESIDENTS_CONCIERGE = ambos grupos. */
export type MailAudience = 'ALL' | 'RESIDENTS' | 'CONCIERGE' | 'RESIDENTS_CONCIERGE' | 'CUSTOM';

export interface SendMailPayload {
  subject: string;
  body: string;
  audience: MailAudience;
  recipientIds?: number[] | null;
}

export interface MailSendResponse {
  messageId: number;
  subject: string;
  recipientCount: number;
}

export const mailApi = {
  send: (payload: SendMailPayload) =>
    api.post<MailSendResponse>('/api/admin/mail', payload).then((response) => response.data),
};
