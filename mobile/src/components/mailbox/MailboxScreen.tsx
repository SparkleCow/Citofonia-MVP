import React from 'react';
import { MailboxCenter } from '@/components/mailbox/MailboxCenter';
import { Screen } from '@/components/ui/Screen';

type MailboxScreenProps = {
  eyebrow?: string;
  /** Muestra botón "volver" (cuando no es una pestaña raíz, p. ej. admin). */
  showBack?: boolean;
};

/** Pantalla de buzón reutilizable por los tres roles. */
export function MailboxScreen({ eyebrow, showBack = false }: MailboxScreenProps) {
  return (
    <Screen>
      <MailboxCenter eyebrow={eyebrow} showBack={showBack} />
    </Screen>
  );
}
