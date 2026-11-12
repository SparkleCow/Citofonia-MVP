import { useColorScheme } from 'nativewind';
import React, { createContext, useContext, useEffect, useMemo, useRef } from 'react';

type ThemeContextValue = {
  scheme: 'light' | 'dark';
  isDark: boolean;
  setScheme: (scheme: 'light' | 'dark' | 'system') => void;
  toggle: () => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { colorScheme, setColorScheme, toggleColorScheme } = useColorScheme();
  const scheme = colorScheme === 'dark' ? 'dark' : 'light';

  // Tema oscuro por defecto; el usuario puede cambiarlo desde la app.
  const initialized = useRef(false);
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    setColorScheme('dark');
  }, [setColorScheme]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      scheme,
      isDark: scheme === 'dark',
      setScheme: setColorScheme,
      toggle: toggleColorScheme,
    }),
    [scheme, setColorScheme, toggleColorScheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme debe usarse dentro de ThemeProvider');
  return context;
}
