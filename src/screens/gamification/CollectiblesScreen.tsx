import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  Animated,
  Dimensions,
  StatusBar,
  Modal,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// TODO: IS_MOCK_DATA = true â Remplacer par une vraie source de donnÃ©es (API, store, injection)
const IS_MOCK_DATA = true;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COLUMN_COUNT = 3;
const ITEM_SIZE = (SCREEN_WIDTH - 16 * 2 - 10 * (COLUMN_COUNT - 1)) / COLUMN_COUNT;

// âââ ThÃ¨me centralisÃ© ââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

const Colors = {
  background: '#080810',
  surface: '#1C1C28',
  surfaceDeep: '#111118',
  surfaceOverlay: '#080810AA',
  border: '#2A2A3A',
  textPrimary: '#E8E8F0',
  textSecondary: '#A8A8C0',
  textLocked: '#3A3A4A',
  accent: '#3D8BFF',
  accentAlpha: '#3D8BFF22',
  accentBorder: '#3D8BFF55',
  white: '#FFFFFF',
  whiteAlpha: '#FFFFFF33',
  overlay: '#000000AA',
  rarityCommon: '#A8A8C0',
  rarityCommonBg: '#A8A8C022',
  rarityRare: '#3D8BFF',
  rarityRareBg: '#3D8BFF22',
  rarityEpic: '#9B59B6',
  rarityEpicBg: '#9B59B622',
  rarityLegendary: '#F5A623',
  rarityLegendaryBg: '#F5A62322',
} as const;

// âââ Types âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

type CollectibleCategory = 'Tout' | 'Badges' | 'Objets' | 'SuccÃ¨s';

interface Collectible {
  id: string;
  name: string;
  description: string;
  category: Exclude<CollectibleCategory, 'Tout'>;
  obtained: boolean;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  icon: string;
  obtainedDate?: string;
  howToObtain: string;
}

// âââ DonnÃ©es mock âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// TODO: IS_MOCK_DATA â Remplacer COLLECTIBLES par des donnÃ©es dynamiques

const COLLECTIBLES: Collectible[] = [
  // Badges
  { id: 'b1', name: 'Hibou de nuit', description: 'MaÃ®trisez votre sommeil', category: 'Badges', obtained: true, rarity: 'rare', icon: 'ð¦', obtainedDate: '2024-01-15', howToObtain: 'Obtenir un score de sommeil 90+ pendant 7 jours consÃ©cutifs' },
  { id: 'b2', name: 'LÃ¨ve-tÃ´t', description: 'Levez-vous avant 6h du matin', category: 'Badges', obtained: true, rarity: 'common', icon: 'ð¦', obtainedDate: '2024-01-20', howToObtain: 'Se lever avant 6h du matin 5 jours de suite' },
  { id: 'b3', name: 'VolontÃ© de fer', description: 'Streak de 30 jours', category: 'Badges', obtained: false, rarity: 'epic', icon: 'ðï¸', howToObtain: 'Maintenir un streak de 30 jours' },
  { id: 'b4', name: 'MaÃ®tre zen', description: '100 sessions de mÃ©ditation', category: 'Badges', obtained: false, rarity: 'legendary', icon: 'ð§', howToObtain: 'ComplÃ©ter 100 sessions de mÃ©ditation' },
  { id: 'b5', name: 'Roi de l\'hydratation', description: 'Hydratation parfaite 30 jours', category: 'Badges', obtained: true, rarity: 'rare', icon: 'ð§', obtainedDate: '2024-02-01', howToObtain: 'Atteindre les objectifs d\'hydratation 30 jours de suite' },
  { id: 'b6', name: 'Marathon', description: 'Courez 100km total', category: 'Badges', obtained: false, rarity: 'epic', icon: 'ð', howToObtain: 'Enregistrer un total de 100km en course Ã  pied' },
  // Objets
  { id: 'i1', name: 'Orbe de cristal', description: 'Artefact de clartÃ© mentale', category: 'Objets', obtained: true, rarity: 'epic', icon: 'ð®', obtainedDate: '2024-01-28', howToObtain: 'Vaincre le boss Titan du Stress' },
  { id: 'i2', name: 'Pierre de lune', description: 'Pierre de sommeil profond', category: 'Objets', obtained: false, rarity: 'legendary', icon: 'ð', howToObtain: 'Atteindre le niveau 50' },
  { id: 'i3', name: 'CÅur de flamme', description: 'Ãnergie infinie', category: 'Objets', obtained: false, rarity: 'rare', icon: 'ð¥', howToObtain: 'ComplÃ©ter 10 quÃªtes de mouvement' },
  { id: 'i4', name: 'Gemme tonnerre', description: 'Boost de rÃ©cupÃ©ration', category: 'Objets', obtained: true, rarity: 'common', icon: 'â¡', obtainedDate: '2024-01-10', howToObtain: 'Enregistrer 50 sessions d\'entraÃ®nement' },
  { id: 'i5', name: 'Couronne de feuilles', description: 'Harmonie avec la nature', category: 'Objets', obtained: false, rarity: 'rare', icon: 'ð¿', howToObtain: 'ComplÃ©ter toutes les quÃªtes Nutrition en un mois' },
  { id: 'i6', name: 'PoussiÃ¨re d\'Ã©toile', description: 'Poudre de rÃªves', category: 'Objets', obtained: false, rarity: 'legendary', icon: 'â¨', howToObtain: 'Atteindre le niveau 100' },
  // SuccÃ¨s
  { id: 'a1', name: 'Premiers pas', description: 'PremiÃ¨re connexion', category: 'SuccÃ¨s', obtained: true, rarity: 'common', icon: 'ð£', obtainedDate: '2023-11-01', howToObtain: 'Se connecter pour la premiÃ¨re fois' },
  { id: 'a2', name: 'Guerrier de la semaine', description: '7 jours consÃ©cutifs', category: 'SuccÃ¨s', obtained: true, rarity: 'common', icon: 'ð', obtainedDate: '2023-11-08', howToObtain: 'ComplÃ©ter 7 jours consÃ©cutifs' },
  { id: 'a3', name: 'Niveau 10', description: 'Atteindre le niveau 10', category: 'SuccÃ¨s', obtained: true, rarity: 'rare', icon: 'ð¯', obtainedDate: '2023-11-30', howToObtain: 'Atteindre le niveau 10' },
  { id: 'a4', name: 'Papillon social', description: 'Rejoindre une guilde', category: 'SuccÃ¨s', obtained: false, rarity: 'common', icon: 'ð¦', howToObtain: 'Rejoindre ou crÃ©er une guilde' },
  { id: 'a5', name: 'Tueur de boss', description: 'Vaincre 3 boss', category: 'SuccÃ¨s', obtained: false, rarity: 'epic', icon: 'âï¸', howToObtain: 'Participer Ã  la dÃ©faite de 3 boss mensuels' },
  { id: 'a6', name: 'Perfectionniste', description: 'Score parfait une semaine', category: 'SuccÃ¨s', obtained: false, rarity: 'legendary', icon: 'ð', howToObtain: 'Obtenir des scores parfaits dans toutes les catÃ©gories pendant une semaine' },
];

const CATEGORIES: CollectibleCategory[] = ['Tout', 'Badges', 'Objets', 'SuccÃ¨s'];

const RARITY_COLORS: Record<Collectible['rarity'], string> = {
  common: Colors.rarityCommon,
  rare: Colors.rarityRare,
  epic: Colors.rarityEpic,
  legendary: Colors.rarityLegendary,
};

const RARITY_BG: Record<Collectible['rarity'], string> = {
  common: Colors.rarityCommonBg,
  rare: Colors.rarityRareBg,
  epic: Colors.rarityEpicBg,
  legendary: Colors.rarityLegendaryBg,
};

const RARITY_LABELS: Record<Collectible['rarity'], string> = {
  common: 'Commun',
  rare: 'Rare',
  epic: 'Ãpique',
  legendary: 'LÃ©gendaire',
};

// âââ CollectionProgress âââââââââââââââââââââââââââââââââââââââââââââââââââââââ

const CollectionProgress: React.FC<{ total: number; obtained: number }> = React.memo(
  ({ total, obtained }) => {
    const animVal = useRef(new Animated.Value(0)).current;
    const progress = total > 0 ? obtained / total : 0;

    useEffect(() => {
      const animation = Animated.timing(animVal, {
        toValue: progress,
        duration: 1000,
        useNativeDriver: false,
      });
      animation.start();
      return () => animation.stop();
    }, [progress, animVal]);

    const barWidth = animVal.interpolate({
      inputRange: [0, 1],
      outputRange: ['0%', '100%'],
    });

    return (
      <View style={styles.progressContainer}>
        <View style={styles.progressHeader}>
          <View>
            <Text style={styles.progressLabel}>COLLECTION</Text>
            <Text style={styles.progressCount}>
              {obtained}
              <Text style={styles.progressTotal}>/{total} collectibles</Text>
            </Text>
          </View>
          <View style={styles.progressCircle}>
            <Text style={styles.progressPercent}>{Math.round(progress * 100)}%</Text>
          </View>
        </View>
        <View style={styles.progressBarBg}>
          <Animated.View style={[styles.progressBarFill, { width: barWidth }]} />
        </View>
      </View>
    );
  }
);

// âââ GlowView âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

const GlowView: React.FC<{ color: string; children: React.ReactNode; style?: object }> = React.memo(
  ({ color, children, style }) => {
    const animVal = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(animVal, { toValue: 1, duration: 2000, useNativeDriver: true }),
          Animated.timing(animVal, { toValue: 0, duration: 2000, useNativeDriver: true }),
        ])
      );
      animation.start();
      return () => animation.stop();
    }, [animVal]);

    const opacity = animVal.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0.9] });

    const glowStyle = useMemo(
      () => ({
        borderColor: color,
        shadowColor: color,
      }),
      [color]
    );

    return (
      <Animated.View style={[styles.glowView, glowStyle, { opacity }, style]}>
        {children}
      </Animated.View>
    );
  }
);

// âââ CollectibleItem ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

const CollectibleItem: React.FC<{ item: Collectible; onPress: (item: Collectible) => void }> = React.memo(
  ({ item, onPress }) => {
    const rarityColor = RARITY_COLORS[item.rarity];

    const handlePress = useCallback(() => {
      onPress(item);
    }, [onPress, item]);

    const itemContainerStyle = useMemo(
      () => ([
        styles.collectibleInner,
        !item.obtained && styles.collectibleInnerLocked,
      ]),
      [item.obtained]
    );

    const inner = (
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [
          itemContainerStyle,
          pressed && styles.collectiblePressed,
        ]}
      >
        <Text style={[styles.collectibleIcon, !item.obtained && styles.collectibleIconLocked]}>
          {item.icon}
        </Text>
        <Text
          style={[
            styles.collectibleName,
            item.obtained ? styles.collectibleNameObtained : styles.collectibleNameLocked,
          ]}
          numberOfLines={2}
        >
          {item.name}
        </Text>

        {item.obtained && (
          <View style={[styles.rarityDot, { backgroundColor: rarityColor }]} />
        )}

        {!item.obtained && (
          <View style={styles.lockOverlay}>
            <Text style={styles.lockIcon}>ð</Text>
          </View>
        )}
      </Pressable>
    );

    const wrapperStyle = useMemo(
      () => ({ width: ITEM_SIZE, height: ITEM_SIZE + 30, marginBottom: 10 }),
      []
    );

    if (item.obtained) {
      return (
        <GlowView color={rarityColor} style={wrapperStyle}>
          {inner}
        </GlowView>
      );
    }

    return <View style={wrapperStyle}>{inner}</View>;
  }
);

// âââ DetailModal ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

const DetailModal: React.FC<{ item: Collectible | null; onClose: () => void }> = React.memo(
  ({ item, onClose }) => {
    if (!item) return null;
    const rarityColor = RARITY_COLORS[item.rarity];
    const rarityBg = RARITY_BG[item.rarity];

    const modalContentStyle = useMemo(
      () => ([
        styles.modalContent,
        { borderColor: rarityColor + '55' },
      ]),
      [rarityColor]
    );

    const iconContainerStyle = useMemo(
      () => ([
        styles.modalIconContainer,
        { backgroundColor: rarityBg, borderColor: rarityColor + '55' },
      ]),
      [rarityBg, rarityColor]
    );

    const rarityBadgeStyle = useMemo(
      () => ([styles.rarityBadge, { backgroundColor: rarityBg }]),
      [rarityBg]
    );

    return (
      <Modal visible={!!item} transparent animationType="fade" onRequestClose={onClose}>
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalDismissArea} onPress={onClose} />
          <View style={modalContentStyle}>
            {/* IcÃ´ne */}
            <View style={styles.modalIconWrapper}>
              <View style={iconContainerStyle}>
                <Text style={styles.modalIconText}>{item.icon}</Text>
              </View>
              <Text style={styles.modalTitle}>{item.name}</Text>
              <View style={rarityBadgeStyle}>
                <Text style={[styles.rarityBadgeText, { color: rarityColor }]}>
                  {RARITY_LABELS[item.rarity]}
                </Text>
              </View>
            </View>

            <Text style={styles.modalDescription}>{item.description}</Text>

            <View style={styles.modalInfoBox}>
              <Text style={styles.modalInfoLabel}>
                {item.obtained ? 'â OBTENU LE' : 'ð COMMENT OBTENIR'}
              </Text>
              <Text style={styles.modalInfoValue}>
                {item.obtained ? (item.obtainedDate ?? '') : item.howToObtain}
              </Text>
            </View>

            <Pressable
              onPress={onClose}
              style={({ pressed }) => [
                styles.modalCloseButton,
                pressed && styles.modalCloseButtonPressed,
              ]}
            >
              <Text style={styles.modalCloseText}>Fermer</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    );
  }
);

// âââ CategoryTabs âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

const CategoryTabs: React.FC<{
  selected: CollectibleCategory;
  onSelect: (c: CollectibleCategory) => void;
  counts: Record<CollectibleCategory, number>;
}> = React.memo(({ selected, onSelect, counts }) => (
  <FlatList
    horizontal
    showsHorizontalScrollIndicator={false}
    data={CATEGORIES}
    keyExtractor={(item) => item}
    contentContainerStyle={styles.categoryTabsContent}
    renderItem={({ item }) => {
      const isActive = item === selected;
      return (
        <Pressable
          onPress={() => onSelect(item)}
          style={({ pressed }) => [
            styles.categoryTab,
            isActive ? styles.categoryTabActive : styles.categoryTabInactive,
            pressed && styles.categoryTabPressed,
          ]}
        >
          <Text
            style={[
              styles.categoryTabText,
              isActive ? styles.categoryTabTextActive : styles.categoryTabTextInactive,
            ]}
          >
            {item}
          </Text>
          <View style={[styles.categoryCount, isActive ? styles.categoryCountActive : styles.categoryCountInactive]}>
            <Text
              style={[
                styles.categoryCountText,
                isActive ? styles.categoryCountTextActive : styles.categoryCountTextInactive,
              ]}
            >
              {counts[item]}
            </Text>
          </View>
        </Pressable>
      );
    }}
  />
));

// âââ LÃ©gende des raretÃ©s ââââââââââââââââââââââââââââââââââââââââââââââââââââââ

const RarityLegend: React.FC = React.memo(() => (
  <View style={styles.rarityLegend}>
    {(Object.keys(RARITY_COLORS) as Collectible['rarity'][]).map((r) => (
      <View key={r} style={styles.rarityLegendItem}>
        <View style={[styles.rarityLegendDot, { backgroundColor: RARITY_COLORS[r] }]} />
        <Text style={styles.rarityLegendText}>{RARITY_LABELS[r]}</Text>
      </View>
    ))}
  </View>
));

// âââ Ãcran principal ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

export const CollectiblesScreen: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<CollectibleCategory>('Tout');
  const [selectedItem, setSelectedItem] = useState<Collectible | null>(null);

  const handleSelectItem = useCallback((item: Collectible) => {
    setSelectedItem(item);
  }, []);

  const handleCloseModal = useCallback(() => {
    setSelectedItem(null);
  }, []);

  const handleSelectCategory = useCallback((category: CollectibleCategory) => {
    setSelectedCategory(category);
  }, []);

  const filteredItems = useMemo(
    () =>
      selectedCategory === 'Tout'
        ? COLLECTIBLES
        : COLLECTIBLES.filter((c) => c.category === selectedCategory),
    [selectedCategory]
  );

  const counts = useMemo<Record<CollectibleCategory, number>>(
    () => ({
      Tout: COLLECTIBLES.length,
      Badges: COLLECTIBLES.filter((c) => c.category === 'Badges').length,
      Objets: COLLECTIBLES.filter((c) => c.category === 'Objets').length,
      SuccÃ¨s: COLLECTIBLES.filter((c) => c.category === 'SuccÃ¨s').length,
    }),
    []
  );

  const obtainedCount = useMemo(
    () => filteredItems.filter((c) => c.obtained).length,
    [filteredItems]
  );

  const rows = useMemo<Collectible[][]>(() => {
    const result: Collectible[][] = [];
    for (let i = 0; i < filteredItems.length; i += COLUMN_COUNT) {
      result.push(filteredItems.slice(i, i + COLUMN_COUNT));
    }
    return result;
  }, [filteredItems]);

  const ListHeader = useMemo(
    () => (
      <>
        <CollectionProgress total={filteredItems.length} obtained={obtainedCount} />
        <CategoryTabs selected={selectedCategory} onSelect={handleSelectCategory} counts={counts} />
        <RarityLegend />
      </>
    ),
    [filteredItems.length, obtainedCount, selectedCategory, handleSelectCategory, counts]
  );

  const renderRow = useCallback(
    ({ item: row }: { item: Collectible[] }) => (
      <View style={styles.gridRow}>
        {row.map((collectible) => (
          <CollectibleItem
            key={collectible.id}
            item={collectible}
            onPress={handleSelectItem}
          />
        ))}
        {row.length < COLUMN_COUNT &&
          Array.from({ length: COLUMN_COUNT - row.length }).map((_, i) => (
            <View key={`empty-${i}`} style={styles.emptySlot} />
          ))}
      </View>
    ),
    [handleSelectItem]
  );

  const keyExtractor = useCallback((_: Collectible[], index: number) => `row-${index}`, []);

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
      <SafeAreaView style={styles.safeArea}>
        {/* En-tÃªte */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Collectibles</Text>
          <Text style={styles.headerSubtitle}>DÃ©bloquez des objets en progressant</Text>
        </View>

        <FlatList
          data={rows}
          keyExtractor={keyExtractor}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={ListHeader}
          renderItem={renderRow}
        />

        <DetailModal item={selectedItem} onClose={handleCloseModal} />
      </SafeAreaView>
    </View>
  );
};

// âââ Styles âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

const styles = StyleSheet.create({
  // Ãcran
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  safeArea: {
    flex: 1,
  },
  // En-tÃªte
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerTitle: {
    color: Colors.textPrimary,
    fontSize: 24,
    fontWeight: '800',
  },
  headerSubtitle: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  // Liste
  listContent: {
    paddingBottom: 32,
  },
  // CollectionProgress
  progressContainer: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  progressLabel: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
  },
  progressCount: {
    color: Colors.textPrimary,
    fontSize: 20,
    fontWeight: '800',
    marginTop: 2,
  },
  progressTotal: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '400',
  },
  progressCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.accentAlpha,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.accentBorder,
  },
  progressPercent: {
    color: Colors.accent,
    fontSize: 14,
    fontWeight: '800',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: Colors.surfaceDeep,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: Colors.accent,
  },
  // GlowView
  glowView: {
    borderRadius: 14,
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 8,
  },
  // CollectibleItem
  collectibleInner: {
    width: ITEM_SIZE,
    height: ITEM_SIZE + 30,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  collectibleInnerLocked: {
    borderWidth: 1,
    borderColor: Colors.border,
  },
  collectiblePressed: {
    opacity: 0.8,
  },
  collectibleIcon: {
    fontSize: 34,
  },
  collectibleIconLocked: {
    opacity: 0.25,
  },
  collectibleName: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 6,
    textAlign: 'center',
    paddingHorizontal: 4,
  },
  collectibleNameObtained: {
    color: Colors.textPrimary,
  },
  collectibleNameLocked: {
    color: Colors.textLocked,
  },
  rarityDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  lockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.surfaceOverlay,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },
  lockIcon: {
    fontSize: 20,
  },
  // Grille
  gridRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 10,
  },
  emptySlot: {
    width: ITEM_SIZE,
    height: ITEM_SIZE + 30,
  },
  // DetailModal
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalDismissArea: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderRadius: 24,
    padding: 24,
    width: '100%',
    borderWidth: 1.5,
  },
  modalIconWrapper: {
    alignItems: 'center',
    marginBottom: 16,
  },
  modalIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    marginBottom: 12,
  },
  modalIconText: {
    fontSize: 42,
  },
  modalTitle: {
    color: Colors.textPrimary,
    fontSize: 22,
    fontWeight: '800',
  },
  rarityBadge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 6,
  },
  rarityBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  modalDescription: {
    color: Colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  modalInfoBox: {
    backgroundColor: Colors.surfaceDeep,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  modalInfoLabel: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  modalInfoValue: {
    color: Colors.textPrimary,
    fontSize: 13,
    lineHeight: 18,
  },
  modalCloseButton: {
    backgroundColor: Colors.accent,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalCloseButtonPressed: {
    opacity: 0.8,
  },
  modalCloseText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
  // CategoryTabs
  categoryTabsContent: {
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
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  categoryTabInactive: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
  },
  categoryTabPressed: {
    opacity: 0.8,
  },
  categoryTabText: {
    fontSize: 13,
  },
  categoryTabTextActive: {
    color: Colors.white,
    fontWeight: '700',
  },
  categoryTabTextInactive: {
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  categoryCount: {
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  categoryCountActive: {
    backgroundColor: Colors.whiteAlpha,
  },
  categoryCountInactive: {
    backgroundColor: Colors.border,
  },
  categoryCountText: {
    fontSize: 11,
    fontWeight: '600',
  },
  categoryCountTextActive: {
    color: Colors.white,
  },
  categoryCountTextInactive: {
    color: Colors.textSecondary,
  },
  // LÃ©gende des raretÃ©s
  rarityLegend: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 14,
    gap: 12,
    flexWrap: 'wrap',
  },
  rarityLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rarityLegendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  rarityLegendText: {
    color: Colors.textSecondary,
    fontSize: 11,
  },
});

export default CollectiblesScreen;
