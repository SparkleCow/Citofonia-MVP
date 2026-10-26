import { View, Text, ScrollView, useWindowDimensions, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { colors, spacing } from '@/theme';
import { s } from '@/theme/styles';
import { SectionHeader } from '@/components/admin/SectionHeader';
import { ActionCard } from '@/components/admin/ActionCard';
import { StatCard } from '@/components/admin/StatCard';
import { Ionicons } from '@expo/vector-icons';

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  const go = (path: string) => router.push(path as any);

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={[s.container, { paddingBottom: spacing.xxxl }]}>
        <View style={s.header}>
          <View>
            <Text style={s.title}>Citonofia Facil</Text>
            <Text style={s.subtitle}>Panel de Administración • {user?.email}</Text>
          </View>
          <TouchableOpacity onPress={logout}>
            <Text style={s.link}>Cerrar sesión</Text>
          </TouchableOpacity>
        </View>

        <SectionHeader title="Resumen rápido" subtitle="Acceso directo a las funciones más usadas" />
        <View style={[s.grid, { flexDirection: 'row' }]}>
          <StatCard label="Usuarios" value="-" />
          <StatCard label="Pendientes" value="-" />
          <StatCard label="Apartamentos" value="-" />
        </View>

        <SectionHeader title="Gestión" subtitle="Administrar usuarios, viviendas y comunicación" />
        <View style={{ flexDirection: isTablet ? 'row' : 'column', flexWrap: 'wrap', gap: spacing.lg }}>
          <View style={{ flex: isTablet ? 1 : 0, minWidth: isTablet ? 280 : '100%' }}>
            <ActionCard
              title="Usuarios"
              subtitle="Listar, editar, habilitar/deshabilitar y eliminar"
              icon={<Ionicons name="people" size={26} color="#bfdbfe" />}
              onPress={() => go('/(admin)/users')}
              variant="surface"
            />
          </View>
          <View style={{ flex: isTablet ? 1 : 0, minWidth: isTablet ? 280 : '100%' }}>
            <ActionCard
              title="Pendientes de habilitación"
              subtitle="Aprobar o rechazar registros de residentes"
              icon={<Ionicons name="time" size={26} color="#fde68a" />}
              onPress={() => go('/(admin)/pending')}
              variant="surface"
            />
          </View>
          <View style={{ flex: isTablet ? 1 : 0, minWidth: isTablet ? 280 : '100%' }}>
            <ActionCard
              title="Crear conserje"
              subtitle="Alta directa de usuario conserjería"
              icon={<Ionicons name="person-add" size={26} color="#86efac" />}
              onPress={() => go('/(admin)/create')}
              variant="surface"
            />
          </View>
        </View>

        <SectionHeader title="Comunicación & Llamadas" subtitle="Mensajería y citófono" />
        <View style={{ flexDirection: isTablet ? 'row' : 'column', flexWrap: 'wrap', gap: spacing.lg }}>
          <View style={{ flex: isTablet ? 1 : 0, minWidth: isTablet ? 280 : '100%' }}>
            <ActionCard
              title="Enviar mensaje al buzón"
              subtitle="Avisos a todos, residentes o personalizados"
              icon={<Ionicons name="mail" size={26} color="#bfdbfe" />}
              onPress={() => go('/(admin)/mail')}
              variant="surface"
            />
          </View>
          <View style={{ flex: isTablet ? 1 : 0, minWidth: isTablet ? 280 : '100%' }}>
            <ActionCard
              title="Llamar"
              subtitle="Portería, apartamentos o residentes"
              icon={<Ionicons name="call" size={26} color="#86efac" />}
              onPress={() => go('/(admin)/calls')}
              variant="primary"
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
