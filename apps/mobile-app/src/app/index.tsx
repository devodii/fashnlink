import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HomeScreen() {
  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 items-center justify-center px-4">
        <Text className="text-2xl font-semibold text-foreground">TRYON LINK</Text>
      </View>
    </SafeAreaView>
  );
}
