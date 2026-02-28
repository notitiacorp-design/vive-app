import React, { useState, useCallback } from 'react';
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
  Dimensions,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@supabase/supabase-js';
import SleepScore from './SleepScore';
import MissionCard from './MissionCard';
import CheckInModal from './CheckInModal';

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? ''
);

const { width } = Dimensions.get('window');

type Mission = {
  id: string;
  title: string;
  category: string;
  xpReward: number;
  status: 'todo' | 'in_progress' | 'done';
  description: string;
};

type DashboardData = {
  sleepScore: number;
  trend: 'up' | 'down' | 'stable';
  bottleneck: string;
  missions: Mission[];
  weeklyScores: number[];
};

const WEEK_DAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Bonjour';
  if (hour >= 12 && hour < 18) return 'Bon après-midi';
  if (hour >= 18 && hour < 22) return 'Bonne soirée';
  return 'Bonne nuit';
}

async function fetchDashboardData(): Promise<DashboardData> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const [sleepRes, missionsRes] = await Promise.all([
    supabase
      .from('sleep_records')
      .select('score, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(7),
    supabase
      .from('missions')
      .select('*')
      .eq('user_id', user.id)
      .in('status', ['todo', 'in_progress'])
      .limit(3),
  ]);

  const sleepRecords = sleepRes.data ?? [];
  const latestScore = sleepRecords[0]?.score ?? 72;
  const prevScore = sleepRecords[1]?.score ?? 68;
  const trend: 'up' | 'down' | 'stable' =
    latestScore > prevScore ? 'up' : latestScore < prevScore ? 'down' : 'stable';

  const weeklyScores = Array.from({ length: 7 }, (_, i) =>
    sleepRecords[6 - i]?.score ?? Math.floor(55 + Math.random() * 30)
  );

  const missions: Mission[] = (missionsRes.data ?? []).length > 0
    ? missionsRes.data!.map((m: any) => ({
        id: m.id,
        title: m.title,
        category: m.category,
        xpReward: m.xp_reward,
        status: m.status,
        description: m.description,
      }))
    : [
        { id: '1', title: 'Méditation matinale', category: 'mindfulness', xpReward: 50, status: 'todo', description: '10 min de pleine conscience pour démarrer' },
        { id: '2', title: 'Coucher avant 23h', category: 'sleep', xpReward: 75, status: 'in_progress', description: 'Respecter votre heure de coucher cible' },
        { id: '3', title: 'Marche 30 minutes', category: 'movement', xpReward: 60, status: 'todo', description: 'Activité légère en plein air recommandée' },
      ];

  return {
    sleepScore: latestScore,
    trend,
    bottleneck: 'Votre latence d'endormissement est 2× plus longue que la normale. Essayez la technique 4-7-8.',
    missions,
    weeklyScores,
  };
}

const MiniBarChart: React.FC<{ scores: number[] }> = ({ scores }) => {
  const maxScore = Math.max(...scores, 1);
  const barWidth = (width - 64 - (scores.length - 1) * 8) / scores.length;

  return (
    <View className="flex-row items-end" style={{ height: 60, gap: 8 }}>
      {scores.map((score, index) => {
        const barHeight = Math.max((score / maxScore) * 56, 4);
        const isToday = index === scores.length - 1;
        return (
          <View key={index} className="items-center" style={{ flex: 1 }}>
            <View
              style={[
                {
                  height: barHeight,
                  width: barWidth,
                  borderRadius: 4,
                  backgroundColor: isToday ? '#3D8BFF' : '#1C1C28',
                  borderWidth: isToday ? 0 : 1,
                  borderColor: '#2A2A3C',
                },
              ]}
            />
            <Text
              style={{ color: isToday ? '#E8E8F0' : '#A8A8C0', fontSize: 10, marginTop: 4 }}
            >
              {WEEK_DAYS[index]}
            </Text>
          </View>
        );
      })}
    </View>
  );
};

const DashboardScreen: React.FC = () => {
  const [checkInVisible, setCheckInVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, refetch } = useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: fetchDashboardData,
    staleTime: 1000 * 60 * 5,
  });

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleCheckInSubmit = useCallback(
    async (values: { energy: number; sleep: number; stress: number }) => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        await supabase.from('check_ins').insert({
          user_id: user.id,
          energy: values.energy,
          sleep_quality: values.sleep,
          stress: values.stress,
          created_at: new Date().toISOString(),
        });
        setCheckInVisible(false);
        refetch();
      } catch (err) {
        console.error('Check-in error:', err);
      }
    },
    [refetch]
  );

  const greeting = getGreeting();

  const skeleton = isLoading || !data;

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#080810" />
      <ScrollView
        style={{ flex: 1, backgroundColor: '#080810' }}
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#3D8BFF"
          />
        }
      >
        {/* Header */}
        <View
          style={{
            paddingHorizontal: 24,
            paddingTop: 60,
            paddingBottom: 24,
            backgroundColor: '#080810',
          }}
        >
          <Text style={{ color: '#A8A8C0', fontSize: 14, letterSpacing: 0.5 }}>
            {greeting} 👋
          </Text>
          <Text
            style={{
              color: '#E8E8F0',
              fontSize: 26,
              fontWeight: '700',
              marginTop: 4,
              letterSpacing: -0.5,
            }}
          >
            Tableau de bord
          </Text>
        </View>

        {/* Sleep Score Card */}
        <View style={{ paddingHorizontal: 24, marginBottom: 16 }}>
          <View
            style={{
              backgroundColor: '#111118',
              borderRadius: 20,
              padding: 24,
              alignItems: 'center',
              borderWidth: 1,
              borderColor: '#1C1C28',
            }}
          >
            <Text
              style={{
                color: '#A8A8C0',
                fontSize: 12,
                letterSpacing: 1.5,
                textTransform: 'uppercase',
                marginBottom: 16,
              }}
            >
              Score Sommeil
            </Text>
            {skeleton ? (
              <View
                style={{
                  width: 160,
                  height: 160,
                  borderRadius: 80,
                  backgroundColor: '#1C1C28',
                }}
              />
            ) : (
              <SleepScore
                score={data.sleepScore}
                trend={data.trend}
                size={160}
              />
            )}
          </View>
        </View>

        {/* Bottleneck Card */}
        <View style={{ paddingHorizontal: 24, marginBottom: 16 }}>
          <View
            style={{
              backgroundColor: '#111118',
              borderRadius: 16,
              padding: 20,
              borderWidth: 1,
              borderColor: '#1C1C28',
              borderLeftWidth: 3,
              borderLeftColor: '#3D8BFF',
            }}
          >
            <View className="flex-row items-center" style={{ marginBottom: 8 }}>
              <Text style={{ fontSize: 16 }}>⚡</Text>
              <Text
                style={{
                  color: '#3D8BFF',
                  fontSize: 12,
                  fontWeight: '600',
                  letterSpacing: 1,
                  textTransform: 'uppercase',
                  marginLeft: 8,
                }}
              >
                Goulot d'étranglement
              </Text>
            </View>
            <Text
              style={{
                color: '#E8E8F0',
                fontSize: 14,
                lineHeight: 22,
              }}
            >
              {skeleton
                ? 'Chargement de votre analyse...'
                : data.bottleneck}
            </Text>
          </View>
        </View>

        {/* Weekly Chart */}
        <View style={{ paddingHorizontal: 24, marginBottom: 16 }}>
          <View
            style={{
              backgroundColor: '#111118',
              borderRadius: 16,
              padding: 20,
              borderWidth: 1,
              borderColor: '#1C1C28',
            }}
          >
            <Text
              style={{
                color: '#A8A8C0',
                fontSize: 12,
                letterSpacing: 1.5,
                textTransform: 'uppercase',
                marginBottom: 16,
              }}
            >
              7 Derniers Jours
            </Text>
            {skeleton ? (
              <View style={{ height: 76, backgroundColor: '#1C1C28', borderRadius: 8 }} />
            ) : (
              <MiniBarChart scores={data.weeklyScores} />
            )}
          </View>
        </View>

        {/* Missions */}
        <View style={{ paddingHorizontal: 24, marginBottom: 16 }}>
          <View className="flex-row items-center justify-between" style={{ marginBottom: 16 }}>
            <Text
              style={{
                color: '#E8E8F0',
                fontSize: 18,
                fontWeight: '700',
              }}
            >
              Mes Missions
            </Text>
            <TouchableOpacity>
              <Text style={{ color: '#3D8BFF', fontSize: 14 }}>Voir tout</Text>
            </TouchableOpacity>
          </View>

          {skeleton
            ? Array.from({ length: 3 }).map((_, i) => (
                <View
                  key={i}
                  style={{
                    backgroundColor: '#1C1C28',
                    borderRadius: 16,
                    height: 88,
                    marginBottom: 12,
                  }}
                />
              ))
            : data.missions.map((mission) => (
                <MissionCard
                  key={mission.id}
                  mission={mission}
                  onPress={() => console.log('Mission pressed:', mission.id)}
                />
              ))}
        </View>

        {/* Check-in CTA */}
        <View style={{ paddingHorizontal: 24, marginTop: 8 }}>
          <TouchableOpacity
            onPress={() => setCheckInVisible(true)}
            style={{
              backgroundColor: '#3D8BFF',
              borderRadius: 16,
              paddingVertical: 18,
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'center',
              shadowColor: '#3D8BFF',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.35,
              shadowRadius: 16,
              elevation: 8,
            }}
            activeOpacity={0.85}
          >
            <Text style={{ fontSize: 18, marginRight: 10 }}>✨</Text>
            <Text
              style={{
                color: '#FFFFFF',
                fontSize: 16,
                fontWeight: '700',
                letterSpacing: 0.3,
              }}
            >
              Check-in rapide
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <CheckInModal
        visible={checkInVisible}
        onClose={() => setCheckInVisible(false)}
        onSubmit={handleCheckInSubmit}
      />
    </>
  );
};

export default DashboardScreen;
