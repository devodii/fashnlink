import '../global.css';

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AppQueryProvider } from '@/lib/query-client';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppQueryProvider>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="t/[slug]" options={{ title: '' }} />
          <Stack.Screen name="r/[renderId]" options={{ title: '' }} />
          <Stack.Screen name="p/[slug]" options={{ title: '' }} />
        </Stack>
        <StatusBar style="auto" />
      </AppQueryProvider>
    </GestureHandlerRootView>
  );
}
