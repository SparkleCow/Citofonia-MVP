import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, View } from 'react-native';
import { attachmentsApi } from '@/api/attachments';
import { getToken } from '@/services/storage';

type AuthImageProps = {
  attachmentId: number;
  size?: number;
};

/**
 * Miniatura de un adjunto protegido. La descarga exige el JWT (el backend comprueba
 * que la foto sea de tu vivienda o que seas personal), así que va en la cabecera.
 * Al tocarla se amplía.
 */
export function AuthImage({ attachmentId, size = 72 }: AuthImageProps) {
  const [token, setToken] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    void getToken().then((value) => alive && setToken(value));
    return () => {
      alive = false;
    };
  }, []);

  if (!token) {
    return (
      <View style={{ width: size, height: size }} className="items-center justify-center rounded-xl bg-ink-100 dark:bg-ink-800">
        <ActivityIndicator color="#6f87ab" />
      </View>
    );
  }

  const source = { uri: attachmentsApi.contentUrl(attachmentId), headers: { Authorization: `Bearer ${token}` } };

  if (failed) {
    return (
      <View style={{ width: size, height: size }} className="items-center justify-center rounded-xl bg-ink-100 dark:bg-ink-800">
        <Ionicons name="image-outline" size={22} color="#93a8c7" />
      </View>
    );
  }

  return (
    <>
      <Pressable accessibilityRole="imagebutton" accessibilityLabel="Ver foto del paquete" onPress={() => setOpen(true)}>
        <Image
          source={source}
          style={{ width: size, height: size }}
          className="rounded-xl bg-ink-100 dark:bg-ink-800"
          onError={() => setFailed(true)}
        />
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cerrar foto"
          onPress={() => setOpen(false)}
          className="flex-1 items-center justify-center bg-black/90 p-4"
        >
          <Image source={source} resizeMode="contain" style={{ width: '100%', height: '80%' }} />
        </Pressable>
      </Modal>
    </>
  );
}
