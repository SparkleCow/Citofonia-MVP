import type { ApartmentOption } from '@/types';

/** Interlocutor de una conversación del buzón. */
export type Person = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  caption?: string | null;
};

export type MailTarget =
  | { type: 'staff' }
  | { type: 'inbox' }
  | { type: 'apartment'; apartment: ApartmentOption };

export const targetKey = (target: MailTarget | null) =>
  !target ? 'home' : target.type === 'apartment' ? `apt-${target.apartment.id}` : target.type;
