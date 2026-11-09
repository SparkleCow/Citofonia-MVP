import { Redirect, Stack } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { RouteError } from '@/components/navigation/RouteError';
import { useAuth } from '@/context/AuthContext';
import { CallProvider } from '@/context/CallContext';
import { EmergencyProvider } from '@/context/EmergencyContext';
import { MailboxProvider } from '@/context/MailboxContext';
import { useTheme } from '@/context/ThemeContext';

export { RouteError as ErrorBoundary };

/** Pantallas secundarias declaradas explícitamente (las no declaradas no se garantizan). */
const STACK_SCREENS = [
  'inbox',
  'pending',
  'apartments',
  'calls',
  'mail',
  'users',
  'create',
  'emergencies',
];

/**
 * Área de administración: guardia de rol + Stack.
 *  - `(tabs)`: pestañas visibles (Inicio, Residentes, Historial, Más).
 *  - Resto (buzón, pendientes, apartamentos, llamadas…): pantallas apiladas sobre las pestañas.
 */
export default function AdminLayout() {
  const { loading, isAuth, user, isAdmin, homeFor } = useAuth();
  const { isDark } = useTheme();

  if (loading) {
    return (
      <View className='flex-1 items-center justify-center bg-ink-50 dark:bg-ink-950'>
        <ActivityIndicator size='large' color='#3389fb' />
      </View>
    );
  }

  if (!isAuth || !user) {
    return <Redirect href='/(auth)/login' />;
  }

  if (!isAdmin) {
    return <Redirect href={homeFor(user.roles) as never} />;
  }

  return (
    <MailboxProvider>
      <CallProvider>
        <EmergencyProvider>
          <Stack
            screenOptions={{
              headerShown: false,
              animation: 'slide_from_right',
              contentStyle: { backgroundColor: isDark ? '#0b1020' : '#f7f9fc' },
            }}
          >
            <Stack.Screen name='(tabs)' />
            {STACK_SCREENS.map((name) => (
              <Stack.Screen key={name} name={name} />
            ))}
          </Stack>
        </EmergencyProvider>
      </CallProvider>
    </MailboxProvider>
  );
}
