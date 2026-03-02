import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, Text, StyleSheet } from 'react-native';

const queryClient = new QueryClient();
const Stack = createNativeStackNavigator();

// Placeholder home screen - replace with actual navigation
function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>VIVE</Text>
      <Text style={styles.subtitle}>Premium Health Concierge</Text>
      <Text style={styles.version}>v1.0.0 - Preview Build</Text>
      <StatusBar style="light" />
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <NavigationContainer>
          <Stack.Navigator
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: '#0A0E1A' },
            }}
          >
            <Stack.Screen name="Home" component={HomeScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0E1A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 48,
    fontWeight: '800',
    color: '#6C63FF',
    letterSpacing: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#8E95A9',
    marginTop: 12,
  },
  version: {
    fontSize: 12,
    color: '#4A5068',
    marginTop: 24,
  },
});
