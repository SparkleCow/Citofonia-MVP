import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { router } from 'expo-router';
import { authService } from '@/services/auth';
import { getToken } from '@/services/storage';
import type { Role, UserSession } from '@/types';

type AuthCtx = {
  user: UserSession | null;
  loading: boolean;
  isAuth: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (p: any) => Promise<any>;
  logout: () => Promise<void>;
  homeFor: (roles?: Role[]) => string;
};

const Ctx = createContext<AuthCtx | undefined>(undefined);

function homeFor(roles: Role[] = []) {
  if (roles.includes('ADMIN')) return '/(admin)/dashboard';
  if (roles.includes('CONCIERGE')) return '/(concierge)/dashboard';
  if (roles.includes('USER')) return '/(resident)/dashboard';
  return '/(auth)/login';
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        const cached = await authService.getCachedUser();
        if (token && cached) {
          setUser(cached);
          try {
            const me = await authService.me();
            setUser(me);
          } catch {}
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = async (email: string, password: string) => {
    const logged = await authService.login({ email, password });
    setUser(logged);
    router.replace(homeFor(logged.roles) as any);
  };

  const register = async (p: any) => authService.register(p);

  const logout = async () => {
    await authService.logout();
    setUser(null);
    router.replace('/(auth)/login');
  };

  const value = useMemo(
    () => ({ user, loading, isAuth: !!user, login, register, logout, homeFor }),
    [user, loading]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useAuth = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth fuera de AuthProvider');
  return v;
};
