import { Redirect, Stack } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '@/context/AuthContext';

export default function AuthLayout() {
  const { loading, isAuth, user, homeFor } = useAuth();

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-ink-50 dark:bg-ink-950">
        <ActivityIndicator size="large" color="#4267f2" />
      </View>
    );
  }

  if (isAuth && user) {
    return <Redirect href={homeFor(user.roles) as never} />;
  }

  return <Stack screenOptions={{ headerShown: false, animation: 'fade' }} />;
}
