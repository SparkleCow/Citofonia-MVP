import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { notificationsApi } from '@/api/notifications';

/**
 * Notificaciones locales y push. Todo es "mejor esfuerzo": si el módulo nativo no está
 * (web, Expo Go con limitaciones) o el usuario niega el permiso, la app sigue funcionando
 * con el aviso en pantalla por WebSocket.
 *
 * Límites reales de la plataforma:
 *  - Con la app abierta o en segundo plano reciente: notificación local con sonido.
 *  - Con la app cerrada: solo llega un PUSH (requiere build con projectId de EAS,
 *    credenciales FCM/APNs y `app.push.enabled=true` en el backend).
 *  - Android: Expo Go (SDK 53+) no admite push remoto; sí notificaciones locales.
 *  - iOS: el sonido respeta el modo silencio salvo "Critical Alerts" (permiso especial de Apple).
 */

export const EMERGENCY_CHANNEL = 'emergencias';

type NotificationsModule = typeof import('expo-notifications');

let cached: NotificationsModule | null | undefined;
let pushToken: string | null = null;

function load(): NotificationsModule | null {
  if (cached !== undefined) return cached;
  if (Platform.OS === 'web') {
    cached = null;
    return cached;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cached = require('expo-notifications') as NotificationsModule;
  } catch {
    cached = null;
  }
  return cached;
}

/** Configura el canal de emergencias y el comportamiento en primer plano. */
export async function setupNotifications() {
  const Notifications = load();
  if (!Notifications) return;
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(EMERGENCY_CHANNEL, {
        name: 'Emergencias del edificio',
        importance: Notifications.AndroidImportance.MAX,
        sound: 'default',
        vibrationPattern: [0, 800, 400, 800, 400, 800],
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        enableVibrate: true,
      });
    }
  } catch {
    // Sin soporte en este entorno.
  }
}

/** Pide permiso solo si aún no se decidió (no vuelve a molestar si el usuario lo negó). */
export async function ensureNotificationPermission(): Promise<boolean> {
  const Notifications = load();
  if (!Notifications) return false;
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    if (!current.canAskAgain) return false;
    const asked = await Notifications.requestPermissionsAsync();
    return asked.granted;
  } catch {
    return false;
  }
}

/** Notificación local inmediata (suena aunque la app esté en segundo plano si el SO la mantiene viva). */
export async function notifyEmergencyLocally(title: string, body: string) {
  const Notifications = load();
  if (!Notifications) return;
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.MAX,
        data: { type: 'EMERGENCY' },
      },
      trigger: Platform.OS === 'android' ? { channelId: EMERGENCY_CHANNEL } : null,
    });
  } catch {
    // Permiso denegado o entorno sin soporte.
  }
}

/**
 * Registra el token push en el backend si existe la infraestructura (projectId de EAS).
 * Sin projectId no se intenta: no hay forma de recibir push.
 */
export async function registerPushToken() {
  const Notifications = load();
  if (!Notifications) return;
  const projectId =
    (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId ??
    Constants.easConfig?.projectId;
  if (!projectId) return;
  try {
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
    pushToken = data;
    await notificationsApi.registerPushToken(data, Platform.OS);
  } catch {
    // Expo Go en Android, simulador o sin red: se queda solo con WebSocket.
  }
}

export async function unregisterPushToken() {
  if (!pushToken) return;
  try {
    await notificationsApi.unregisterPushToken(pushToken);
  } catch {
    // Mejor esfuerzo.
  }
  pushToken = null;
}
