import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  StatusBar,
  Linking,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Check, Crown, Zap, Star, RefreshCw, ExternalLink } from 'lucide-react-native';
import { useRevenueCat } from '../../hooks/useRevenueCat';

// âââ ThÃ¨me âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
const Theme = {
  bg: '#080810',
  surface: '#111118',
  card: '#1C1C28',
  textPrimary: '#E8E8F0',
  textSecondary: '#A8A8C0',
  borderSubtle: 'rgba(255,255,255,0.08)',
  borderFaint: 'rgba(255,255,255,0.06)',
  borderUltraFaint: 'rgba(255,255,255,0.04)',
  overlayLight: 'rgba(255,255,255,0.03)',
  colorFree: '#A8A8C0',
  colorPremium: '#3D8BFF',
  colorElite: '#FBBF24',
} as const;

// âââ Types âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
type PlanTier = 'Free' | 'Premium' | 'Elite';

interface PlanFeature {
  label: string;
  free: boolean | string;
  premium: boolean | string;
  elite: boolean | string;
}

interface PurchaseError {
  userCancelled?: boolean;
  message?: string;
}

function isPurchaseError(e: unknown): e is PurchaseError {
  return typeof e === 'object' && e !== null;
}

// âââ Constantes ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
const PLAN_FEATURES: PlanFeature[] = [
  { label: 'Suivi journalier', free: true, premium: true, elite: true },
  { label: 'Tableaux de bord', free: 'Basique', premium: 'AvancÃ©', elite: 'Complet' },
  { label: 'IA Wellness Coach', free: false, premium: true, elite: true },
  { label: 'Analyses approfondies', free: false, premium: true, elite: true },
  { label: 'Programmes personnalisÃ©s', free: false, premium: false, elite: true },
  { label: 'Support prioritaire', free: false, premium: false, elite: true },
  { label: 'Export de donnÃ©es', free: false, premium: true, elite: true },
];

const TIERS: PlanTier[] = ['Free', 'Premium', 'Elite'];

const PLAN_CONFIG: Record<
  PlanTier,
  { color: string; label: string; description: string }
> = {
  Free: {
    color: Theme.colorFree,
    label: 'Gratuit',
    description: 'FonctionnalitÃ©s essentielles pour commencer.',
  },
  Premium: {
    color: Theme.colorPremium,
    label: 'Premium',
    description: "Tout ce qu'il faut pour optimiser votre bien-Ãªtre.",
  },
  Elite: {
    color: Theme.colorElite,
    label: 'Ãlite',
    description: "L'expÃ©rience VIVE ultime, sans compromis.",
  },
};

// âââ Feature Cell âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
interface FeatureCellProps {
  value: boolean | string;
  color: string;
}

const FeatureCell: React.FC<FeatureCellProps> = React.memo(({ value, color }) => {
  if (typeof value === 'string') {
    return (
      <Text style={[styles.featureCellText, { color }]}>
        {value}
      </Text>
    );
  }
  if (value) {
    return (
      <View style={styles.featureCellContainer}>
        <Check size={14} color={color} />
      </View>
    );
  }
  return (
    <View style={styles.featureCellContainer}>
      <Text style={styles.featureCellDash}>{'â'}</Text>
    </View>
  );
});

// âââ Plan Card âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
interface PlanCardProps {
  tier: PlanTier;
  isCurrentPlan: boolean;
  price?: string;
  period?: string;
  onPress: () => void;
  loading: boolean;
}

const PlanCard: React.FC<PlanCardProps> = React.memo(
  ({ tier, isCurrentPlan, price, period, onPress, loading }) => {
    const config = PLAN_CONFIG[tier];
    const isFree = tier === 'Free';

    const cardBorderColor = useMemo(
      () => (isCurrentPlan ? `${config.color}80` : Theme.borderSubtle),
      [isCurrentPlan, config.color],
    );

    const cardBgColor = useMemo(
      () => (isCurrentPlan ? `${config.color}12` : Theme.surface),
      [isCurrentPlan, config.color],
    );

    const iconBgColor = useMemo(() => `${config.color}18`, [config.color]);
    const actionBgColor = useMemo(() => `${config.color}20`, [config.color]);

    const PlanIcon = useMemo(() => {
      if (tier === 'Free') return <Star size={20} color={config.color} />;
      if (tier === 'Premium') return <Zap size={20} color={config.color} />;
      return <Crown size={20} color={config.color} />;
    }, [tier, config.color]);

    return (
      <TouchableOpacity
        onPress={isFree || isCurrentPlan ? undefined : onPress}
        activeOpacity={isFree || isCurrentPlan ? 1 : 0.8}
        disabled={isFree || isCurrentPlan || loading}
        style={[styles.planCard, { borderColor: cardBorderColor, backgroundColor: cardBgColor }]}
      >
        <View style={styles.planCardRow}>
          <View style={styles.planCardLeft}>
            <View
              style={[
                styles.planIconWrapper,
                { backgroundColor: iconBgColor, borderColor: Theme.borderSubtle },
              ]}
            >
              {PlanIcon}
            </View>
            <View style={styles.planCardLabelContainer}>
              <Text style={styles.planCardLabel}>{config.label}</Text>
              <Text style={styles.planCardDescription}>{config.description}</Text>
            </View>
          </View>

          <View style={styles.planCardPriceContainer}>
            {isFree ? (
              <Text style={styles.planCardFreePrice}>0 â¬</Text>
            ) : price ? (
              <>
                <Text style={[styles.planCardPrice, { color: config.color }]}>{price}</Text>
                {period ? (
                  <Text style={styles.planCardPeriod}>{period}</Text>
                ) : null}
              </>
            ) : null}
          </View>
        </View>

        {isCurrentPlan && (
          <View style={[styles.currentPlanBadge, { borderColor: config.color }]}>
            <Text style={[styles.currentPlanBadgeText, { color: config.color }]}>
              {'â Plan actuel'}
            </Text>
          </View>
        )}

        {!isCurrentPlan && !isFree && (
          <View style={[styles.upgradeButton, { backgroundColor: actionBgColor }]}>
            {loading ? (
              <ActivityIndicator size="small" color={config.color} />
            ) : (
              <Text style={[styles.upgradeButtonText, { color: config.color }]}>
                {`Passer Ã  ${config.label}`}
              </Text>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  },
);

// âââ Feature Row Item âââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
interface FeatureRowProps {
  item: PlanFeature;
  isLast: boolean;
}

const FeatureRow: React.FC<FeatureRowProps> = React.memo(({ item, isLast }) => (
  <View style={[styles.featureRow, !isLast && styles.featureRowBorder]}>
    <Text style={styles.featureRowLabel}>{item.label}</Text>
    <FeatureCell value={item.free} color={PLAN_CONFIG.Free.color} />
    <FeatureCell value={item.premium} color={PLAN_CONFIG.Premium.color} />
    <FeatureCell value={item.elite} color={PLAN_CONFIG.Elite.color} />
  </View>
));

// âââ Main Screen âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
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
        Alert.alert('Erreur', 'Offre non disponible. RÃ©essayez plus tard.');
        return;
      }
      setPurchasingTier(tier);
      try {
        await purchasePackage(pkg);
        Alert.alert(
          'Merci ! ð',
          `Votre abonnement ${PLAN_CONFIG[tier].label} est maintenant actif.`,
        );
      } catch (error: unknown) {
        if (isPurchaseError(error) && !error.userCancelled) {
          Alert.alert(
            "Erreur d'achat",
            error.message ?? "Une erreur est survenue lors de l'achat.",
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
      Alert.alert('Restauration rÃ©ussie', 'Vos achats ont Ã©tÃ© restaurÃ©s.');
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

  const currentPlanColor = useMemo(
    () => PLAN_CONFIG[currentPlan as PlanTier]?.color ?? Theme.textSecondary,
    [currentPlan],
  );

  const currentPlanLabel = useMemo(
    () => PLAN_CONFIG[currentPlan as PlanTier]?.label ?? currentPlan,
    [currentPlan],
  );

  const contentContainerStyle = useMemo(
    () => ({ paddingBottom: insets.bottom + 32 }),
    [insets.bottom],
  );

  // DonnÃ©es combinÃ©es pour le FlatList principal
  type SectionKey =
    | 'hero'
    | 'plansHeader'
    | 'plansLoading'
    | 'planCard'
    | 'tableHeader'
    | 'table'
    | 'actions'
    | 'legal';

  interface SectionItem {
    key: string;
    type: SectionKey;
    tier?: PlanTier;
  }

  const sections = useMemo<SectionItem[]>(() => {
    const items: SectionItem[] = [
      { key: 'hero', type: 'hero' },
      { key: 'plansHeader', type: 'plansHeader' },
    ];
    if (isLoading) {
      items.push({ key: 'plansLoading', type: 'plansLoading' });
    } else {
      TIERS.forEach((tier) => {
        items.push({ key: `planCard-${tier}`, type: 'planCard', tier });
      });
    }
    items.push(
      { key: 'tableHeader', type: 'tableHeader' },
      { key: 'table', type: 'table' },
      { key: 'actions', type: 'actions' },
      { key: 'legal', type: 'legal' },
    );
    return items;
  }, [isLoading]);

  const renderItem = useCallback(
    ({ item }: { item: SectionItem }) => {
      switch (item.type) {
        case 'hero':
          return (
            <View style={styles.heroContainer}>
              <View style={styles.heroRow}>
                <View style={styles.heroIconWrapper}>
                  <Crown size={22} color={Theme.colorPremium} />
                </View>
                <View>
                  <Text style={styles.heroTitle}>Plans VIVE</Text>
                  <Text style={styles.heroSubtitle}>
                    {'Plan actuel : '}
                    <Text style={[styles.heroCurrentPlan, { color: currentPlanColor }]}>
                      {currentPlanLabel}
                    </Text>
                  </Text>
                </View>
              </View>
              <Text style={styles.heroDescription}>
                Choisissez le plan qui correspond Ã  vos objectifs de bien-Ãªtre.
              </Text>
            </View>
          );

        case 'plansHeader':
          return (
            <View style={styles.sectionHeaderContainer}>
              <Text style={styles.sectionHeader}>Choisir un plan</Text>
            </View>
          );

        case 'plansLoading':
          return (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Theme.colorPremium} />
              <Text style={styles.loadingText}>Chargement des offresâ¦</Text>
            </View>
          );

        case 'planCard': {
          const tier = item.tier!;
          const pkg = getPackageForTier(tier);
          const price = pkg?.product?.priceString;
          const period =
            pkg?.packageType === 'ANNUAL'
              ? '/ an'
              : pkg?.packageType === 'MONTHLY'
              ? '/ mois'
              : undefined;
          return (
            <View style={styles.planCardWrapper}>
              <PlanCard
                tier={tier}
                isCurrentPlan={currentPlan === tier}
                price={price}
                period={period}
                onPress={() => handlePurchase(tier)}
                loading={purchasingTier === tier}
              />
            </View>
          );
        }

        case 'tableHeader':
          return (
            <View style={styles.tableHeaderContainer}>
              <Text style={styles.sectionHeader}>Comparaison des fonctionnalitÃ©s</Text>
            </View>
          );

        case 'table':
          return (
            <View style={styles.tableContainer}>
              {/* En-tÃªte du tableau */}
              <View style={styles.tableHeadRow}>
                <Text style={styles.tableHeadFeature}>FonctionnalitÃ©</Text>
                {TIERS.map((t) => (
                  <Text
                    key={t}
                    style={[styles.tableHeadTier, { color: PLAN_CONFIG[t].color }]}
                  >
                    {PLAN_CONFIG[t].label}
                  </Text>
                ))}
              </View>
              {/* Lignes du tableau via FlatList interne */}
              <FlatList
                data={PLAN_FEATURES}
                keyExtractor={(f) => f.label}
                scrollEnabled={false}
                renderItem={({ item: feature, index }) => (
                  <FeatureRow
                    item={feature}
                    isLast={index === PLAN_FEATURES.length - 1}
                  />
                )}
              />
            </View>
          );

        case 'actions':
          return (
            <View style={styles.actionsContainer}>
              <TouchableOpacity
                onPress={handleManageSubscription}
                activeOpacity={0.8}
                style={styles.actionButton}
              >
                <ExternalLink size={16} color={Theme.textSecondary} />
                <Text style={styles.actionButtonText}>GÃ©rer l'abonnement</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleRestore}
                disabled={restoring}
                activeOpacity={0.8}
                style={styles.actionButton}
              >
                {restoring ? (
                  <ActivityIndicator size="small" color={Theme.textSecondary} />
                ) : (
                  <RefreshCw size={16} color={Theme.textSecondary} />
                )}
                <Text style={styles.actionButtonText}>
                  {restoring ? 'Restaurationâ¦' : 'Restaurer les achats'}
                </Text>
              </TouchableOpacity>
            </View>
          );

        case 'legal':
          return (
            <View style={styles.legalContainer}>
              <Text style={styles.legalText}>
                {`Les abonnements se renouvellent automatiquement. Vous pouvez annuler Ã  tout moment depuis les paramÃ¨tres de votre compte. ${
                  Platform.OS === 'ios' ? 'App Store' : 'Google Play'
                }.`}
              </Text>
            </View>
          );

        default:
          return null;
      }
    },
    [
      currentPlanColor,
      currentPlanLabel,
      currentPlan,
      getPackageForTier,
      handlePurchase,
      handleRestore,
      handleManageSubscription,
      purchasingTier,
      restoring,
    ],
  );

  return (
    <View
      style={[
        styles.root,
        { paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) : 0 },
      ]}
    >
      <StatusBar barStyle="light-content" backgroundColor={Theme.bg} />

      {/* ââ En-tÃªte navigation ââ */}
      <View style={styles.navHeader}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>{'â¹'}</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>Abonnement</Text>
      </View>

      <FlatList
        data={sections}
        keyExtractor={(item) => item.key}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={contentContainerStyle}
      />
    </View>
  );
};

// âââ Styles ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
const styles = StyleSheet.create({
  // Root
  root: {
    flex: 1,
    backgroundColor: Theme.bg,
  },

  // Nav
  navHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: Theme.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  backButtonText: {
    color: Theme.textPrimary,
    fontSize: 20,
    lineHeight: 22,
  },
  navTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Theme.textPrimary,
  },

  // Hero
  heroContainer: {
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 24,
    backgroundColor: Theme.card,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: Theme.borderSubtle,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  heroIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(61,139,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(61,139,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Theme.textPrimary,
  },
  heroSubtitle: {
    fontSize: 12,
    color: Theme.textSecondary,
  },
  heroCurrentPlan: {
    fontWeight: '600',
  },
  heroDescription: {
    fontSize: 14,
    color: Theme.textSecondary,
    lineHeight: 20,
  },

  // Section headers
  sectionHeaderContainer: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '600',
    color: Theme.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },

  // Loading
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    color: Theme.textSecondary,
    fontSize: 14,
    marginTop: 12,
  },

  // Plan card wrapper
  planCardWrapper: {
    paddingHorizontal: 20,
  },

  // Plan Card
  planCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  planCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  planCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  planIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  planCardLabelContainer: {
    flex: 1,
  },
  planCardLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Theme.textPrimary,
  },
  planCardDescription: {
    fontSize: 12,
    color: Theme.textSecondary,
  },
  planCardPriceContainer: {
    alignItems: 'flex-end',
  },
  planCardFreePrice: {
    fontSize: 16,
    fontWeight: '700',
    color: Theme.textSecondary,
  },
  planCardPrice: {
    fontSize: 16,
    fontWeight: '700',
  },
  planCardPeriod: {
    fontSize: 12,
    color: Theme.textSecondary,
  },
  currentPlanBadge: {
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 8,
    alignItems: 'center',
  },
  currentPlanBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  upgradeButton: {
    marginTop: 12,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  upgradeButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Feature Cell
  featureCellContainer: {
    flex: 1,
    alignItems: 'center',
  },
  featureCellText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  featureCellDash: {
    fontSize: 12,
    color: 'rgba(168,168,192,0.3)',
  },

  // Table
  tableHeaderContainer: {
    paddingHorizontal: 20,
    marginTop: 24,
    marginBottom: 12,
  },
  tableContainer: {
    marginHorizontal: 20,
    backgroundColor: Theme.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Theme.borderFaint,
    overflow: 'hidden',
  },
  tableHeadRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Theme.borderFaint,
    backgroundColor: Theme.overlayLight,
  },
  tableHeadFeature: {
    flex: 2,
    fontSize: 12,
    color: Theme.textSecondary,
    fontWeight: '500',
  },
  tableHeadTier: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  featureRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Theme.borderUltraFaint,
  },
  featureRowLabel: {
    flex: 2,
    fontSize: 12,
    color: Theme.textPrimary,
  },

  // Actions
  actionsContainer: {
    marginHorizontal: 20,
    marginTop: 24,
    gap: 12,
  },
  actionButton: {
    backgroundColor: Theme.surface,
    borderWidth: 1,
    borderColor: Theme.borderSubtle,
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionButtonText: {
    color: Theme.textSecondary,
    fontWeight: '500',
    fontSize: 14,
  },

  // Legal
  legalContainer: {
    marginHorizontal: 20,
    marginTop: 24,
  },
  legalText: {
    color: 'rgba(168,168,192,0.5)',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
  },
});

export default SubscriptionScreen;