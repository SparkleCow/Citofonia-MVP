import React from 'react';
import { CallDirectory } from '@/components/calls/CallDirectory';

/** Directorio y citofonía de portería: búsqueda por apartamento o nombre + Llamar. */
export default function ResidentDirectoryScreen() {
  return <CallDirectory eyebrow="Portería" title="Residentes y llamadas" />;
}
