import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Animated,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Types ──────────────────────────────────────────────────────────────────

type RootStackParamList = {
  Profile: undefined;
  Settings: undefined;
};

type ProfileScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Profile'>;

interface ProfileScreenProps {
  navigation: ProfileScreenNavigationProp;
}

interface StatCard {
  id: string;
  label: string;
  value: number;
  unit: string;
  icon: string;
  trend: 'up' | 'down' | 'neutral';
  trendValue: string;
  color: string;
}

interface StreakDay {
  date: string;
  completed: boolean;
}

// ─── Mock Data ───────────────────────────────────────────────────────────────

const USER = {
  name: 'Alexandre',
  username: '@alex_vive',
  level: 24,
  currentXP: 3740,
  xpToNextLevel: 5000,
  currentStreak: 12,
  bestStreak: 31,
  joinedDaysAgo: 87,
};

const STATS: StatCard[] = [
  { id: 'sleep', label: 'Sleep Score', value: 84, unit: '/100', icon: '🌙', trend: 'up', trendValue: '+3', color: '#6B4FBB' },
  { id: 'energy', label: 'Energy', value: 72, unit: '/100', icon: '⚡', trend: 'up', trendValue: '+8', color: '#F5A623' },
  { id: 'recovery', label: 'Recovery', value: 91, unit: '/100', icon: '💚', trend: 'neutral', trendValue: '0', color: '#27AE60' },
  { id: 'stress', label: 'Stress', value: 34, unit: '/100', icon: '🧘', trend: 'down', trendValue: '-12', color: '#3D8BFF' },
];

const generateStreakDays = (): StreakDay[] => {
  const days: StreakDay[] = [];
  const today = new Date();
  for (let i = 20; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    days.push({
      date: d.toISOString().split('T')[0],
      completed: i > 8 ? true : i <= 11,
    });
  }
  return days;
};

const STREAK_DAYS = generateStreakDays();

// ─── Sub-components ──────────────────────────────────────────────────────────

const AvatarSection: React.FC<{ level: number }> = ({ level }) => (
  <View className="items-center mt-4 mb-6">
    <View style={{ position: 'relative' }}>
      {/* Glow ring */}
      <View
        style={{
          width: 100,
          height: 100,
          borderRadius: 50,
          backgroundColor: '#3D8BFF22',
          position: 'absolute',
          top: -6,
          left: -6,
          right: -6,
          bottom: -6,
          width: 112,
          height: 112,
        }}
      />
      {/* Avatar circle */}
      <View
        style={{
          width: 100,
          height: 100,
          borderRadius: 50,
          backgroundColor: '#1C1C28',
          borderWidth: 2,
          borderColor: '#3D8BFF',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ fontSize: 44 }}>🧑‍💻</Text>
      </View>
      {/* Level badge */}
      <View
        style={{
          position: 'absolute',
          bottom: -6,
          right: -6,
          backgroundColor: '#3D8BFF',
          borderRadius: 12,
          paddingHorizontal: 8,
          paddingVertical: 3,
          borderWidth: 2,
          borderColor: '#080810',
        }}
      >
        <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '800' }}>LVL {level}</Text>
      </View>
    </View>
    <Text style={{ color: '#E8E8F0', fontSize: 20, fontWeight: '700', marginTop: 16 }}>{USER.name}</Text>
    <Text style={{ color: '#A8A8C0', fontSize: 13, marginTop: 2 }}>{USER.username}</Text>
    <View style={{ flexDirection: 'row', marginTop: 8, gap: 4, alignItems: 'center' }}>
      <View style={{ backgroundColor: '#1C1C28', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
        <Text style={{ color: '#A8A8C0', fontSize: 12 }}>🗓 {USER.joinedDaysAgo} days active</Text>
      </View>
    </View>
  </View>
);

const XPBar: React.FC<{ current: number; max: number; level: number }> = ({ current, max, level }) => {
  const animVal = useRef(new Animated.Value(0)).current;
  const progress = current / max;

  useEffect(() => {
    Animated.timing(animVal, {
      toValue: progress,
      duration: 1200,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  const barWidth = animVal.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View
      style={{
        backgroundColor: '#1C1C28',
        borderRadius: 16,
        padding: 16,
        marginHorizontal: 16,
        marginBottom: 16,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
        <View>
          <Text style={{ color: '#A8A8C0', fontSize: 12, fontWeight: '600', letterSpacing: 1 }}>NIVEAU VIVE</Text>
          <Text style={{ color: '#E8E8F0', fontSize: 22, fontWeight: '800', marginTop: 2 }}>Level {level}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ color: '#3D8BFF', fontSize: 15, fontWeight: '700' }}>{current.toLocaleString()} XP</Text>
          <Text style={{ color: '#A8A8C0', fontSize: 12, marginTop: 2 }}>/ {max.toLocaleString()} XP</Text>
        </View>
      </View>
      {/* Track */}
      <View style={{ height: 10, backgroundColor: '#111118', borderRadius: 5, overflow: 'hidden' }}>
        <Animated.View
          style={[
            {
              height: '100%',
              borderRadius: 5,
              backgroundColor: '#3D8BFF',
            },
            { width: barWidth },
          ]}
        />
      </View>
      <Text style={{ color: '#A8A8C0', fontSize: 11, marginTop: 6, textAlign: 'right' }}>
        {Math.round(progress * 100)}% to Level {level + 1}
      </Text>
    </View>
  );
};

const TrendIndicator: React.FC<{ trend: StatCard['trend']; value: string; color: string }> = ({ trend, value, color }) => {
  const arrow = trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→';
  const trendColor = trend === 'up' ? '#27AE60' : trend === 'down' ? '#E74C3C' : '#A8A8C0';
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
      <Text style={{ color: trendColor, fontSize: 12, fontWeight: '700' }}>{arrow} {value}</Text>
      <Text style={{ color: '#A8A8C0', fontSize: 10, marginLeft: 2 }}>vs last week</Text>
    </View>
  );
};

const StatsGrid: React.FC = () => (
  <View style={{ marginHorizontal: 16, marginBottom: 16 }}>
    <Text style={{ color: '#A8A8C0', fontSize: 12, fontWeight: '600', letterSpacing: 1, marginBottom: 12 }}>WEEKLY STATS</Text>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
      {STATS.map((stat) => (
        <View
          key={stat.id}
          style={{
            flex: 1,
            minWidth: (SCREEN_WIDTH - 52) / 2,
            maxWidth: (SCREEN_WIDTH - 52) / 2,
            backgroundColor: '#1C1C28',
            borderRadius: 14,
            padding: 14,
            borderWidth: 1,
            borderColor: '#2A2A3A',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 22 }}>{stat.icon}</Text>
            <View
              style={{
                backgroundColor: stat.color + '22',
                borderRadius: 8,
                paddingHorizontal: 8,
                paddingVertical: 3,
              }}
            >
              <Text style={{ color: stat.color, fontSize: 11, fontWeight: '700' }}>{stat.value}{stat.unit}</Text>
            </View>
          </View>
          <Text style={{ color: '#E8E8F0', fontSize: 15, fontWeight: '700', marginTop: 8 }}>{stat.label}</Text>
          <TrendIndicator trend={stat.trend} value={stat.trendValue} color={stat.color} />
        </View>
      ))}
    </View>
  </View>
);

const StreaksSection: React.FC = () => (
  <View
    style={{
      backgroundColor: '#1C1C28',
      borderRadius: 16,
      marginHorizontal: 16,
      marginBottom: 16,
      padding: 16,
    }}
  >
    <Text style={{ color: '#A8A8C0', fontSize: 12, fontWeight: '600', letterSpacing: 1, marginBottom: 12 }}>STREAKS</Text>
    <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: 16 }}>
      <View style={{ alignItems: 'center' }}>
        <Text style={{ fontSize: 28 }}>🔥</Text>
        <Text style={{ color: '#E8E8F0', fontSize: 22, fontWeight: '800' }}>{USER.currentStreak}</Text>
        <Text style={{ color: '#A8A8C0', fontSize: 12 }}>Current Streak</Text>
      </View>
      <View style={{ width: 1, backgroundColor: '#2A2A3A' }} />
      <View style={{ alignItems: 'center' }}>
        <Text style={{ fontSize: 28 }}>🏆</Text>
        <Text style={{ color: '#E8E8F0', fontSize: 22, fontWeight: '800' }}>{USER.bestStreak}</Text>
        <Text style={{ color: '#A8A8C0', fontSize: 12 }}>Best Streak</Text>
      </View>
    </View>
    {/* Calendar dots */}
    <Text style={{ color: '#A8A8C0', fontSize: 11, marginBottom: 8 }}>Last 21 days</Text>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
      {STREAK_DAYS.map((day, index) => (
        <View
          key={day.date}
          style={{
            width: 12,
            height: 12,
            borderRadius: 6,
            backgroundColor: day.completed ? '#3D8BFF' : '#111118',
            borderWidth: 1,
            borderColor: day.completed ? '#3D8BFF' : '#2A2A3A',
          }}
        />
      ))}
    </View>
    <View style={{ flexDirection: 'row', marginTop: 8, gap: 12, alignItems: 'center' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#3D8BFF' }} />
        <Text style={{ color: '#A8A8C0', fontSize: 10 }}>Completed</Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#111118', borderWidth: 1, borderColor: '#2A2A3A' }} />
        <Text style={{ color: '#A8A8C0', fontSize: 10 }}>Missed</Text>
      </View>
    </View>
  </View>
);

// ─── Main Screen ─────────────────────────────────────────────────────────────

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ navigation }) => {
  return (
    <View style={{ flex: 1, backgroundColor: '#080810' }}>
      <StatusBar barStyle="light-content" backgroundColor="#080810" />
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 16,
            paddingTop: 8,
            paddingBottom: 4,
          }}
        >
          <Text style={{ color: '#E8E8F0', fontSize: 24, fontWeight: '800' }}>Profile</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('Settings')}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: '#1C1C28',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 18 }}>⚙️</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 32 }}
        >
          <AvatarSection level={USER.level} />
          <XPBar current={USER.currentXP} max={USER.xpToNextLevel} level={USER.level} />
          <StatsGrid />
          <StreaksSection />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

export default ProfileScreen;
