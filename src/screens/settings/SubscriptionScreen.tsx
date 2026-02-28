import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  StatusBar,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Check, Crown, Zap, Star, RefreshCw, ExternalLink } from 'lucide-react-native';
import { useRevenueCat } from '../../hooks/useRevenueCat';

// ─── Types ───────────────────────────────────────────────────────────────────
type PlanTier = 'Free' | 'Premium' | 'Elite';

interface PlanFeature {
  label: string;
  free: boolean | string;
  premium: boolean | string;
  elite: boolean | string;
}

// ─── Constants ───────────────────────────────────────────────────────────────
const PLAN_FEATURES: PlanFeature[] = [
  { label: 'Suivi journalier', free: true, premium: true, elite: true },
  { label: 'Tableaux de bord', free: 'Basique', premium: 'Avancé', elite: 'Complet' },
  { label: 'IA Wellness Coach', free: false, premium: true, elite: true },
  { label: 'Analyses approfondies', free: false, premium: true, elite: true },
  { label: 'Programmes personnalisés', free: false, premium: false, elite: true },
  { label: 'Support prioritaire', free: false, premium: false, elite: true },
  { label: 'Export de données', free: false, premium: true, elite: true },
];

const PLAN_CONFIG: Record<
  PlanTier,
  { color: string; gradient: string; icon: React.ReactNode; label: string; description: string }
> = {
  Free: {
    color: '#A8A8C0',
    gradient: 'bg-white/8',
    icon: <Star size={20} color="#A8A8C0" />,
    label: 'Gratuit',
    description: 'Fonctionnalités essentielles pour commencer.',
  },
  Premium: {
    color: '#3D8BFF',
    gradient: 'bg-blue-500/15',
    icon: <Zap size={20} color="#3D8BFF" />,
    label: 'Premium',
    description: 'Tout ce qu\'il faut pour optimiser votre bien-être.',
  },
  Elite: {
    color: '#FBBF24',
    gradient: 'bg-yellow-500/15',
    icon: <Crown size={20} color="#FBBF24" />,
    label: 'Élite',
    description: 'L\'expérience VIVE ultime, sans compromis.',
  },
};

// ─── Feature Cell ─────────────────────────────────────────────────────────────
const FeatureCell: React.FC<{ value: boolean | string; color: string }> = ({
  value,
  color,
}) => {
  if (typeof value === 'string') {
    return (
      <Text style={{ color }} className="text-xs font-medium text-center flex-1">
        {value}
      </Text>
    );
  }
  if (value) {
    return (
      <View className="flex-1 items-center">
        <Check size={14} color={color} />
      </View>
    );
  }
  return (
    <View className="flex-1 items-center">
      <Text className="text-[#A8A8C0]/30 text-xs">—</Text>
    </View>
  );
};

// ─── Plan Card ───────────────────────────────────────────────────────────────
const PlanCard: React.FC<{
  tier: PlanTier;
  isCurrentPlan: boolean;
  price?: string;
  period?: string;
  onPress: () => void;
  loading: boolean;
}> = ({ tier, isCurrentPlan, price, period, onPress, loading }) => {
  const config = PLAN_CONFIG[tier];
  const isFree = tier === 'Free';

  return (
    <TouchableOpacity
      onPress={isFree || isCurrentPlan ? undefined : onPress}
      activeOpacity={isFree || isCurrentPlan ? 1 : 0.8}
      disabled={isFree || isCurrentPlan || loading}
      className={`rounded-2xl p-4 border mb-3 ${
        isCurrentPlan
          ? `border-[${config.color}]/50 ${config.gradient}`
          : 'border-white/8 bg-[#111118]'
      }`}
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <View
            className={`w-9 h-9 rounded-xl items-center justify-center ${
              config.gradient
            } border border-white/10`}
          >
            {config.icon}
          </View>
          <View>
            <Text className="text-[#E8E8F0] font-semibold text-sm">
              {config.label}
            </Text>
            <Text className="text-[#A8A8C0] text-xs">{config.description}</Text>
          </View>
        </View>

        <View className="items-end">
          {isFree ? (
            <Text className="text-[#A8A8C0] font-bold text-base">0 €</Text>
          ) : price ? (
            <>
              <Text style={{ color: config.color }} className="font-bold text-base">
                {price}
              </Text>
              {period ? (
                <Text className="text-[#A8A8C0] text-xs">{period}</Text>
              ) : null}
            </>
          ) : null}
        </View>
      </View>

      {isCurrentPlan && (
        <View
          style={{ borderColor: config.color }}
          className="mt-3 border rounded-xl py-2 items-center"
        >
          <Text style={{ color: config.color }} className="text-xs font-semibold">
            ✓ Plan actuel
          </Text>
        </View>
      )}

      {!isCurrentPlan && !isFree && (
        <View
          className="mt-3 rounded-xl py-2.5 items-center"
          style={{ backgroundColor: `${config.color}20` }}
        >
          {loading ? (
            <ActivityIndicator size="small" color={config.color} />
          ) : (
            <Text style={{ color: config.color }} className="text-xs font-semibold">
              Passer à {config.label}
            </Text>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

// ─── Main Screen ─────────────────────────────────────────────────────────────
export const SubscriptionScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [purchasingTier, setPurchasingTier] = useState<PlanTier | null>(null);
  const [restoring, setRestoring] = useState(false);

  const {
    currentPlan,
    offerings,
    isLoading,
    purchasePackage,
    restorePurchases,
    getPackageForTier,
  } = useRevenueCat();

  const handlePurchase = useCallback(
    async (tier: PlanTier) => {
      const pkg = getPackageForTier(tier);
      if (!pkg) {
        Alert.alert('Erreur', 'Offre non disponible. Réessayez plus tard.');
        return;
      }
      setPurchasingTier(tier);
      try {
        await purchasePackage(pkg);
        Alert.alert(
          'Merci ! 🎉',
          `Votre abonnement ${PLAN_CONFIG[tier].label} est maintenant actif.`,
        );
      } catch (error: any) {
        if (!error?.userCancelled) {
          Alert.alert(
            'Erreur d\'achat',
            error?.message ?? 'Une erreur est survenue lors de l\'achat.',
          );
        }
      } finally {
        setPurchasingTier(null);
      }
    },
    [purchasePackage, getPackageForTier],
  );

  const handleRestore = useCallback(async () => {
    setRestoring(true);
    try {
      await restorePurchases();
      Alert.alert('Restauration réussie', 'Vos achats ont été restaurés.');
    } catch {
      Alert.alert('Erreur', 'Impossible de restaurer vos achats.');
    } finally {
      setRestoring(false);
    }
  }, [restorePurchases]);

  const handleManageSubscription = useCallback(() => {
    const url =
      Platform.OS === 'ios'
        ? 'https://apps.apple.com/account/subscriptions'
        : 'https://play.google.com/store/account/subscriptions';
    Linking.openURL(url);
  }, []);

  const TIERS: PlanTier[] = ['Free', 'Premium', 'Elite'];

  return (
    <View
      className="flex-1 bg-[#080810]"
      style={{ paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }}
    >
      <StatusBar barStyle="light-content" backgroundColor="#080810" />

      {/* ── Nav Header ──────────────────────────────────── */}
      <View className="flex-row items-center px-5 pt-5 pb-3">
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="w-9 h-9 rounded-xl bg-white/8 items-center justify-center mr-3"
        >
          <Text className="text-[#E8E8F0] text-base">‹</Text>
        </TouchableOpacity>
        <Text className="text-xl font-bold text-[#E8E8F0]">Abonnement</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
      >
        {/* ── Hero ────────────────────────────────────────── */}
        <View className="mx-5 mt-2 mb-6 bg-[#1C1C28] rounded-3xl p-5 border border-white/8">
          <View className="flex-row items-center gap-3 mb-3">
            <View className="w-12 h-12 rounded-2xl bg-[#3D8BFF]/20 border border-[#3D8BFF]/30 items-center justify-center">
              <Crown size={22} color="#3D8BFF" />
            </View>
            <View>
              <Text className="text-[#E8E8F0] font-bold text-lg">Plans VIVE</Text>
              <Text className="text-[#A8A8C0] text-xs">
                Plan actuel\ :{' '}
                <Text
                  style={{ color: PLAN_CONFIG[currentPlan as PlanTier]?.color ?? '#A8A8C0' }}
                  className="font-semibold"
                >
                  {PLAN_CONFIG[currentPlan as PlanTier]?.label ?? currentPlan}
                </Text>
              </Text>
            </View>
          </View>
          <Text className="text-[#A8A8C0] text-sm leading-5">
            Choisissez le plan qui correspond à vos objectifs de bien-être.
          </Text>
        </View>

        {/* ── Plan Cards ──────────────────────────────────── */}
        <View className="px-5">
          <Text className="text-xs font-semibold text-[#A8A8C0] uppercase tracking-widest mb-3">
            Choisir un plan
          </Text>

          {isLoading ? (
            <View className="items-center py-10">
              <ActivityIndicator size="large" color="#3D8BFF" />
              <Text className="text-[#A8A8C0] text-sm mt-3">Chargement des offres…</Text>
            </View>
          ) : (
            TIERS.map((tier) => {
              const pkg = getPackageForTier(tier);
              const price = pkg?.product?.priceString;
              const period =
                pkg?.packageType === 'ANNUAL'
                  ? '/ an'
                  : pkg?.packageType === 'MONTHLY'
                  ? '/ mois'
                  : undefined;
              return (
                <PlanCard
                  key={tier}
                  tier={tier}
                  isCurrentPlan={currentPlan === tier}
                  price={price}
                  period={period}
                  onPress={() => handlePurchase(tier)}
                  loading={purchasingTier === tier}
                />
              );
            })
          )}
        </View>

        {/* ── Feature Comparison Table ─────────────────────── */}
        <View className="mx-5 mt-6">
          <Text className="text-xs font-semibold text-[#A8A8C0] uppercase tracking-widest mb-3">
            Comparaison des fonctionnalités
          </Text>

          <View className="bg-[#111118] rounded-2xl border border-white/6 overflow-hidden">
            {/* Header Row */}
            <View className="flex-row px-4 py-3 border-b border-white/6 bg-white/3">
              <Text className="flex-[2] text-xs text-[#A8A8C0] font-medium">Fonctionnalité</Text>
              {TIERS.map((t) => (
                <Text
                  key={t}
                  style={{ color: PLAN_CONFIG[t].color }}
                  className="flex-1 text-xs font-bold text-center"
                >
                  {PLAN_CONFIG[t].label}
                </Text>
              ))}
            </View>

            {/* Feature Rows */}
            {PLAN_FEATURES.map((feature, i) => (
              <View
                key={feature.label}
                className={`flex-row items-center px-4 py-3 ${
                  i !== PLAN_FEATURES.length - 1 ? 'border-b border-white/4' : ''
                }`}
              >
                <Text className="flex-[2] text-xs text-[#E8E8F0]">{feature.label}</Text>
                <FeatureCell value={feature.free} color={PLAN_CONFIG.Free.color} />
                <FeatureCell value={feature.premium} color={PLAN_CONFIG.Premium.color} />
                <FeatureCell value={feature.elite} color={PLAN_CONFIG.Elite.color} />
              </View>
            ))}
          </View>
        </View>

        {/* ── Actions ─────────────────────────────────────── */}
        <View className="mx-5 mt-6 gap-3">
          <TouchableOpacity
            onPress={handleManageSubscription}
            activeOpacity={0.8}
            className="bg-[#111118] border border-white/8 rounded-2xl py-4 flex-row items-center justify-center gap-2"
          >
            <ExternalLink size={16} color="#A8A8C0" />
            <Text className="text-[#A8A8C0] font-medium text-sm">
              Gérer l\'abonnement
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleRestore}
            disabled={restoring}
            activeOpacity={0.8}
            className="bg-[#111118] border border-white/8 rounded-2xl py-4 flex-row items-center justify-center gap-2"
          >
            {restoring ? (
              <ActivityIndicator size="small" color="#A8A8C0" />
            ) : (
              <RefreshCw size={16} color="#A8A8C0" />
            )}
            <Text className="text-[#A8A8C0] font-medium text-sm">
              {restoring ? 'Restauration…' : 'Restaurer les achats'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Legal ───────────────────────────────────────── */}
        <View className="mx-5 mt-6">
          <Text className="text-[#A8A8C0]/50 text-xs text-center leading-4">
            Les abonnements se renouvellent automatiquement. Vous pouvez annuler
            à tout moment depuis les paramètres de votre compte.{' '}
            {Platform.OS === 'ios' ? 'App Store' : 'Google Play'}.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

export default SubscriptionScreen;
