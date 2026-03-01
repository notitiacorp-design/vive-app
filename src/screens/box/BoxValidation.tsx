import React, { useState, useRef, useCallback, useEffect, memo } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  Animated,
  StatusBar,
  ActivityIndicator,
  Alert,
  StyleSheet,
  ListRenderItemInfo,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { BoxStackParamList } from '../../navigation/types';

// âââ Types âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

type NavigationProp = NativeStackNavigationProp<BoxStackParamList, 'BoxValidation'>;

interface Mission {
  id: string;
  title: string;
  description: string;
  icon: string;
}

interface HeroModule {
  id: string;
  name: string;
  category: string;
  description: string;
  duration: string;
  level: string;
}

interface BoxValidationPayload {
  hero_module_id: string;
  missions_accepted: string[];
  validated_at: string;
}

// âââ ThÃ¨me âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

const Theme = {
  colors: {
    background: '#080810',
    surface: '#111118',
    surfaceElevated: '#1C1C28',
    border: '#1C1C28',
    borderAccent: '#3D8BFF33',
    borderAccentMid: '#3D8BFF44',
    borderAccentFaint: '#3D8BFF22',
    textPrimary: '#E8E8F0',
    textSecondary: '#A8A8C0',
    textMuted: '#A8A8C060',
    textMutedBorder: '#A8A8C044',
    accent: '#3D8BFF',
    accentDark: '#1A5FCC',
    accentDeep: '#1A3A6B',
    accentBg: '#3D8BFF1A',
    accentBgFaint: '#3D8BFF0D',
    accentBgDeep: '#3D8BFF22',
    error: '#FF6B6B',
    white: '#FFFFFF',
    gradientSurface: '#1C2A44',
    checkboxBorder: '#3D8BFF',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 14,
    base: 16,
    lg: 20,
    xl: 24,
    xxl: 28,
  },
  radius: {
    sm: 7,
    md: 10,
    lg: 14,
    xl: 16,
    xxl: 20,
  },
  font: {
    xs: 10,
    sm: 11,
    base: 12,
    md: 13,
    body: 14,
    subtitle: 15,
    title: 17,
    heading: 18,
    icon: 20,
    iconLg: 24,
    iconXl: 28,
    cta: 16,
  },
} as const;

// âââ Service âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

async function saveBoxValidation(payload: BoxValidationPayload): Promise<void> {
  if (!payload.hero_module_id || payload.hero_module_id.trim() === '') {
    throw new Error('Module hÃ©ros invalide');
  }
  if (!payload.missions_accepted || payload.missions_accepted.length === 0) {
    throw new Error('Vous devez accepter au moins une mission');
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Non authentifiÃ©');

  const { error } = await supabase.from('box_validations').insert({
    user_id: user.id,
    hero_module_id: payload.hero_module_id,
    missions_accepted: payload.missions_accepted,
    validated_at: payload.validated_at,
    status: 'validated',
  });

  if (error) throw error;
}

// âââ Hook âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

function useBoxValidation() {
  const [heroModule, setHeroModule] = useState<HeroModule | null>(null);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      try {
        setLoading(true);
        setFetchError(null);

        const { data: moduleData, error: moduleError } = await supabase
          .from('hero_modules')
          .select('id, name, category, description, duration, level')
          .limit(1)
          .single();

        if (cancelled) return;
        if (moduleError) throw moduleError;
        if (moduleData) setHeroModule(moduleData as HeroModule);

        const { data: missionsData, error: missionsError } = await supabase
          .from('missions')
          .select('id, title, description, icon');

        if (cancelled) return;
        if (missionsError) throw missionsError;
        if (missionsData) setMissions(missionsData as Mission[]);
      } catch (err: unknown) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Erreur lors du chargement';
          setFetchError(message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();

    return () => {
      cancelled = true;
    };
  }, []);

  return { heroModule, missions, loading, fetchError };
}

// âââ Sub-components âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

const HeroModuleCard = memo(function HeroModuleCard({ module }: { module: HeroModule }) {
  return (
    <View style={styles.heroCard}>
      <LinearGradient
        colors={[Theme.colors.accent, Theme.colors.accentDeep]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.heroGradientBar}
      />
      <View style={styles.heroCardContent}>
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryBadgeText}>{module.category}</Text>
        </View>
        <View style={styles.heroRow}>
          <View style={styles.heroIconContainer}>
            <Text style={styles.heroIconText}>ð«§</Text>
          </View>
          <View style={styles.heroTextContainer}>
            <Text style={styles.heroName}>{module.name}</Text>
            <Text style={styles.heroDescription}>{module.description}</Text>
          </View>
        </View>
        <View style={styles.metaRow}>
          {[
            { label: module.duration, icon: 'â±' },
            { label: module.level, icon: 'â' },
          ].map((meta) => (
            <View key={meta.label} style={styles.metaItem}>
              <Text>{meta.icon}</Text>
              <Text style={styles.metaText}>{meta.label}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
});

const MysterySlot = memo(function MysterySlot() {
  const [flipped, setFlipped] = useState(false);
  const flipAnim = useRef(new Animated.Value(0)).current;

  const frontInterpolate = flipAnim.interpolate({
    inputRange: [0, 180],
    outputRange: ['0deg', '180deg'],
  });
  const backInterpolate = flipAnim.interpolate({
    inputRange: [0, 180],
    outputRange: ['180deg', '360deg'],
  });

  const handleFlip = useCallback(() => {
    if (flipped) return;
    Animated.spring(flipAnim, {
      toValue: 180,
      friction: 7,
      tension: 60,
      useNativeDriver: true,
    }).start(() => setFlipped(true));
  }, [flipped, flipAnim]);

  return (
    <View style={styles.mysteryContainer}>
      <Text style={styles.mysteryTitle}>Slot mystÃ¨re</Text>
      <Pressable onPress={handleFlip} style={styles.mysteryPressable}>
        <Animated.View
          style={[
            styles.mysteryCardBase,
            styles.mysteryFront,
            { transform: [{ rotateY: frontInterpolate }] },
          ]}
        >
          <Text style={styles.mysteryFrontIcon}>â</Text>
          <Text style={styles.mysteryFrontText}>Appuyer pour rÃ©vÃ©ler</Text>
          <Text style={styles.mysteryFrontSubText}>Contenu surprise sÃ©lectionnÃ© pour vous</Text>
        </Animated.View>
        <Animated.View
          style={[
            styles.mysteryCardBase,
            styles.mysteryBack,
            { transform: [{ rotateY: backInterpolate }] },
          ]}
        >
          <LinearGradient
            colors={[Theme.colors.gradientSurface, Theme.colors.surface]}
            style={styles.mysteryBackGradient}
          >
            <View style={styles.mysteryBackIconContainer}>
              <Text style={styles.mysteryBackIcon}>ð¿</Text>
            </View>
            <View style={styles.mysteryBackTextContainer}>
              <Text style={styles.mysteryBackTitle}>Huile essentielle Lavande</Text>
              <Text style={styles.mysteryBackSubtitle}>Bio Â· Grade thÃ©rapeutique Â· 10ml</Text>
              <View style={styles.surpriseBadge}>
                <Text style={styles.surpriseBadgeText}>SURPRISE â¦</Text>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>
      </Pressable>
    </View>
  );
});

const MissionItem = memo(function MissionItem({
  mission,
  checked,
  onToggle,
}: {
  mission: Mission;
  checked: boolean;
  onToggle: () => void;
}) {
  const checkAnim = useRef(new Animated.Value(checked ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(checkAnim, {
      toValue: checked ? 1 : 0,
      friction: 6,
      tension: 80,
      useNativeDriver: true,
    }).start();
  }, [checked, checkAnim]);

  const missionItemStyle = checked ? styles.missionItemChecked : styles.missionItemUnchecked;
  const checkboxStyle = checked ? styles.checkboxChecked : styles.checkboxUnchecked;

  return (
    <Pressable
      onPress={onToggle}
      style={({ pressed }) => ({
        opacity: pressed ? 0.85 : 1,
        transform: [{ scale: pressed ? 0.99 : 1 }],
      })}
    >
      <View style={[styles.missionItem, missionItemStyle]}>
        <View style={styles.missionIconContainer}>
          <Text style={styles.missionIcon}>{mission.icon}</Text>
        </View>
        <View style={styles.missionTextContainer}>
          <Text style={styles.missionTitle}>{mission.title}</Text>
          <Text style={styles.missionDescription}>{mission.description}</Text>
        </View>
        <Animated.View
          style={[
            styles.checkbox,
            checkboxStyle,
            {
              transform: [
                {
                  scale: checkAnim.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [1, 1.15, 1],
                  }),
                },
              ],
            },
          ]}
        >
          {checked && <Text style={styles.checkboxCheck}>â</Text>}
        </Animated.View>
      </View>
    </Pressable>
  );
});

// âââ Main Screen ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

interface ListSection {
  type: 'header' | 'hero' | 'mystery' | 'missions-header' | 'mission' | 'footer';
  id: string;
  data?: Mission;
  checkedCount?: number;
  totalCount?: number;
  heroModule?: HeroModule;
  checkedMissions?: Record<string, boolean>;
}

export default function BoxValidation() {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const [checkedMissions, setCheckedMissions] = useState<Record<string, boolean>>({});

  const { heroModule, missions, loading, fetchError } = useBoxValidation();

  const allChecked = missions.length > 0 && missions.every((m) => checkedMissions[m.id]);

  const toggleMission = useCallback((id: string) => {
    setCheckedMissions((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const mutation = useMutation<void, Error, BoxValidationPayload>({
    mutationFn: saveBoxValidation,
    onSuccess: () => {
      Alert.alert(
        'â¦ Box validÃ©e !',
        'Votre sÃ©lection est confirmÃ©e. Bon voyage dans cette nouvelle expÃ©rience VIVE.',
        [
          {
            text: 'Voir mes boxes',
            onPress: () => navigation.navigate('BoxHistory'),
          },
        ]
      );
    },
    onError: (err) => {
      Alert.alert('Erreur', err.message || 'Une erreur est survenue. Veuillez rÃ©essayer.');
    },
  });

  const handleConfirm = useCallback(() => {
    if (!allChecked || !heroModule) return;
    mutation.mutate({
      hero_module_id: heroModule.id,
      missions_accepted: missions.map((m) => m.id),
      validated_at: new Date().toISOString(),
    });
  }, [allChecked, heroModule, missions, mutation]);

  const ctaBottomPadding = insets.bottom > 0 ? insets.bottom : Theme.spacing.lg;
  const scrollBottomPadding = 80 + ctaBottomPadding + Theme.spacing.lg;

  const checkedCount = Object.values(checkedMissions).filter(Boolean).length;

  const listData: ListSection[] = React.useMemo(() => {
    if (!heroModule) return [];
    const sections: ListSection[] = [
      { type: 'hero', id: 'hero', heroModule },
      { type: 'mystery', id: 'mystery' },
      {
        type: 'missions-header',
        id: 'missions-header',
        checkedCount,
        totalCount: missions.length,
      },
      ...missions.map(
        (m): ListSection => ({
          type: 'mission',
          id: m.id,
          data: m,
        })
      ),
      { type: 'footer', id: 'footer' },
    ];
    return sections;
  }, [heroModule, missions, checkedCount]);

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<ListSection>) => {
      switch (item.type) {
        case 'hero':
          return (
            <View style={styles.heroSection}>
              <Text style={styles.sectionLabel}>Module hÃ©ros sÃ©lectionnÃ©</Text>
              {item.heroModule && <HeroModuleCard module={item.heroModule} />}
            </View>
          );
        case 'mystery':
          return (
            <View style={styles.mysterySlotSection}>
              <Text style={styles.sectionLabel}>Produit accompagnateur</Text>
              <MysterySlot />
            </View>
          );
        case 'missions-header':
          return (
            <View style={styles.missionsHeaderContainer}>
              <View style={styles.missionsSectionHeader}>
                <Text style={styles.missionsSectionLabel}>Serment missions</Text>
                <View style={styles.missionsCountBadge}>
                  <Text style={styles.missionsCountText}>
                    {item.checkedCount}/{item.totalCount}
                  </Text>
                </View>
              </View>
              <Text style={styles.missionsSubtitle}>
                Engagez-vous envers ces missions pour activer votre box. Votre parole est votre force.
              </Text>
            </View>
          );
        case 'mission':
          return item.data ? (
            <View style={styles.missionWrapper}>
              <MissionItem
                mission={item.data}
                checked={!!checkedMissions[item.data.id]}
                onToggle={() => toggleMission(item.data!.id)}
              />
            </View>
          ) : null;
        case 'footer':
          return <View style={{ height: scrollBottomPadding }} />;
        default:
          return null;
      }
    },
    [checkedMissions, toggleMission, scrollBottomPadding]
  );

  const keyExtractor = useCallback((item: ListSection) => item.id, []);

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={Theme.colors.background} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={Theme.colors.accent} size="large" />
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      </View>
    );
  }

  if (fetchError || !heroModule) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={Theme.colors.background} />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            {fetchError ?? 'Impossible de charger les donnÃ©es.'}
          </Text>
          <Pressable style={styles.retryButton} onPress={() => navigation.goBack()}>
            <Text style={styles.retryButtonText}>Retour</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Theme.colors.background} />
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backButtonText}>â</Text>
          </Pressable>
          <View>
            <Text style={styles.headerTitle}>Validation de box</Text>
            <Text style={styles.headerSubtitle}>Confirmez votre sÃ©lection</Text>
          </View>
        </View>

        <FlatList<ListSection>
          data={listData}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        />

        {/* CTA fixe */}
        <View style={[styles.ctaContainer, { paddingBottom: ctaBottomPadding }]}>
          {!allChecked && (
            <Text style={styles.ctaHint}>Acceptez toutes les missions pour confirmer</Text>
          )}
          <Pressable
            onPress={handleConfirm}
            disabled={!allChecked || mutation.isPending}
            style={({ pressed }) => ({
              opacity: !allChecked || mutation.isPending ? 0.45 : pressed ? 0.85 : 1,
              transform: [{ scale: pressed && allChecked ? 0.98 : 1 }],
            })}
          >
            <LinearGradient
              colors={
                allChecked
                  ? [Theme.colors.accent, Theme.colors.accentDark]
                  : [Theme.colors.surfaceElevated, Theme.colors.surfaceElevated]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.ctaGradient}
            >
              {mutation.isPending ? (
                <ActivityIndicator color={Theme.colors.white} size="small" />
              ) : (
                <Text
                  style={[
                    styles.ctaText,
                    { color: allChecked ? Theme.colors.white : Theme.colors.textSecondary },
                  ]}
                >
                  Je confirme mon serment â¦
                </Text>
              )}
            </LinearGradient>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

// âââ Styles âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: Theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  backButton: {
    marginRight: Theme.spacing.md,
    padding: Theme.spacing.xs,
  },
  backButtonText: {
    color: Theme.colors.textSecondary,
    fontSize: Theme.font.icon,
  },
  headerTitle: {
    color: Theme.colors.textPrimary,
    fontSize: Theme.font.title,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    color: Theme.colors.textSecondary,
    fontSize: Theme.font.base,
    marginTop: 1,
  },
  listContent: {
    paddingTop: Theme.spacing.xl,
  },
  heroSection: {
    marginBottom: Theme.spacing.sm,
  },
  sectionLabel: {
    color: Theme.colors.textSecondary,
    fontSize: Theme.font.sm,
    fontWeight: '600',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    marginLeft: Theme.spacing.lg,
    marginBottom: Theme.spacing.base,
  },
  heroCard: {
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.radius.xxl,
    overflow: 'hidden',
    marginHorizontal: Theme.spacing.lg,
    borderWidth: 1,
    borderColor: Theme.colors.borderAccent,
  },
  heroGradientBar: {
    height: 4,
  },
  heroCardContent: {
    padding: Theme.spacing.lg,
  },
  categoryBadge: {
    backgroundColor: Theme.colors.accentBg,
    borderWidth: 1,
    borderColor: Theme.colors.borderAccentMid,
    borderRadius: Theme.spacing.sm,
    paddingHorizontal: Theme.spacing.sm + 2,
    paddingVertical: 3,
    alignSelf: 'flex-start',
    marginBottom: Theme.spacing.base,
  },
  categoryBadgeText: {
    color: Theme.colors.accent,
    fontSize: Theme.font.xs,
    fontWeight: '600',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  heroIconContainer: {
    width: 72,
    height: 72,
    borderRadius: Theme.spacing.base,
    backgroundColor: Theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Theme.colors.borderAccentFaint,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Theme.spacing.md,
    flexShrink: 0,
  },
  heroIconText: {
    fontSize: Theme.font.iconXl,
  },
  heroTextContainer: {
    flex: 1,
  },
  heroName: {
    color: Theme.colors.textPrimary,
    fontSize: Theme.font.heading,
    fontWeight: '700',
    marginBottom: Theme.spacing.xs,
    letterSpacing: -0.3,
  },
  heroDescription: {
    color: Theme.colors.textSecondary,
    fontSize: Theme.font.md,
    lineHeight: 19,
  },
  metaRow: {
    flexDirection: 'row',
    marginTop: Theme.spacing.base,
    gap: Theme.spacing.sm + 2,
  },
  metaItem: {
    flex: 1,
    backgroundColor: Theme.colors.surfaceElevated,
    borderRadius: Theme.radius.md,
    padding: Theme.spacing.sm + 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    color: Theme.colors.textSecondary,
    fontSize: Theme.font.base,
    fontWeight: '500',
  },
  mysterySlotSection: {
    marginTop: Theme.spacing.xxl,
    marginBottom: Theme.spacing.sm,
  },
  mysteryContainer: {
    marginHorizontal: Theme.spacing.lg,
  },
  mysteryTitle: {
    color: Theme.colors.textPrimary,
    fontSize: Theme.font.subtitle,
    fontWeight: '700',
    marginBottom: Theme.spacing.base,
    letterSpacing: -0.2,
  },
  mysteryPressable: {
    height: 120,
  },
  mysteryCardBase: {
    width: '100%',
    height: 120,
    borderRadius: Theme.radius.xl,
    position: 'absolute',
    backfaceVisibility: 'hidden',
  },
  mysteryFront: {
    backgroundColor: Theme.colors.surfaceElevated,
    borderWidth: 1.5,
    borderColor: Theme.colors.borderAccentMid,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mysteryFrontIcon: {
    color: Theme.colors.accent,
    fontSize: Theme.font.iconXl,
    marginBottom: 6,
  },
  mysteryFrontText: {
    color: Theme.colors.textSecondary,
    fontSize: Theme.font.md,
    fontWeight: '500',
  },
  mysteryFrontSubText: {
    color: Theme.colors.textMuted,
    fontSize: Theme.font.sm,
    marginTop: 2,
  },
  mysteryBack: {
    borderRadius: Theme.radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#3D8BFF55',
  },
  mysteryBackGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Theme.spacing.base,
    flexDirection: 'row',
    gap: Theme.spacing.md,
  },
  mysteryBackIconContainer: {
    width: 52,
    height: 52,
    borderRadius: Theme.spacing.md,
    backgroundColor: Theme.colors.accentBgDeep,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Theme.colors.borderAccentMid,
  },
  mysteryBackIcon: {
    fontSize: Theme.font.iconLg,
  },
  mysteryBackTextContainer: {
    flex: 1,
  },
  mysteryBackTitle: {
    color: Theme.colors.textPrimary,
    fontSize: Theme.font.body,
    fontWeight: '700',
    marginBottom: 3,
  },
  mysteryBackSubtitle: {
    color: Theme.colors.textSecondary,
    fontSize: Theme.font.base,
    lineHeight: 17,
  },
  surpriseBadge: {
    backgroundColor: Theme.colors.accentBgDeep,
    borderRadius: 6,
    paddingHorizontal: Theme.spacing.sm,
    paddingVertical: 2,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  surpriseBadgeText: {
    color: Theme.colors.accent,
    fontSize: Theme.font.xs,
    fontWeight: '600',
  },
  missionsHeaderContainer: {
    marginTop: Theme.spacing.xxl,
    paddingHorizontal: Theme.spacing.lg,
  },
  missionsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  missionsSectionLabel: {
    color: Theme.colors.textSecondary,
    fontSize: Theme.font.sm,
    fontWeight: '600',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  missionsCountBadge: {
    backgroundColor: Theme.colors.accent,
    borderRadius: Theme.spacing.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: Theme.spacing.sm,
  },
  missionsCountText: {
    color: Theme.colors.white,
    fontSize: Theme.font.xs,
    fontWeight: '700',
  },
  missionsSubtitle: {
    color: Theme.colors.textSecondary,
    fontSize: Theme.font.base,
    marginBottom: Theme.spacing.base,
    lineHeight: 18,
  },
  missionWrapper: {
    paddingHorizontal: Theme.spacing.lg,
  },
  missionItem: {
    borderRadius: Theme.radius.lg,
    padding: Theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Theme.spacing.base,
    borderWidth: 1,
    marginBottom: Theme.spacing.sm + 2,
  },
  missionItemChecked: {
    backgroundColor: Theme.colors.accentBgFaint,
    borderColor: Theme.colors.borderAccentMid,
  },
  missionItemUnchecked: {
    backgroundColor: Theme.colors.surface,
    borderColor: Theme.colors.border,
  },
  missionIconContainer: {
    width: 36,
    height: 36,
    borderRadius: Theme.radius.md,
    backgroundColor: Theme.colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  missionIcon: {
    fontSize: Theme.font.base + 4,
  },
  missionTextContainer: {
    flex: 1,
  },
  missionTitle: {
    color: Theme.colors.textPrimary,
    fontSize: Theme.font.md,
    fontWeight: '600',
    marginBottom: 3,
  },
  missionDescription: {
    color: Theme.colors.textSecondary,
    fontSize: Theme.font.base,
    lineHeight: 17,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: Theme.radius.sm,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 2,
  },
  checkboxChecked: {
    borderColor: Theme.colors.checkboxBorder,
    backgroundColor: Theme.colors.accent,
  },
  checkboxUnchecked: {
    borderColor: Theme.colors.textMutedBorder,
    backgroundColor: 'transparent',
  },
  checkboxCheck: {
    color: Theme.colors.white,
    fontSize: Theme.font.md,
    fontWeight: '700',
  },
  ctaContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Theme.colors.background,
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.base,
    borderTopWidth: 1,
    borderTopColor: Theme.colors.border,
  },
  ctaHint: {
    color: Theme.colors.textSecondary,
    fontSize: Theme.font.base,
    textAlign: 'center',
    marginBottom: Theme.spacing.sm + 2,
  },
  ctaGradient: {
    borderRadius: Theme.spacing.base,
    paddingVertical: 17,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Theme.spacing.sm,
  },
  ctaText: {
    fontSize: Theme.font.cta,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: Theme.colors.textSecondary,
    marginTop: Theme.spacing.base,
    fontSize: Theme.font.body,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Theme.spacing.xl,
  },
  errorText: {
    color: Theme.colors.error,
    fontSize: Theme.font.body,
    textAlign: 'center',
    marginBottom: Theme.spacing.base,
  },
  retryButton: {
    backgroundColor: Theme.colors.accent,
    borderRadius: Theme.spacing.base,
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: Theme.spacing.sm + 2,
  },
  retryButtonText: {
    color: Theme.colors.white,
    fontSize: Theme.font.body,
    fontWeight: '600',
  },
});
