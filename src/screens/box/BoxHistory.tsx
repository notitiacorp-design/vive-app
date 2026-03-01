import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// âââ Theme Colors âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

const Colors = {
  background: '#080810',
  surface: '#111118',
  surfaceElevated: '#1C1C28',
  primary: '#3D8BFF',
  primaryDim: '#3D8BFF1A',
  primaryAccent: '#3D8BFF33',
  primaryDeep: '#1A3A6B',
  success: '#4ECDC4',
  successDim: '#4ECDC41A',
  warning: '#F7B731',
  warningDim: '#F7B7311A',
  textPrimary: '#E8E8F0',
  textSecondary: '#A8A8C0',
  white: '#FFFFFF',
  border: '#1C1C28',
  activeBorder: '#3D8BFF33',
  notesBorder: '#3D8BFF22',
};

// âââ Types ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

type BoxStatus = 'delivered' | 'active' | 'completed' | 'pending';

interface BoxItem {
  id: string;
  month: number;
  year: number;
  name: string;
  status: BoxStatus;
  hero_module: string;
  products: string[];
  notes?: string;
  missions_completed: number;
  missions_total: number;
}

interface SupabaseBoxRow {
  id: string;
  validated_at: string;
  box_name: string | null;
  status: string | null;
  hero_module_name: string | null;
  products: string[] | null;
  notes: string | null;
  missions_completed: number | null;
  missions_total: number | null;
  user_id: string;
  created_at: string;
}

// âââ Service / Mapping ââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

function mapBoxRow(row: SupabaseBoxRow): BoxItem {
  return {
    id: row.id,
    month: new Date(row.validated_at).getMonth() + 1,
    year: new Date(row.validated_at).getFullYear(),
    name: row.box_name ?? 'VIVE Box',
    status: (row.status as BoxStatus) ?? 'delivered',
    hero_module: row.hero_module_name ?? 'Module hÃ©ros',
    products: row.products ?? [],
    notes: row.notes ?? undefined,
    missions_completed: row.missions_completed ?? 0,
    missions_total: row.missions_total ?? 3,
  };
}

// âââ Supabase fetch âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

async function fetchBoxHistory(): Promise<BoxItem[]> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) throw authError;
  if (!user) throw new Error('Non authentifiÃ©');

  const { data, error } = await supabase
    .from('box_validations')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data ?? []).map((row: SupabaseBoxRow) => mapBoxRow(row));
}

// âââ Demo/Mock data âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// These are demonstration data only and are shown clearly as such

const DEMO_BOXES: BoxItem[] = [
  {
    id: 'demo-1',
    month: 11,
    year: 2024,
    name: '[DÃ©mo] Box VitalitÃ© Hivernale',
    status: 'completed',
    hero_module: 'MÃ©ditation Pleine Conscience',
    products: ['Diffuseur Ultrasons', 'Huile Eucalyptus Bio', 'Carnet Gratitude'],
    notes: 'Exemple de retour utilisateur.',
    missions_completed: 3,
    missions_total: 3,
  },
  {
    id: 'demo-2',
    month: 10,
    year: 2024,
    name: '[DÃ©mo] Box Ancrage Automne',
    status: 'completed',
    hero_module: 'CohÃ©rence Cardiaque',
    products: ['Roller Jade', 'Tisane AdaptogÃ¨ne', 'Guide Respiration'],
    notes: 'Exemple de retour utilisateur.',
    missions_completed: 3,
    missions_total: 3,
  },
  {
    id: 'demo-3',
    month: 9,
    year: 2024,
    name: '[DÃ©mo] Box Ãnergie Pure',
    status: 'active',
    hero_module: 'Nutrition Intuitive',
    products: ['Spiruline Premium', 'Carnet Alimentaire', 'Recettes DÃ©tox'],
    missions_completed: 1,
    missions_total: 3,
  },
];

// âââ Helpers âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

const MONTH_NAMES_FR = [
  'Janvier', 'FÃ©vrier', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'AoÃ»t', 'Septembre', 'Octobre', 'Novembre', 'DÃ©cembre',
];

function getMonthLabel(month: number, year: number): string {
  return `${MONTH_NAMES_FR[month - 1]} ${year}`;
}

const STATUS_CONFIG: Record<BoxStatus, { label: string; color: string; bg: string; icon: string }> = {
  delivered: { label: 'LivrÃ©e', color: Colors.textSecondary, bg: Colors.surfaceElevated, icon: 'ð¦' },
  active: { label: 'En cours', color: Colors.primary, bg: Colors.primaryDim, icon: 'â¡' },
  completed: { label: 'ComplÃ©tÃ©e', color: Colors.success, bg: Colors.successDim, icon: 'â¦' },
  pending: { label: 'En attente', color: Colors.warning, bg: Colors.warningDim, icon: 'â³' },
};

// âââ Sub-components âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

const StatusBadge = React.memo(function StatusBadge({ status }: { status: BoxStatus }) {
  const config = STATUS_CONFIG[status];
  return (
    <View
      style={[
        styles.statusBadge,
        { backgroundColor: config.bg },
      ]}
    >
      <Text style={styles.statusBadgeIcon}>{config.icon}</Text>
      <Text style={[styles.statusBadgeLabel, { color: config.color }]}>
        {config.label}
      </Text>
    </View>
  );
});

const MissionProgress = React.memo(function MissionProgress({
  completed,
  total,
}: {
  completed: number;
  total: number;
}) {
  const progress = total > 0 ? completed / total : 0;
  const progressColor = progress === 1 ? Colors.success : Colors.primary;
  return (
    <View style={styles.missionProgressContainer}>
      <View style={styles.missionProgressHeader}>
        <Text style={styles.missionLabel}>Missions</Text>
        <Text style={styles.missionLabel}>
          {completed}/{total}
        </Text>
      </View>
      <View style={styles.missionProgressTrack}>
        <View
          style={[
            styles.missionProgressFill,
            { width: `${progress * 100}%`, backgroundColor: progressColor },
          ]}
        />
      </View>
    </View>
  );
});

const BoxCard = React.memo(function BoxCard({ item }: { item: BoxItem }) {
  const [expanded, setExpanded] = useState(false);
  const rotateAnim = React.useRef(new Animated.Value(0)).current;

  const toggleExpand = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((prev) => !prev);
    Animated.timing(rotateAnim, {
      toValue: expanded ? 0 : 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [expanded, rotateAnim]);

  const chevronRotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const statusConfig = STATUS_CONFIG[item.status];
  const isActive = item.status === 'active';

  return (
    <View
      style={[
        styles.boxCard,
        { borderColor: isActive ? Colors.activeBorder : Colors.border },
      ]}
    >
      {/* Active accent bar */}
      {isActive && (
        <LinearGradient
          colors={[Colors.primary, Colors.primaryDeep]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.activeAccentBar}
        />
      )}

      {/* Card header */}
      <Pressable
        onPress={toggleExpand}
        style={({ pressed }) => [styles.cardPressable, { opacity: pressed ? 0.9 : 1 }]}
      >
        <View style={styles.cardHeaderRow}>
          {/* Box icon */}
          <View style={styles.boxIconContainer}>
            <Text style={styles.boxIcon}>{statusConfig.icon}</Text>
          </View>
          {/* Info */}
          <View style={styles.cardInfo}>
            <View style={styles.cardInfoTopRow}>
              <Text style={styles.monthLabel}>
                {getMonthLabel(item.month, item.year)}
              </Text>
              <StatusBadge status={item.status} />
            </View>
            <Text style={styles.boxName}>{item.name}</Text>
            <Text style={styles.heroModule}>â¦ {item.hero_module}</Text>
          </View>
          {/* Chevron */}
          <Animated.View style={[styles.chevron, { transform: [{ rotate: chevronRotate }] }]}>
            <Text style={styles.chevronText}>â</Text>
          </Animated.View>
        </View>

        <MissionProgress completed={item.missions_completed} total={item.missions_total} />
      </Pressable>

      {/* Expanded content */}
      {expanded && (
        <View style={styles.expandedContent}>
          {/* Products list */}
          <Text style={styles.sectionTitle}>Contenu de la box</Text>
          {item.products.map((product, index) => (
            <View
              key={`${item.id}-product-${index}`}
              style={[
                styles.productRow,
                {
                  borderBottomWidth: index < item.products.length - 1 ? 1 : 0,
                  borderBottomColor: Colors.border,
                },
              ]}
            >
              <View style={styles.productDot} />
              <Text style={styles.productText}>{product}</Text>
            </View>
          ))}

          {/* Notes */}
          {item.notes ? (
            <View style={styles.notesContainer}>
              <Text style={styles.notesTitle}>Mon retour</Text>
              <Text style={styles.notesText}>"{item.notes}"</Text>
            </View>
          ) : null}
        </View>
      )}
    </View>
  );
});

const EmptyState = React.memo(function EmptyState() {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconContainer}>
        <Text style={styles.emptyIcon}>ð¦</Text>
      </View>
      <Text style={styles.emptyTitle}>Aucune box reÃ§ue</Text>
      <Text style={styles.emptySubtitle}>
        Votre premiÃ¨re box VIVE vous attend. Validez votre sÃ©lection pour commencer votre parcours.
      </Text>
    </View>
  );
});

const ErrorState = React.memo(function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <View style={styles.errorState}>
      <Text style={styles.errorTitle}>Impossible de charger vos boxes</Text>
      <Text style={styles.errorSubtitle}>VÃ©rifiez votre connexion et rÃ©essayez.</Text>
      <Pressable
        onPress={onRetry}
        style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
      >
        <View style={styles.retryButton}>
          <Text style={styles.retryButtonText}>RÃ©essayer</Text>
        </View>
      </Pressable>
    </View>
  );
});

// âââ Main Screen ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

export default function BoxHistory() {
  const navigation = useNavigation();

  const { data, isLoading, isError, refetch, isFetching } = useQuery<BoxItem[], Error>({
    queryKey: ['box-history'],
    queryFn: fetchBoxHistory,
    staleTime: 1000 * 60 * 2, // 2 min
  });

  // Use real data or empty array; show demo data only explicitly if needed
  const boxes = data ?? [];
  const isDemoMode = !data && !isLoading && !isError;
  const displayBoxes = isDemoMode ? DEMO_BOXES : boxes;

  const stats = useMemo(
    () => ({
      completed: displayBoxes.filter((b) => b.status === 'completed').length,
      active: displayBoxes.filter((b) => b.status === 'active').length,
      missionsCompleted: displayBoxes.reduce((acc, b) => acc + b.missions_completed, 0),
    }),
    [displayBoxes]
  );

  const boxCountLabel = useMemo(() => {
    if (displayBoxes.length === 0) return 'Aucune box';
    return `${displayBoxes.length} box${displayBoxes.length > 1 ? 'es' : ''} reÃ§ue${displayBoxes.length > 1 ? 's' : ''}`;
  }, [displayBoxes.length]);

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const renderItem = useCallback(
    ({ item }: { item: BoxItem }) => <BoxCard item={item} />,
    []
  );

  const keyExtractor = useCallback((item: BoxItem) => item.id, []);

  const listHeader = useMemo(() => {
    if (displayBoxes.length === 0) return null;
    return (
      <View style={styles.statsContainer}>
        {isDemoMode && (
          <Text style={styles.demoBanner}>â ï¸ Mode dÃ©monstration â donnÃ©es fictives</Text>
        )}
        {[
          { label: 'ComplÃ©tÃ©es', value: stats.completed, color: Colors.success },
          { label: 'En cours', value: stats.active, color: Colors.primary },
          { label: 'Missions â', value: stats.missionsCompleted, color: Colors.textPrimary },
        ].map((stat) => (
          <View key={stat.label} style={styles.statItem}>
            <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>
    );
  }, [displayBoxes.length, stats, isDemoMode]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />
      <SafeAreaView style={styles.flex1} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Text style={styles.backButtonText}>â</Text>
          </Pressable>
          <View style={styles.flex1}>
            <Text style={styles.headerTitle}>Historique des boxes</Text>
            <Text style={styles.headerSubtitle}>{boxCountLabel}</Text>
          </View>
          {/* Stats badge */}
          {displayBoxes.length > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeValue}>{displayBoxes.length}</Text>
              <Text style={styles.countBadgeLabel}>BOXES</Text>
            </View>
          )}
        </View>

        {/* Loading */}
        {isLoading && (
          <View style={styles.centered}>
            <ActivityIndicator color={Colors.primary} size="large" />
            <Text style={styles.loadingText}>Chargementâ¦</Text>
          </View>
        )}

        {/* Error */}
        {isError && !isLoading && <ErrorState onRetry={handleRefresh} />}

        {/* List */}
        {!isLoading && (
          <FlatList<BoxItem>
            data={displayBoxes}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={<EmptyState />}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isFetching && !isLoading}
                onRefresh={handleRefresh}
                tintColor={Colors.primary}
                colors={[Colors.primary]}
              />
            }
            ListHeaderComponent={listHeader}
          />
        )}
      </SafeAreaView>
    </View>
  );
}

// âââ Styles âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  flex1: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginTop: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    marginRight: 14,
    padding: 4,
  },
  backButtonText: {
    color: Colors.textSecondary,
    fontSize: 20,
  },
  headerTitle: {
    color: Colors.textPrimary,
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 1,
  },
  countBadge: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: 'center',
  },
  countBadgeValue: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '700',
  },
  countBadgeLabel: {
    color: Colors.textSecondary,
    fontSize: 9,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
    flexGrow: 1,
  },
  statsContainer: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    flexDirection: 'row',
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  demoBanner: {
    color: Colors.warning,
    fontSize: 11,
    textAlign: 'center',
    width: '100%',
    marginBottom: 8,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
  },
  statLabel: {
    color: Colors.textSecondary,
    fontSize: 10,
    marginTop: 2,
    textAlign: 'center',
  },
  // BoxCard
  boxCard: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    marginBottom: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  activeAccentBar: {
    height: 3,
  },
  cardPressable: {
    padding: 16,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  boxIconContainer: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  boxIcon: {
    fontSize: 22,
  },
  cardInfo: {
    flex: 1,
  },
  cardInfoTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  monthLabel: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  boxName: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  heroModule: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  chevron: {
    marginLeft: 8,
    marginTop: 12,
  },
  chevronText: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  expandedContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  sectionTitle: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginTop: 14,
    marginBottom: 8,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 10,
  },
  productDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
  },
  productText: {
    color: Colors.textPrimary,
    fontSize: 13,
    flex: 1,
  },
  notesContainer: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 12,
    padding: 12,
    marginTop: 14,
    borderLeftWidth: 2,
    borderLeftColor: Colors.primary,
  },
  notesTitle: {
    color: Colors.textSecondary,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 5,
  },
  notesText: {
    color: Colors.textPrimary,
    fontSize: 13,
    lineHeight: 19,
    fontStyle: 'italic',
  },
  // StatusBadge
  statusBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusBadgeIcon: {
    fontSize: 10,
  },
  statusBadgeLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  // MissionProgress
  missionProgressContainer: {
    marginTop: 12,
  },
  missionProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  missionLabel: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '500',
  },
  missionProgressTrack: {
    height: 4,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 2,
    overflow: 'hidden',
  },
  missionProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  // EmptyState
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.notesBorder,
  },
  emptyIcon: {
    fontSize: 36,
  },
  emptyTitle: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  emptySubtitle: {
    color: Colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
  },
  // ErrorState
  errorState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  errorTitle: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorSubtitle: {
    color: Colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  retryButtonText: {
    color: Colors.white,
    fontWeight: '600',
    fontSize: 14,
  },
});
