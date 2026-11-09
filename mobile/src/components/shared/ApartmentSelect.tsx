import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apartmentsApi } from '@/api/apartments';
import { getApiErrorMessage } from '@/api/axios';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { SearchBar } from '@/components/ui/SearchBar';
import type { ApartmentOption } from '@/types';

type ApartmentSelectProps = {
  value: ApartmentOption | null;
  onChange: (apartment: ApartmentOption) => void;
  label?: string;
  error?: string | null;
};

function apartmentLabel(apartment: ApartmentOption) {
  const extra = [apartment.block, apartment.floor != null ? `Piso ${apartment.floor}` : null]
    .filter(Boolean)
    .join(' · ');
  return extra ? `${apartment.identifier} — ${extra}` : apartment.identifier;
}

/** Selector de vivienda con búsqueda (usa `/api/apartments/options`). */
export function ApartmentSelect({ value, onChange, label = 'Apartamento', error }: ApartmentSelectProps) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<ApartmentOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const needsLoad = open && options.length === 0 && !loadError && !loading;

  useEffect(() => {
    if (!needsLoad) return;
    let alive = true;
    apartmentsApi
      .options()
      .then((list) => alive && setOptions(list))
      .catch((err) => alive && setLoadError(getApiErrorMessage(err)))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [needsLoad]);

  const load = () => {
    setLoadError(null);
    setLoading(false);
  };

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return options;
    return options.filter((option) => apartmentLabel(option).toLowerCase().includes(term));
  }, [options, query]);

  return (
    <View className="gap-1.5">
      <Text className="text-sm font-semibold text-ink-800 dark:text-ink-100">{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={value ? `${label}: ${value.identifier}. Cambiar` : `Seleccionar ${label}`}
        onPress={() => setOpen(true)}
        className={`min-h-[52px] flex-row items-center gap-3 rounded-2xl border bg-white px-4 active:opacity-80 dark:bg-ink-900 ${
          error ? 'border-rose-500' : 'border-ink-300 dark:border-ink-700'
        }`}
      >
        <Ionicons name="business-outline" size={20} color="#526b8e" />
        <Text
          className={`flex-1 text-[15px] ${
            value ? 'font-semibold text-ink-950 dark:text-white' : 'text-ink-500 dark:text-ink-400'
          }`}
        >
          {value ? apartmentLabel(value) : 'Selecciona una vivienda'}
        </Text>
        <Ionicons name="chevron-down" size={20} color="#526b8e" />
      </Pressable>
      {error ? <Text className="text-xs font-medium text-rose-600 dark:text-rose-400">{error}</Text> : null}

      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <SafeAreaView className="flex-1 bg-ink-50 dark:bg-ink-950">
          <View className="w-full max-w-[720px] flex-1 self-center px-5 pt-3">
            <View className="mb-4 flex-row items-center gap-3">
              <Text className="flex-1 text-2xl font-extrabold text-ink-950 dark:text-white">
                Elegir vivienda
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cerrar"
                onPress={() => setOpen(false)}
                className="h-12 w-12 items-center justify-center rounded-full bg-ink-100 active:opacity-70 dark:bg-ink-800"
              >
                <Ionicons name="close" size={22} color="#526b8e" />
              </Pressable>
            </View>
            <SearchBar value={query} onChangeText={setQuery} placeholder="Buscar por torre, número..." />
            {loadError ? (
              <View className="mt-3">
                <ErrorBanner message={loadError} onRetry={load} />
              </View>
            ) : null}
            {open && options.length === 0 && !loadError ? (
              <ActivityIndicator className="mt-10" size="large" color="#1d6af0" />
            ) : (
              <ScrollView
                className="mt-3"
                contentContainerStyle={{ gap: 8, paddingBottom: 32 }}
                keyboardShouldPersistTaps="handled"
              >
                {filtered.map((option) => {
                  const selected = option.id === value?.id;
                  return (
                    <Pressable
                      key={option.id}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      onPress={() => {
                        onChange(option);
                        setOpen(false);
                        setQuery('');
                      }}
                      className={`min-h-[56px] flex-row items-center gap-3 rounded-2xl border px-4 active:opacity-80 ${
                        selected
                          ? 'border-brand-600 bg-brand-50 dark:bg-brand-500/15'
                          : 'border-ink-200 bg-white dark:border-ink-800 dark:bg-ink-900'
                      }`}
                    >
                      <Text className="flex-1 text-base font-semibold text-ink-950 dark:text-white">
                        {apartmentLabel(option)}
                      </Text>
                      {selected ? <Ionicons name="checkmark-circle" size={22} color="#1d6af0" /> : null}
                    </Pressable>
                  );
                })}
                {!loading && filtered.length === 0 && !loadError ? (
                  <Text className="mt-8 text-center text-ink-600 dark:text-ink-300">
                    No hay viviendas que coincidan.
                  </Text>
                ) : null}
              </ScrollView>
            )}
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
}
