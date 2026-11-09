import { Client, type IMessage, type StompSubscription } from '@stomp/stompjs';
import { WS_URL } from '@/config/env';
import { getToken } from '@/services/storage';

export type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'disconnected';

type StatusListener = (status: ConnectionStatus) => void;
type Handler<T> = (payload: T) => void;

type Registration = {
  destination: string;
  handler: (message: IMessage) => void;
  active: StompSubscription | null;
};

/**
 * Cliente STOMP único para toda la app (WebSocket nativo en `/ws`).
 * El JWT viaja en la cabecera `Authorization` del frame CONNECT, que es lo que
 * valida `StompJwtAuthInterceptor`. Reconecta solo y re-suscribe tras cada reconexión.
 *
 * Varios módulos (buzón, llamadas) comparten la conexión: cada uno hace
 * `acquire()` al montarse y `release()` al desmontarse; el socket se cierra
 * cuando nadie lo usa.
 */
class StompService {
  private client: Client | null = null;
  private status: ConnectionStatus = 'idle';
  private users = 0;
  private statusListeners = new Set<StatusListener>();
  private registrations = new Set<Registration>();
  private connectListeners = new Set<() => void>();

  getStatus() {
    return this.status;
  }

  isConnected() {
    return this.status === 'connected' && Boolean(this.client?.connected);
  }

  onStatus(listener: StatusListener) {
    this.statusListeners.add(listener);
    listener(this.status);
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  /** Se invoca en cada (re)conexión; útil para resincronizar datos perdidos. */
  onConnect(listener: () => void) {
    this.connectListeners.add(listener);
    return () => {
      this.connectListeners.delete(listener);
    };
  }

  private setStatus(status: ConnectionStatus) {
    this.status = status;
    this.statusListeners.forEach((listener) => listener(status));
  }

  /** Registra un usuario de la conexión y la abre si hace falta. */
  acquire() {
    this.users += 1;
    this.open();
  }

  async release() {
    this.users = Math.max(0, this.users - 1);
    if (this.users === 0) await this.close();
  }

  /** Reabre el socket si el sistema lo cerró (p. ej. al volver a primer plano). */
  reconnect() {
    if (this.users > 0) this.open();
  }

  private open() {
    if (this.client?.active) return;

    try {
      const client = new Client({
        brokerURL: WS_URL,
        // Necesarios para el WebSocket de React Native.
        forceBinaryWSFrames: true,
        appendMissingNULLonIncoming: true,
        reconnectDelay: 5_000,
        heartbeatIncoming: 0,
        heartbeatOutgoing: 0,
        // Token fresco en cada intento (también en reconexiones).
        beforeConnect: async () => {
          const token = await getToken();
          client.connectHeaders = token ? { Authorization: `Bearer ${token}` } : {};
          this.setStatus('connecting');
        },
        onConnect: () => {
          this.setStatus('connected');
          this.registrations.forEach((registration) => this.attach(registration));
          this.connectListeners.forEach((listener) => listener());
        },
        onWebSocketClose: () => {
          this.registrations.forEach((registration) => {
            registration.active = null;
          });
          if (this.client?.active) this.setStatus('disconnected');
        },
        onStompError: () => this.setStatus('disconnected'),
      });

      this.client = client;
      this.setStatus('connecting');
      client.activate();
    } catch {
      // Un fallo del socket no debe tumbar la pantalla: queda como "sin conexión".
      this.client = null;
      this.setStatus('disconnected');
    }
  }

  private async close() {
    const client = this.client;
    this.client = null;
    this.registrations.forEach((registration) => {
      registration.active = null;
    });
    this.setStatus('idle');
    if (client) await client.deactivate().catch(() => undefined);
  }

  private attach(registration: Registration) {
    if (!this.client?.connected) return;
    registration.active?.unsubscribe();
    registration.active = this.client.subscribe(registration.destination, registration.handler);
  }

  /** Suscripción JSON que sobrevive a reconexiones. Devuelve la función de baja. */
  subscribe<T>(destination: string, handler: Handler<T>) {
    const registration: Registration = {
      destination,
      active: null,
      handler: (message) => {
        try {
          handler(JSON.parse(message.body) as T);
        } catch {
          // Frame no JSON: se ignora.
        }
      },
    };
    this.registrations.add(registration);
    this.attach(registration);

    return () => {
      this.registrations.delete(registration);
      try {
        registration.active?.unsubscribe();
      } catch {
        // Conexión ya cerrada.
      }
    };
  }

  /** Publica un frame JSON en un destino de aplicación (`/app/...`). */
  publish(destination: string, body: unknown) {
    if (!this.client?.connected) throw new Error('Sin conexión en tiempo real con el servidor.');
    this.client.publish({ destination, body: JSON.stringify(body) });
  }
}

export const stomp = new StompService();

export const MAILBOX_DESTINATION = '/user/queue/mailbox';
export const CALLS_DESTINATION = '/user/queue/calls';
