import React, { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { apartmentsApi } from '@/api/apartments';
import { callsApi } from '@/api/calls';
import { Avatar } from '@/components/ui/Avatar';
import { SearchBar } from '@/components/ui/SearchBar';
import { fullName } from '@/lib/format';
import { normalizeText } from '@/lib/validation';
import type { ApartmentOption, ResidentDirectoryItem } from '@/types';

type ResidentFinderProps = {
  /** Se elige un residente: devuelve su apartamento (y el propio residente). */
  onPick: (apartment: ApartmentOption, resident: ResidentDirectoryItem) => void;
};

/**
 * Alternativa a elegir apartamento: buscar al residente por nombre (portería suele
 * conocer el nombre, no el número). Usa el directorio de residentes (ADMIN | CONCIERGE).
 */
export function ResidentFinder({ onPick }: ResidentFinderProps) {
  const [query, setQuery] = useState('');
  const [residents, setResidents] = useState<ResidentDirectoryItem[]>([]);
  const [apartments, setApartments] = useState<ApartmentOption[]>([]);
  const [loaded, setLoaded] = useState(false);

  const onChangeQuery = (value: string) => {
    setQuery(value);
    if (!value || loaded) return;
    setLoaded(true);
    void Promise.all([callsApi.residents(), apartmentsApi.options()])
      .then(([r, a]) => {
        setResidents(r);
        setApartments(a);
      })
      .catch(() => setLoaded(false));
  };

  const matches = useMemo(() => {
    const term = normalizeText(query);
    if (term.length < 2) return [];
    return residents
      .filter((r) => normalizeText(`${fullName(r.firstName, r.lastName)} ${r.apartmentIdentifier ?? ''}`).includes(term))
      .slice(0, 6);
  }, [residents, query]);

  return (
    <View className="gap-2">
      <Text className="text-sm font-semibold text-ink-800 dark:text-ink-100">…o busca al residente por nombre</Text>
      <SearchBar value={query} onChangeText={onChangeQuery} placeholder="Nombre del residente" />
      {matches.map((resident) => {
        const apartment = apartments.find((a) => a.identifier === resident.apartmentIdentifier);
        return (
          <Pressable
            key={resident.id}
            accessibilityRole="button"
            disabled={!apartment}
            onPress={() => {
              if (!apartment) return;
              onPick(apartment, resident);
              setQuery('');
            }}
            className="min-h-[52px] flex-row items-center gap-3 rounded-xl border border-ink-200 bg-white px-3 active:bg-ink-100 dark:border-ink-700 dark:bg-ink-900"
          >
            <Avatar firstName={resident.firstName} lastName={resident.lastName} size="sm" />
            <Text className="flex-1 text-[15px] font-semibold text-ink-950 dark:text-white" numberOfLines={1}>
              {fullName(resident.firstName, resident.lastName)}
            </Text>
            <Text className="text-sm font-bold text-brand-800 dark:text-brand-200">
              {resident.apartmentIdentifier ? `Apto. ${resident.apartmentIdentifier}` : 'Sin apto.'}
            </Text>
          </Pressable>
        );
      })}
      {query.length >= 2 && loaded && matches.length === 0 ? (
        <Text className="text-[13px] text-ink-600 dark:text-ink-300">Ningún residente coincide.</Text>
      ) : null}
    </View>
  );
}
