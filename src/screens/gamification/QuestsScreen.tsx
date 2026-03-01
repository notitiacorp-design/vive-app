import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// âââ Types âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

type QuestCategory = 'All' | 'Sleep' | 'Nutrition' | 'Movement' | 'Mental';

interface Quest {
  id: string;
  title: string;
  description: string;
  category: Exclude<QuestCategory, 'All'>;
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

// âââ Mock Data ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

const QUESTS: Quest[] = [
  {
    id: 'q1',
    title: 'Sleep Architect',
    description: 'Achieve 8h sleep for 10 out of 14 days',
    category: 'Sleep',
    progress: 7,
    total: 10,
    xpReward: 500,
    daysRemaining: 7,
    icon: '\uD83C\uDF19',
    color: '#6B4FBB',
  },
  {
    id: 'q2',
    title: 'Hydration Hero',
    description: 'Drink 2L of water every day for 2 weeks',
    category: 'Nutrition',
    progress: 9,
    total: 14,
    xpReward: 350,
    daysRemaining: 5,
    icon: '\uD83D\uDCA7',
    color: '#3D8BFF',
  },
  {
    id: 'q3',
    title: 'Movement Streak',
    description: 'Complete 30 min of exercise 12 days in a row',
    category: 'Movement',
    progress: 5,
    total: 12,
    xpReward: 600,
    daysRemaining: 9,
    icon: '\uD83C\uDFC3',
    color: '#27AE60',
  },
  {
    id: 'q4',
    title: 'Mindful Minutes',
    description: 'Meditate for at least 10 minutes daily',
    category: 'Mental',
    progress: 11,
    total: 14,
    xpReward: 400,
    daysRemaining: 3,
    icon: '\uD83E\uDDD8',
    color: '#F5A623',
  },
  {
    id: 'q5',
    title: 'Deep Rest Protocol',
    description: 'Hit 90%+ sleep quality score 7 times',
    category: 'Sleep',
    progress: 3,
    total: 7,
    xpReward: 700,
    daysRemaining: 11,
    icon: '\uD83D\uDE34',
    color: '#6B4FBB',
  },
  {
    id: 'q6',
    title: 'Macro Balance',
    description: 'Hit your macro targets 10 days out of 14',
    category: 'Nutrition',
    progress: 6,
    total: 10,
    xpReward: 450,
    daysRemaining: 8,
    icon: '\uD83E\uDD57',
    color: '#27AE60',
  },
];

const BOSS: BossFight = {
  name: 'Le Titan du Stress',
  description: 'D\u00E9faites le boss mensuel en maintenant un niveau de stress bas durant tout le mois.',
  hp: 4200,
  maxHp: 10000,
  damageDealt: 840,
  participants: 1247,
  daysLeft: 18,
  reward: 2500,
};

const CATEGORIES: QuestCategory[] = ['All', 'Sleep', 'Nutrition', 'Movement', 'Mental'];

const CATEGORY_ICONS: Record<QuestCategory, string> = {
  All: '\u2728',
  Sleep: '\uD83C\uDF19',
  Nutrition: '\uD83E\uDD57',
  Movement: '\uD83C\uDFC3',
  Mental: '\uD83E\uDDD8',
};

// âââ Sub-components âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

const AnimatedProgressBar: React.FC<{ progress: number; color: string; height?: number }> = ({
  progress,
  color,
  height = 6,
}) => {
  const animVal = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animVal, {
      toValue: progress,
      duration: 900,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  const barWidth = animVal.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={{ height, backgroundColor: '#111118', borderRadius: height / 2, overflow: 'hidden' }}>
      <Animated.View
        style={[
          { height: '100%', borderRadius: height / 2, backgroundColor: color },
          { width: barWidth },
        ]}
      />
    </View>
  );
};

const QuestCard: React.FC<{ quest: Quest }> = ({ quest }) => {
  const progress = quest.progress / quest.total;
  const pct = Math.round(progress * 100);

  return (
    <View
      style={{
        backgroundColor: '#1C1C28',
        borderRadius: 16,
        padding: 16,
        marginHorizontal: 16,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#2A2A3A',
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 }}>
        {/* Icon */}
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            backgroundColor: quest.color + '22',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 12,
          }}
        >
          <Text style={{ fontSize: 22 }}>{quest.icon}</Text>
        </View>
        {/* Info */}
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ color: '#E8E8F0', fontSize: 15, fontWeight: '700', flex: 1, marginRight: 8 }}>
              {quest.title}
            </Text>
            <View
              style={{
                backgroundColor: '#3D8BFF22',
                borderRadius: 8,
                paddingHorizontal: 8,
                paddingVertical: 3,
              }}
            >
              <Text style={{ color: '#3D8BFF', fontSize: 11, fontWeight: '700' }}>+{quest.xpReward} XP</Text>
            </View>
          </View>
          <Text style={{ color: '#A8A8C0', fontSize: 12, marginTop: 3, lineHeight: 17 }}>{quest.description}</Text>
        </View>
      </View>

      {/* Progress */}
      <View style={{ marginBottom: 6 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
          <Text style={{ color: '#A8A8C0', fontSize: 12 }}>
            {quest.progress}/{quest.total} completed
          </Text>
          <Text style={{ color: quest.color, fontSize: 12, fontWeight: '700' }}>{pct}%</Text>
        </View>
        <AnimatedProgressBar progress={progress} color={quest.color} />
      </View>

      {/* Footer */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
        <View
          style={{
            backgroundColor: quest.color + '22',
            borderRadius: 6,
            paddingHorizontal: 8,
            paddingVertical: 3,
          }}
        >
          <Text style={{ color: quest.color, fontSize: 11, fontWeight: '600' }}>{quest.category}</Text>
        </View>
        <Text style={{ color: '#A8A8C0', fontSize: 12 }}>
          \u23F3 {quest.daysRemaining}d left
        </Text>
      </View>
    </View>
  );
};

const BossFightCard: React.FC<{ boss: BossFight }> = ({ boss }) => {
  const hpProgress = 1 - boss.hp / boss.maxHp;
  const animVal = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animVal, {
      toValue: hpProgress,
      duration: 1200,
      useNativeDriver: false,
    }).start();
  }, [hpProgress]);

  const hpBarWidth = animVal.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View
      style={{
        marginHorizontal: 16,
        marginBottom: 10,
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1.5,
        borderColor: '#E74C3C55',
      }}
    >
      {/* Background gradient simulation */}
      <View
        style={{
          backgroundColor: '#1C1C28',
          padding: 18,
        }}
      >
        {/* Boss badge */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
          <View
            style={{
              backgroundColor: '#E74C3C22',
              borderRadius: 8,
              paddingHorizontal: 10,
              paddingVertical: 4,
              marginRight: 10,
            }}
          >
            <Text style={{ color: '#E74C3C', fontSize: 11, fontWeight: '800', letterSpacing: 1 }}>
              \u2694\uFE0F BOSS MENSUEL
            </Text>
          </View>
          <Text style={{ color: '#A8A8C0', fontSize: 12 }}>
            \u23F3 {boss.daysLeft} jours restants
          </Text>
        </View>

        {/* Boss title */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
          <Text style={{ fontSize: 40, marginRight: 14 }}>\uD83D\uDC79</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#E8E8F0', fontSize: 20, fontWeight: '800' }}>{boss.name}</Text>
            <Text style={{ color: '#A8A8C0', fontSize: 12, marginTop: 4, lineHeight: 17 }}>
              {boss.description}
            </Text>
          </View>
        </View>

        {/* HP Bar */}
        <View style={{ marginBottom: 10 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
            <Text style={{ color: '#E8E8F0', fontSize: 13, fontWeight: '700' }}>
              \u2764\uFE0F Boss HP
            </Text>
            <Text style={{ color: '#E74C3C', fontSize: 13, fontWeight: '700' }}>
              {boss.hp.toLocaleString()} / {boss.maxHp.toLocaleString()}
            </Text>
          </View>
          <View style={{ height: 12, backgroundColor: '#111118', borderRadius: 6, overflow: 'hidden' }}>
            <Animated.View
              style={[
                {
                  height: '100%',
                  borderRadius: 6,
                  backgroundColor: '#E74C3C',
                },
                { width: hpBarWidth },
              ]}
            />
          </View>
        </View>

        {/* Stats row */}
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
          <View
            style={{
              flex: 1,
              backgroundColor: '#111118',
              borderRadius: 10,
              padding: 10,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: '#F5A623', fontSize: 16, fontWeight: '800' }}>
              \uD83D\uDCA5 {boss.damageDealt}
            </Text>
            <Text style={{ color: '#A8A8C0', fontSize: 11, marginTop: 2 }}>Your Damage</Text>
          </View>
          <View
            style={{
              flex: 1,
              backgroundColor: '#111118',
              borderRadius: 10,
              padding: 10,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: '#3D8BFF', fontSize: 16, fontWeight: '800' }}>
              \uD83D\uDC65 {boss.participants.toLocaleString()}
            </Text>
            <Text style={{ color: '#A8A8C0', fontSize: 11, marginTop: 2 }}>Raiders</Text>
          </View>
          <View
            style={{
              flex: 1,
              backgroundColor: '#111118',
              borderRadius: 10,
              padding: 10,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: '#27AE60', fontSize: 16, fontWeight: '800' }}>
              \u2728 {boss.reward}
            </Text>
            <Text style={{ color: '#A8A8C0', fontSize: 11, marginTop: 2 }}>XP Reward</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

// CategoryTabs uses ScrollView instead of FlatList to avoid nested FlatList conflict
const CategoryTabs: React.FC<{
  selected: QuestCategory;
  onSelect: (c: QuestCategory) => void;
}> = ({ selected, onSelect }) => (
  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
    contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 12, gap: 8 }}
    keyboardShouldPersistTaps="handled"
  >
    {CATEGORIES.map((item) => {
      const isActive = item === selected;
      return (
        <TouchableOpacity
          key={item}
          onPress={() => onSelect(item)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 14,
            paddingVertical: 8,
            borderRadius: 20,
            backgroundColor: isActive ? '#3D8BFF' : '#1C1C28',
            borderWidth: 1,
            borderColor: isActive ? '#3D8BFF' : '#2A2A3A',
            gap: 5,
          }}
        >
          <Text style={{ fontSize: 14 }}>{CATEGORY_ICONS[item]}</Text>
          <Text
            style={{
              color: isActive ? '#FFFFFF' : '#A8A8C0',
              fontSize: 13,
              fontWeight: isActive ? '700' : '500',
            }}
          >
            {item}
          </Text>
        </TouchableOpacity>
      );
    })}
  </ScrollView>
);

// âââ List item types ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

type ListItemBossHeader = { type: 'bossHeader' };
type ListItemBoss = { type: 'boss'; data: BossFight };
type ListItemQuestHeader = { type: 'questHeader'; label: string };
type ListItemQuest = { type: 'quest'; data: Quest };

type ListItem = ListItemBossHeader | ListItemBoss | ListItemQuestHeader | ListItemQuest;

// âââ Main Screen ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

export const QuestsScreen: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<QuestCategory>('All');

  const filteredQuests =
    selectedCategory === 'All' ? QUESTS : QUESTS.filter((q) => q.category === selectedCategory);

  // Build a flat list of typed items â renderItem always returns the same component shape
  const listData: ListItem[] = [];

  if (selectedCategory === 'All') {
    listData.push({ type: 'bossHeader' });
    listData.push({ type: 'boss', data: BOSS });
  }

  listData.push({
    type: 'questHeader',
    label:
      selectedCategory === 'All'
        ? '\uD83D\uDCCB QU\u00CATES ACTIVES (14 JOURS)'
        : `${CATEGORY_ICONS[selectedCategory]} QU\u00CATES ${selectedCategory.toUpperCase()}`,
  });

  filteredQuests.forEach((q) => {
    listData.push({ type: 'quest', data: q });
  });

  const renderItem = ({ item }: { item: ListItem }) => {
    switch (item.type) {
      case 'bossHeader':
        return (
          <View style={{ paddingHorizontal: 16, marginBottom: 10, marginTop: 4 }}>
            <Text style={{ color: '#A8A8C0', fontSize: 12, fontWeight: '600', letterSpacing: 1 }}>
              \u2694\uFE0F BOSS DU MOIS
            </Text>
          </View>
        );
      case 'boss':
        return <BossFightCard boss={item.data} />;
      case 'questHeader':
        return (
          <View style={{ paddingHorizontal: 16, marginTop: 16, marginBottom: 10 }}>
            <Text style={{ color: '#A8A8C0', fontSize: 12, fontWeight: '600', letterSpacing: 1 }}>
              {item.label}
            </Text>
          </View>
        );
      case 'quest':
        return <QuestCard quest={item.data} />;
      default:
        return null;
    }
  };

  const keyExtractor = (item: ListItem, index: number): string => {
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
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#080810' }}>
      <StatusBar barStyle="light-content" backgroundColor="#080810" />
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 }}>
          <Text style={{ color: '#E8E8F0', fontSize: 24, fontWeight: '800' }}>Qu\u00EAtes</Text>
          <Text style={{ color: '#A8A8C0', fontSize: 13, marginTop: 2 }}>
            {filteredQuests.length} qu\u00EAte{filteredQuests.length !== 1 ? 's' : ''} active
            {filteredQuests.length !== 1 ? 's' : ''}
          </Text>
        </View>

        {/* Category Tabs â uses ScrollView, not FlatList, to avoid nested FlatList conflicts */}
        <CategoryTabs selected={selectedCategory} onSelect={setSelectedCategory} />

        {/* Main list â single FlatList with typed items, renderItem always returns same shape */}
        <FlatList<ListItem>
          data={listData}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 32 }}
        />
      </SafeAreaView>
    </View>
  );
};

export default QuestsScreen;
