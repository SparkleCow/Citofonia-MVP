import React from 'react';
import { IconButton } from '@/components/ui/IconButton';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';

/** Botones de cabecera: tema claro/oscuro y cerrar sesión. */
export function ProfileActions() {
  const { logout } = useAuth();
  const { isDark, toggle } = useTheme();
  return (
    <>
      <IconButton
        icon={isDark ? 'sunny-outline' : 'moon-outline'}
        label={isDark ? 'Tema claro' : 'Tema oscuro'}
        onPress={toggle}
      />
      <IconButton icon="log-out-outline" label="Cerrar sesión" onPress={() => void logout()} />
    </>
  );
}
