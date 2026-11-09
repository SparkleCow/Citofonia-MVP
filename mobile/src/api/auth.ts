import api from '@/api/axios';
import { clearSession, getToken, getUser, saveToken, saveUser } from '@/services/storage';
import type { JwtResponse, LoginPayload, RegisterPayload, UserResponse } from '@/types';

async function persistSession(jwt: JwtResponse) {
  await saveToken(jwt.token);
  const basic: UserResponse = {
    id: 0,
    firstName: '',
    lastName: '',
    email: jwt.email,
    roles: jwt.roles ?? [],
    enabled: true,
    deleted: false,
  };
  await saveUser(basic);
}

async function loadProfile(): Promise<UserResponse> {
  const { data } = await api.get<UserResponse>('/api/auth/me');
  await saveUser(data);
  return data;
}

export const authApi = {
  async login(payload: LoginPayload): Promise<UserResponse> {
    const { data } = await api.post<JwtResponse>('/api/auth/login', payload);
    await persistSession(data);
    try {
      return await loadProfile();
    } catch {
      return {
        id: 0,
        firstName: '',
        lastName: '',
        email: data.email,
        roles: data.roles ?? [],
        enabled: true,
        deleted: false,
      };
    }
  },

  async register(payload: RegisterPayload): Promise<UserResponse> {
    const { data } = await api.post<UserResponse>('/api/auth/register', payload);
    return data;
  },

  me: loadProfile,

  async getCachedUser() {
    return getUser<UserResponse>();
  },

  async hasToken() {
    return Boolean(await getToken());
  },

  async logout() {
    await clearSession();
  },
};
