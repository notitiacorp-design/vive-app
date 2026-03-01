import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
  StatusBar,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
    white: '#FFFFFF',
    accent: '#3D8BFF',
    accentSleep: '#6B4FBB',
    accentNutrition: '#27AE60',
    accentMovement: '#27AE60',
    accentMental: '#F5A623',
    boss: '#E74C3C',
    xp: '#F5A623',
    participants: '#3D8BFF',
    reward: '#27AE60',
  },
} as const;

// âââ Types ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

type QuestCategory = 'Tout' | 'Sommeil' | 'Nutrition' | 'Mouvement' | 'Mental';

interface Quest {
  id: string;
  title: string;
  description: string;
  category: Exclude<QuestCategory, 'Tout'>;
  progress: number;
  total: number;
  xpReward: number;
  daysRemaining: number;
  icon: string;
  color: string;
}

interface BossFight {
  name: string;
  description: string;
  hp: number;
  maxHp: number;
  damageDealt: number;
  participants: number;
  daysLeft: number;
  reward: number;
}

// âââ DonnÃ©es mock âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

const QUESTS: Quest[] = [
  {
    id: 'q1',
    title: 'Architecte du Sommeil',
    description: 'Atteindre 8h de sommeil pendant 10 jours sur 14',
    category: 'Sommeil',
    progress: 7,
    total: 10,
    xpReward: 500,
    daysRemaining: 7,
    icon: 'ð',
    color: Theme.colors.accentSleep,
  },
  {
    id: 'q2',
    title: 'HÃ©ros de l\'Hydratation',
    description: 'Boire 2L d\'eau chaque jour pendant 2 semaines',
    category: 'Nutrition',
    progress: 9,
    total: 14,
    xpReward: 350,
    daysRemaining: 5,
    icon: 'ð§',
    color: Theme.colors.accent,
  },
  {
    id: 'q3',
    title: 'SÃ©rie de Mouvement',
    description: 'Effectuer 30 min d\'exercice 12 jours de suite',
    category: 'Mouvement',
    progress: 5,
    total: 12,
    xpReward: 600,
    daysRemaining: 9,
    icon: 'ð',
    color: Theme.colors.accentMovement,
  },
  {
    id: 'q4',
    title: 'Minutes de Pleine Conscience',
    description: 'MÃ©diter au moins 10 minutes par jour',
    category: 'Mental',
    progress: 11,
    total: 14,
    xpReward: 400,
    daysRemaining: 3,
    icon: 'ð§',
    color: Theme.colors.accentMental,
  },
  {
    id: 'q5',
    title: 'Protocole de Repos Profond',
    description: 'Obtenir un score de qualitÃ© de sommeil â¥ 90% 7 fois',
    category: 'Sommeil',
    progress: 3,
    total: 7,
    xpReward: 700,
    daysRemaining: 11,
    icon: 'ð´',
    color: Theme.colors.accentSleep,
  },
  {
    id: 'q6',
    title: 'Ãquilibre Macro',
    description: 'Atteindre vos objectifs de macros 10 jours sur 14',
    category: 'Nutrition',
    progress: 6,
    total: 10,
    xpReward: 450,
    daysRemaining: 8,
    icon: 'ð¥',
    color: Theme.colors.accentNutrition,
  },
];

const BOSS: BossFight = {
  name: 'Le Titan du Stress',
  description: 'DÃ©faites le boss mensuel en maintenant un niveau de stress bas durant tout le mois.',
  hp: 4200,
  maxHp: 10000,
  damageDealt: 840,
  participants: 1247,
  daysLeft: 18,
  reward: 2500,
};

const CATEGORIES: QuestCategory[] = ['Tout', 'Sommeil', 'Nutrition', 'Mouvement', 'Mental'];

const CATEGORY_ICONS: Record<QuestCategory, string> = {
  Tout: 'â¨',
  Sommeil: 'ð',
  Nutrition: 'ð¥',
  Mouvement: 'ð',
  Mental: 'ð§',
};

// âââ Sous-composants ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

interface AnimatedProgressBarProps {
  progress: number;
  color: string;
  height?: number;
}

const AnimatedProgressBar: React.FC<AnimatedProgressBarProps> = ({ progress, color, height = 6 }) => {
  const animVal = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.timing(animVal, {
      toValue: progress,
      duration: 900,
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
    <View
      style={[
        styles.progressBarTrack,
        { height, borderRadius: height / 2 },
      ]}
    >
      <Animated.View
        style={[
          styles.progressBarFill,
          { height: '100%', borderRadius: height / 2, backgroundColor: color },
          { width: barWidth },
        ]}
      />
    </View>
  );
};

interface QuestCardProps {
  quest: Quest;
}

const QuestCard: React.FC<QuestCardProps> = React.memo(({ quest }) => {
  const progress = quest.progress / quest.total;
  const pct = Math.round(progress * 100);

  return (
    <View style={styles.questCard}>
      <View style={styles.questCardHeader}>
        <View
          style={[
            styles.questIconContainer,
            { backgroundColor: quest.color + '22' },
          ]}
        >
          <Text style={styles.questIcon}>{quest.icon}</Text>
        </View>
        <View style={styles.questInfo}>
          <View style={styles.questTitleRow}>
            <Text style={styles.questTitle}>{quest.title}</Text>
            <View style={styles.xpBadge}>
              <Text style={styles.xpBadgeText}>+{quest.xpReward} XP</Text>
            </View>
          </View>
          <Text style={styles.questDescription}>{quest.description}</Text>
        </View>
      </View>

      <View style={styles.questProgressSection}>
        <View style={styles.questProgressRow}>
          <Text style={styles.questProgressLabel}>
            {quest.progress}/{quest.total} complÃ©tÃ©s
          </Text>
          <Text style={[styles.questProgressPct, { color: quest.color }]}>{pct}%</Text>
        </View>
        <AnimatedProgressBar progress={progress} color={quest.color} />
      </View>

      <View style={styles.questFooter}>
        <View style={[styles.categoryBadge, { backgroundColor: quest.color + '22' }]}>
          <Text style={[styles.categoryBadgeText, { color: quest.color }]}>{quest.category}</Text>
        </View>
        <Text style={styles.daysRemaining}>â³ {quest.daysRemaining}j restants</Text>
      </View>
    </View>
  );
});

interface BossFightCardProps {
  boss: BossFight;
}

const BossFightCard: React.FC<BossFightCardProps> = React.memo(({ boss }) => {
  const hpProgress = 1 - boss.hp / boss.maxHp;
  const animVal = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.timing(animVal, {
      toValue: hpProgress,
      duration: 1200,
      useNativeDriver: false,
    });
    animation.start();
    return () => {
      animation.stop();
    };
  }, [hpProgress, animVal]);

  const hpBarWidth = animVal.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.bossCard}>
      <View style={styles.bossCardInner}>
        <View style={styles.bossBadgeRow}>
          <View style={styles.bossBadge}>
            <Text style={styles.bossBadgeText}>âï¸ BOSS MENSUEL</Text>
          </View>
          <Text style={styles.bossDaysLeft}>â³ {boss.daysLeft} jours restants</Text>
        </View>

        <View style={styles.bossTitleRow}>
          <Text style={styles.bossEmoji}>ð¹</Text>
          <View style={styles.bossTitleInfo}>
            <Text style={styles.bossName}>{boss.name}</Text>
            <Text style={styles.bossDescription}>{boss.description}</Text>
          </View>
        </View>

        <View style={styles.bossHpSection}>
          <View style={styles.bossHpRow}>
            <Text style={styles.bossHpLabel}>â¤ï¸ PV du Boss</Text>
            <Text style={styles.bossHpValue}>
              {boss.hp.toLocaleString()} / {boss.maxHp.toLocaleString()}
            </Text>
          </View>
          <View style={styles.bossHpTrack}>
            <Animated.View style={[styles.bossHpFill, { width: hpBarWidth }]} />
          </View>
        </View>

        <View style={styles.bossStatsRow}>
          <View style={styles.bossStatItem}>
            <Text style={[styles.bossStatValue, { color: Theme.colors.xp }]}>
              ð¥ {boss.damageDealt}
            </Text>
            <Text style={styles.bossStatLabel}>Vos dÃ©gÃ¢ts</Text>
          </View>
          <View style={styles.bossStatItem}>
            <Text style={[styles.bossStatValue, { color: Theme.colors.participants }]}>
              ð¥ {boss.participants.toLocaleString()}
            </Text>
            <Text style={styles.bossStatLabel}>Participants</Text>
          </View>
          <View style={styles.bossStatItem}>
            <Text style={[styles.bossStatValue, { color: Theme.colors.reward }]}>
              â¨ {boss.reward}
            </Text>
            <Text style={styles.bossStatLabel}>RÃ©compense XP</Text>
          </View>
        </View>
      </View>
    </View>
  );
});

interface CategoryTabsProps {
  selected: QuestCategory;
  onSelect: (c: QuestCategory) => void;
}

const CategoryTabs: React.FC<CategoryTabsProps> = ({ selected, onSelect }) => (
  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
    contentContainerStyle={styles.categoryTabsContainer}
    keyboardShouldPersistTaps="handled"
  >
    {CATEGORIES.map((item) => {
      const isActive = item === selected;
      return (
        <TouchableOpacity
          key={item}
          onPress={() => onSelect(item)}
          style={[
            styles.categoryTab,
            isActive ? styles.categoryTabActive : styles.categoryTabInactive,
          ]}
        >
          <Text style={styles.categoryTabIcon}>{CATEGORY_ICONS[item]}</Text>
          <Text
            style={[
              styles.categoryTabLabel,
              { color: isActive ? Theme.colors.white : Theme.colors.textSecondary,
                fontWeight: isActive ? '700' : '500' },
            ]}
          >
            {item}
          </Text>
        </TouchableOpacity>
      );
    })}
  </ScrollView>
);

// âââ Types d'Ã©lÃ©ments de liste ââââââââââââââââââââââââââââââââââââââââââââââââ

type ListItemBossHeader = { type: 'bossHeader' };
type ListItemBoss = { type: 'boss'; data: BossFight };
type ListItemQuestHeader = { type: 'questHeader'; label: string };
type ListItemQuest = { type: 'quest'; data: Quest };

type ListItem = ListItemBossHeader | ListItemBoss | ListItemQuestHeader | ListItemQuest;

// âââ Ãcran principal ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

export const QuestsScreen: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<QuestCategory>('Tout');

  const filteredQuests = useMemo(
    () =>
      selectedCategory === 'Tout'
        ? QUESTS
        : QUESTS.filter((q) => q.category === selectedCategory),
    [selectedCategory],
  );

  const listData = useMemo<ListItem[]>(() => {
    const items: ListItem[] = [];

    if (selectedCategory === 'Tout') {
      items.push({ type: 'bossHeader' });
      items.push({ type: 'boss', data: BOSS });
    }

    items.push({
      type: 'questHeader',
      label:
        selectedCategory === 'Tout'
          ? 'ð QUÃTES ACTIVES (14 JOURS)'
          : `${CATEGORY_ICONS[selectedCategory]} QUÃTES ${selectedCategory.toUpperCase()}`,
    });

    filteredQuests.forEach((q) => {
      items.push({ type: 'quest', data: q });
    });

    return items;
  }, [selectedCategory, filteredQuests]);

  const renderItem = useCallback(({ item }: { item: ListItem }) => {
    switch (item.type) {
      case 'bossHeader':
        return (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionHeaderText}>âï¸ BOSS DU MOIS</Text>
          </View>
        );
      case 'boss':
        return <BossFightCard boss={item.data} />;
      case 'questHeader':
        return (
          <View style={styles.sectionHeaderQuest}>
            <Text style={styles.sectionHeaderText}>{item.label}</Text>
          </View>
        );
      case 'quest':
        return <QuestCard quest={item.data} />;
      default:
        return null;
    }
  }, []);

  const keyExtractor = useCallback((item: ListItem, index: number): string => {
    switch (item.type) {
      case 'bossHeader':
        return 'boss-header';
      case 'boss':
        return 'boss';
      case 'questHeader':
        return 'quest-header';
      case 'quest':
        return item.data.id;
      default:
        return String(index);
    }
  }, []);

  const handleSelectCategory = useCallback((c: QuestCategory) => {
    setSelectedCategory(c);
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Theme.colors.background} />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.headerContainer}>
          <Text style={styles.headerTitle}>QuÃªtes</Text>
          <Text style={styles.headerSubtitle}>
            {filteredQuests.length} quÃªte{filteredQuests.length !== 1 ? 's' : ''} active
            {filteredQuests.length !== 1 ? 's' : ''}
          </Text>
        </View>

        <CategoryTabs selected={selectedCategory} onSelect={handleSelectCategory} />

        <FlatList<ListItem>
          data={listData}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.flatListContent}
        />
      </SafeAreaView>
    </View>
  );
};

// âââ Styles âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  safeArea: {
    flex: 1,
  },
  headerContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerTitle: {
    color: Theme.colors.textPrimary,
    fontSize: 24,
    fontWeight: '800',
  },
  headerSubtitle: {
    color: Theme.colors.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  flatListContent: {
    paddingBottom: 32,
  },
  // Category tabs
  categoryTabsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  categoryTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: 5,
  },
  categoryTabActive: {
    backgroundColor: Theme.colors.accent,
    borderColor: Theme.colors.accent,
  },
  categoryTabInactive: {
    backgroundColor: Theme.colors.surface,
    borderColor: Theme.colors.border,
  },
  categoryTabIcon: {
    fontSize: 14,
  },
  categoryTabLabel: {
    fontSize: 13,
  },
  // Section headers
  sectionHeader: {
    paddingHorizontal: 16,
    marginBottom: 10,
    marginTop: 4,
  },
  sectionHeaderQuest: {
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 10,
  },
  sectionHeaderText: {
    color: Theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
  },
  // Progress bar
  progressBarTrack: {
    backgroundColor: Theme.colors.surfaceDeep,
    overflow: 'hidden',
  },
  progressBarFill: {
    // backgroundColor and borderRadius set inline via props
  },
  // Quest card
  questCard: {
    backgroundColor: Theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  questCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  questIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  questIcon: {
    fontSize: 22,
  },
  questInfo: {
    flex: 1,
  },
  questTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  questTitle: {
    color: Theme.colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  xpBadge: {
    backgroundColor: Theme.colors.accent + '22',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  xpBadgeText: {
    color: Theme.colors.accent,
    fontSize: 11,
    fontWeight: '700',
  },
  questDescription: {
    color: Theme.colors.textSecondary,
    fontSize: 12,
    marginTop: 3,
    lineHeight: 17,
  },
  questProgressSection: {
    marginBottom: 6,
  },
  questProgressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  questProgressLabel: {
    color: Theme.colors.textSecondary,
    fontSize: 12,
  },
  questProgressPct: {
    fontSize: 12,
    fontWeight: '700',
  },
  questFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  categoryBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  daysRemaining: {
    color: Theme.colors.textSecondary,
    fontSize: 12,
  },
  // Boss card
  bossCard: {
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: Theme.colors.boss + '55',
  },
  bossCardInner: {
    backgroundColor: Theme.colors.surface,
    padding: 18,
  },
  bossBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  bossBadge: {
    backgroundColor: Theme.colors.boss + '22',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 10,
  },
  bossBadgeText: {
    color: Theme.colors.boss,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  bossDaysLeft: {
    color: Theme.colors.textSecondary,
    fontSize: 12,
  },
  bossTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  bossEmoji: {
    fontSize: 40,
    marginRight: 14,
  },
  bossTitleInfo: {
    flex: 1,
  },
  bossName: {
    color: Theme.colors.textPrimary,
    fontSize: 20,
    fontWeight: '800',
  },
  bossDescription: {
    color: Theme.colors.textSecondary,
    fontSize: 12,
    marginTop: 4,
    lineHeight: 17,
  },
  bossHpSection: {
    marginBottom: 10,
  },
  bossHpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  bossHpLabel: {
    color: Theme.colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  bossHpValue: {
    color: Theme.colors.boss,
    fontSize: 13,
    fontWeight: '700',
  },
  bossHpTrack: {
    height: 12,
    backgroundColor: Theme.colors.surfaceDeep,
    borderRadius: 6,
    overflow: 'hidden',
  },
  bossHpFill: {
    height: '100%',
    borderRadius: 6,
    backgroundColor: Theme.colors.boss,
  },
  bossStatsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  bossStatItem: {
    flex: 1,
    backgroundColor: Theme.colors.surfaceDeep,
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
  },
  bossStatValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  bossStatLabel: {
    color: Theme.colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
});

export default QuestsScreen;