import React, { useState, useCallback, useMemo, memo } from 'react';
import {
  View,
  Text,
  Pressable,
  FlatList,
  RefreshControl,
  StatusBar,
  Dimensions,
  StyleSheet,
  Alert,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import SleepScore from './SleepScore';
import MissionCard from './MissionCard';
import CheckInModal from './CheckInModal';
import type { Mission, SupabaseMission } from '../../types/mission';

// ---------------------------------------------------------------------------
// Constantes de thÃ¨me
// ---------------------------------------------------------------------------
const Theme = {
  background: '#080810',
  surface: '#111118',
  surfaceAlt: '#1C1C28',
  border: '#1C1C28',
  borderAccent: '#2A2A3C',
  primary: '#3D8BFF',
  textPrimary: '#E8E8F0',
  textSecondary: '#A8A8C0',
  white: '#FFFFFF',
} as const;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type DashboardData = {
  sleepScore: number;
  trend: 'up' | 'down' | 'stable';
  bottleneck: string;
  missions: Mission[];
  weeklyScores: number[];
};

type CheckInValues = {
  energy: number;
  sleep: number;
  stress: number;
};

// ---------------------------------------------------------------------------
// Constantes statiques
// ---------------------------------------------------------------------------
const WEEK_DAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'] as const;

const MOCK_MISSIONS: Mission[] = [
  {
    id: '1',
    title: 'MÃ©ditation matinale',
    category: 'mindfulness',
    xpReward: 50,
    status: 'todo',
    description: '10 min de pleine conscience pour dÃ©marrer',
  },
  {
    id: '2',
    title: 'Coucher avant 23h',
    category: 'sleep',
    xpReward: 75,
    status: 'in_progress',
    description: 'Respecter votre heure de coucher cible',
  },
  {
    id: '3',
    title: 'Marche 30 minutes',
    category: 'movement',
    xpReward: 60,
    status: 'todo',
    description: 'ActivitÃ© lÃ©gÃ¨re en plein air recommandÃ©e',
  },
];

const MOCK_WEEKLY_SCORES: number[] = [62, 68, 71, 65, 74, 70, 72];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Bonjour';
  if (hour >= 12 && hour < 18) return 'Bon aprÃ¨s-midi';
  if (hour >= 18 && hour < 22) return 'Bonne soirÃ©e';
  return 'Bonne nuit';
}

// ---------------------------------------------------------------------------
// Fetch
// ---------------------------------------------------------------------------
async function fetchDashboardData(): Promise<DashboardData> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) throw new Error('Non authentifiÃ©');

  const user = authData.user;

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
  const latestScore: number = sleepRecords[0]?.score ?? 72;
  const prevScore: number = sleepRecords[1]?.score ?? 68;
  const trend: 'up' | 'down' | 'stable' =
    latestScore > prevScore ? 'up' : latestScore < prevScore ? 'down' : 'stable';

  const weeklyScores: number[] =
    sleepRecords.length > 0
      ? Array.from({ length: 7 }, (_, i) => sleepRecords[6 - i]?.score ?? 0)
      : MOCK_WEEKLY_SCORES;

  const rawMissions: SupabaseMission[] = missionsRes.data ?? [];
  const missions: Mission[] =
    rawMissions.length > 0
      ? rawMissions.map((m) => ({
          id: m.id,
          title: m.title,
          category: m.category,
          xpReward: m.xp_reward,
          status: m.status,
          description: m.description,
        }))
      : MOCK_MISSIONS;

  return {
    sleepScore: latestScore,
    trend,
    bottleneck:
      "Votre latence d'endormissement est 2Ã plus longue que la normale. Essayez la technique 4-7-8.",
    missions,
    weeklyScores,
  };
}

// ---------------------------------------------------------------------------
// MiniBarChart
// ---------------------------------------------------------------------------
const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface MiniBarChartProps {
  scores: number[];
}

const MiniBarChart: React.FC<MiniBarChartProps> = memo(({ scores }) => {
  const maxScore = useMemo(() => Math.max(...scores, 1), [scores]);
  const barWidth = useMemo(
    () => (SCREEN_WIDTH - 64 - (scores.length - 1) * 8) / scores.length,
    [scores.length],
  );

  const bars = useMemo(
    () =>
      scores.map((score, index) => ({
        score,
        index,
        barHeight: Math.max((score / maxScore) * 56, 4),
        isToday: index === scores.length - 1,
        day: WEEK_DAYS[index],
      })),
    [scores, maxScore],
  );

  return (
    <View style={chartStyles.container}>
      {bars.map(({ index, barHeight, isToday, day }) => (
        <View key={index} style={chartStyles.barWrapper}>
          <View
            style={[
              chartStyles.bar,
              {
                height: barHeight,
                width: barWidth,
                backgroundColor: isToday ? Theme.primary : Theme.surfaceAlt,
                borderWidth: isToday ? 0 : 1,
                borderColor: Theme.borderAccent,
              },
            ]}
          />
          <Text style={[chartStyles.dayLabel, { color: isToday ? Theme.textPrimary : Theme.textSecondary }]}>
            {day}
          </Text>
        </View>
      ))}
    </View>
  );
});

const chartStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 60,
    gap: 8,
  },
  barWrapper: {
    flex: 1,
    alignItems: 'center',
  },
  bar: {
    borderRadius: 4,
  },
  dayLabel: {
    fontSize: 10,
    marginTop: 4,
  },
});

// ---------------------------------------------------------------------------
// Skeletons
// ---------------------------------------------------------------------------
const SkeletonCircle = memo(() => <View style={styles.skeletonCircle} />);
const SkeletonRect = memo(() => <View style={styles.skeletonRect} />);
const SkeletonMission = memo(({ index }: { index: number }) => (
  <View key={index} style={styles.skeletonMission} />
));

// ---------------------------------------------------------------------------
// DashboardScreen
// ---------------------------------------------------------------------------
const DashboardScreen: React.FC = () => {
  const [checkInVisible, setCheckInVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: fetchDashboardData,
    staleTime: 1000 * 60 * 5,
  });

  const checkInMutation = useMutation({
    mutationFn: async (values: CheckInValues) => {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) throw new Error('Non authentifiÃ©');
      const { error } = await supabase.from('check_ins').insert({
        user_id: authData.user.id,
        energy: values.energy,
        sleep_quality: values.sleep,
        stress: values.stress,
        created_at: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setCheckInVisible(false);
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: () => {
      Alert.alert('Erreur', "Impossible d'enregistrer le check-in");
    },
  });

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleCheckInSubmit = useCallback(
    (values: CheckInValues) => {
      checkInMutation.mutate(values);
    },
    [checkInMutation],
  );

  const handleOpenCheckIn = useCallback(() => setCheckInVisible(true), []);
  const handleCloseCheckIn = useCallback(() => setCheckInVisible(false), []);

  const greeting = useMemo(() => getGreeting(), []);
  const isSkeleton = isLoading || !data;

  // Sections pour FlatList
  type Section =
    | { key: 'header' }
    | { key: 'sleepScore' }
    | { key: 'bottleneck' }
    | { key: 'weeklyChart' }
    | { key: 'missionsHeader' }
    | { key: 'mission'; mission: Mission }
    | { key: 'missionSkeleton'; index: number }
    | { key: 'checkinCta' };

  const sections = useMemo<Section[]>(() => {
    const items: Section[] = [
      { key: 'header' },
      { key: 'sleepScore' },
      { key: 'bottleneck' },
      { key: 'weeklyChart' },
      { key: 'missionsHeader' },
    ];
    if (isSkeleton) {
      items.push(
        { key: 'missionSkeleton', index: 0 },
        { key: 'missionSkeleton', index: 1 },
        { key: 'missionSkeleton', index: 2 },
      );
    } else {
      data.missions.forEach((mission) => items.push({ key: 'mission', mission }));
    }
    items.push({ key: 'checkinCta' });
    return items;
  }, [isSkeleton, data]);

  const renderItem = useCallback(
    ({ item }: { item: Section }) => {
      switch (item.key) {
        case 'header':
          return (
            <View style={styles.header}>
              <Text style={styles.greeting}>{greeting} ð</Text>
              <Text style={styles.title}>Tableau de bord</Text>
            </View>
          );

        case 'sleepScore':
          return (
            <View style={styles.sectionPadding}>
              <View style={[styles.card, styles.cardCenter]}>
                <Text style={styles.cardLabel}>Score Sommeil</Text>
                {isSkeleton ? <SkeletonCircle /> : <SleepScore score={data!.sleepScore} trend={data!.trend} size={160} />}
              </View>
            </View>
          );

        case 'bottleneck':
          return (
            <View style={styles.sectionPadding}>
              <View style={[styles.card, styles.bottleneckCard]}>
                <View style={styles.bottleneckRow}>
                  <Text style={styles.bottleneckIcon}>â¡</Text>
                  <Text style={styles.bottleneckTitle}>Goulot d'Ã©tranglement</Text>
                </View>
                <Text style={styles.bottleneckText}>
                  {isSkeleton ? 'Chargement de votre analyse...' : data!.bottleneck}
                </Text>
              </View>
            </View>
          );

        case 'weeklyChart':
          return (
            <View style={styles.sectionPadding}>
              <View style={styles.card}>
                <Text style={styles.cardLabel}>7 Derniers Jours</Text>
                {isSkeleton ? <SkeletonRect /> : <MiniBarChart scores={data!.weeklyScores} />}
              </View>
            </View>
          );

        case 'missionsHeader':
          return (
            <View style={[styles.sectionPadding, styles.missionsHeader]}>
              <Text style={styles.missionsTitle}>Mes Missions</Text>
              <Pressable disabled>
                <Text style={styles.seeAllLabel}>Voir tout</Text>
              </Pressable>
            </View>
          );

        case 'mission':
          return (
            <View style={styles.missionItem}>
              <MissionCard mission={item.mission} onPress={undefined} />
            </View>
          );

        case 'missionSkeleton':
          return (
            <View style={styles.missionItem}>
              <SkeletonMission index={item.index} />
            </View>
          );

        case 'checkinCta':
          return (
            <View style={styles.ctaWrapper}>
              <Pressable
                onPress={handleOpenCheckIn}
                style={({ pressed }) => [styles.ctaButton, pressed && styles.ctaButtonPressed]}
              >
                <Text style={styles.ctaEmoji}>â¨</Text>
                <Text style={styles.ctaLabel}>Check-in rapide</Text>
              </Pressable>
            </View>
          );

        default:
          return null;
      }
    },
    [isSkeleton, data, greeting, handleOpenCheckIn],
  );

  const keyExtractor = useCallback((item: Section, index: number) => {
    if (item.key === 'mission') return `mission-${item.mission.id}`;
    if (item.key === 'missionSkeleton') return `skeleton-${item.index}`;
    return `${item.key}-${index}`;
  }, []);

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor={Theme.background} />
      <FlatList
        data={sections}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Theme.primary}
          />
        }
      />
      <CheckInModal
        visible={checkInVisible}
        onClose={handleCloseCheckIn}
        onSubmit={handleCheckInSubmit}
      />
    </>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  list: {
    flex: 1,
    backgroundColor: Theme.background,
  },
  listContent: {
    paddingBottom: 40,
  },
  // Header
  header: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 24,
    backgroundColor: Theme.background,
  },
  greeting: {
    color: Theme.textSecondary,
    fontSize: 14,
    letterSpacing: 0.5,
  },
  title: {
    color: Theme.textPrimary,
    fontSize: 26,
    fontWeight: '700',
    marginTop: 4,
    letterSpacing: -0.5,
  },
  // Sections
  sectionPadding: {
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  // Cards
  card: {
    backgroundColor: Theme.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Theme.border,
  },
  cardCenter: {
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  cardLabel: {
    color: Theme.textSecondary,
    fontSize: 12,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 16,
  },
  // Bottleneck
  bottleneckCard: {
    borderLeftWidth: 3,
    borderLeftColor: Theme.primary,
  },
  bottleneckRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  bottleneckIcon: {
    fontSize: 16,
  },
  bottleneckTitle: {
    color: Theme.primary,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginLeft: 8,
  },
  bottleneckText: {
    color: Theme.textPrimary,
    fontSize: 14,
    lineHeight: 22,
  },
  // Missions
  missionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 0,
  },
  missionsTitle: {
    color: Theme.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  seeAllLabel: {
    color: Theme.primary,
    fontSize: 14,
    opacity: 0.5,
  },
  missionItem: {
    paddingHorizontal: 24,
    marginTop: 12,
  },
  // Skeletons
  skeletonCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: Theme.surfaceAlt,
  },
  skeletonRect: {
    height: 76,
    backgroundColor: Theme.surfaceAlt,
    borderRadius: 8,
  },
  skeletonMission: {
    backgroundColor: Theme.surfaceAlt,
    borderRadius: 16,
    height: 88,
  },
  // CTA
  ctaWrapper: {
    paddingHorizontal: 24,
    marginTop: 20,
  },
  ctaButton: {
    backgroundColor: Theme.primary,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    shadowColor: Theme.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  ctaButtonPressed: {
    opacity: 0.85,
  },
  ctaEmoji: {
    fontSize: 18,
    marginRight: 10,
  },
  ctaLabel: {
    color: Theme.white,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});

export default memo(DashboardScreen);
