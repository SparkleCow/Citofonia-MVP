import { router } from 'expo-router';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ApiError, registerAuthFailureHandler } from '@/api/axios';
import { authApi } from '@/api/auth';
import type { RegisterPayload, Role, UserResponse, UserSession } from '@/types';

type AuthContextValue = {
  user: UserSession | null;
  loading: boolean;
  isAuth: boolean;
  isAdmin: boolean;
  isConcierge: boolean;
  isResident: boolean;
  login: (email: string, password: string) => Promise<UserSession>;
  register: (payload: RegisterPayload) => Promise<UserResponse>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<UserSession | null>;
  hasRole: (...roles: Role[]) => boolean;
  homeFor: (roles?: Role[]) => string;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function homeForRoles(roles: Role[] = []) {
  if (roles.includes('ADMIN')) return '/admin/dashboard';
  if (roles.includes('CONCIERGE')) return '/concierge/dashboard';
  if (roles.includes('USER')) return '/resident/dashboard';
  return '/(auth)/login';
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);

  // Al limpiar `user`, los layouts protegidos redirigen solos al login (declarativo);
  // un router.replace imperativo competía con el guardia de (auth) y rebotaba al dashboard.
  const logout = useCallback(async () => {
    await authApi.logout();
    setUser(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    try {
      const profile = await authApi.me();
      setUser(profile);
      return profile;
    } catch (error) {
      // Solo una sesión rechazada (401) la cierra; un fallo de red conserva el perfil actual.
      if (error instanceof ApiError && error.status === 401) {
        await authApi.logout();
        setUser(null);
        return null;
      }
      return null;
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const hasToken = await authApi.hasToken();
        if (!hasToken) return;

        const cached = await authApi.getCachedUser();
        if (cached && mounted) {
          setUser(cached);
        }

        try {
          const profile = await authApi.me();
          if (mounted) setUser(profile);
        } catch (error) {
          // Sin red o servidor caído: se mantiene la sesión en caché en vez de expulsar al usuario.
          if (error instanceof ApiError && error.status === 401) {
            await authApi.logout();
            if (mounted) setUser(null);
          }
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    registerAuthFailureHandler(() => setUser(null));

    return () => registerAuthFailureHandler(null);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const profile = await authApi.login({ email: email.trim().toLowerCase(), password });
    setUser(profile);
    router.replace(homeForRoles(profile.roles) as never);
    return profile;
  }, []);

  const register = useCallback(async (payload: RegisterPayload) => {
    return authApi.register(payload);
  }, []);

  const hasRole = useCallback(
    (...roles: Role[]) => Boolean(user?.roles?.some((role) => roles.includes(role))),
    [user],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      isAuth: Boolean(user),
      isAdmin: Boolean(user?.roles?.includes('ADMIN')),
      isConcierge: Boolean(user?.roles?.includes('CONCIERGE')),
      isResident: Boolean(user?.roles?.includes('USER')),
      login,
      register,
      logout,
      refreshProfile,
      hasRole,
      homeFor: homeForRoles,
    }),
    [user, loading, login, register, logout, refreshProfile, hasRole],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return context;
}
