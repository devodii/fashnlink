import * as React from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { formatPriceCents } from '@tryonlink/shared';
import { useSharedRender } from '@/lib/api/shared-render';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';

export default function SharedRenderScreen() {
  const { renderId } = useLocalSearchParams<{ renderId: string }>();
  const router = useRouter();
  const query = useSharedRender(renderId);

  if (query.isLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background">
        <Text className="text-muted-foreground">Loading…</Text>
      </SafeAreaView>
    );
  }

  if (query.isError || !query.data) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center gap-2 bg-background px-6">
        <Text className="text-center text-destructive">
          {query.error instanceof Error
            ? query.error.message
            : "This look isn't available anymore."}
        </Text>
      </SafeAreaView>
    );
  }

  const render = query.data;
  const price = formatPriceCents(render.priceCents, render.currency);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <Stack.Screen options={{ title: render.productTitle, headerBackTitle: 'Back' }} />
      <View className="flex-1 gap-4 px-4 pt-4">
        <View className="items-center gap-1">
          <Text className="text-sm text-muted-foreground">{render.merchantName}</Text>
          <Text className="text-lg font-medium text-foreground">{render.productTitle}</Text>
          {!!price && <Text className="text-sm text-muted-foreground">{price}</Text>}
        </View>

        <View className="relative aspect-[3/4] w-full overflow-hidden rounded-lg bg-muted">
          <Image source={{ uri: render.outputUrl }} className="h-full w-full" contentFit="cover" />
        </View>

        <Button size="lg" onPress={() => router.push(`/t/${render.slug}`)}>
          See it on you
        </Button>
      </View>
    </SafeAreaView>
  );
}
