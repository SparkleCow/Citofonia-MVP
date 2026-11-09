import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { fullName, roleLabels } from '@/lib/format';

type MenuItem = {
  label: string;
  description?: string;
  icon: keyof typeof Ionicons.glyphMap;
  path?: string;
  onPress?: () => void;
  danger?: boolean;
};

export default function MoreScreen() {
  const { user, logout } = useAuth();
  const { scheme, setScheme } = useTheme();

  const primaryRole = user?.roles?.includes('ADMIN')
    ? 'ADMIN'
    : user?.roles?.includes('CONCIERGE')
      ? 'CONCIERGE'
      : 'USER';

  const management: MenuItem[] = [
    {
      label: 'Solicitudes pendientes',
      description: 'Aprueba o rechaza nuevos registros',
      icon: 'time-outline',
      path: '/admin/pending',
    },
    {
      label: 'Apartamentos',
      description: 'Crear, editar y eliminar unidades',
      icon: 'business-outline',
      path: '/admin/apartments',
    },
    {
      label: 'Crear conserje',
      description: 'Alta directa de personal',
      icon: 'person-add-outline',
      path: '/admin/create',
    },
    {
      label: 'Mi buzón',
      description: 'Mensajes y notificaciones recibidos',
      icon: 'file-tray-outline',
      path: '/admin/inbox',
    },
    {
      label: 'Redactar mensaje',
      description: 'Avisos al buzón de los usuarios',
      icon: 'mail-outline',
      path: '/admin/mail',
    },
    {
      label: 'Llamadas',
      description: 'Llamar a portería, viviendas o residentes',
      icon: 'call-outline',
      path: '/admin/calls',
    },
    {
      label: 'Emergencias',
      description: 'Historial de alertas y resolución',
      icon: 'shield-checkmark-outline',
      path: '/admin/emergencies',
    },
  ];

  const onItem = (item: MenuItem) => {
    if (item.onPress) {
      item.onPress();
      return;
    }
    if (item.path) router.push(item.path as never);
  };

  const confirmLogout = () => {
    Alert.alert('Cerrar sesión', '¿Quieres salir del panel de administración?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Cerrar sesión', style: 'destructive', onPress: () => logout() },
    ]);
  };

  return (
    <Screen edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="pt-4">
          <Text className="text-2xl font-extrabold text-ink-900 dark:text-ink-50">Mi cuenta</Text>
          <Text className="mt-1 text-sm text-ink-500 dark:text-ink-400">
            Perfil, ajustes y herramientas de administración.
          </Text>
        </View>

        <Card className="mt-5 flex-row items-center gap-4">
          <Avatar firstName={user?.firstName} lastName={user?.lastName} size="lg" />
          <View className="min-w-0 flex-1">
            <Text numberOfLines={1} className="text-lg font-extrabold text-ink-900 dark:text-ink-50">
              {fullName(user?.firstName, user?.lastName)}
            </Text>
            <Text numberOfLines={1} className="mt-0.5 text-xs text-ink-500 dark:text-ink-400">
              {user?.email}
            </Text>
            <View className="mt-2 flex-row flex-wrap items-center gap-2">
              <Badge label={roleLabels[primaryRole]} tone="info" icon="shield-checkmark-outline" />
              {user?.apartmentIdentifier ? (
                <Badge label={user.apartmentIdentifier} tone="neutral" icon="home-outline" />
              ) : null}
            </View>
          </View>
        </Card>

        <Text className="mb-2 mt-6 text-xs font-bold uppercase tracking-wider text-ink-500 dark:text-ink-400">
          Apariencia
        </Text>
        <Card padded={false} className="overflow-hidden">
          <View className="flex-row gap-2 p-3">
            {(['light', 'dark', 'system'] as const).map((option) => {
              const selected = scheme === option;
              const labels = { light: 'Claro', dark: 'Oscuro', system: 'Sistema' };
              const icons = {
                light: 'sunny-outline',
                dark: 'moon-outline',
                system: 'phone-portrait-outline',
              } as const;
              return (
                <Pressable
                  key={option}
                  onPress={() => setScheme(option)}
                  className={`flex-1 items-center gap-1.5 rounded-2xl border py-3 ${
                    selected
                      ? 'border-brand-500 bg-brand-50 dark:border-brand-400 dark:bg-brand-500/15'
                      : 'border-ink-200 bg-white dark:border-ink-800 dark:bg-ink-900'
                  }`}
                >
                  <Ionicons
                    name={icons[option]}
                    size={19}
                    color={selected ? '#3389fb' : '#6f87ab'}
                  />
                  <Text
                    className={`text-xs font-semibold ${
                      selected ? 'text-brand-700 dark:text-brand-200' : 'text-ink-600 dark:text-ink-300'
                    }`}
                  >
                    {labels[option]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Card>

        <Text className="mb-2 mt-6 text-xs font-bold uppercase tracking-wider text-ink-500 dark:text-ink-400">
          Gestión
        </Text>
        <Card padded={false} className="overflow-hidden">
          {management.map((item, index) => (
            <Pressable
              key={item.label}
              accessibilityRole="button"
              onPress={() => onItem(item)}
              className={`flex-row items-center gap-3 px-4 py-3.5 active:bg-ink-50 dark:active:bg-ink-800 ${
                index > 0 ? 'border-t border-ink-100 dark:border-ink-800' : ''
              }`}
            >
              <View className="h-10 w-10 items-center justify-center rounded-2xl bg-ink-100 dark:bg-ink-800">
                <Ionicons name={item.icon} size={19} color="#3389fb" />
              </View>
              <View className="min-w-0 flex-1">
                <Text className="text-sm font-semibold text-ink-900 dark:text-ink-50">{item.label}</Text>
                {item.description ? (
                  <Text className="mt-0.5 text-xs text-ink-500 dark:text-ink-400">
                    {item.description}
                  </Text>
                ) : null}
              </View>
              <Ionicons name="chevron-forward" size={18} color="#93a8c7" />
            </Pressable>
          ))}
        </Card>

        <Text className="mb-2 mt-6 text-xs font-bold uppercase tracking-wider text-ink-500 dark:text-ink-400">
          Sesión
        </Text>
        <Card padded={false} className="overflow-hidden">
          <Pressable
            accessibilityRole="button"
            onPress={confirmLogout}
            className="flex-row items-center gap-3 px-4 py-3.5 active:bg-rose-50 dark:active:bg-rose-500/10"
          >
            <View className="h-10 w-10 items-center justify-center rounded-2xl bg-rose-100 dark:bg-rose-500/20">
              <Ionicons name="log-out-outline" size={19} color="#e11d48" />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-semibold text-rose-600 dark:text-rose-300">Cerrar sesión</Text>
              <Text className="mt-0.5 text-xs text-ink-500 dark:text-ink-400">
                Salir de este dispositivo de forma segura
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#93a8c7" />
          </Pressable>
        </Card>

        <Text className="mt-6 text-center text-xs text-ink-400 dark:text-ink-500">
          Citofonía Fácil · Panel de administración
        </Text>
      </ScrollView>
    </Screen>
  );
}
