import '../global.css';

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AppQueryProvider } from '@/lib/query-client';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppQueryProvider>
        <Stack screenOptions={{ headerShown: false }} />
        <StatusBar style="auto" />
      </AppQueryProvider>
    </GestureHandlerRootView>
  );
}
