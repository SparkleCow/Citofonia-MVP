const configured = process.env.EXPO_PUBLIC_API_URL?.trim();
const configuredWs = process.env.EXPO_PUBLIC_WS_URL?.trim();

const devFallback = 'http://192.168.1.7:8080';

export const API_BASE_URL = (configured || (__DEV__ ? devFallback : '')).replace(/\/+$/, '');

/** El backend expone WebSocket nativo en `/ws` (sin SockJS). */
export const WS_URL = (
  configuredWs || `${API_BASE_URL.replace(/^http/i, 'ws')}/ws`
).replace(/\/+$/, '');

export const API_TIMEOUT = 20_000;

/** Fuerza el modo simulado de llamadas (demos de UI sin contactar a nadie). */
export const CALL_SIMULATION = process.env.EXPO_PUBLIC_CALL_SIMULATION === '1';
