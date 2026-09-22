import * as React from 'react';
import { Platform, RefreshControl, ScrollView, Share, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';
import { Image } from 'expo-image';
import { Trash2 } from 'lucide-react-native';
import type { ClosetItem } from '@tryonlink/shared';
import { useCloset, useDeleteRender } from '@/lib/api/closet';
import { useRecordRenderEvent } from '@/lib/api/renders';
import { WEB_URL } from '@/lib/config';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';

function groupByMerchant(items: ClosetItem[]): [string, ClosetItem[]][] {
  const byMerchant = new Map<string, ClosetItem[]>();
  for (const item of items) {
    const list = byMerchant.get(item.merchantName) ?? [];
    list.push(item);
    byMerchant.set(item.merchantName, list);
  }
  return Array.from(byMerchant.entries());
}

export default function ClosetScreen() {
  const closet = useCloset();
  const deleteRender = useDeleteRender();
  const recordEvent = useRecordRenderEvent();

  const items = (closet.data?.items ?? []).filter((item) => item.outputUrl);
  const grouped = groupByMerchant(items);
  const defaultTwin = closet.data?.defaultTwin;

  async function handleShare(renderId: string, productTitle: string) {
    const url = `${WEB_URL}/r/${renderId}`;
    try {
      await Share.share(
        Platform.OS === 'ios'
          ? { url, message: productTitle }
          : { message: `${productTitle}: ${url}` },
      );
      recordEvent.mutate({ renderId, event: 'share' });
    } catch {
      // dismissed
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        className="flex-1 px-4 pt-4"
        refreshControl={
          <RefreshControl refreshing={closet.isRefetching} onRefresh={() => closet.refetch()} />
        }
      >
        <Text className="text-2xl font-semibold text-foreground">Your closet</Text>
        <Text className="mt-1 text-sm text-muted-foreground">
          Every try-on you&apos;ve saved, right on your phone.
        </Text>

        {defaultTwin?.twinUrl && (
          <View className="mt-6">
            <Text className="mb-2 text-sm font-medium text-foreground">Your model</Text>
            <Image
              source={{ uri: defaultTwin.twinUrl }}
              className="aspect-[3/4] w-28 rounded-md bg-muted"
              contentFit="cover"
            />
          </View>
        )}

        {closet.isLoading && <Text className="mt-6 text-muted-foreground">Loading…</Text>}

        {closet.isError && (
          <Text className="mt-6 text-destructive">
            {closet.error instanceof Error ? closet.error.message : "Couldn't load your closet."}
          </Text>
        )}

        {!closet.isLoading && !closet.isError && grouped.length === 0 && (
          <Text className="mt-6 text-muted-foreground">
            Nothing here yet — try something on from a shop&apos;s link and it&apos;ll show up here.
          </Text>
        )}

        {grouped.map(([merchantName, renders]) => (
          <View key={merchantName} className="mt-6">
            <Text className="mb-2 text-sm font-medium text-foreground">{merchantName}</Text>
            <View className="flex-row flex-wrap gap-3">
              {renders.map((render) => (
                <View key={render.renderId} className="w-[47%] gap-1.5">
                  <View className="relative aspect-[3/4] w-full overflow-hidden rounded-md bg-muted">
                    <Image
                      source={{ uri: render.outputUrl ?? undefined }}
                      className="h-full w-full"
                      contentFit="cover"
                    />
                  </View>
                  <Text className="text-xs text-foreground" numberOfLines={1}>
                    {render.productTitle}
                  </Text>
                  <View className="flex-row flex-wrap gap-1.5">
                    <Button
                      size="xs"
                      variant="secondary"
                      onPress={() => handleShare(render.renderId, render.productTitle)}
                    >
                      Share
                    </Button>
                    {!!render.buyUrl && (
                      <Button
                        size="xs"
                        variant="secondary"
                        onPress={() => Linking.openURL(render.buyUrl!)}
                      >
                        Buy
                      </Button>
                    )}
                    <Button
                      size="icon-xs"
                      variant="secondary"
                      onPress={() => deleteRender.mutate(render.renderId)}
                    >
                      <Trash2 size={12} />
                    </Button>
                  </View>
                </View>
              ))}
            </View>
          </View>
        ))}

        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  );
}
