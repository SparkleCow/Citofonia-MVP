import axios, { AxiosError, AxiosInstance } from 'axios';
import { API_BASE_URL, API_TIMEOUT } from '@/config/env';
import { clearSession, getToken } from '@/services/storage';

type ErrorBody = {
  message?: string;
  error?: string;
  fieldErrors?: Record<string, string> | null;
};

export class ApiError extends Error {
  status: number;
  fieldErrors: Record<string, string> | null;

  constructor(message: string, status = 0, fieldErrors: Record<string, string> | null = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

type AuthFailureHandler = (status: number) => void;
let authFailureHandler: AuthFailureHandler | null = null;
/** Evita disparar varias veces el cierre de sesión si fallan peticiones en paralelo. */
let sessionEnding = false;

export function registerAuthFailureHandler(handler: AuthFailureHandler | null) {
  authFailureHandler = handler;
}

const PUBLIC_ENDPOINTS = ['/api/auth/login', '/api/auth/register', '/api/apartments/options'];

function isPublicRequest(url?: string) {
  if (!url) return false;
  return PUBLIC_ENDPOINTS.some((endpoint) => url.includes(endpoint));
}

function toApiError(error: AxiosError<ErrorBody>): ApiError {
  const status = error.response?.status ?? 0;
  const body = error.response?.data;
  const message =
    body?.message ||
    (!API_BASE_URL ? 'La app no tiene configurada la dirección del servidor (EXPO_PUBLIC_API_URL).' : '') ||
    (status === 401
      ? 'Tu sesión ha caducado. Inicia sesión de nuevo.'
      : status === 403
        ? 'No tienes permisos para realizar esta acción.'
        : status === 429
          ? 'Demasiados intentos. Espera un momento.'
          : error.code === 'ECONNABORTED'
            ? 'La conexión tardó demasiado. Inténtalo de nuevo.'
            : error.message || 'No se pudo conectar con el servidor.');

  return new ApiError(message, status, body?.fieldErrors ?? null);
}

export function getApiErrorMessage(
  error: unknown,
  fallback = 'No se pudo completar la operación. Inténtalo de nuevo.',
) {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ErrorBody>) => {
    const status = error.response?.status ?? 0;

    // 401 = token ausente/inválido/caducado → sesión muerta.
    // 403 = autenticado pero sin permiso para ese recurso: NO se cierra la sesión
    // (si no, una pantalla restringida expulsaría al usuario al login/dashboard).
    // Errores de red (status 0) y 5xx tampoco tocan la sesión.
    if (status === 401 && !isPublicRequest(error.config?.url) && !sessionEnding) {
      sessionEnding = true;
      try {
        await clearSession();
        authFailureHandler?.(status);
      } finally {
        sessionEnding = false;
      }
    }

    return Promise.reject(toApiError(error));
  },
);

export default api;
