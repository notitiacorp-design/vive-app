import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Animated,
  StatusBar,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

type BoxStackParamList = {
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

// ─── Constants ────────────────────────────────────────────────────────────────

const HERO_MODULE: HeroModule = {
  id: 'hero-001',
  name: 'Cohérence Cardiaque',
  category: 'Respiration & Stress',
  description:
    'Programme de 21 jours pour maîtriser votre système nerveux autonome. 5 minutes par jour suffisent pour transformer votre résilience au stress.',
  duration: '21 jours',
  level: 'Débutant',
};

const MISSIONS: Mission[] = [
  {
    id: 'mission-1',
    title: 'Pratiquer chaque matin',
    description: '5 min de cohérence cardiaque avant 9h, 21 jours consécutifs',
    icon: '🌅',
  },
  {
    id: 'mission-2',
    title: 'Tracker mes émotions',
    description: 'Enregistrer mon état émotionnel dans VIVE après chaque session',
    icon: '📊',
  },
  {
    id: 'mission-3',
    title: 'Partager mon avancée',
    description: 'Publier une réflexion dans la communauté VIVE à J+7 et J+21',
    icon: '✦',
  },
];

// ─── Supabase mutation ────────────────────────────────────────────────────────

async function saveBoxValidation(payload: BoxValidationPayload): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Non authentifié');

  const { error } = await supabase.from('box_validations').insert({
    user_id: user.id,
    hero_module_id: payload.hero_module_id,
    missions_accepted: payload.missions_accepted,
    validated_at: payload.validated_at,
    status: 'validated',
  });

  if (error) throw error;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function HeroModuleCard({ module }: { module: HeroModule }) {
  return (
    <View
      style={{
        backgroundColor: '#111118',
        borderRadius: 20,
        overflow: 'hidden',
        marginHorizontal: 20,
        borderWidth: 1,
        borderColor: '#3D8BFF33',
      }}
    >
      {/* Top gradient bar */}
      <LinearGradient
        colors={['#3D8BFF', '#1A3A6B']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{ height: 4 }}
      />
      <View style={{ padding: 20 }}>
        {/* Category badge */}
        <View
          style={{
            backgroundColor: '#3D8BFF1A',
            borderWidth: 1,
            borderColor: '#3D8BFF44',
            borderRadius: 8,
            paddingHorizontal: 10,
            paddingVertical: 3,
            alignSelf: 'flex-start',
            marginBottom: 12,
          }}
        >
          <Text style={{ color: '#3D8BFF', fontSize: 10, fontWeight: '600', letterSpacing: 1.2, textTransform: 'uppercase' }}>
            {module.category}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
          {/* Image placeholder */}
          <View
            style={{
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
            }}
          >
            <Text style={{ fontSize: 28 }}>🫀</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                color: '#E8E8F0',
                fontSize: 18,
                fontWeight: '700',
                marginBottom: 4,
                letterSpacing: -0.3,
              }}
            >
              {module.name}
            </Text>
            <Text style={{ color: '#A8A8C0', fontSize: 13, lineHeight: 19 }}>
              {module.description}
            </Text>
          </View>
        </View>

        {/* Meta row */}
        <View
          style={{
            flexDirection: 'row',
            marginTop: 16,
            gap: 10,
          }}
        >
          {[
            { label: module.duration, icon: '⏱' },
            { label: module.level, icon: '◈' },
          ].map((meta) => (
            <View
              key={meta.label}
              style={{
                flex: 1,
                backgroundColor: '#1C1C28',
                borderRadius: 10,
                padding: 10,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Text style={{ fontSize: 13 }}>{meta.icon}</Text>
              <Text style={{ color: '#A8A8C0', fontSize: 12, fontWeight: '500' }}>{meta.label}</Text>
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

  const cardStyle = {
    width: '100%' as const,
    height: 120,
    borderRadius: 16,
    position: 'absolute' as const,
    backfaceVisibility: 'hidden' as const,
  };

  return (
    <View style={{ marginHorizontal: 20 }}>
      <Text
        style={{
          color: '#E8E8F0',
          fontSize: 15,
          fontWeight: '700',
          marginBottom: 12,
          letterSpacing: -0.2,
        }}
      >
        Slot mystère
      </Text>
      <Pressable onPress={handleFlip} style={{ height: 120 }}>
        {/* Front */}
        <Animated.View
          style={[
            cardStyle,
            {
              transform: [{ rotateY: frontInterpolate }],
              backgroundColor: '#1C1C28',
              borderWidth: 1.5,
              borderColor: '#3D8BFF44',
              borderStyle: 'dashed',
              alignItems: 'center',
              justifyContent: 'center',
            },
          ]}
        >
          <Text style={{ color: '#3D8BFF', fontSize: 28, marginBottom: 6 }}>⟳</Text>
          <Text style={{ color: '#A8A8C0', fontSize: 13, fontWeight: '500' }}>
            Appuyer pour révéler
          </Text>
          <Text style={{ color: '#A8A8C060', fontSize: 11, marginTop: 2 }}>
            Contenu surprise sélectionné pour vous
          </Text>
        </Animated.View>
        {/* Back */}
        <Animated.View
          style={[
            cardStyle,
            {
              transform: [{ rotateY: backInterpolate }],
              borderRadius: 16,
              overflow: 'hidden',
              borderWidth: 1,
              borderColor: '#3D8BFF55',
            },
          ]}
        >
          <LinearGradient
            colors={['#1C2A44', '#111118']}
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              padding: 16,
              flexDirection: 'row',
              gap: 14,
            }}
          >
            <View
              style={{
                width: 52,
                height: 52,
                borderRadius: 14,
                backgroundColor: '#3D8BFF22',
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: '#3D8BFF44',
              }}
            >
              <Text style={{ fontSize: 24 }}>🌿</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#E8E8F0', fontSize: 14, fontWeight: '700', marginBottom: 3 }}>
                Huile essentielle Lavande
              </Text>
              <Text style={{ color: '#A8A8C0', fontSize: 12, lineHeight: 17 }}>
                Bio · Grade thérapeutique · 10ml
              </Text>
              <View
                style={{
                  backgroundColor: '#3D8BFF22',
                  borderRadius: 6,
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  alignSelf: 'flex-start',
                  marginTop: 6,
                }}
              >
                <Text style={{ color: '#3D8BFF', fontSize: 10, fontWeight: '600' }}>SURPRISE ✦</Text>
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
        style={{
          backgroundColor: checked ? '#3D8BFF0D' : '#111118',
          borderRadius: 14,
          padding: 14,
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: 12,
          borderWidth: 1,
          borderColor: checked ? '#3D8BFF44' : '#1C1C28',
          marginBottom: 10,
        }}
      >
        {/* Icon */}
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            backgroundColor: '#1C1C28',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Text style={{ fontSize: 16 }}>{mission.icon}</Text>
        </View>
        {/* Text */}
        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: '#E8E8F0',
              fontSize: 13,
              fontWeight: '600',
              marginBottom: 3,
            }}
          >
            {mission.title}
          </Text>
          <Text style={{ color: '#A8A8C0', fontSize: 12, lineHeight: 17 }}>
            {mission.description}
          </Text>
        </View>
        {/* Checkbox */}
        <Animated.View
          style={[
            {
              width: 24,
              height: 24,
              borderRadius: 7,
              borderWidth: 2,
              borderColor: checked ? '#3D8BFF' : '#A8A8C044',
              backgroundColor: checked ? '#3D8BFF' : 'transparent',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              marginTop: 2,
            },
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
          {checked && (
            <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>✓</Text>
          )}
        </Animated.View>
      </View>
    </Pressable>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function BoxValidation() {
  const navigation = useNavigation<NavigationProp>();
  const [checkedMissions, setCheckedMissions] = useState<Record<string, boolean>>({});

  const allChecked = MISSIONS.every((m) => checkedMissions[m.id]);

  const toggleMission = useCallback((id: string) => {
    setCheckedMissions((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const mutation = useMutation<void, Error, BoxValidationPayload>({
    mutationFn: saveBoxValidation,
    onSuccess: () => {
      Alert.alert(
        '✦ Box validée !',
        'Votre sélection est confirmée. Bon voyage dans cette nouvelle expérience VIVE.',
        [
          {
            text: 'Voir mes boxes',
            onPress: () => navigation.navigate('BoxHistory'),
          },
        ]
      );
    },
    onError: (err) => {
      Alert.alert('Erreur', err.message || 'Une erreur est survenue. Veuillez réessayer.');
    },
  });

  const handleConfirm = useCallback(() => {
    if (!allChecked) return;
    mutation.mutate({
      hero_module_id: HERO_MODULE.id,
      missions_accepted: MISSIONS.map((m) => m.id),
      validated_at: new Date().toISOString(),
    });
  }, [allChecked, mutation]);

  return (
    <View style={{ flex: 1, backgroundColor: '#080810' }}>
      <StatusBar barStyle="light-content" backgroundColor="#080810" />
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 20,
            paddingVertical: 14,
            borderBottomWidth: 1,
            borderBottomColor: '#1C1C28',
          }}
        >
          <Pressable
            onPress={() => navigation.goBack()}
            style={{ marginRight: 14, padding: 4 }}
          >
            <Text style={{ color: '#A8A8C0', fontSize: 20 }}>←</Text>
          </Pressable>
          <View>
            <Text style={{ color: '#E8E8F0', fontSize: 17, fontWeight: '700', letterSpacing: -0.3 }}>
              Validation de box
            </Text>
            <Text style={{ color: '#A8A8C0', fontSize: 12, marginTop: 1 }}>Confirmez votre sélection</Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={{ paddingTop: 24, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero module */}
          <Text
            style={{
              color: '#A8A8C0',
              fontSize: 11,
              fontWeight: '600',
              letterSpacing: 1.6,
              textTransform: 'uppercase',
              marginLeft: 20,
              marginBottom: 12,
            }}
          >
            Module héros sélectionné
          </Text>
          <HeroModuleCard module={HERO_MODULE} />

          {/* Mystery slot */}
          <View style={{ marginTop: 28, marginBottom: 8 }}>
            <Text
              style={{
                color: '#A8A8C0',
                fontSize: 11,
                fontWeight: '600',
                letterSpacing: 1.6,
                textTransform: 'uppercase',
                marginLeft: 20,
                marginBottom: 12,
              }}
            >
              Produit accompagnateur
            </Text>
            <MysterySlot />
          </View>

          {/* Serment missions */}
          <View style={{ marginTop: 28, paddingHorizontal: 20 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
              <Text
                style={{
                  color: '#A8A8C0',
                  fontSize: 11,
                  fontWeight: '600',
                  letterSpacing: 1.6,
                  textTransform: 'uppercase',
                }}
              >
                Serment missions
              </Text>
              <View
                style={{
                  backgroundColor: '#3D8BFF',
                  borderRadius: 8,
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                  marginLeft: 8,
                }}
              >
                <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>
                  {Object.values(checkedMissions).filter(Boolean).length}/{MISSIONS.length}
                </Text>
              </View>
            </View>
            <Text style={{ color: '#A8A8C0', fontSize: 12, marginBottom: 16, lineHeight: 18 }}>
              Engagez-vous envers ces 3 missions pour activer votre box. Votre parole est votre force.
            </Text>
            {MISSIONS.map((mission) => (
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
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: '#080810',
            paddingHorizontal: 20,
            paddingTop: 16,
            paddingBottom: 34,
            borderTopWidth: 1,
            borderTopColor: '#1C1C28',
          }}
        >
          {!allChecked && (
            <Text
              style={{
                color: '#A8A8C0',
                fontSize: 12,
                textAlign: 'center',
                marginBottom: 10,
              }}
            >
              Acceptez les 3 missions pour confirmer
            </Text>
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
              style={{
                borderRadius: 16,
                paddingVertical: 17,
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              {mutation.isPending ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text
                  style={{
                    color: allChecked ? '#fff' : '#A8A8C0',
                    fontSize: 16,
                    fontWeight: '700',
                    letterSpacing: 0.3,
                  }}
                >
                  Je confirme mon serment ✦
                </Text>
              )}
            </LinearGradient>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}
