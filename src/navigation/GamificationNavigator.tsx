// src/navigation/GamificationNavigator.tsx
// Navigator + barrel exports for the gamification screens

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ProfileScreen } from '../screens/gamification/ProfileScreen';
import { QuestsScreen } from '../screens/gamification/QuestsScreen';
import { CollectiblesScreen } from '../screens/gamification/CollectiblesScreen';

// âââ Types âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

export type GamificationStackParamList = {
  Profile: undefined;
  Quests: undefined;
  Collectibles: undefined;
};

const Stack = createNativeStackNavigator<GamificationStackParamList>();

// âââ Navigator ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

export const GamificationNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName="Profile"
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: '#080810' },
      }}
    >
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="Quests" component={QuestsScreen} />
      <Stack.Screen name="Collectibles" component={CollectiblesScreen} />
    </Stack.Navigator>
  );
};

export default GamificationNavigator;
