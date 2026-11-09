import { Ionicons } from '@expo/vector-icons';
import { Redirect, Stack, Tabs } from 'expo-router';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { CallProvider } from '@/context/CallContext';
import { EmergencyProvider } from '@/context/EmergencyContext';
import { MailboxProvider, useMailbox } from '@/context/MailboxContext';
import { useTheme } from '@/context/ThemeContext';
import { useResponsive } from '@/hooks/useResponsive';
import type { Role } from '@/types';

type IconName = keyof typeof Ionicons.glyphMap;

export type RoleTab = {
  name: string;
  title: string;
  icon: IconName;
  activeIcon: IconName;
  /** Muestra el contador de no leídos del buzón. */
  mailBadge?: boolean;
};

const HOME_BY_ROLE: Record<Role, string> = {
  ADMIN: '/admin/dashboard',
  CONCIERGE: '/concierge/dashboard',
  USER: '/resident/dashboard',
};

/** Guardia de rol + servicios en tiempo real (buzón, llamadas, emergencias). */
export function RoleShell({ role, children }: { role: Role; children: React.ReactNode }) {
  const { loading, isAuth, user, homeFor } = useAuth();

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-ink-50 dark:bg-ink-950">
        <ActivityIndicator size="large" color="#1d6af0" />
      </View>
    );
  }

  if (!isAuth || !user) return <Redirect href="/(auth)/login" />;

  const target = homeFor(user.roles);
  if (target !== HOME_BY_ROLE[role]) return <Redirect href={target as never} />;

  return (
    <MailboxProvider>
      <CallProvider>
        <EmergencyProvider>{children}</EmergencyProvider>
      </CallProvider>
    </MailboxProvider>
  );
}

/** Stack del rol: `(tabs)` + pantallas secundarias declaradas explícitamente. */
export function RoleStack({ screens = [] }: { screens?: string[] }) {
  const { isDark } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: isDark ? '#0b1020' : '#f7f9fc' },
      }}
    >
      <Stack.Screen name="(tabs)" />
      {screens.map((name) => (
        <Stack.Screen key={name} name={name} />
      ))}
    </Stack>
  );
}

/**
 * Barra de pestañas. Solo pestañas visibles: expo-router 58 redirige a la primera pestaña
 * cualquier ruta oculta (`href: null`) que reciba el foco, así que las pantallas secundarias
 * van en el Stack del rol (ver `RoleStack`).
 */
export function RoleTabBar({ tabs }: { tabs: RoleTab[] }) {
  const { isDark } = useTheme();
  const { isTablet } = useResponsive();
  const { stats } = useMailbox();

  return (
    <Tabs
      backBehavior="history"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: isDark ? '#8ec7ff' : '#1854dc',
        tabBarInactiveTintColor: isDark ? '#93a8c7' : '#526b8e',
        tabBarLabelStyle: { fontSize: isTablet ? 13 : 12, fontWeight: '700' },
        tabBarLabelPosition: isTablet ? 'beside-icon' : 'below-icon',
        tabBarStyle: {
          backgroundColor: isDark ? '#0b1020' : '#ffffff',
          borderTopColor: isDark ? '#2a3a52' : '#dbe3ef',
          height: isTablet ? 72 : 68,
          paddingTop: 8,
          paddingBottom: 10,
        },
      }}
    >
      {tabs.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarAccessibilityLabel: tab.title,
            tabBarBadge: tab.mailBadge && stats.unread > 0 ? stats.unread : undefined,
            tabBarBadgeStyle: { backgroundColor: '#e11d48', fontWeight: '700' },
            tabBarIcon: ({ focused, color }) => (
              <Ionicons name={focused ? tab.activeIcon : tab.icon} size={24} color={color as string} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}

/** Rol sin pantallas secundarias (residente): guardia + pestañas directamente. */
export function RoleTabs({ role, tabs }: { role: Role; tabs: RoleTab[] }) {
  return (
    <RoleShell role={role}>
      <RoleTabBar tabs={tabs} />
    </RoleShell>
  );
}
