import * as React from 'react';
import { Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams } from 'expo-router';
import { usePollDetail, usePollState, useCastPollVote } from '@/lib/api/polls';
import { Text } from '@/components/ui/text';

export default function PollVoteScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const poll = usePollDetail(slug);

  if (poll.isLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background">
        <Text className="text-muted-foreground">Loading…</Text>
      </SafeAreaView>
    );
  }

  if (poll.isError || !poll.data) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center gap-2 bg-background px-6">
        <Text className="text-center text-destructive">
          {poll.error instanceof Error ? poll.error.message : "Couldn't load this poll."}
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <PollVoteView
      linkId={poll.data.linkId}
      merchantName={poll.data.merchantName}
      options={poll.data.options}
      closed={poll.data.closed}
    />
  );
}

function PollVoteView({
  linkId,
  merchantName,
  options,
  closed,
}: {
  linkId: string;
  merchantName: string;
  options: { productId: string; productTitle: string; renderId: string; imageUrl: string }[];
  closed: boolean;
}) {
  const [myVote, setMyVote] = React.useState<string | null>(null);
  const state = usePollState(linkId);
  const castVote = useCastPollVote(linkId);
  const votes = state.data?.votesByRenderId ?? {};
  const showResults = !!myVote || closed;

  function handleVote(renderId: string) {
    if (closed || myVote) return;
    setMyVote(renderId);
    castVote.mutate(renderId);
  }

  if (options.length === 0) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background px-6">
        <Text className="text-center text-muted-foreground">
          This poll doesn&apos;t have any looks to vote on yet.
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <Stack.Screen options={{ title: 'Which one?', headerBackTitle: 'Back' }} />
      <View className="flex-1 gap-4 px-4 pt-4">
        <View className="gap-1">
          <Text className="text-sm text-muted-foreground">{merchantName}</Text>
          <Text className="text-lg font-medium text-foreground">Which one?</Text>
          {closed && <Text className="text-sm text-muted-foreground">This poll is closed.</Text>}
        </View>

        <View className="flex-row flex-wrap gap-3">
          {options.map((option) => {
            const voteCount = votes[option.renderId] ?? 0;
            const isMine = myVote === option.renderId;
            return (
              <Pressable
                key={option.renderId}
                onPress={() => handleVote(option.renderId)}
                disabled={showResults}
                className="w-[47%] gap-1.5 rounded-md"
              >
                <View
                  className={`relative aspect-[3/4] w-full overflow-hidden rounded-md bg-muted ${
                    isMine ? 'border-2 border-primary' : ''
                  }`}
                >
                  <Image
                    source={{ uri: option.imageUrl }}
                    className="h-full w-full"
                    contentFit="cover"
                  />
                </View>
                <Text className="text-xs text-foreground" numberOfLines={1}>
                  {option.productTitle}
                </Text>
                {showResults && (
                  <Text className="text-xs text-muted-foreground">
                    {voteCount} {voteCount === 1 ? 'vote' : 'votes'}
                  </Text>
                )}
              </Pressable>
            );
          })}
        </View>
      </View>
    </SafeAreaView>
  );
}
