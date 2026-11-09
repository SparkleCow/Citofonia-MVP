import React from 'react';
import { CallDirectory } from '@/components/calls/CallDirectory';

/** Citofonía para administración: residentes, apartamentos y personal. */
export default function CallsScreen() {
  return <CallDirectory eyebrow="Administración" title="Llamadas" showBack />;
}
