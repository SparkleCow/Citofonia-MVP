import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { goBack } from '@/lib/navigation';
import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { MailboxHome } from '@/components/mailbox/MailboxHome';
import { MailboxView } from '@/components/mailbox/MailboxView';
import { PeopleList } from '@/components/mailbox/PeopleList';
import { ThreadView } from '@/components/mailbox/ThreadView';
import { targetKey, type MailTarget, type Person } from '@/components/mailbox/types';
import { useAuth } from '@/context/AuthContext';
import { useResponsive } from '@/hooks/useResponsive';
import { mailCapabilities } from '@/lib/permissions';

type MailboxCenterProps = {
  eyebrow?: string;
  /** Muestra "volver" en la portada (cuando la ruta no es una pestaña raíz). */
  showBack?: boolean;
};

/** Solo el admin llega al buzón desde un menú (Más); el resto lo abre desde su pestaña. */
const fallback = '/admin/more';

function BackButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Volver"
      onPress={onPress}
      className="h-12 w-12 items-center justify-center rounded-full bg-ink-100 active:opacity-70 dark:bg-ink-800"
    >
      <Ionicons name="arrow-back" size={22} color="#526b8e" />
    </Pressable>
  );
}

/**
 * Buzón por rol:
 *  - USER: bandeja de entrada.
 *  - CONCIERGE: portada + directorio, solo lectura (no envía).
 *  - ADMIN: portada + directorio + envío.
 * Smartphone navega por pantallas; tablet muestra lista y conversación en paralelo.
 */
export function MailboxCenter({ eyebrow, showBack = false }: MailboxCenterProps) {
  const { user } = useAuth();
  const { isTablet } = useResponsive();
  const caps = mailCapabilities(user?.roles);
  const [target, setTarget] = useState<MailTarget | null>(null);
  const [person, setPerson] = useState<Person | null>(null);

  if (!caps.canBrowseDirectory) {
    return (
      <MailboxView
        eyebrow={eyebrow}
        headerRight={showBack ? <BackButton onPress={() => goBack(fallback)} /> : undefined}
      />
    );
  }

  const open = (next: MailTarget) => {
    setTarget(next);
    setPerson(null);
  };
  const home = () => {
    setTarget(null);
    setPerson(null);
  };

  const homeView = (
    <MailboxHome
      eyebrow={eyebrow}
      caps={caps}
      selected={target}
      onOpen={open}
      onCompose={() => router.push('/admin/mail' as never)}
      headerRight={showBack ? <BackButton onPress={() => goBack(fallback)} /> : undefined}
    />
  );

  if (target?.type === 'inbox') {
    return <MailboxView eyebrow={eyebrow} headerRight={<BackButton onPress={home} />} />;
  }

  const peopleView =
    target ? (
      <PeopleList
        key={targetKey(target)}
        target={target}
        selectedId={person?.id}
        onSelect={setPerson}
        onBack={home}
      />
    ) : null;

  if (!isTablet) {
    if (person) {
      return <ThreadView key={person.id} person={person} canSend={caps.canSend} onBack={() => setPerson(null)} />;
    }
    return peopleView ?? homeView;
  }

  return (
    <View className="flex-1 flex-row">
      <View className="w-[42%] max-w-[460px] border-r border-ink-200 dark:border-ink-800">
        {peopleView ?? homeView}
      </View>
      <View className="flex-1">
        {person ? (
          <ThreadView key={person.id} person={person} canSend={caps.canSend} />
        ) : (
          <View className="flex-1 items-center justify-center bg-white p-10 dark:bg-ink-900">
            <Ionicons name="chatbubbles-outline" size={48} color="#93a8c7" />
            <Text className="mt-3 text-center text-base font-semibold text-ink-600 dark:text-ink-300">
              Elige Conserjería o un apartamento y después una persona
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}
