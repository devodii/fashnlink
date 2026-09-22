import { Tabs } from 'expo-router';
import { Shirt, Sparkles } from 'lucide-react-native';
import { THEME } from '@/lib/theme';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: THEME.light.primary,
        tabBarInactiveTintColor: THEME.light['muted-foreground'],
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Closet',
          tabBarIcon: ({ color, size }) => <Shirt color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="try-on"
        options={{
          title: 'Try On',
          tabBarIcon: ({ color, size }) => <Sparkles color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
