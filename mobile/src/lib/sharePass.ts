import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform, Share } from 'react-native';

export type QrHandle = { toDataURL: (callback: (base64: string) => void) => void };

export type ShareResult = 'shared' | 'copied';

/**
 * Envía el pase al visitante. En móvil comparte la imagen del QR (WhatsApp, correo…);
 * en web no hay hoja de compartir con archivos, así que comparte o copia el texto con el código.
 */
export async function sharePass(code: string, message: string, qr: QrHandle | null): Promise<ShareResult> {
  if (Platform.OS === 'web') {
    const nav = globalThis.navigator;
    if (typeof nav?.share === 'function') {
      await nav.share({ text: message });
      return 'shared';
    }
    await nav.clipboard.writeText(message);
    return 'copied';
  }

  if (qr && (await Sharing.isAvailableAsync())) {
    const base64 = await new Promise<string>((resolve) => qr.toDataURL(resolve));
    const file = new File(Paths.cache, `visita-${code}.png`);
    if (file.exists) file.delete();
    file.create();
    file.write(base64, { encoding: 'base64' });
    await Sharing.shareAsync(file.uri, { mimeType: 'image/png', dialogTitle: message });
    return 'shared';
  }

  await Share.share({ message });
  return 'shared';
}
