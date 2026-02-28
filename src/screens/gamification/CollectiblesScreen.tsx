import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Animated,
  Dimensions,
  StatusBar,
  Modal,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COLUMN_COUNT = 3;
const ITEM_SIZE = (SCREEN_WIDTH - 16 * 2 - 10 * (COLUMN_COUNT - 1)) / COLUMN_COUNT;

// ─── Types ───────────────────────────────────────────────────────────────────

type CollectibleCategory = 'All' | 'Badges' | 'Items' | 'Achievements';

interface Collectible {
  id: string;
  name: string;
  description: string;
  category: Exclude<CollectibleCategory, 'All'>;
  obtained: boolean;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  icon: string;
  obtainedDate?: string;
  howToObtain: string;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const COLLECTIBLES: Collectible[] = [
  // Badges
  { id: 'b1', name: 'Night Owl', description: 'Maîtrisez votre sommeil', category: 'Badges', obtained: true, rarity: 'rare', icon: '🦉', obtainedDate: '2024-01-15', howToObtain: 'Achieve 90+ sleep score 7 days in a row' },
  { id: 'b2', name: 'Early Bird', description: 'Levez-vous avant 6h du matin', category: 'Badges', obtained: true, rarity: 'common', icon: '🐦', obtainedDate: '2024-01-20', howToObtain: 'Wake up before 6AM 5 days in a row' },
  { id: 'b3', name: 'Iron Will', description: 'Streak de 30 jours', category: 'Badges', obtained: false, rarity: 'epic', icon: '🏋️', howToObtain: 'Maintain a 30-day streak' },
  { id: 'b4', name: 'Zen Master', description: '100 sessions de méditation', category: 'Badges', obtained: false, rarity: 'legendary', icon: '🧘', howToObtain: 'Complete 100 meditation sessions' },
  { id: 'b5', name: 'Hydro King', description: 'Hydratation parfaite 30 jours', category: 'Badges', obtained: true, rarity: 'rare', icon: '💧', obtainedDate: '2024-02-01', howToObtain: 'Hit hydration goals 30 days straight' },
  { id: 'b6', name: 'Marathon', description: 'Courez 100km total', category: 'Badges', obtained: false, rarity: 'epic', icon: '🏃', howToObtain: 'Log a total of 100km running' },
  // Items
  { id: 'i1', name: 'Crystal Orb', description: 'Artefact de clarté mentale', category: 'Items', obtained: true, rarity: 'epic', icon: '🔮', obtainedDate: '2024-01-28', howToObtain: 'Defeat the Stress Titan boss' },
  { id: 'i2', name: 'Moon Stone', description: 'Pierre de sommeil profond', category: 'Items', obtained: false, rarity: 'legendary', icon: '🌙', howToObtain: 'Reach Level 50' },
  { id: 'i3', name: 'Flame Heart', description: 'Énergie infinie', category: 'Items', obtained: false, rarity: 'rare', icon: '🔥', howToObtain: 'Complete 10 movement quests' },
  { id: 'i4', name: 'Thunder Gem', description: 'Boost de récupération', category: 'Items', obtained: true, rarity: 'common', icon: '⚡', obtainedDate: '2024-01-10', howToObtain: 'Log 50 workout sessions' },
  { id: 'i5', name: 'Leaf Crown', description: 'Harmonie avec la nature', category: 'Items', obtained: false, rarity: 'rare', icon: '🌿', howToObtain: 'Complete all Nutrition quests in one month' },
  { id: 'i6', name: 'Star Dust', description: 'Poudre de rêves', category: 'Items', obtained: false, rarity: 'legendary', icon: '✨', howToObtain: 'Reach Level 100' },
  // Achievements
  { id: 'a1', name: 'First Steps', description: 'Première connexion', category: 'Achievements', obtained: true, rarity: 'common', icon: '👣', obtainedDate: '2023-11-01', howToObtain: 'Log in for the first time' },
  { id: 'a2', name: 'Week Warrior', description: '7 jours consécutifs', category: 'Achievements', obtained: true, rarity: 'common', icon: '📅', obtainedDate: '2023-11-08', howToObtain: 'Complete 7 consecutive days' },
  { id: 'a3', name: 'Level 10', description: 'Atteindre le niveau 10', category: 'Achievements', obtained: true, rarity: 'rare', icon: '🎯', obtainedDate: '2023-11-30', howToObtain: 'Reach Level 10' },
  { id: 'a4', name: 'Social Butterfly', description: 'Rejoindre une guilde', category: 'Achievements', obtained: false, rarity: 'common', icon: '🦋', howToObtain: 'Join or create a guild' },
  { id: 'a5', name: 'Boss Slayer', description: 'Vaincre 3 boss', category: 'Achievements', obtained: false, rarity: 'epic', icon: '⚔️', howToObtain: 'Participate in defeating 3 monthly bosses' },
  { id: 'a6', name: 'Perfectionist', description: 'Score parfait une semaine', category: 'Achievements', obtained: false, rarity: 'legendary', icon: '💎', howToObtain: 'Achieve perfect scores in all categories for one week' },
];

const CATEGORIES: CollectibleCategory[] = ['All', 'Badges', 'Items', 'Achievements'];

const RARITY_COLORS: Record<Collectible['rarity'], string> = {
  common: '#A8A8C0',
  rare: '#3D8BFF',
  epic: '#9B59B6',
  legendary: '#F5A623',
};

const RARITY_BG: Record<Collectible['rarity'], string> = {
  common: '#A8A8C022',
  rare: '#3D8BFF22',
  epic: '#9B59B622',
  legendary: '#F5A62322',
};

const RARITY_LABELS: Record<Collectible['rarity'], string> = {
  common: 'Commun',
  rare: 'Rare',
  epic: 'Épique',
  legendary: 'Légendaire',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const CollectionProgress: React.FC<{ total: number; obtained: number }> = ({ total, obtained }) => {
  const animVal = useRef(new Animated.Value(0)).current;
  const progress = obtained / total;

  useEffect(() => {
    Animated.timing(animVal, {
      toValue: progress,
      duration: 1000,
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
        marginHorizontal: 16,
        marginBottom: 14,
        padding: 16,
        borderWidth: 1,
        borderColor: '#2A2A3A',
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <View>
          <Text style={{ color: '#A8A8C0', fontSize: 12, fontWeight: '600', letterSpacing: 1 }}>COLLECTION</Text>
          <Text style={{ color: '#E8E8F0', fontSize: 20, fontWeight: '800', marginTop: 2 }}>
            {obtained}
            <Text style={{ color: '#A8A8C0', fontSize: 14, fontWeight: '400' }}>/{total} collectibles</Text>
          </Text>
        </View>
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: '#3D8BFF22',
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 2,
            borderColor: '#3D8BFF55',
          }}
        >
          <Text style={{ color: '#3D8BFF', fontSize: 14, fontWeight: '800' }}>{Math.round(progress * 100)}%</Text>
        </View>
      </View>
      <View style={{ height: 8, backgroundColor: '#111118', borderRadius: 4, overflow: 'hidden' }}>
        <Animated.View
          style={[
            { height: '100%', borderRadius: 4, backgroundColor: '#3D8BFF' },
            { width: barWidth },
          ]}
        />
      </View>
    </View>
  );
};

const GlowView: React.FC<{ color: string; children: React.ReactNode; style?: object }> = ({
  color,
  children,
  style,
}) => {
  const animVal = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animVal, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(animVal, { toValue: 0, duration: 2000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const opacity = animVal.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0.9] });

  return (
    <Animated.View
      style={[
        {
          borderRadius: 14,
          borderWidth: 1.5,
          borderColor: color,
          shadowColor: color,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.6,
          shadowRadius: 8,
          elevation: 8,
          opacity,
        },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
};

const CollectibleItem: React.FC<{ item: Collectible; onPress: (item: Collectible) => void }> = ({
  item,
  onPress,
}) => {
  const rarityColor = RARITY_COLORS[item.rarity];

  const inner = (
    <TouchableOpacity
      onPress={() => onPress(item)}
      activeOpacity={0.8}
      style={{
        width: ITEM_SIZE,
        height: ITEM_SIZE + 30,
        borderRadius: 14,
        backgroundColor: '#1C1C28',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        borderWidth: item.obtained ? 0 : 1,
        borderColor: '#2A2A3A',
      }}
    >
      {/* Icon */}
      <Text style={{ fontSize: 34, opacity: item.obtained ? 1 : 0.25 }}>{item.icon}</Text>
      <Text
        style={{
          color: item.obtained ? '#E8E8F0' : '#3A3A4A',
          fontSize: 11,
          fontWeight: '600',
          marginTop: 6,
          textAlign: 'center',
          paddingHorizontal: 4,
        }}
        numberOfLines={2}
      >
        {item.name}
      </Text>

      {/* Rarity dot */}
      {item.obtained && (
        <View
          style={{
            position: 'absolute',
            top: 6,
            right: 6,
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: rarityColor,
          }}
        />
      )}

      {/* Lock overlay */}
      {!item.obtained && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: '#080810AA',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 14,
          }}
        >
          <Text style={{ fontSize: 20 }}>🔒</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  if (item.obtained) {
    return (
      <GlowView color={rarityColor} style={{ width: ITEM_SIZE, height: ITEM_SIZE + 30, marginBottom: 10 }}>
        {inner}
      </GlowView>
    );
  }

  return <View style={{ width: ITEM_SIZE, height: ITEM_SIZE + 30, marginBottom: 10 }}>{inner}</View>;
};

const DetailModal: React.FC<{ item: Collectible | null; onClose: () => void }> = ({ item, onClose }) => {
  if (!item) return null;
  const rarityColor = RARITY_COLORS[item.rarity];
  const rarityBg = RARITY_BG[item.rarity];

  return (
    <Modal visible={!!item} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={onClose}
        style={{ flex: 1, backgroundColor: '#000000AA', justifyContent: 'center', alignItems: 'center', padding: 24 }}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={{
            backgroundColor: '#1C1C28',
            borderRadius: 24,
            padding: 24,
            width: '100%',
            borderWidth: 1.5,
            borderColor: rarityColor + '55',
          }}
        >
          {/* Icon */}
          <View style={{ alignItems: 'center', marginBottom: 16 }}>
            <View
              style={{
                width: 80,
                height: 80,
                borderRadius: 20,
                backgroundColor: rarityBg,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 2,
                borderColor: rarityColor + '55',
                marginBottom: 12,
              }}
            >
              <Text style={{ fontSize: 42 }}>{item.icon}</Text>
            </View>
            <Text style={{ color: '#E8E8F0', fontSize: 22, fontWeight: '800' }}>{item.name}</Text>
            <View
              style={{
                backgroundColor: rarityBg,
                borderRadius: 8,
                paddingHorizontal: 10,
                paddingVertical: 4,
                marginTop: 6,
              }}
            >
              <Text style={{ color: rarityColor, fontSize: 12, fontWeight: '700' }}>
                {RARITY_LABELS[item.rarity]}
              </Text>
            </View>
          </View>

          <Text style={{ color: '#A8A8C0', fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 16 }}>
            {item.description}
          </Text>

          <View style={{ backgroundColor: '#111118', borderRadius: 12, padding: 12, marginBottom: 16 }}>
            <Text style={{ color: '#A8A8C0', fontSize: 12, fontWeight: '600', marginBottom: 4 }}>
              {item.obtained ? '✅ OBTENU LE' : '🔒 COMMENT OBTENIR'}
            </Text>
            <Text style={{ color: '#E8E8F0', fontSize: 13, lineHeight: 18 }}>
              {item.obtained ? item.obtainedDate ?? '' : item.howToObtain}
            </Text>
          </View>

          <TouchableOpacity
            onPress={onClose}
            style={{
              backgroundColor: '#3D8BFF',
              borderRadius: 12,
              paddingVertical: 14,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '700' }}>Fermer</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const CategoryTabs: React.FC<{
  selected: CollectibleCategory;
  onSelect: (c: CollectibleCategory) => void;
  counts: Record<CollectibleCategory, number>;
}> = ({ selected, onSelect, counts }) => (
  <FlatList
    horizontal
    showsHorizontalScrollIndicator={false}
    data={CATEGORIES}
    keyExtractor={(item) => item}
    contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 12, gap: 8 }}
    renderItem={({ item }) => {
      const isActive = item === selected;
      return (
        <TouchableOpacity
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
          <Text
            style={{
              color: isActive ? '#FFFFFF' : '#A8A8C0',
              fontSize: 13,
              fontWeight: isActive ? '700' : '500',
            }}
          >
            {item}
          </Text>
          <View
            style={{
              backgroundColor: isActive ? '#FFFFFF33' : '#2A2A3A',
              borderRadius: 10,
              paddingHorizontal: 6,
              paddingVertical: 1,
            }}
          >
            <Text
              style={{
                color: isActive ? '#FFFFFF' : '#A8A8C0',
                fontSize: 11,
                fontWeight: '600',
              }}
            >
              {counts[item]}
            </Text>
          </View>
        </TouchableOpacity>
      );
    }}
  />
);

// ─── Main Screen ──────────────────────────────────────────────────────────────

export const CollectiblesScreen: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<CollectibleCategory>('All');
  const [selectedItem, setSelectedItem] = useState<Collectible | null>(null);

  const filteredItems =
    selectedCategory === 'All'
      ? COLLECTIBLES
      : COLLECTIBLES.filter((c) => c.category === selectedCategory);

  const obtainedCount = filteredItems.filter((c) => c.obtained).length;
  const totalCount = filteredItems.length;

  const counts: Record<CollectibleCategory, number> = {
    All: COLLECTIBLES.length,
    Badges: COLLECTIBLES.filter((c) => c.category === 'Badges').length,
    Items: COLLECTIBLES.filter((c) => c.category === 'Items').length,
    Achievements: COLLECTIBLES.filter((c) => c.category === 'Achievements').length,
  };

  // Build grid rows
  const rows: Collectible[][] = [];
  for (let i = 0; i < filteredItems.length; i += COLUMN_COUNT) {
    rows.push(filteredItems.slice(i, i + COLUMN_COUNT));
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#080810' }}>
      <StatusBar barStyle="light-content" backgroundColor="#080810" />
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 }}>
          <Text style={{ color: '#E8E8F0', fontSize: 24, fontWeight: '800' }}>Collectibles</Text>
          <Text style={{ color: '#A8A8C0', fontSize: 13, marginTop: 2 }}>Débloquez des items en progressant</Text>
        </View>

        <FlatList
          data={rows}
          keyExtractor={(_, index) => `row-${index}`}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 32 }}
          ListHeaderComponent={
            <>
              <CollectionProgress total={COLLECTIBLES.filter((c) => selectedCategory === 'All' || c.category === selectedCategory).length} obtained={COLLECTIBLES.filter((c) => (selectedCategory === 'All' || c.category === selectedCategory) && c.obtained).length} />
              <CategoryTabs selected={selectedCategory} onSelect={setSelectedCategory} counts={counts} />
              {/* Rarity legend */}
              <View style={{ flexDirection: 'row', paddingHorizontal: 16, marginBottom: 14, gap: 12, flexWrap: 'wrap' }}>
                {(Object.keys(RARITY_COLORS) as Collectible['rarity'][]).map((r) => (
                  <View key={r} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: RARITY_COLORS[r] }} />
                    <Text style={{ color: '#A8A8C0', fontSize: 11 }}>{RARITY_LABELS[r]}</Text>
                  </View>
                ))}
              </View>
            </>
          }
          renderItem={({ item: row }) => (
            <View
              style={{
                flexDirection: 'row',
                paddingHorizontal: 16,
                gap: 10,
                marginBottom: 0,
              }}
            >
              {row.map((collectible) => (
                <CollectibleItem
                  key={collectible.id}
                  item={collectible}
                  onPress={setSelectedItem}
                />
              ))}
              {/* Fill empty slots */}
              {row.length < COLUMN_COUNT &&
                Array.from({ length: COLUMN_COUNT - row.length }).map((_, i) => (
                  <View key={`empty-${i}`} style={{ width: ITEM_SIZE, height: ITEM_SIZE + 30 }} />
                ))}
            </View>
          )}
        />

        <DetailModal item={selectedItem} onClose={() => setSelectedItem(null)} />
      </SafeAreaView>
    </View>
  );
};

export default CollectiblesScreen;
