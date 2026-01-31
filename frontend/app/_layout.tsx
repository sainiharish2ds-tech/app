import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="party-detail" options={{ headerShown: true, title: 'Party Details' }} />
        <Stack.Screen name="create-order" options={{ headerShown: true, title: 'Create Order' }} />
        <Stack.Screen name="create-party" options={{ headerShown: true, title: 'Create Party' }} />
        <Stack.Screen name="create-financial" options={{ headerShown: true, title: 'Financial Transaction' }} />
      </Stack>
    </GestureHandlerRootView>
  );
}
