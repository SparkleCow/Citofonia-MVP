import React from 'react';
import { ActivityIndicator, FlatList, RefreshControl, View } from 'react-native';
import { EmptyState } from '@/components/ui/EmptyState';
import { useResponsive } from '@/hooks/useResponsive';

type ResponsiveListProps<T> = {
  data: T[];
  keyExtractor: (item: T) => string;
  renderItem: (item: T) => React.ReactElement;
  header?: React.ReactElement;
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  emptyTitle: string;
  emptyDescription?: string;
  emptyIcon?: React.ComponentProps<typeof EmptyState>['icon'];
};

/** Lista con rejilla adaptativa: 1 columna en móvil, 2–3 en tablet. */
export function ResponsiveList<T>({
  data,
  keyExtractor,
  renderItem,
  header,
  loading,
  refreshing,
  onRefresh,
  emptyTitle,
  emptyDescription,
  emptyIcon,
}: ResponsiveListProps<T>) {
  const { columns, gutter } = useResponsive();
  return (
    <FlatList
      key={`cols-${columns}`}
      data={data}
      numColumns={columns}
      keyExtractor={keyExtractor}
      columnWrapperStyle={columns > 1 ? { gap: 12 } : undefined}
      contentContainerStyle={{ paddingHorizontal: gutter, paddingBottom: 32, gap: 12 }}
      ListHeaderComponent={header ? <View style={{ paddingTop: 12, paddingBottom: 4 }}>{header}</View> : undefined}
      ListEmptyComponent={
        loading ? (
          <ActivityIndicator className="mt-12" size="large" color="#1d6af0" />
        ) : (
          <EmptyState title={emptyTitle} description={emptyDescription} icon={emptyIcon} />
        )
      }
      renderItem={({ item }) => <View style={{ flex: 1 / columns }}>{renderItem(item)}</View>}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1d6af0" />}
      showsVerticalScrollIndicator={false}
    />
  );
}
