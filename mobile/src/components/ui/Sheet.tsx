import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useResponsive } from '@/hooks/useResponsive';

type SheetProps = {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  /** Acciones fijas al pie (botones primarios). */
  footer?: React.ReactNode;
};

/**
 * Hoja modal: bottom-sheet en smartphone, diálogo centrado en tablet.
 */
export function Sheet({ visible, onClose, title, subtitle, children, footer }: SheetProps) {
  const { isTablet, height } = useResponsive();
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      animationType={isTablet ? 'fade' : 'slide'}
      transparent
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        behavior="padding"
        className={`flex-1 bg-black/60 ${isTablet ? 'items-center justify-center p-8' : 'justify-end'}`}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cerrar"
          className="absolute inset-0"
          onPress={onClose}
        />
        <View
          className={`w-full bg-white dark:bg-ink-900 ${isTablet ? 'max-w-[620px] rounded-3xl' : 'rounded-t-3xl'}`}
          style={{ maxHeight: height * (isTablet ? 0.85 : 0.92) }}
        >
          <View className="flex-row items-start gap-3 border-b border-ink-100 px-5 pb-4 pt-5 dark:border-ink-800">
            <View className="flex-1">
              <Text className="text-xl font-extrabold text-ink-900 dark:text-ink-50">{title}</Text>
              {subtitle ? (
                <Text className="mt-1 text-sm text-ink-600 dark:text-ink-300">{subtitle}</Text>
              ) : null}
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cerrar"
              hitSlop={8}
              onPress={onClose}
              className="h-11 w-11 items-center justify-center rounded-full bg-ink-100 active:opacity-70 dark:bg-ink-800"
            >
              <Ionicons name="close" size={22} color="#4a5c98" />
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={{ padding: 20, gap: 16 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>

          {footer ? (
            <View
              className="flex-row gap-3 border-t border-ink-100 px-5 pt-4 dark:border-ink-800"
              style={{ paddingBottom: isTablet ? 20 : Math.max(insets.bottom, 16) }}
            >
              {footer}
            </View>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
