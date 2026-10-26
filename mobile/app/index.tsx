import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { colors } from '@/theme';

export default function Index() {
  const { loading, isAuth, user, homeFor } = useAuth();
  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  if (!isAuth || !user) return <Redirect href="/(auth)/login" />;
  return <Redirect href={homeFor(user.roles) as any} />;
}
