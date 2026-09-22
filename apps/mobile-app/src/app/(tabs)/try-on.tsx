import * as React from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Input } from '@/components/ui/input';

function slugFromInput(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    const parts = url.pathname.split('/').filter(Boolean);
    return parts[parts.length - 1] ?? null;
  } catch {
    return trimmed.replace(/^\/+|\/+$/g, '');
  }
}

export default function TryOnEntryScreen() {
  const router = useRouter();
  const [value, setValue] = React.useState('');

  function handleGo() {
    const slug = slugFromInput(value);
    if (!slug) return;
    router.push(`/t/${slug}`);
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 gap-4 px-4 pt-6">
        <Text className="text-2xl font-semibold text-foreground">Try something on</Text>
        <Text className="text-sm text-muted-foreground">
          Paste a shop&apos;s try-on link, or the code from their storefront, to see it on you.
        </Text>
        <Input
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="tryonlink.app/t/abc123 or abc123"
          value={value}
          onChangeText={setValue}
          onSubmitEditing={handleGo}
        />
        <Button onPress={handleGo} disabled={!value.trim()}>
          Go
        </Button>
      </View>
    </SafeAreaView>
  );
}
