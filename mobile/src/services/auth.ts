import api from './api';
import { saveToken, saveUser, clearSession, getUser } from './storage';
import type { LoginPayload, RegisterPayload, UserSession } from '@/types';

class AuthService {
  async login(payload: LoginPayload): Promise<UserSession> {
    const res = await api.post('/api/auth/login', payload);
    const { token, email, roles } = res.data;
    await saveToken(token);
    const basic: UserSession = { email, roles: roles || [] };
    await saveUser(basic);
    try {
      const me = await api.get('/api/auth/me');
      await saveUser(me.data);
      return me.data;
    } catch {
      return basic;
    }
  }

  async register(payload: RegisterPayload) {
    const res = await api.post('/api/auth/register', payload);
    return res.data;
  }

  async me() {
    const res = await api.get('/api/auth/me');
    await saveUser(res.data);
    return res.data;
  }

  async getCachedUser() {
    return getUser();
  }

  async logout() {
    await clearSession();
  }
}

export const authService = new AuthService();
