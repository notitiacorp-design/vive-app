import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Animated,
  StatusBar,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';

// âââ Types ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

export type BoxStackParamList = {
  NextBox: undefined;
  BoxValidation: undefined;
  BoxHistory: undefined;
};

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

// âââ Service ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

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
    async function fetchData() {
      try {
        setLoading(true);
        setFetchError(null);

        const { data: moduleData, error: moduleError } = await supabase
          .from('hero_modules')
          .select('id, name, category, description, duration, level')
          .limit(1)
          .single();

        if (moduleError) throw moduleError;
        if (moduleData) setHeroModule(moduleData as HeroModule);

        const { data: missionsData, error: missionsError } = await supabase
          .from('missions')
          .select('id, title, description, icon');

        if (missionsError) throw missionsError;
        if (missionsData) setMissions(missionsData as Mission[]);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Erreur lors du chargement';
        setFetchError(message);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  return { heroModule, missions, loading, fetchError };
}

// âââ Styles âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#080810',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1C1C28',
  },
  backButton: {
    marginRight: 14,
    padding: 4,
  },
  backButtonText: {
    color: '#A8A8C0',
    fontSize: 20,
  },
  headerTitle: {
    color: '#E8E8F0',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    color: '#A8A8C0',
    fontSize: 12,
    marginTop: 1,
  },
  sectionLabel: {
    color: '#A8A8C0',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    marginLeft: 20,
    marginBottom: 12,
  },
  heroCard: {
    backgroundColor: '#111118',
    borderRadius: 20,
    overflow: 'hidden',
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: '#3D8BFF33',
  },
  heroGradientBar: {
    height: 4,
  },
  heroCardContent: {
    padding: 20,
  },
  categoryBadge: {
    backgroundColor: '#3D8BFF1A',
    borderWidth: 1,
    borderColor: '#3D8BFF44',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  categoryBadgeText: {
    color: '#3D8BFF',
    fontSize: 10,
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
    borderRadius: 16,
    backgroundColor: '#1C1C28',
    borderWidth: 1,
    borderColor: '#3D8BFF22',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    flexShrink: 0,
  },
  heroIconText: {
    fontSize: 28,
  },
  heroTextContainer: {
    flex: 1,
  },
  heroName: {
    color: '#E8E8F0',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  heroDescription: {
    color: '#A8A8C0',
    fontSize: 13,
    lineHeight: 19,
  },
  metaRow: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 10,
  },
  metaItem: {
    flex: 1,
    backgroundColor: '#1C1C28',
    borderRadius: 10,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    color: '#A8A8C0',
    fontSize: 12,
    fontWeight: '500',
  },
  mysteryContainer: {
    marginHorizontal: 20,
  },
  mysteryTitle: {
    color: '#E8E8F0',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
    letterSpacing: -0.2,
  },
  mysteryPressable: {
    height: 120,
  },
  mysteryCardBase: {
    width: '100%',
    height: 120,
    borderRadius: 16,
    position: 'absolute',
    backfaceVisibility: 'hidden',
  },
  mysteryFront: {
    backgroundColor: '#1C1C28',
    borderWidth: 1.5,
    borderColor: '#3D8BFF44',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mysteryFrontIcon: {
    color: '#3D8BFF',
    fontSize: 28,
    marginBottom: 6,
  },
  mysteryFrontText: {
    color: '#A8A8C0',
    fontSize: 13,
    fontWeight: '500',
  },
  mysteryFrontSubText: {
    color: '#A8A8C060',
    fontSize: 11,
    marginTop: 2,
  },
  mysteryBack: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#3D8BFF55',
  },
  mysteryBackGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    flexDirection: 'row',
    gap: 14,
  },
  mysteryBackIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#3D8BFF22',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#3D8BFF44',
  },
  mysteryBackTextContainer: {
    flex: 1,
  },
  mysteryBackTitle: {
    color: '#E8E8F0',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 3,
  },
  mysteryBackSubtitle: {
    color: '#A8A8C0',
    fontSize: 12,
    lineHeight: 17,
  },
  surpriseBadge: {
    backgroundColor: '#3D8BFF22',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  surpriseBadgeText: {
    color: '#3D8BFF',
    fontSize: 10,
    fontWeight: '600',
  },
  missionItem: {
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  missionIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#1C1C28',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  missionTextContainer: {
    flex: 1,
  },
  missionTitle: {
    color: '#E8E8F0',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 3,
  },
  missionDescription: {
    color: '#A8A8C0',
    fontSize: 12,
    lineHeight: 17,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 2,
  },
  checkboxCheck: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  missionsSection: {
    marginTop: 28,
    paddingHorizontal: 20,
  },
  missionsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  missionsSectionLabel: {
    color: '#A8A8C0',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  missionsCountBadge: {
    backgroundColor: '#3D8BFF',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 8,
  },
  missionsCountText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  missionsSubtitle: {
    color: '#A8A8C0',
    fontSize: 12,
    marginBottom: 16,
    lineHeight: 18,
  },
  ctaContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#080810',
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#1C1C28',
  },
  ctaHint: {
    color: '#A8A8C0',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 10,
  },
  ctaGradient: {
    borderRadius: 16,
    paddingVertical: 17,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  ctaText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#A8A8C0',
    marginTop: 12,
    fontSize: 14,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#3D8BFF',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  mysterySlotSection: {
    marginTop: 28,
    marginBottom: 8,
  },
});

// âââ Sub-components âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

function HeroModuleCard({ module }: { module: HeroModule }) {
  return (
    <View style={styles.heroCard}>
      <LinearGradient
        colors={['#3D8BFF', '#1A3A6B']}
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
            <Text style={styles.heroIconText}>ð«</Text>
          </View>
          <View style={styles.heroTextContainer}>
            <Text style={styles.heroName}>{module.name}</Text>
            <Text style={styles.heroDescription}>{module.description}</Text>
          </View>
        </View>
        <View style={styles.metaRow}>
          {[
            { label: module.duration, icon: 'â±' },
            { label: module.level, icon: 'â' },
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
}

function MysterySlot() {
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
          <Text style={styles.mysteryFrontIcon}>â³</Text>
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
            colors={['#1C2A44', '#111118']}
            style={styles.mysteryBackGradient}
          >
            <View style={styles.mysteryBackIconContainer}>
              <Text style={{ fontSize: 24 }}>ð¿</Text>
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
}

function MissionItem({
  mission,
  checked,
  onToggle,
}: {
  mission: Mission;
  checked: boolean;
  onToggle: () => void;
}) {
  const checkAnim = useRef(new Animated.Value(checked ? 1 : 0)).current;

  React.useEffect(() => {
    Animated.spring(checkAnim, {
      toValue: checked ? 1 : 0,
      friction: 6,
      tension: 80,
      useNativeDriver: true,
    }).start();
  }, [checked, checkAnim]);

  return (
    <Pressable
      onPress={onToggle}
      style={({ pressed }) => ({
        opacity: pressed ? 0.85 : 1,
        transform: [{ scale: pressed ? 0.99 : 1 }],
      })}
    >
      <View
        style={[
          styles.missionItem,
          {
            backgroundColor: checked ? '#3D8BFF0D' : '#111118',
            borderColor: checked ? '#3D8BFF44' : '#1C1C28',
          },
        ]}
      >
        <View style={styles.missionIconContainer}>
          <Text style={{ fontSize: 16 }}>{mission.icon}</Text>
        </View>
        <View style={styles.missionTextContainer}>
          <Text style={styles.missionTitle}>{mission.title}</Text>
          <Text style={styles.missionDescription}>{mission.description}</Text>
        </View>
        <Animated.View
          style={[
            styles.checkbox,
            {
              borderColor: checked ? '#3D8BFF' : '#A8A8C044',
              backgroundColor: checked ? '#3D8BFF' : 'transparent',
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
}

// âââ Main Screen ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

export default function BoxValidation() {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const [checkedMissions, setCheckedMissions] = useState<Record<string, boolean>>({});

  const { heroModule, missions, loading, fetchError } = useBoxValidation();

  const allChecked =
    missions.length > 0 && missions.every((m) => checkedMissions[m.id]);

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

  const ctaBottomPadding = insets.bottom > 0 ? insets.bottom : 20;
  const scrollBottomPadding = 80 + ctaBottomPadding + 20;

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#080810" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#3D8BFF" size="large" />
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      </View>
    );
  }

  if (fetchError || !heroModule) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#080810" />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            {fetchError || 'Impossible de charger les donnÃ©es.'}
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
      <StatusBar barStyle="light-content" backgroundColor="#080810" />
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

        <ScrollView
          contentContainerStyle={{ paddingTop: 24, paddingBottom: scrollBottomPadding }}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero module */}
          <Text style={styles.sectionLabel}>Module hÃ©ros sÃ©lectionnÃ©</Text>
          <HeroModuleCard module={heroModule} />

          {/* Mystery slot */}
          <View style={styles.mysterySlotSection}>
            <Text style={styles.sectionLabel}>Produit accompagnateur</Text>
            <MysterySlot />
          </View>

          {/* Serment missions */}
          <View style={styles.missionsSection}>
            <View style={styles.missionsSectionHeader}>
              <Text style={styles.missionsSectionLabel}>Serment missions</Text>
              <View style={styles.missionsCountBadge}>
                <Text style={styles.missionsCountText}>
                  {Object.values(checkedMissions).filter(Boolean).length}/{missions.length}
                </Text>
              </View>
            </View>
            <Text style={styles.missionsSubtitle}>
              Engagez-vous envers ces missions pour activer votre box. Votre parole est votre force.
            </Text>
            {missions.map((mission) => (
              <MissionItem
                key={mission.id}
                mission={mission}
                checked={!!checkedMissions[mission.id]}
                onToggle={() => toggleMission(mission.id)}
              />
            ))}
          </View>
        </ScrollView>

        {/* Fixed CTA */}
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
              colors={allChecked ? ['#3D8BFF', '#1A5FCC'] : ['#1C1C28', '#1C1C28']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.ctaGradient}
            >
              {mutation.isPending ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={[styles.ctaText, { color: allChecked ? '#fff' : '#A8A8C0' }]}>
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
