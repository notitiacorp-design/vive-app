import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Animated,
  StatusBar,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';

// âââ Types ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

type BoxStackParamList = {
  NextBox: undefined;
  BoxValidation: undefined;
  BoxHistory: undefined;
};

type NavigationProp = NativeStackNavigationProp<BoxStackParamList, 'NextBox'>;

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

// âââ Theme ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

const Theme = {
  bg: '#080810',
  surface: '#111118',
  surfaceAlt: '#1C1C28',
  primary: '#3D8BFF',
  primaryDark: '#1A5FCC',
  textPrimary: '#E8E8F0',
  textSecondary: '#A8A8C0',
  white: '#FFFFFF',
  primaryAlpha08: '#3D8BFF08',
  primaryAlpha11: '#3D8BFF1A',
  primaryAlpha22: '#3D8BFF22',
  primaryAlpha33: '#3D8BFF33',
  primaryAlpha44: '#3D8BFF44',
  surfaceAlpha50: '#1C1C2880',
  headerGradientStart: '#0D1A2D',
} as const;

// âââ Helpers ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

function getDeliveryDate(): Date {
  const now = new Date();
  const target = new Date(now);
  target.setMonth(target.getMonth() + 1, 1);
  target.setHours(9, 0, 0, 0);
  return target;
}

function calculateTimeLeft(target: Date): TimeLeft {
  const diff = target.getTime() - Date.now();
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  return { days, hours, minutes, seconds };
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

// âââ Hook useCountdown ââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

function useCountdown(targetDate: Date): TimeLeft {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(() =>
    calculateTimeLeft(targetDate)
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(calculateTimeLeft(targetDate));
    }, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  return timeLeft;
}

// âââ Sub-components âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

const CountdownUnit = React.memo(function CountdownUnit({
  value,
  label,
}: {
  value: number;
  label: string;
}) {
  return (
    <View style={styles.countdownUnit}>
      <View style={styles.countdownBox}>
        <Text style={styles.countdownValue}>{pad(value)}</Text>
      </View>
      <Text style={styles.countdownLabel}>{label}</Text>
    </View>
  );
});

const BoxIllustration = React.memo(function BoxIllustration() {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.04,
          duration: 1800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1800,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => {
      animation.stop();
    };
  }, [pulseAnim]);

  return (
    <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
      <View style={styles.boxIllustrationContainer}>
        <View style={styles.boxIllustrationOverlay} />
        <View style={styles.lockIconWrapper}>
          <View style={styles.lockShackle} />
          <View style={styles.lockBody}>
            <View style={styles.lockKeyhole} />
          </View>
        </View>
        <Text style={styles.mysteryText}>Contenu mystÃ¨re</Text>
        <View style={styles.boxIllustrationBottomOverlay} />
      </View>
    </Animated.View>
  );
});

const HeroTeaser = React.memo(function HeroTeaser() {
  return (
    <View style={styles.heroTeaserContainer}>
      <View style={styles.heroTeaserHeader}>
        <View style={styles.heroTeaserDot} />
        <Text style={styles.heroTeaserTitle}>Module hÃ©ros Â· RÃ©vÃ©lation</Text>
      </View>
      <View style={styles.heroTeaserRow}>
        <View style={styles.heroTeaserImagePlaceholder}>
          <Text style={styles.heroTeaserQuestionMark}>?</Text>
        </View>
        <View style={styles.heroTeaserLines}>
          <View style={styles.heroTeaserLineWide} />
          <View style={styles.heroTeaserLineMedium} />
          <View style={styles.heroTeaserLineNarrow} />
        </View>
      </View>
      <View style={styles.heroTeaserBadge}>
        <Text style={styles.heroTeaserBadgeText}>
          â¦ RÃ©vÃ©lÃ© Ã  J-0 lors de la validation
        </Text>
      </View>
    </View>
  );
});

// âââ Styles âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

const styles = StyleSheet.create({
  // CountdownUnit
  countdownUnit: {
    alignItems: 'center',
    marginHorizontal: 12,
  },
  countdownBox: {
    backgroundColor: Theme.surfaceAlt,
    borderWidth: 1,
    borderColor: Theme.primaryAlpha33,
    borderRadius: 14,
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Theme.primary,
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  countdownValue: {
    color: Theme.textPrimary,
    fontSize: 30,
    fontWeight: '700',
    letterSpacing: 1,
  },
  countdownLabel: {
    color: Theme.textSecondary,
    fontSize: 11,
    marginTop: 6,
    fontWeight: '500',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  // BoxIllustration
  boxIllustrationContainer: {
    width: 200,
    height: 200,
    borderRadius: 32,
    backgroundColor: Theme.surfaceAlt,
    borderWidth: 1.5,
    borderColor: Theme.primaryAlpha44,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Theme.primary,
    shadowOpacity: 0.3,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 8 },
    overflow: 'hidden',
  },
  boxIllustrationOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Theme.primaryAlpha08,
  },
  lockIconWrapper: {
    alignItems: 'center',
  },
  lockBody: {
    width: 44,
    height: 32,
    borderRadius: 8,
    backgroundColor: Theme.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Theme.primary,
    shadowOpacity: 0.6,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
  },
  lockKeyhole: {
    width: 14,
    height: 10,
    borderRadius: 2,
    backgroundColor: Theme.bg,
  },
  lockShackle: {
    width: 24,
    height: 28,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderWidth: 3,
    borderBottomWidth: 0,
    borderColor: Theme.primary,
    marginBottom: -4,
  },
  mysteryText: {
    color: Theme.textSecondary,
    fontSize: 12,
    marginTop: 16,
    fontWeight: '500',
    letterSpacing: 0.8,
  },
  boxIllustrationBottomOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    backgroundColor: Theme.surfaceAlpha50,
  },
  // HeroTeaser
  heroTeaserContainer: {
    backgroundColor: Theme.surface,
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: Theme.surfaceAlt,
  },
  heroTeaserHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  heroTeaserDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Theme.primary,
    marginRight: 8,
    shadowColor: Theme.primary,
    shadowOpacity: 0.8,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 0 },
  },
  heroTeaserTitle: {
    color: Theme.textSecondary,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  heroTeaserRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroTeaserImagePlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 14,
    backgroundColor: Theme.surfaceAlt,
    borderWidth: 1,
    borderColor: Theme.primaryAlpha22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  heroTeaserQuestionMark: {
    color: Theme.primary,
    fontSize: 28,
    fontWeight: '700',
  },
  heroTeaserLines: {
    flex: 1,
  },
  heroTeaserLineWide: {
    height: 14,
    borderRadius: 7,
    backgroundColor: Theme.surfaceAlt,
    marginBottom: 8,
    width: '70%',
  },
  heroTeaserLineMedium: {
    height: 10,
    borderRadius: 5,
    backgroundColor: Theme.surfaceAlt,
    marginBottom: 8,
    width: '90%',
  },
  heroTeaserLineNarrow: {
    height: 10,
    borderRadius: 5,
    backgroundColor: Theme.surfaceAlt,
    marginBottom: 8,
    width: '55%',
  },
  heroTeaserBadge: {
    marginTop: 16,
    padding: 10,
    backgroundColor: Theme.primaryAlpha11,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Theme.primaryAlpha22,
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroTeaserBadgeText: {
    color: Theme.primary,
    fontSize: 12,
    fontWeight: '500',
  },
  // NextBox screen
  screenContainer: {
    flex: 1,
    backgroundColor: Theme.bg,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  headerGradient: {
    paddingTop: 20,
    paddingBottom: 40,
    alignItems: 'center',
  },
  animatedHeader: {
    alignItems: 'center',
  },
  badge: {
    backgroundColor: Theme.primaryAlpha11,
    borderWidth: 1,
    borderColor: Theme.primaryAlpha44,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 5,
    marginBottom: 20,
  },
  badgeText: {
    color: Theme.primary,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  title: {
    color: Theme.textPrimary,
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  subtitle: {
    color: Theme.textSecondary,
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 32,
  },
  countdownSection: {
    alignItems: 'center',
    marginBottom: 32,
    paddingTop: 8,
  },
  countdownSectionLabel: {
    color: Theme.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    marginBottom: 16,
  },
  countdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  countdownSeparator: {
    color: Theme.primary,
    fontSize: 28,
    fontWeight: '300',
    marginBottom: 18,
  },
  jxBadge: {
    marginTop: 16,
    backgroundColor: Theme.primary,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  jxBadgeText: {
    color: Theme.white,
    fontWeight: '700',
    fontSize: 13,
    letterSpacing: 0.5,
  },
  selectionTitle: {
    color: Theme.textPrimary,
    fontSize: 17,
    fontWeight: '700',
    marginLeft: 20,
    marginBottom: 12,
    letterSpacing: -0.2,
  },
  infoCardsRow: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 16,
    gap: 12,
  },
  infoCard: {
    flex: 1,
    backgroundColor: Theme.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: Theme.surfaceAlt,
  },
  infoCardIcon: {
    color: Theme.primary,
    fontSize: 18,
    marginBottom: 6,
  },
  infoCardLabel: {
    color: Theme.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  infoCardSub: {
    color: Theme.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  ctaWrapper: {
    marginHorizontal: 20,
    marginTop: 32,
  },
  ctaGradient: {
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: Theme.primary,
    shadowOpacity: 0.4,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
  },
  ctaText: {
    color: Theme.white,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  ctaSubtext: {
    color: Theme.textSecondary,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 10,
  },
  ctaPressable: {
    width: '100%',
  },
});

// âââ Info Card Item âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

interface InfoCardItem {
  icon: string;
  label: string;
  sub: string;
}

const INFO_CARDS: InfoCardItem[] = [
  { icon: 'â¦', label: '3â5 produits', sub: 'sÃ©lectionnÃ©s pour vous' },
  { icon: 'â', label: 'Valeur +120â¬', sub: 'garanti dans chaque box' },
];

const InfoCard = React.memo(function InfoCard({ item }: { item: InfoCardItem }) {
  return (
    <View style={styles.infoCard}>
      <Text style={styles.infoCardIcon}>{item.icon}</Text>
      <Text style={styles.infoCardLabel}>{item.label}</Text>
      <Text style={styles.infoCardSub}>{item.sub}</Text>
    </View>
  );
});

// âââ Main Screen ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

export default function NextBox() {
  const navigation = useNavigation<NavigationProp>();

  // Issue 6 : une seule source de vÃ©ritÃ© pour la date de livraison
  const deliveryDate = useRef<Date>(getDeliveryDate()).current;

  // Issue 7 : logique countdown extraite dans un hook dÃ©diÃ©
  const timeLeft = useCountdown(deliveryDate);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Issue 4 : cleanup de l'animation fade
  useEffect(() => {
    const anim = Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    });
    anim.start();
    return () => {
      anim.stop();
    };
  }, [fadeAnim]);

  const handleValidate = useCallback(() => {
    navigation.navigate('BoxValidation');
  }, [navigation]);

  // Issue 9 : monthLabel en minuscules avant toUpperCase() pour Ã©viter
  // un double uppercase si la locale renvoie dÃ©jÃ  des majuscules
  const monthLabel = deliveryDate
    .toLocaleString('fr-FR', { month: 'long', year: 'numeric' })
    .toLowerCase();

  return (
    <View style={styles.screenContainer}>
      <StatusBar barStyle="light-content" backgroundColor={Theme.bg} />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header gradient */}
          <LinearGradient
            colors={[Theme.headerGradientStart, Theme.bg]}
            style={styles.headerGradient}
          >
            <Animated.View style={[styles.animatedHeader, { opacity: fadeAnim }]}>
              {/* Badge */}
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {/* Issue 9 : monthLabel dÃ©jÃ  en lowercase, toUpperCase() sans risque de double */}
                  VIVE BOX Â· {monthLabel.toUpperCase()}
                </Text>
              </View>

              <Text style={styles.title}>Votre prochaine box</Text>
              <Text style={styles.subtitle}>
                PrÃ©parez-vous Ã  recevoir votre sÃ©lection premium personnalisÃ©e
              </Text>

              {/* Issue 1 + 2 : BoxIllustration avec cleanup loop et styles StyleSheet */}
              <BoxIllustration />
            </Animated.View>
          </LinearGradient>

          <Animated.View style={{ opacity: fadeAnim }}>
            {/* Issue 8 : countdown affiche maintenant aussi les secondes */}
            <View style={styles.countdownSection}>
              <Text style={styles.countdownSectionLabel}>Livraison dans</Text>
              <View style={styles.countdownRow}>
                <CountdownUnit value={timeLeft.days} label="Jours" />
                <Text style={styles.countdownSeparator}>:</Text>
                <CountdownUnit value={timeLeft.hours} label="Heures" />
                <Text style={styles.countdownSeparator}>:</Text>
                <CountdownUnit value={timeLeft.minutes} label="Minutes" />
                <Text style={styles.countdownSeparator}>:</Text>
                <CountdownUnit value={timeLeft.seconds} label="Secondes" />
              </View>
              <View style={styles.jxBadge}>
                <Text style={styles.jxBadgeText}>J-{timeLeft.days}</Text>
              </View>
            </View>

            {/* Hero item teaser */}
            <Text style={styles.selectionTitle}>AperÃ§u de votre sÃ©lection</Text>
            <HeroTeaser />

            {/* Info cards */}
            <View style={styles.infoCardsRow}>
              {INFO_CARDS.map((item) => (
                <InfoCard key={item.label} item={item} />
              ))}
            </View>

            {/* CTA */}
            <View style={styles.ctaWrapper}>
              <Pressable
                onPress={handleValidate}
                style={({ pressed }) => ([
                  styles.ctaPressable,
                  {
                    opacity: pressed ? 0.85 : 1,
                    transform: [{ scale: pressed ? 0.98 : 1 }],
                  },
                ])}
              >
                <LinearGradient
                  colors={[Theme.primary, Theme.primaryDark]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.ctaGradient}
                >
                  <Text style={styles.ctaText}>Valider ma box â</Text>
                </LinearGradient>
              </Pressable>
              <Text style={styles.ctaSubtext}>
                Validation disponible jusqu'au dernier jour du mois
              </Text>
            </View>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
