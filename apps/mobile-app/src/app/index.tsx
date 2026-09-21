import * as React from 'react';
import { FlatList, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { apiFetch, getShopperToken } from '@/lib/shopper-session';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';

type ClosetItem = {
  renderId: string;
  outputUrl: string | null;
  productTitle: string;
  createdAt: string;
};

/**
 * The Phase A integration proof: mint/read the shopper token, hit the real
 * shopper-scoped /api/me closet endpoint with it, and render whatever comes
 * back with the token-styled component library. No mocked data.
 */
function useShopperCloset() {
  return useQuery({
    queryKey: ['shopper-closet'],
    queryFn: async () => {
      await getShopperToken();
      const res = await apiFetch('/api/me');
      if (!res.ok) throw new Error(`closet fetch failed: ${res.status}`);
      const data = (await res.json()) as { items: ClosetItem[] };
      return data.items;
    },
  });
}

export default function HomeScreen() {
  const { data, isLoading, isError, error, refetch, isRefetching } = useShopperCloset();

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 px-4 pt-4">
        <Text className="text-2xl font-semibold text-foreground">Your closet</Text>
        <Text className="mt-1 text-sm text-muted-foreground">
          Every try-on you&apos;ve saved, synced from the same API the web app uses.
        </Text>

        <Button className="mt-4 self-start" onPress={() => refetch()} disabled={isRefetching}>
          {isRefetching ? 'Refreshing…' : 'Refresh'}
        </Button>

        {isLoading && <Text className="mt-6 text-muted-foreground">Loading…</Text>}

        {isError && (
          <Text className="mt-6 text-destructive">
            Couldn&apos;t reach the API: {error instanceof Error ? error.message : 'unknown error'}
          </Text>
        )}

        {!isLoading && !isError && data?.length === 0 && (
          <Text className="mt-6 text-muted-foreground">
            Nothing here yet — try something on from a shop&apos;s link and it&apos;ll show up here.
          </Text>
        )}

        <FlatList
          className="mt-6"
          data={data}
          keyExtractor={(item) => item.renderId}
          renderItem={({ item }) => (
            <View className="mb-3 flex-row items-center gap-3 rounded-lg border border-border bg-card p-3">
              {item.outputUrl ? (
                <Image
                  source={{ uri: item.outputUrl }}
                  className="h-16 w-16 rounded-md bg-muted"
                  contentFit="cover"
                />
              ) : (
                <View className="h-16 w-16 rounded-md bg-muted" />
              )}
              <View className="flex-1">
                <Text className="text-base font-medium text-card-foreground">
                  {item.productTitle}
                </Text>
                <Text className="text-xs text-muted-foreground">
                  {new Date(item.createdAt).toLocaleDateString()}
                </Text>
              </View>
            </View>
          )}
        />
      </View>
    </SafeAreaView>
  );
}
