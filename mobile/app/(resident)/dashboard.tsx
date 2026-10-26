import { View, Text, Pressable, ScrollView, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { s } from '@/theme/styles';

export default function ResidentDash() {
  const { user, logout } = useAuth();
  const { width } = useWindowDimensions();
  const tablet = width >= 768;
  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={[s.container, { paddingBottom: 32 }]}>
        <View style={s.header}>
          <View>
            <Text style={s.title}>Residente</Text>
            <Text style={s.subtitle}>{user?.email} · USER {user?.apartmentIdentifier ? '· ' + user.apartmentIdentifier : ''}</Text>
          </View>
          <Pressable onPress={logout}><Text style={s.link}>Cerrar sesión</Text></Pressable>
        </View>
        <View style={[s.grid, { flexDirection: tablet ? 'row' : 'column' }]}>
          <View style={[s.panel, { flexBasis: tablet ? '48%' : '100%' }]}><Text style={{ color: '#f8fafc', fontWeight: '700' }}>Citófono</Text><Text style={s.panelText}>Llamar a portería / recibir llamadas (WebRTC)</Text></View>
          <View style={[s.panel, { flexBasis: tablet ? '48%' : '100%' }]}><Text style={{ color: '#f8fafc', fontWeight: '700' }}>Buzón</Text><Text style={s.panelText}>Mensajes internos</Text></View>
          <View style={[s.panel, { flexBasis: tablet ? '48%' : '100%' }]}><Text style={{ color: '#f8fafc', fontWeight: '700' }}>Visitas</Text><Text style={s.panelText}>Historial</Text></View>
          <View style={[s.panel, { flexBasis: tablet ? '48%' : '100%' }]}><Text style={{ color: '#f8fafc', fontWeight: '700' }}>Correspondencia</Text><Text style={s.panelText}>Estado de entregas</Text></View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
