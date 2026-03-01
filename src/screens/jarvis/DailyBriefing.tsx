import React, { useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Animated,
  StyleSheet,
  Dimensions,
  DimensionValue,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useAppStore } from '../../stores/appStore';
import type { NightScore, Recommendation, DailyMission, BriefingData } from './types';

// âââ ThÃ¨me âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

const Theme = {
  background: '#080810',
  card: '#111118',
  cardBorder: '#1C1C28',
  surface: '#1C1C28',
  primary: '#3D8BFF',
  textPrimary: '#E8E8F0',
  textSecondary: '#A8A8C0',
  white: '#FFFFFF',
  scoreHigh: '#34D399',
  scoreMid: '#3D8BFF',
  scoreWarn: '#FBBF24',
  scoreLow: '#F87171',
  impactMedium: '#FBBF24',
  impactLow: '#A8A8C0',
} as const;

// âââ Mock API âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

async function fetchDailyBriefing(): Promise<BriefingData> {
  await new Promise((res) => setTimeout(res, 600));
  return {
    nightScore: {
      score: 78,
      deepSleepMinutes: 92,
      remMinutes: 74,
      awakenings: 3,
      hrv: 54,
    },
    topRecommendation: {
      id: 'rec-1',
      icon: 'ð',
      title: 'DÃ©caler votre coucher de 30 min',
      description:
        'Vos donnÃ©es indiquent que dormir Ã  22h30 plutÃ´t que 23h00 augmenterait votre score de sommeil de ~12 points.',
      category: 'sommeil',
      impact: 'high',
    },
    missions: [
      {
        id: 'mission-1',
        title: 'Marche matinale',
        description: '20 min de marche au soleil avant 10h',
        xpReward: 150,
        estimatedMinutes: 20,
        type: 'movement',
      },
      {
        id: 'mission-2',
        title: 'Hydratation ciblÃ©e',
        description: 'Boire 500ml dÃ¨s le rÃ©veil',
        xpReward: 80,
        estimatedMinutes: 2,
        type: 'nutrition',
      },
      {
        id: 'mission-3',
        title: 'CohÃ©rence cardiaque',
        description: 'Session de 5 min â 5-5-5 respiration',
        xpReward: 100,
        estimatedMinutes: 5,
        type: 'mindfulness',
      },
    ],
    date: new Date(),
  };
}

// âââ Helpers ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

const { width: SCREEN_WIDTH } = Dimensions.get('window');
void SCREEN_WIDTH;

function getGreeting(firstName: string): string {
  const hour = new Date().getHours();
  if (hour < 12) return `Bonjour, ${firstName} âï¸`;
  if (hour < 18) return `Bon aprÃ¨s-midi, ${firstName} ð¤`;
  return `Bonsoir, ${firstName} ð`;
}

function getScoreColor(score: number): string {
  if (score >= 85) return Theme.scoreHigh;
  if (score >= 65) return Theme.scoreMid;
  if (score >= 45) return Theme.scoreWarn;
  return Theme.scoreLow;
}

function getScoreLabel(score: number): string {
  if (score >= 85) return 'Excellent â¨';
  if (score >= 65) return 'Bon ð';
  if (score >= 45) return 'Moyen ð';
  return 'Ã amÃ©liorer ðª';
}

function getMissionIcon(type: DailyMission['type']): string {
  const icons: Record<DailyMission['type'], string> = {
    movement: 'ð',
    nutrition: 'ð¥',
    recovery: 'ð´',
    mindfulness: 'ð§',
  };
  return icons[type];
}

function getImpactBadge(impact: Recommendation['impact']): { label: string; color: string } {
  if (impact === 'high') return { label: 'ð¥ Impact Ã©levÃ©', color: Theme.scoreHigh };
  if (impact === 'medium') return { label: 'â¡ Impact moyen', color: Theme.impactMedium };
  return { label: 'ð§ Impact faible', color: Theme.impactLow };
}

// âââ NightScoreCard âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

interface NightScoreCardProps {
  score: NightScore;
}

const NightScoreCard = React.memo(function NightScoreCard({ score }: NightScoreCardProps) {
  const scoreColor = getScoreColor(score.score);
  const scoreLabel = getScoreLabel(score.score);

  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.timing(progressAnim, {
      toValue: score.score / 100,
      duration: 900,
      delay: 400,
      useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [progressAnim, score.score]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const stats = [
    { label: 'Sommeil profond', value: `${score.deepSleepMinutes}m`, icon: 'ðµ' },
    { label: 'Sommeil REM', value: `${score.remMinutes}m`, icon: 'ð£' },
    { label: 'RÃ©veils', value: `${score.awakenings}`, icon: 'â¡' },
    { label: 'VFC', value: `${score.hrv}ms`, icon: 'â¤ï¸' },
  ];

  return (
    <View style={styles.card}>
      <Text style={styles.cardLabel}>Score nuit</Text>
      <View style={styles.scoreRow}>
        <Text style={[styles.scoreNumber, { color: scoreColor }]}>{score.score}</Text>
        <View style={styles.scoreRightCol}>
          <Text style={[styles.scoreLabel, { color: scoreColor }]}>{scoreLabel}</Text>
          <Text style={styles.scoreMax}>/100</Text>
        </View>
      </View>

      <View style={styles.progressTrack}>
        <Animated.View
          style={[
            styles.progressFill,
            { width: progressWidth as unknown as DimensionValue, backgroundColor: scoreColor },
          ]}
        />
      </View>

      <View style={styles.statsGrid}>
        {stats.map((stat) => (
          <View key={stat.label} style={styles.statItem}>
            <Text style={styles.statIcon}>{stat.icon}</Text>
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
});

// âââ RecommendationCard âââââââââââââââââââââââââââââââââââââââââââââââââââââââ

interface RecommendationCardProps {
  recommendation: Recommendation;
}

const RecommendationCard = React.memo(function RecommendationCard({
  recommendation,
}: RecommendationCardProps) {
  const badge = getImpactBadge(recommendation.impact);

  return (
    <View style={styles.recCard}>
      <View style={styles.recHeader}>
        <View style={styles.recBadgeRow}>
          <View style={styles.recNumBadge}>
            <Text style={styles.recNum}>#1</Text>
          </View>
          <View style={[styles.impactBadge, { borderColor: badge.color }]}>
            <Text style={[styles.impactText, { color: badge.color }]}>{badge.label}</Text>
          </View>
        </View>
        <Text style={styles.recIcon}>{recommendation.icon}</Text>
      </View>
      <Text style={styles.recTitle}>{recommendation.title}</Text>
      <Text style={styles.recDescription}>{recommendation.description}</Text>
    </View>
  );
});

// âââ MissionRow âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

interface MissionRowProps {
  mission: DailyMission;
}

const MissionRow = React.memo(function MissionRow({ mission }: MissionRowProps) {
  return (
    <View style={styles.missionRow}>
      <View style={styles.missionIconWrap}>
        <Text style={styles.missionIcon}>{getMissionIcon(mission.type)}</Text>
      </View>
      <View style={styles.missionText}>
        <Text style={styles.missionTitle}>{mission.title}</Text>
        <Text style={styles.missionDesc}>{mission.description}</Text>
      </View>
      <View style={styles.missionMeta}>
        <Text style={styles.missionXp}>+{mission.xpReward} XP</Text>
        <Text style={styles.missionTime}>{mission.estimatedMinutes}m</Text>
      </View>
    </View>
  );
});

// âââ Skeleton âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

const SkeletonBlock = React.memo(function SkeletonBlock({
  height,
  width = '100%',
  borderRadius = 10,
  marginBottom = 0,
}: {
  height: number;
  width?: DimensionValue;
  borderRadius?: number;
  marginBottom?: number;
}) {
  const anim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.4, duration: 800, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [anim]);

  return (
    <Animated.View
      style={{
        height,
        width,
        borderRadius,
        backgroundColor: Theme.surface,
        opacity: anim,
        marginBottom,
      }}
    />
  );
});

const BriefingSkeleton = React.memo(function BriefingSkeleton() {
  return (
    <View style={styles.skeletonWrap}>
      <SkeletonBlock height={22} width="50%" marginBottom={8} />
      <SkeletonBlock height={14} width="30%" marginBottom={28} />
      <SkeletonBlock height={180} marginBottom={16} />
      <SkeletonBlock height={140} marginBottom={16} />
      <SkeletonBlock height={120} marginBottom={24} />
      <SkeletonBlock height={52} borderRadius={26} />
    </View>
  );
});

// âââ MissionsList âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

interface MissionsListProps {
  missions: DailyMission[];
}

const MissionsList = React.memo(function MissionsList({ missions }: MissionsListProps) {
  const renderItem = useCallback(
    ({ item, index }: { item: DailyMission; index: number }) => (
      <>
        <MissionRow mission={item} />
        {index < missions.length - 1 && <View style={styles.missionDivider} />}
      </>
    ),
    [missions.length]
  );

  const keyExtractor = useCallback((item: DailyMission) => item.id, []);

  return (
    <FlatList
      data={missions}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      scrollEnabled={false}
      style={styles.missionsCard}
      contentContainerStyle={styles.missionsCardContent}
    />
  );
});

// âââ Main Screen ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

interface DailyBriefingProps {
  onStart?: () => void;
}

export default function DailyBriefing({ onStart }: DailyBriefingProps) {
  const user = useAppStore((s) => s.user);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  const { data: briefing, isLoading, isError } = useQuery({
    queryKey: ['dailyBriefing', user?.id],
    queryFn: fetchDailyBriefing,
    staleTime: 1000 * 60 * 10,
  });

  useEffect(() => {
    if (!isLoading) {
      const animation = Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]);
      animation.start();
      return () => animation.stop();
    }
    return undefined;
  }, [isLoading, fadeAnim, slideAnim]);

  const handleStart = useCallback(() => {
    onStart?.();
  }, [onStart]);

  const dateString = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const greeting = getGreeting(user?.firstName ?? 'vous');

  const renderHeader = useCallback(
    () => (
      <View style={styles.greetingSection}>
        <Text style={styles.greeting}>{greeting}</Text>
        <Text style={styles.dateText}>{dateString}</Text>
      </View>
    ),
    [greeting, dateString]
  );

  const renderContent = useCallback(() => {
    if (isLoading) return <BriefingSkeleton />;
    if (isError) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorEmoji}>â ï¸</Text>
          <Text style={styles.errorText}>Impossible de charger votre bilan.</Text>
          <Text style={styles.errorSub}>VÃ©rifiez votre connexion et rÃ©essayez.</Text>
        </View>
      );
    }
    if (!briefing) return null;
    return (
      <Animated.View
        style={[
          styles.contentWrap,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
      >
        <NightScoreCard score={briefing.nightScore} />

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>ð¡ Recommandation du jour</Text>
        </View>
        <RecommendationCard recommendation={briefing.topRecommendation} />

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>ð¯ Missions du jour</Text>
          <View style={styles.missionCountBadge}>
            <Text style={styles.missionCountText}>{briefing.missions.length}</Text>
          </View>
        </View>

        <MissionsList missions={briefing.missions} />

        <TouchableOpacity
          style={styles.ctaButton}
          onPress={handleStart}
          activeOpacity={0.85}
        >
          <Text style={styles.ctaText}>Commencer la journÃ©e</Text>
          <Text style={styles.ctaArrow}>â</Text>
        </TouchableOpacity>

        <Text style={styles.footer}>â¨ Bilan gÃ©nÃ©rÃ© par Jarvis Â· VIVE</Text>
      </Animated.View>
    );
  }, [isLoading, isError, briefing, fadeAnim, slideAnim, handleStart]);

  const flatListData = [{ key: 'content' }];

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <FlatList
        data={flatListData}
        keyExtractor={(item) => item.key}
        renderItem={renderContent}
        ListHeaderComponent={renderHeader}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

// âââ Styles âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Theme.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    flexGrow: 1,
  },
  greetingSection: {
    paddingTop: 24,
    paddingBottom: 24,
  },
  greeting: {
    fontSize: 26,
    fontWeight: '700',
    color: Theme.textPrimary,
    letterSpacing: 0.2,
    marginBottom: 4,
  },
  dateText: {
    fontSize: 14,
    color: Theme.textSecondary,
    textTransform: 'capitalize',
    letterSpacing: 0.3,
  },
  contentWrap: {
    flex: 1,
  },
  skeletonWrap: {
    flex: 1,
  },
  card: {
    backgroundColor: Theme.card,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Theme.cardBorder,
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Theme.textSecondary,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 14,
  },
  scoreNumber: {
    fontSize: 72,
    fontWeight: '800',
    lineHeight: 72,
    letterSpacing: -2,
  },
  scoreRightCol: {
    marginLeft: 10,
    marginBottom: 8,
  },
  scoreLabel: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  scoreMax: {
    fontSize: 14,
    color: Theme.textSecondary,
    marginTop: 2,
  },
  progressTrack: {
    height: 4,
    backgroundColor: Theme.cardBorder,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 20,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statIcon: {
    fontSize: 16,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '700',
    color: Theme.textPrimary,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 10,
    color: Theme.textSecondary,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Theme.textPrimary,
    letterSpacing: 0.2,
  },
  missionCountBadge: {
    backgroundColor: Theme.primary,
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  missionCountText: {
    color: Theme.white,
    fontSize: 11,
    fontWeight: '700',
  },
  recCard: {
    backgroundColor: Theme.card,
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Theme.primary,
    shadowColor: Theme.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  recHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  recBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  recNumBadge: {
    backgroundColor: Theme.primary,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  recNum: {
    color: Theme.white,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  impactBadge: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  impactText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  recIcon: {
    fontSize: 28,
  },
  recTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Theme.textPrimary,
    marginBottom: 8,
    lineHeight: 24,
  },
  recDescription: {
    fontSize: 14,
    color: Theme.textSecondary,
    lineHeight: 21,
  },
  missionsCard: {
    backgroundColor: Theme.card,
    borderRadius: 20,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: Theme.cardBorder,
  },
  missionsCardContent: {
    padding: 4,
  },
  missionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  missionIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Theme.surface,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  missionIcon: {
    fontSize: 20,
  },
  missionText: {
    flex: 1,
  },
  missionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Theme.textPrimary,
    marginBottom: 2,
  },
  missionDesc: {
    fontSize: 12,
    color: Theme.textSecondary,
    lineHeight: 17,
  },
  missionMeta: {
    alignItems: 'flex-end',
    flexShrink: 0,
  },
  missionXp: {
    fontSize: 13,
    fontWeight: '700',
    color: Theme.primary,
    marginBottom: 2,
  },
  missionTime: {
    fontSize: 11,
    color: Theme.textSecondary,
  },
  missionDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Theme.cardBorder,
    marginHorizontal: 14,
  },
  ctaButton: {
    backgroundColor: Theme.primary,
    borderRadius: 26,
    paddingVertical: 16,
    paddingHorizontal: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: Theme.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
    marginBottom: 20,
  },
  ctaText: {
    color: Theme.white,
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  ctaArrow: {
    color: Theme.white,
    fontSize: 18,
    fontWeight: '700',
  },
  footer: {
    textAlign: 'center',
    fontSize: 12,
    color: Theme.textSecondary,
    letterSpacing: 0.3,
    opacity: 0.7,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  errorEmoji: {
    fontSize: 40,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 16,
    fontWeight: '600',
    color: Theme.textPrimary,
    marginBottom: 6,
    textAlign: 'center',
  },
  errorSub: {
    fontSize: 13,
    color: Theme.textSecondary,
    textAlign: 'center',
  },
});
