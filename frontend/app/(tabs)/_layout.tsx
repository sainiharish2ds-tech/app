import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{
      tabBarActiveTintColor: '#007AFF',
      tabBarInactiveTintColor: '#8E8E93',
      tabBarStyle: {
        backgroundColor: '#F9F9F9',
        borderTopWidth: 1,
        borderTopColor: '#E5E5EA',
        height: 60,
        paddingBottom: 8,
        paddingTop: 8,
      },
      headerStyle: {
        backgroundColor: '#007AFF',
      },
      headerTintColor: '#fff',
      headerTitleStyle: {
        fontWeight: '600',
      },
    }}>
      <Tabs.Screen
        name="products"
        options={{
          title: 'Products',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cube-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="parties"
        options={{
          title: 'Parties',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
