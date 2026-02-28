import React, { useState, useCallback } from 'react';
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

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Supabase fetch ───────────────────────────────────────────────────────────

async function fetchBoxHistory(): Promise<BoxItem[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Non authentifié');

  const { data, error } = await supabase
    .from('box_validations')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;

  // Map to BoxItem shape (adapt to your actual schema)
  return (data ?? []).map((row: any) => ({
    id: row.id,
    month: new Date(row.validated_at).getMonth() + 1,
    year: new Date(row.validated_at).getFullYear(),
    name: row.box_name ?? 'VIVE Box',
    status: (row.status as BoxStatus) ?? 'delivered',
    hero_module: row.hero_module_name ?? 'Module héros',
    products: row.products ?? [],
    notes: row.notes,
    missions_completed: row.missions_completed ?? 0,
    missions_total: row.missions_total ?? 3,
  }));
}

// ─── Mock data for preview/empty state ────────────────────────────────────────

const MOCK_BOXES: BoxItem[] = [
  {
    id: '1',
    month: 11,
    year: 2024,
    name: 'Box Vitalité Hivernale',
    status: 'completed',
    hero_module: 'Méditation Pleine Conscience',
    products: ['Diffuseur Ultrasons', 'Huile Eucalyptus Bio', 'Carnet Gratitude'],
    notes: 'Une box transformatrice. Le module méditation a changé ma routine du matin.',
    missions_completed: 3,
    missions_total: 3,
  },
  {
    id: '2',
    month: 10,
    year: 2024,
    name: 'Box Ancrage Automne',
    status: 'completed',
    hero_module: 'Cohérence Cardiaque',
    products: ['Roller Jade', 'Tisane Adaptogène', 'Guide Respiration'],
    notes: 'La cohérence cardiaque en 21 jours — une révélation.',
    missions_completed: 3,
    missions_total: 3,
  },
  {
    id: '3',
    month: 9,
    year: 2024,
    name: 'Box Énergie Pure',
    status: 'active',
    hero_module: 'Nutrition Intuitive',
    products: ['Spiruline Premium', 'Carnet Alimentaire', 'Recettes Détox'],
    missions_completed: 1,
    missions_total: 3,
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const MONTH_NAMES_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

function getMonthLabel(month: number, year: number): string {
  return `${MONTH_NAMES_FR[month - 1]} ${year}`;
}

const STATUS_CONFIG: Record<BoxStatus, { label: string; color: string; bg: string; icon: string }> = {
  delivered: { label: 'Livrée', color: '#A8A8C0', bg: '#1C1C28', icon: '📦' },
  active: { label: 'En cours', color: '#3D8BFF', bg: '#3D8BFF1A', icon: '⚡' },
  completed: { label: 'Complétée', color: '#4ECDC4', bg: '#4ECDC41A', icon: '✦' },
  pending: { label: 'En attente', color: '#F7B731', bg: '#F7B7311A', icon: '⏳' },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: BoxStatus }) {
  const config = STATUS_CONFIG[status];
  return (
    <View
      style={{
        backgroundColor: config.bg,
        borderRadius: 8,
        paddingHorizontal: 8,
        paddingVertical: 3,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
      }}
    >
      <Text style={{ fontSize: 10 }}>{config.icon}</Text>
      <Text style={{ color: config.color, fontSize: 10, fontWeight: '600', letterSpacing: 0.5 }}>
        {config.label}
      </Text>
    </View>
  );
}

function MissionProgress({
  completed,
  total,
}: {
  completed: number;
  total: number;
}) {
  const progress = total > 0 ? completed / total : 0;
  return (
    <View style={{ marginTop: 12 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
        <Text style={{ color: '#A8A8C0', fontSize: 11, fontWeight: '500' }}>Missions</Text>
        <Text style={{ color: '#A8A8C0', fontSize: 11 }}>
          {completed}/{total}
        </Text>
      </View>
      <View
        style={{
          height: 4,
          backgroundColor: '#1C1C28',
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            height: '100%',
            width: `${progress * 100}%`,
            backgroundColor: progress === 1 ? '#4ECDC4' : '#3D8BFF',
            borderRadius: 2,
          }}
        />
      </View>
    </View>
  );
}

function BoxCard({ item }: { item: BoxItem }) {
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

  return (
    <View
      style={{
        backgroundColor: '#111118',
        borderRadius: 18,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: item.status === 'active' ? '#3D8BFF33' : '#1C1C28',
        overflow: 'hidden',
      }}
    >
      {/* Active accent bar */}
      {item.status === 'active' && (
        <LinearGradient
          colors={['#3D8BFF', '#1A3A6B']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ height: 3 }}
        />
      )}

      {/* Card header */}
      <Pressable
        onPress={toggleExpand}
        style={({ pressed }) => ({
          padding: 16,
          opacity: pressed ? 0.9 : 1,
        })}
      >
        <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
          {/* Box icon */}
          <View
            style={{
              width: 46,
              height: 46,
              borderRadius: 12,
              backgroundColor: '#1C1C28',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 12,
              flexShrink: 0,
            }}
          >
            <Text style={{ fontSize: 22 }}>{statusConfig.icon}</Text>
          </View>
          {/* Info */}
          <View style={{ flex: 1 }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 3,
              }}
            >
              <Text
                style={{
                  color: '#A8A8C0',
                  fontSize: 11,
                  fontWeight: '500',
                  letterSpacing: 0.8,
                  textTransform: 'uppercase',
                }}
              >
                {getMonthLabel(item.month, item.year)}
              </Text>
              <StatusBadge status={item.status} />
            </View>
            <Text
              style={{
                color: '#E8E8F0',
                fontSize: 15,
                fontWeight: '700',
                letterSpacing: -0.2,
              }}
            >
              {item.name}
            </Text>
            <Text style={{ color: '#A8A8C0', fontSize: 12, marginTop: 2 }}>
              ✦ {item.hero_module}
            </Text>
          </View>
          {/* Chevron */}
          <Animated.View style={{ transform: [{ rotate: chevronRotate }], marginLeft: 8, marginTop: 12 }}>
            <Text style={{ color: '#A8A8C0', fontSize: 14 }}>⌄</Text>
          </Animated.View>
        </View>

        <MissionProgress completed={item.missions_completed} total={item.missions_total} />
      </Pressable>

      {/* Expanded content */}
      {expanded && (
        <View
          style={{
            paddingHorizontal: 16,
            paddingBottom: 16,
            borderTopWidth: 1,
            borderTopColor: '#1C1C28',
          }}
        >
          {/* Products list */}
          <Text
            style={{
              color: '#A8A8C0',
              fontSize: 11,
              fontWeight: '600',
              letterSpacing: 1.2,
              textTransform: 'uppercase',
              marginTop: 14,
              marginBottom: 8,
            }}
          >
            Contenu de la box
          </Text>
          {item.products.map((product, index) => (
            <View
              key={`${item.id}-product-${index}`}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 8,
                borderBottomWidth: index < item.products.length - 1 ? 1 : 0,
                borderBottomColor: '#1C1C28',
                gap: 10,
              }}
            >
              <View
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: '#3D8BFF',
                }}
              />
              <Text style={{ color: '#E8E8F0', fontSize: 13, flex: 1 }}>{product}</Text>
            </View>
          ))}

          {/* Notes */}
          {item.notes ? (
            <View
              style={{
                backgroundColor: '#1C1C28',
                borderRadius: 12,
                padding: 12,
                marginTop: 14,
                borderLeftWidth: 2,
                borderLeftColor: '#3D8BFF',
              }}
            >
              <Text
                style={{
                  color: '#A8A8C0',
                  fontSize: 10,
                  fontWeight: '600',
                  letterSpacing: 1,
                  textTransform: 'uppercase',
                  marginBottom: 5,
                }}
              >
                Mon retour
              </Text>
              <Text style={{ color: '#E8E8F0', fontSize: 13, lineHeight: 19, fontStyle: 'italic' }}>
                "{item.notes}"
              </Text>
            </View>
          ) : null}
        </View>
      )}
    </View>
  );
}

function EmptyState() {
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 80,
        paddingHorizontal: 40,
      }}
    >
      <View
        style={{
          width: 80,
          height: 80,
          borderRadius: 24,
          backgroundColor: '#1C1C28',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 20,
          borderWidth: 1,
          borderColor: '#3D8BFF22',
        }}
      >
        <Text style={{ fontSize: 36 }}>📦</Text>
      </View>
      <Text
        style={{
          color: '#E8E8F0',
          fontSize: 18,
          fontWeight: '700',
          textAlign: 'center',
          marginBottom: 8,
          letterSpacing: -0.3,
        }}
      >
        Aucune box reçue
      </Text>
      <Text
        style={{
          color: '#A8A8C0',
          fontSize: 14,
          textAlign: 'center',
          lineHeight: 21,
        }}
      >
        Votre première box VIVE vous attend. Validez votre sélection pour commencer votre parcours.
      </Text>
    </View>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 }}>
      <Text style={{ color: '#E8E8F0', fontSize: 16, fontWeight: '600', marginBottom: 8, textAlign: 'center' }}>
        Impossible de charger vos boxes
      </Text>
      <Text style={{ color: '#A8A8C0', fontSize: 13, textAlign: 'center', marginBottom: 20 }}>
        Vérifiez votre connexion et réessayez.
      </Text>
      <Pressable
        onPress={onRetry}
        style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
      >
        <View
          style={{
            backgroundColor: '#3D8BFF',
            borderRadius: 12,
            paddingHorizontal: 20,
            paddingVertical: 10,
          }}
        >
          <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>Réessayer</Text>
        </View>
      </Pressable>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function BoxHistory() {
  const navigation = useNavigation();

  const { data, isLoading, isError, refetch, isFetching } = useQuery<BoxItem[], Error>({
    queryKey: ['box-history'],
    queryFn: fetchBoxHistory,
    // Fall back to mock data when Supabase isn't configured yet
    placeholderData: MOCK_BOXES,
    staleTime: 1000 * 60 * 2, // 2 min
  });

  const boxes = data ?? MOCK_BOXES;

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const renderItem = useCallback(
    ({ item }: { item: BoxItem }) => <BoxCard item={item} />,
    []
  );

  const keyExtractor = useCallback((item: BoxItem) => item.id, []);

  return (
    <View style={{ flex: 1, backgroundColor: '#080810' }}>
      <StatusBar barStyle="light-content" backgroundColor="#080810" />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
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
          <View style={{ flex: 1 }}>
            <Text
              style={{
                color: '#E8E8F0',
                fontSize: 17,
                fontWeight: '700',
                letterSpacing: -0.3,
              }}
            >
              Historique des boxes
            </Text>
            <Text style={{ color: '#A8A8C0', fontSize: 12, marginTop: 1 }}>
              {boxes.length > 0 ? `${boxes.length} box${boxes.length > 1 ? 'es' : ''} reçue${boxes.length > 1 ? 's' : ''}` : 'Aucune box'}
            </Text>
          </View>
          {/* Stats badge */}
          {boxes.length > 0 && (
            <View
              style={{
                backgroundColor: '#1C1C28',
                borderRadius: 10,
                paddingHorizontal: 10,
                paddingVertical: 6,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: '#3D8BFF', fontSize: 16, fontWeight: '700' }}>{boxes.length}</Text>
              <Text style={{ color: '#A8A8C0', fontSize: 9, fontWeight: '500', letterSpacing: 0.5 }}>BOXES</Text>
            </View>
          )}
        </View>

        {/* Loading */}
        {isLoading && (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color="#3D8BFF" size="large" />
            <Text style={{ color: '#A8A8C0', fontSize: 13, marginTop: 12 }}>Chargement…</Text>
          </View>
        )}

        {/* Error */}
        {isError && !isLoading && <ErrorState onRetry={handleRefresh} />}

        {/* List */}
        {!isLoading && (
          <FlatList<BoxItem>
            data={boxes}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingTop: 16,
              paddingBottom: 40,
              flexGrow: 1,
            }}
            ListEmptyComponent={<EmptyState />}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isFetching && !isLoading}
                onRefresh={handleRefresh}
                tintColor="#3D8BFF"
                colors={['#3D8BFF']}
              />
            }
            ListHeaderComponent={
              boxes.length > 0 ? (
                <View
                  style={{
                    backgroundColor: '#111118',
                    borderRadius: 14,
                    padding: 14,
                    marginBottom: 16,
                    flexDirection: 'row',
                    gap: 12,
                    borderWidth: 1,
                    borderColor: '#1C1C28',
                  }}
                >
                  {[
                    {
                      label: 'Complétées',
                      value: boxes.filter((b) => b.status === 'completed').length,
                      color: '#4ECDC4',
                    },
                    {
                      label: 'En cours',
                      value: boxes.filter((b) => b.status === 'active').length,
                      color: '#3D8BFF',
                    },
                    {
                      label: 'Missions ✓',
                      value: boxes.reduce((acc, b) => acc + b.missions_completed, 0),
                      color: '#E8E8F0',
                    },
                  ].map((stat) => (
                    <View key={stat.label} style={{ flex: 1, alignItems: 'center' }}>
                      <Text style={{ color: stat.color, fontSize: 22, fontWeight: '700' }}>
                        {stat.value}
                      </Text>
                      <Text style={{ color: '#A8A8C0', fontSize: 10, marginTop: 2, textAlign: 'center' }}>
                        {stat.label}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : null
            }
          />
        )}
      </SafeAreaView>
    </View>
  );
}
