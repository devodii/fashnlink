import * as React from 'react';
import { Platform, Share, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams } from 'expo-router';
import { formatPriceCents, type LinkDetailResponse } from '@tryonlink/shared';
import { useLinkDetail } from '@/lib/api/link-detail';
import { useCreateTwin, useTwinStatus } from '@/lib/api/twins';
import {
  useCreateRender,
  useRecordRenderEvent,
  useRenderStatus,
  renderFailureMessage,
} from '@/lib/api/renders';
import { useImageUploader } from '@/lib/uploadthing';
import { WEB_URL } from '@/lib/config';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';

type Stage =
  | 'idle'
  | 'consent'
  | 'uploading'
  | 'twin-pending'
  | 'render-pending'
  | 'result'
  | 'blocked'
  | 'error';

export default function TryOnScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const linkQuery = useLinkDetail(slug);

  if (linkQuery.isLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background">
        <Text className="text-muted-foreground">Loading…</Text>
      </SafeAreaView>
    );
  }

  if (linkQuery.isError || !linkQuery.data) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center gap-2 bg-background px-6">
        <Text className="text-center text-destructive">
          {linkQuery.error instanceof Error ? linkQuery.error.message : "Couldn't load this link."}
        </Text>
      </SafeAreaView>
    );
  }

  return <TryOnFlow link={linkQuery.data} />;
}

function TryOnFlow({ link }: { link: LinkDetailResponse }) {
  const [stage, setStage] = React.useState<Stage>('idle');
  const [consent, setConsent] = React.useState(false);
  const [ageAttested, setAgeAttested] = React.useState(false);
  const [twinId, setTwinId] = React.useState<string | null>(link.defaultTwin?.id ?? null);
  const [renderId, setRenderId] = React.useState<string | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const createTwin = useCreateTwin();
  const twinStatus = useTwinStatus(twinId, stage === 'twin-pending');
  const createRender = useCreateRender();
  const renderStatus = useRenderStatus(renderId, stage === 'render-pending');
  const recordEvent = useRecordRenderEvent();
  const { openImagePicker, isUploading } = useImageUploader('imageUploader');

  const submittingRenderRef = React.useRef(false);
  async function submitRender(id: string) {
    if (submittingRenderRef.current) return;
    submittingRenderRef.current = true;
    setStage('render-pending');
    setErrorMessage(null);
    try {
      const result = await createRender.mutateAsync({
        linkId: link.linkId,
        productId: link.productId,
        twinId: id,
        variantId: null,
      });
      setRenderId(result.renderId);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Something went wrong. Please try again.',
      );
      setStage('error');
    } finally {
      submittingRenderRef.current = false;
    }
  }

  function handleSeeItOnYou() {
    if (link.defaultTwin?.status === 'ready' && link.defaultTwin.twinUrl && twinId) {
      void submitRender(twinId);
      return;
    }
    setStage('consent');
  }

  async function handlePickSelfie(source: 'camera' | 'library') {
    setErrorMessage(null);
    try {
      const files = await openImagePicker({
        source,
        allowsEditing: true,
        quality: 0.85,
        onInsufficientPermissions: () => {
          setErrorMessage(
            source === 'camera'
              ? 'Camera access is off. Enable it in Settings to take a photo.'
              : 'Photo library access is off. Enable it in Settings to choose a photo.',
          );
          setStage('blocked');
        },
      });
      const file = files?.[0];
      if (!file) return;

      setStage('twin-pending');
      const created = await createTwin.mutateAsync({ key: file.key, url: file.ufsUrl });
      setTwinId(created.twinId);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Something went wrong. Please try again.',
      );
      setStage('blocked');
    }
  }

  React.useEffect(() => {
    if (stage !== 'twin-pending') return;
    if (twinStatus.data?.status === 'ready' && twinStatus.data.twinUrl && twinId) {
      void submitRender(twinId);
    } else if (twinStatus.data?.status === 'failed') {
      setErrorMessage("We couldn't build your model. Please try another photo.");
      setStage('blocked');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [twinStatus.data?.status, stage, twinId]);

  React.useEffect(() => {
    if (stage !== 'render-pending') return;
    if (renderStatus.data?.status === 'succeeded' && renderStatus.data.outputUrl) {
      setStage('result');
    } else if (renderStatus.data?.status === 'failed' || renderStatus.data?.status === 'blocked') {
      setErrorMessage(renderFailureMessage(renderStatus.data));
      setStage('error');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [renderStatus.data?.status, stage]);

  async function handleShare() {
    if (!renderId) return;
    const url = `${WEB_URL}/r/${renderId}`;
    try {
      await Share.share(
        Platform.OS === 'ios'
          ? { url, message: `See it on you at ${link.merchantName}` }
          : { message: `See it on you at ${link.merchantName}: ${url}` },
      );
      recordEvent.mutate({ renderId, event: 'share' });
    } catch {
      // user dismissed the share sheet
    }
  }

  function handleBuy() {
    if (!link.buyUrl) return;
    if (renderId) recordEvent.mutate({ renderId, event: 'buy_click' });
    void Linking.openURL(link.buyUrl);
  }

  const price = formatPriceCents(link.priceCents, link.currency);
  const outputUrl = renderStatus.data?.outputUrl ?? null;

  return (
    <SafeAreaView className="flex-1 bg-background">
      <Stack.Screen options={{ title: link.productTitle, headerBackTitle: 'Back' }} />
      <View className="flex-1 gap-4 px-4 pt-4">
        <View className="relative aspect-[3/4] w-full overflow-hidden rounded-lg bg-muted">
          <Image
            source={{ uri: (stage === 'result' && outputUrl) || link.productImageUrl || undefined }}
            className="h-full w-full"
            contentFit="cover"
            transition={200}
          />
        </View>

        <View className="gap-1">
          <Text className="text-sm text-muted-foreground">{link.merchantName}</Text>
          <Text className="text-lg font-medium text-foreground">{link.productTitle}</Text>
          {!!price && <Text className="text-sm text-muted-foreground">{price}</Text>}
        </View>

        {stage === 'idle' && (
          <Button size="lg" onPress={handleSeeItOnYou}>
            See it on you
          </Button>
        )}

        {stage === 'consent' && (
          <View className="gap-4">
            <View className="flex-row items-start gap-2.5">
              <Checkbox checked={consent} onCheckedChange={setConsent} className="mt-0.5" />
              <Text className="flex-1 text-sm leading-snug">
                I consent to my photo being used to generate a try-on render of myself.
              </Text>
            </View>
            <View className="flex-row items-start gap-2.5">
              <Checkbox checked={ageAttested} onCheckedChange={setAgeAttested} className="mt-0.5" />
              <Text className="flex-1 text-sm leading-snug">
                I am 18 or older and this is a photo of me.
              </Text>
            </View>
            {consent && ageAttested ? (
              <View className="flex-row gap-2">
                <Button
                  className="flex-1"
                  variant="outline"
                  disabled={isUploading}
                  onPress={() => handlePickSelfie('camera')}
                >
                  Take a photo
                </Button>
                <Button
                  className="flex-1"
                  variant="outline"
                  disabled={isUploading}
                  onPress={() => handlePickSelfie('library')}
                >
                  Choose photo
                </Button>
              </View>
            ) : (
              <Text className="text-xs text-muted-foreground">
                Check both boxes to take or upload a photo.
              </Text>
            )}
          </View>
        )}

        {(stage === 'twin-pending' || isUploading) && (
          <View className="gap-2">
            <Text className="text-sm text-muted-foreground">
              {isUploading ? 'Uploading your photo…' : 'Building your model…'}
            </Text>
            <Progress value={isUploading ? 50 : 75} />
          </View>
        )}

        {stage === 'render-pending' && (
          <View className="gap-2">
            <Text className="text-sm text-muted-foreground">Dressing you…</Text>
            <Progress value={90} />
          </View>
        )}

        {(stage === 'blocked' || stage === 'error') && errorMessage && (
          <Text className="text-sm text-destructive">{errorMessage}</Text>
        )}
        {stage === 'blocked' && (
          <Button variant="outline" onPress={() => setStage('consent')}>
            Try another photo
          </Button>
        )}
        {stage === 'error' && (
          <Button variant="outline" onPress={() => setStage('idle')}>
            Try again
          </Button>
        )}

        {stage === 'result' && (
          <View className="flex-row flex-wrap gap-2">
            <Button variant="outline" onPress={handleShare}>
              Share
            </Button>
            {!!link.buyUrl && (
              <Button variant="outline" onPress={handleBuy}>
                Buy
              </Button>
            )}
            <Button
              variant="ghost"
              onPress={() => {
                setStage('idle');
                setRenderId(null);
              }}
            >
              Try another look
            </Button>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
