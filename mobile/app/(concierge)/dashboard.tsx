import { View, Text, Pressable, ScrollView, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { s } from '@/theme/styles';

export default function ConciergeDash() {
  const { user, logout } = useAuth();
  const { width } = useWindowDimensions();
  const tablet = width >= 768;
  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={[s.container, { paddingBottom: 32 }]}>
        <View style={s.header}>
          <View>
            <Text style={s.title}>Conserjería</Text>
            <Text style={s.subtitle}>{user?.email} · CONCIERGE</Text>
          </View>
          <Pressable onPress={logout}><Text style={s.link}>Cerrar sesión</Text></Pressable>
        </View>
        <View style={[s.grid, { flexDirection: tablet ? 'row' : 'column' }]}>
          <View style={[s.panel, { flex: tablet ? 1 : 0, minHeight: tablet ? 320 : undefined }]}><Text style={{ color: '#f8fafc', fontWeight: '700' }}>Directorio rápido</Text><Text style={s.panelText}>Apartamentos/residentes</Text></View>
          <View style={[s.panel, { flex: tablet ? 1 : 0, minHeight: tablet ? 320 : undefined }]}><Text style={{ color: '#f8fafc', fontWeight: '700' }}>Control de llamadas</Text><Text style={s.panelText}>Llamar/atender (WebRTC listo)</Text></View>
          <View style={[s.panel, { flexBasis: tablet ? '32%' : '100%' }]}><Text style={{ color: '#f8fafc', fontWeight: '700' }}>Visitas</Text><Text style={s.panelText}>Entrada/salida</Text></View>
          <View style={[s.panel, { flexBasis: tablet ? '32%' : '100%' }]}><Text style={{ color: '#f8fafc', fontWeight: '700' }}>Correspondencia</Text><Text style={s.panelText}>Recepción/entrega</Text></View>
          <View style={[s.panel, { flexBasis: tablet ? '32%' : '100%' }]}><Text style={{ color: '#f8fafc', fontWeight: '700' }}>Alerta general</Text><Text style={s.panelText}>Con código</Text></View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
