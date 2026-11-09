import api from '@/api/axios';
import type { NotificationPreferences } from '@/types';

/** `NotificationController` — `/api/notifications`. */
export const notificationsApi = {
  preferences: () =>
    api
      .get<NotificationPreferences>('/api/notifications/preferences')
      .then((response) => response.data),
  /** Registra el token push del dispositivo (Expo). */
  registerPushToken: (token: string, platform: string) =>
    api.post<void>('/api/notifications/push-token', { token, platform }).then(() => undefined),
  unregisterPushToken: (token: string) =>
    api.delete<void>('/api/notifications/push-token', { params: { token } }).then(() => undefined),
};
