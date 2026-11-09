import { router } from 'expo-router';

/**
 * "Volver" seguro: si no hay historial (entrada directa, recarga) navega a una ruta
 * conocida en vez de no hacer nada o saltar a la primera pestaña.
 */
export function goBack(fallback: string) {
  if (router.canGoBack()) router.back();
  else router.replace(fallback as never);
}
