import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  Animated,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  StyleSheet,
  ListRenderItemInfo,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// âââ ThÃ¨me ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

const Theme = {
  colors: {
    background: '#080810',
    surface: '#1C1C28',
    surfaceDeep: '#111118',
    border: '#2A2A3A',
    textPrimary: '#E8E8F0',
    textSecondary: '#A8A8C0',
    textWhite: '#FFFFFF',
    accent: '#3D8BFF',
    accentPurple: '#6B4FBB',
    accentOrange: '#F5A623',
    accentGreen: '#27AE60',
    accentRed: '#E74C3C',
    levelBadgeBorder: '#080810',
  },
  spacing: {
    xs: 2,
    sm: 4,
    md: 8,
    base: 10,
    lg: 12,
    xl: 14,
    xxl: 16,
    xxxl: 24,
    huge: 32,
  },
  radius: {
    sm: 6,
    md: 8,
    lg: 12,
    xl: 14,
    xxl: 16,
    avatar: 50,
    glow: 56,
    pill: 20,
  },
  font: {
    tiny: 10,
    xs: 11,
    sm: 12,
    base: 13,
    md: 15,
    lg: 18,
    xl: 20,
    xxl: 22,
    xxxl: 24,
    huge: 28,
    avatar: 44,
  },
};

// âââ Types ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

type ProfileScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

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

// âââ DonnÃ©es Mock âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

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
  { id: 'sleep',    label: 'Score Sommeil', value: 84, unit: '/100', icon: 'ð', trend: 'up',      trendValue: '+3',  color: Theme.colors.accentPurple },
  { id: 'energy',   label: 'Ãnergie',       value: 72, unit: '/100', icon: 'â¡', trend: 'up',      trendValue: '+8',  color: Theme.colors.accentOrange },
  { id: 'recovery', label: 'RÃ©cupÃ©ration',  value: 91, unit: '/100', icon: 'ð', trend: 'neutral', trendValue: '0',   color: Theme.colors.accentGreen },
  { id: 'stress',   label: 'Stress',        value: 34, unit: '/100', icon: 'ð§', trend: 'down',    trendValue: '-12', color: Theme.colors.accent },
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

const STREAK_DAYS: StreakDay[] = generateStreakDays();

// âââ StyleSheet âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

const styles = StyleSheet.create({
  // Root
  rootContainer: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  safeArea: {
    flex: 1,
  },
  flatListContent: {
    paddingBottom: Theme.spacing.huge,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Theme.spacing.xxl,
    paddingTop: Theme.spacing.md,
    paddingBottom: Theme.spacing.sm,
  },
  headerTitle: {
    color: Theme.colors.textPrimary,
    fontSize: Theme.font.xxxl,
    fontWeight: '800',
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: Theme.radius.pill,
    backgroundColor: Theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsIcon: {
    fontSize: Theme.font.lg,
  },

  // AvatarSection
  avatarContainer: {
    alignItems: 'center',
    marginTop: Theme.spacing.xxl,
    marginBottom: Theme.spacing.xxxl,
  },
  avatarRelative: {
    position: 'relative',
  },
  avatarGlowRing: {
    width: 112,
    height: 112,
    borderRadius: Theme.radius.glow,
    backgroundColor: '#3D8BFF22',
    position: 'absolute',
    top: -6,
    left: -6,
  },
  avatarCircle: {
    width: 100,
    height: 100,
    borderRadius: Theme.radius.avatar,
    backgroundColor: Theme.colors.surface,
    borderWidth: 2,
    borderColor: Theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEmoji: {
    fontSize: Theme.font.avatar,
  },
  avatarLevelBadge: {
    position: 'absolute',
    bottom: -6,
    right: -6,
    backgroundColor: Theme.colors.accent,
    borderRadius: Theme.radius.md,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: 3,
    borderWidth: 2,
    borderColor: Theme.colors.levelBadgeBorder,
  },
  avatarLevelText: {
    color: Theme.colors.textWhite,
    fontSize: Theme.font.xs,
    fontWeight: '800',
  },
  avatarName: {
    color: Theme.colors.textPrimary,
    fontSize: Theme.font.xl,
    fontWeight: '700',
    marginTop: Theme.spacing.xxl,
  },
  avatarUsername: {
    color: Theme.colors.textSecondary,
    fontSize: Theme.font.base,
    marginTop: Theme.spacing.xs,
  },
  avatarMetaRow: {
    flexDirection: 'row',
    marginTop: Theme.spacing.md,
    gap: Theme.spacing.sm,
    alignItems: 'center',
  },
  avatarMetaBadge: {
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.spacing.md,
    paddingHorizontal: Theme.base,
    paddingVertical: Theme.spacing.sm,
  },
  avatarMetaText: {
    color: Theme.colors.textSecondary,
    fontSize: Theme.font.sm,
  },

  // XPBar
  xpBarContainer: {
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.radius.xxl,
    padding: Theme.spacing.xxl,
    marginHorizontal: Theme.spacing.xxl,
    marginBottom: Theme.spacing.xxl,
  },
  xpBarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Theme.base,
  },
  xpBarLabelSmall: {
    color: Theme.colors.textSecondary,
    fontSize: Theme.font.sm,
    fontWeight: '600',
    letterSpacing: 1,
  },
  xpBarLevelText: {
    color: Theme.colors.textPrimary,
    fontSize: Theme.font.xxl,
    fontWeight: '800',
    marginTop: Theme.spacing.xs,
  },
  xpBarValueText: {
    color: Theme.colors.accent,
    fontSize: Theme.font.md,
    fontWeight: '700',
  },
  xpBarSubText: {
    color: Theme.colors.textSecondary,
    fontSize: Theme.font.sm,
    marginTop: Theme.spacing.xs,
  },
  xpBarTrack: {
    height: 10,
    backgroundColor: Theme.colors.surfaceDeep,
    borderRadius: 5,
    overflow: 'hidden',
  },
  xpBarFill: {
    height: '100%',
    borderRadius: 5,
    backgroundColor: Theme.colors.accent,
  },
  xpBarProgressText: {
    color: Theme.colors.textSecondary,
    fontSize: Theme.font.xs,
    marginTop: Theme.spacing.sm,
    textAlign: 'right',
  },

  // StatsGrid
  statsGridContainer: {
    marginHorizontal: Theme.spacing.xxl,
    marginBottom: Theme.spacing.xxl,
  },
  statsSectionLabel: {
    color: Theme.colors.textSecondary,
    fontSize: Theme.font.sm,
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: Theme.spacing.lg,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Theme.base,
  },
  statCard: {
    flex: 1,
    minWidth: (SCREEN_WIDTH - 52) / 2,
    maxWidth: (SCREEN_WIDTH - 52) / 2,
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.radius.xl,
    padding: Theme.spacing.xl,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  statCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statCardIcon: {
    fontSize: Theme.font.xxl,
  },
  statCardValueBadge: {
    borderRadius: Theme.spacing.md,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: 3,
  },
  statCardValueText: {
    fontSize: Theme.font.xs,
    fontWeight: '700',
  },
  statCardLabel: {
    color: Theme.colors.textPrimary,
    fontSize: Theme.font.md,
    fontWeight: '700',
    marginTop: Theme.spacing.md,
  },

  // TrendIndicator
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Theme.spacing.sm,
  },
  trendValue: {
    fontSize: Theme.font.sm,
    fontWeight: '700',
  },
  trendLabel: {
    color: Theme.colors.textSecondary,
    fontSize: Theme.font.tiny,
    marginLeft: Theme.spacing.xs,
  },

  // StreaksSection
  streaksContainer: {
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.radius.xxl,
    marginHorizontal: Theme.spacing.xxl,
    marginBottom: Theme.spacing.xxl,
    padding: Theme.spacing.xxl,
  },
  streaksSectionLabel: {
    color: Theme.colors.textSecondary,
    fontSize: Theme.font.sm,
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: Theme.spacing.lg,
  },
  streaksRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: Theme.spacing.xxl,
  },
  streakItem: {
    alignItems: 'center',
  },
  streakEmoji: {
    fontSize: Theme.font.huge,
  },
  streakValue: {
    color: Theme.colors.textPrimary,
    fontSize: Theme.font.xxl,
    fontWeight: '800',
  },
  streakLabel: {
    color: Theme.colors.textSecondary,
    fontSize: Theme.font.sm,
  },
  streakDivider: {
    width: 1,
    backgroundColor: Theme.colors.border,
  },
  streakCalendarLabel: {
    color: Theme.colors.textSecondary,
    fontSize: Theme.font.xs,
    marginBottom: Theme.spacing.md,
  },
  streakDotsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Theme.sm,
  },
  streakLegendRow: {
    flexDirection: 'row',
    marginTop: Theme.spacing.md,
    gap: Theme.spacing.lg,
    alignItems: 'center',
  },
  streakLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.sm,
  },
  streakLegendText: {
    color: Theme.colors.textSecondary,
    fontSize: Theme.font.tiny,
  },
  streakDotCompleted: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Theme.colors.accent,
  },
  streakDotMissed: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Theme.colors.surfaceDeep,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
});

// âââ Sous-composants ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

const AvatarSection: React.FC<{ level: number }> = React.memo(({ level }) => (
  <View style={styles.avatarContainer}>
    <View style={styles.avatarRelative}>
      {/* Anneau lumineux */}
      <View style={styles.avatarGlowRing} />
      {/* Cercle avatar */}
      <View style={styles.avatarCircle}>
        <Text style={styles.avatarEmoji}>{'ð§\u200Dð»'}</Text>
      </View>
      {/* Badge niveau */}
      <View style={styles.avatarLevelBadge}>
        <Text style={styles.avatarLevelText}>NVL {level}</Text>
      </View>
    </View>
    <Text style={styles.avatarName}>{USER.name}</Text>
    <Text style={styles.avatarUsername}>{USER.username}</Text>
    <View style={styles.avatarMetaRow}>
      <View style={styles.avatarMetaBadge}>
        <Text style={styles.avatarMetaText}>ð {USER.joinedDaysAgo} jours actifs</Text>
      </View>
    </View>
  </View>
));

AvatarSection.displayName = 'AvatarSection';

const XPBar: React.FC<{ current: number; max: number; level: number }> = React.memo(
  ({ current, max, level }) => {
    const animVal = useRef(new Animated.Value(0)).current;
    const progress = current / max;

    useEffect(() => {
      const animation = Animated.timing(animVal, {
        toValue: progress,
        duration: 1200,
        useNativeDriver: false,
      });
      animation.start();
      return () => {
        animation.stop();
      };
    }, [progress, animVal]);

    const barWidth = animVal.interpolate({
      inputRange: [0, 1],
      outputRange: ['0%', '100%'],
    });

    return (
      <View style={styles.xpBarContainer}>
        <View style={styles.xpBarRow}>
          <View>
            <Text style={styles.xpBarLabelSmall}>NIVEAU VIVE</Text>
            <Text style={styles.xpBarLevelText}>Niveau {level}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.xpBarValueText}>{current.toLocaleString()} XP</Text>
            <Text style={styles.xpBarSubText}>/ {max.toLocaleString()} XP</Text>
          </View>
        </View>
        <View style={styles.xpBarTrack}>
          <Animated.View style={[styles.xpBarFill, { width: barWidth }]} />
        </View>
        <Text style={styles.xpBarProgressText}>
          {Math.round(progress * 100)}% vers le niveau {level + 1}
        </Text>
      </View>
    );
  }
);

XPBar.displayName = 'XPBar';

const TrendIndicator: React.FC<{
  trend: StatCard['trend'];
  value: string;
}> = React.memo(({ trend, value }) => {
  const arrow = trend === 'up' ? 'â' : trend === 'down' ? 'â' : 'â';
  const trendColor =
    trend === 'up'
      ? Theme.colors.accentGreen
      : trend === 'down'
      ? Theme.colors.accentRed
      : Theme.colors.textSecondary;
  return (
    <View style={styles.trendRow}>
      <Text style={[styles.trendValue, { color: trendColor }]}>
        {arrow} {value}
      </Text>
      <Text style={styles.trendLabel}>vs semaine derniÃ¨re</Text>
    </View>
  );
});

TrendIndicator.displayName = 'TrendIndicator';

const StatCardItem: React.FC<{ stat: StatCard }> = React.memo(({ stat }) => (
  <View style={styles.statCard}>
    <View style={styles.statCardHeader}>
      <Text style={styles.statCardIcon}>{stat.icon}</Text>
      <View
        style={[
          styles.statCardValueBadge,
          { backgroundColor: stat.color + '22' },
        ]}
      >
        <Text style={[styles.statCardValueText, { color: stat.color }]}>
          {stat.value}{stat.unit}
        </Text>
      </View>
    </View>
    <Text style={styles.statCardLabel}>{stat.label}</Text>
    <TrendIndicator trend={stat.trend} value={stat.trendValue} />
  </View>
));

StatCardItem.displayName = 'StatCardItem';

const StatsGrid: React.FC = React.memo(() => (
  <View style={styles.statsGridContainer}>
    <Text style={styles.statsSectionLabel}>STATISTIQUES HEBDOMADAIRES</Text>
    <View style={styles.statsRow}>
      {STATS.map((stat) => (
        <StatCardItem key={stat.id} stat={stat} />
      ))}
    </View>
  </View>
));

StatsGrid.displayName = 'StatsGrid';

const StreakDot: React.FC<{ day: StreakDay }> = React.memo(({ day }) => (
  <View
    style={{
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: day.completed
        ? Theme.colors.accent
        : Theme.colors.surfaceDeep,
      borderWidth: 1,
      borderColor: day.completed ? Theme.colors.accent : Theme.colors.border,
    }}
  />
));

StreakDot.displayName = 'StreakDot';

const StreaksSection: React.FC = React.memo(() => (
  <View style={styles.streaksContainer}>
    <Text style={styles.streaksSectionLabel}>SÃRIES</Text>
    <View style={styles.streaksRow}>
      <View style={styles.streakItem}>
        <Text style={styles.streakEmoji}>ð¥</Text>
        <Text style={styles.streakValue}>{USER.currentStreak}</Text>
        <Text style={styles.streakLabel}>SÃ©rie actuelle</Text>
      </View>
      <View style={styles.streakDivider} />
      <View style={styles.streakItem}>
        <Text style={styles.streakEmoji}>ð</Text>
        <Text style={styles.streakValue}>{USER.bestStreak}</Text>
        <Text style={styles.streakLabel}>Meilleure sÃ©rie</Text>
      </View>
    </View>
    <Text style={styles.streakCalendarLabel}>21 derniers jours</Text>
    <View style={styles.streakDotsRow}>
      {STREAK_DAYS.map((day) => (
        <StreakDot key={day.date} day={day} />
      ))}
    </View>
    <View style={styles.streakLegendRow}>
      <View style={styles.streakLegendItem}>
        <View style={styles.streakDotCompleted} />
        <Text style={styles.streakLegendText}>ComplÃ©tÃ©</Text>
      </View>
      <View style={styles.streakLegendItem}>
        <View style={styles.streakDotMissed} />
        <Text style={styles.streakLegendText}>ManquÃ©</Text>
      </View>
    </View>
  </View>
));

StreaksSection.displayName = 'StreaksSection';

// âââ Sections FlatList ââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

type SectionItem =
  | { key: 'avatar' }
  | { key: 'xpbar' }
  | { key: 'stats' }
  | { key: 'streaks' };

const SECTIONS: SectionItem[] = [
  { key: 'avatar' },
  { key: 'xpbar' },
  { key: 'stats' },
  { key: 'streaks' },
];

// âââ Ãcran principal ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

export const ProfileScreen: React.FC = React.memo(() => {
  const navigation = useNavigation<ProfileScreenNavigationProp>();

  const handleSettingsPress = useCallback(() => {
    const state = navigation.getState();
    const routeExists = state?.routeNames?.includes('Settings') ?? false;
    if (routeExists) {
      navigation.navigate('Settings' as never);
    } else {
      console.warn(
        '[ProfileScreen] La route "Settings" n\'est pas enregistrÃ©e dans le navigateur actuel. Navigation ignorÃ©e.'
      );
    }
  }, [navigation]);

  const xpBarProps = useMemo(
    () => ({
      current: USER.currentXP,
      max: USER.xpToNextLevel,
      level: USER.level,
    }),
    []
  );

  const renderSection = useCallback(
    ({ item }: ListRenderItemInfo<SectionItem>) => {
      switch (item.key) {
        case 'avatar':
          return <AvatarSection level={USER.level} />;
        case 'xpbar':
          return <XPBar {...xpBarProps} />;
        case 'stats':
          return <StatsGrid />;
        case 'streaks':
          return <StreaksSection />;
        default:
          return null;
      }
    },
    [xpBarProps]
  );

  const keyExtractor = useCallback((item: SectionItem) => item.key, []);

  return (
    <View style={styles.rootContainer}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={Theme.colors.background}
      />
      <SafeAreaView style={styles.safeArea}>
        {/* En-tÃªte */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profil</Text>
          <TouchableOpacity
            onPress={handleSettingsPress}
            style={styles.settingsButton}
            accessibilityLabel="Ouvrir les paramÃ¨tres"
            accessibilityRole="button"
          >
            <Text style={styles.settingsIcon}>âï¸</Text>
          </TouchableOpacity>
        </View>

        <FlatList<SectionItem>
          data={SECTIONS}
          keyExtractor={keyExtractor}
          renderItem={renderSection}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.flatListContent}
        />
      </SafeAreaView>
    </View>
  );
});

ProfileScreen.displayName = 'ProfileScreen';

export default ProfileScreen;
