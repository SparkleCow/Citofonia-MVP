import { useWindowDimensions } from 'react-native';

export const TABLET_BREAKPOINT = 768;
export const WIDE_BREAKPOINT = 1100;

/** Breakpoints compartidos por las pantallas de portería y residentes. */
export function useResponsive() {
  const { width, height } = useWindowDimensions();
  const isTablet = width >= TABLET_BREAKPOINT;
  const isWide = width >= WIDE_BREAKPOINT;
  return {
    width,
    height,
    isTablet,
    isWide,
    isLandscape: width > height,
    /** Columnas para rejillas de tarjetas. */
    columns: isWide ? 3 : isTablet ? 2 : 1,
    /** Padding horizontal de pantalla. */
    gutter: isTablet ? 28 : 20,
  };
}
