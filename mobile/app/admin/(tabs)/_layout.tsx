import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { ColorValue } from 'react-native';
import { useMailbox } from '@/context/MailboxContext';
import { useTheme } from '@/context/ThemeContext';

function TabIcon({
  focused,
  color,
  active,
  inactive,
}: {
  focused: boolean;
  color: ColorValue;
  active: keyof typeof Ionicons.glyphMap;
  inactive: keyof typeof Ionicons.glyphMap;
}) {
  return <Ionicons name={focused ? active : inactive} size={22} color={color as string} />;
}

/**
 * Pestañas visibles del administrador. Solo se declaran aquí las pantallas con botón
 * en la barra: expo-router 58 redirige a la primera pestaña cualquier ruta oculta
 * (`href: null`) que reciba el foco, por eso las secundarias viven en el Stack padre.
 */
export default function AdminTabsLayout() {
  const { isDark } = useTheme();
  const { stats } = useMailbox();

  return (
    <Tabs
      backBehavior="history"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: isDark ? '#8ec7ff' : '#1854dc',
        tabBarInactiveTintColor: isDark ? '#93a8c7' : '#526b8e',
        tabBarLabelStyle: { fontSize: 12, fontWeight: '700', marginTop: 2 },
        tabBarStyle: {
          backgroundColor: isDark ? '#0b1020' : '#ffffff',
          borderTopColor: isDark ? '#2a3a52' : '#dbe3ef',
          height: 68,
          paddingTop: 6,
          paddingBottom: 8,
        },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon focused={focused} color={color} active="grid" inactive="grid-outline" />
          ),
        }}
      />
      <Tabs.Screen
        name="residents"
        options={{
          title: 'Residentes',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon focused={focused} color={color} active="people" inactive="people-outline" />
          ),
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          title: 'Historial',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon focused={focused} color={color} active="time" inactive="time-outline" />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'Más',
          tabBarBadge: stats.unread > 0 ? stats.unread : undefined,
          tabBarBadgeStyle: { backgroundColor: '#e11d48', fontWeight: '700' },
          tabBarIcon: ({ focused, color }) => (
            <TabIcon focused={focused} color={color} active="menu" inactive="menu-outline" />
          ),
        }}
      />
    </Tabs>
  );
}
