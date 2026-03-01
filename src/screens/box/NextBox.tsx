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

// âââ Helpers âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

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

// âââ Sub-components âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

function CountdownUnit({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.countdownUnit}>
      <View style={styles.countdownBox}>
        <Text style={styles.countdownValue}>{pad(value)}</Text>
      </View>
      <Text style={styles.countdownLabel}>{label}</Text>
    </View>
  );
}

function BoxIllustration() {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.04, duration: 1800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1800, useNativeDriver: true }),
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
          <View style={styles.lockBody}>
            <View style={styles.lockKeyhole} />
          </View>
          <View style={styles.lockShackle} />
        </View>
        <Text style={styles.mysteryText}>Contenu mystÃ¨re</Text>
        <View style={styles.boxIllustrationBottomOverlay} />
      </View>
    </Animated.View>
  );
}

function HeroTeaser() {
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
          <View style={[styles.heroTeaserLine, { width: '70%' }]} />
          <View style={[styles.heroTeaserLine, { width: '90%', height: 10, borderRadius: 5 }]} />
          <View style={[styles.heroTeaserLine, { width: '55%', height: 10, borderRadius: 5 }]} />
        </View>
      </View>
      <View style={styles.heroTeaserBadge}>
        <Text style={styles.heroTeaserBadgeText}>â¦ RÃ©vÃ©lÃ© Ã  J-0 lors de la validation</Text>
      </View>
    </View>
  );
}

// âââ Styles âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

const styles = StyleSheet.create({
  // CountdownUnit
  countdownUnit: {
    alignItems: 'center',
    marginHorizontal: 12,
  },
  countdownBox: {
    backgroundColor: '#1C1C28',
    borderWidth: 1,
    borderColor: '#3D8BFF33',
    borderRadius: 14,
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3D8BFF',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  countdownValue: {
    color: '#E8E8F0',
    fontSize: 30,
    fontWeight: '700',
    letterSpacing: 1,
  },
  countdownLabel: {
    color: '#A8A8C0',
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
    backgroundColor: '#1C1C28',
    borderWidth: 1.5,
    borderColor: '#3D8BFF44',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3D8BFF',
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
    backgroundColor: '#3D8BFF08',
  },
  lockIconWrapper: {
    alignItems: 'center',
  },
  lockBody: {
    width: 44,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#3D8BFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    shadowColor: '#3D8BFF',
    shadowOpacity: 0.6,
    shadowRadius: 12,
  },
  lockKeyhole: {
    width: 14,
    height: 10,
    borderRadius: 2,
    backgroundColor: '#080810',
  },
  lockShackle: {
    width: 24,
    height: 28,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderWidth: 3,
    borderBottomWidth: 0,
    borderColor: '#3D8BFF',
    marginBottom: -4,
  },
  mysteryText: {
    color: '#A8A8C0',
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
    backgroundColor: '#1C1C2880',
  },
  // HeroTeaser
  heroTeaserContainer: {
    backgroundColor: '#111118',
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: '#1C1C28',
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
    backgroundColor: '#3D8BFF',
    marginRight: 8,
    shadowColor: '#3D8BFF',
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  heroTeaserTitle: {
    color: '#A8A8C0',
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
    backgroundColor: '#1C1C28',
    borderWidth: 1,
    borderColor: '#3D8BFF22',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  heroTeaserQuestionMark: {
    color: '#3D8BFF',
    fontSize: 28,
    fontWeight: '700',
  },
  heroTeaserLines: {
    flex: 1,
  },
  heroTeaserLine: {
    height: 14,
    borderRadius: 7,
    backgroundColor: '#1C1C28',
    marginBottom: 8,
  },
  heroTeaserBadge: {
    marginTop: 16,
    padding: 10,
    backgroundColor: '#3D8BFF11',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#3D8BFF22',
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroTeaserBadgeText: {
    color: '#3D8BFF',
    fontSize: 12,
    fontWeight: '500',
  },
  // NextBox screen
  screenContainer: {
    flex: 1,
    backgroundColor: '#080810',
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
  badge: {
    backgroundColor: '#3D8BFF1A',
    borderWidth: 1,
    borderColor: '#3D8BFF44',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 5,
    marginBottom: 20,
  },
  badgeText: {
    color: '#3D8BFF',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  title: {
    color: '#E8E8F0',
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  subtitle: {
    color: '#A8A8C0',
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
    color: '#A8A8C0',
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
    color: '#3D8BFF',
    fontSize: 28,
    fontWeight: '300',
    marginBottom: 18,
  },
  jxBadge: {
    marginTop: 16,
    backgroundColor: '#3D8BFF',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  jxBadgeText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
    letterSpacing: 0.5,
  },
  selectionTitle: {
    color: '#E8E8F0',
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
    backgroundColor: '#111118',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1C1C28',
  },
  infoCardIcon: {
    color: '#3D8BFF',
    fontSize: 18,
    marginBottom: 6,
  },
  infoCardLabel: {
    color: '#E8E8F0',
    fontSize: 13,
    fontWeight: '600',
  },
  infoCardSub: {
    color: '#A8A8C0',
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
    shadowColor: '#3D8BFF',
    shadowOpacity: 0.4,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
  },
  ctaText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  ctaSubtext: {
    color: '#A8A8C0',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 10,
  },
});

// âââ Main Screen ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

export default function NextBox() {
  const navigation = useNavigation<NavigationProp>();
  const deliveryDate = useRef(getDeliveryDate()).current;
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(calculateTimeLeft(deliveryDate));
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }).start();
  }, [fadeAnim]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(calculateTimeLeft(deliveryDate));
    }, 1000);
    return () => clearInterval(interval);
  }, [deliveryDate]);

  const handleValidate = useCallback(() => {
    navigation.navigate('BoxValidation');
  }, [navigation]);

  const monthLabel = deliveryDate.toLocaleString('fr-FR', { month: 'long', year: 'numeric' });

  return (
    <View style={styles.screenContainer}>
      <StatusBar barStyle="light-content" backgroundColor="#080810" />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header gradient */}
          <LinearGradient
            colors={['#0D1A2D', '#080810']}
            style={styles.headerGradient}
          >
            <Animated.View style={{ opacity: fadeAnim, alignItems: 'center' }}>
              {/* Badge */}
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  VIVE BOX Â· {monthLabel.toUpperCase()}
                </Text>
              </View>

              <Text style={styles.title}>Votre prochaine box</Text>
              <Text style={styles.subtitle}>
                PrÃ©parez-vous Ã  recevoir votre sÃ©lection premium personnalisÃ©e
              </Text>

              {/* Box illustration */}
              <BoxIllustration />
            </Animated.View>
          </LinearGradient>

          <Animated.View style={{ opacity: fadeAnim }}>
            {/* Countdown section */}
            <View style={styles.countdownSection}>
              <Text style={styles.countdownSectionLabel}>Livraison dans</Text>
              <View style={styles.countdownRow}>
                <CountdownUnit value={timeLeft.days} label="Jours" />
                <Text style={styles.countdownSeparator}>:</Text>
                <CountdownUnit value={timeLeft.hours} label="Heures" />
                <Text style={styles.countdownSeparator}>:</Text>
                <CountdownUnit value={timeLeft.minutes} label="Minutes" />
              </View>
              {/* J-X label */}
              <View style={styles.jxBadge}>
                <Text style={styles.jxBadgeText}>J-{timeLeft.days}</Text>
              </View>
            </View>

            {/* Hero item teaser */}
            <Text style={styles.selectionTitle}>AperÃ§u de votre sÃ©lection</Text>
            <HeroTeaser />

            {/* Info cards */}
            <View style={styles.infoCardsRow}>
              {[
                { icon: 'â¦', label: '3â5 produits', sub: 'sÃ©lectionnÃ©s pour vous' },
                { icon: 'â', label: 'Valeur +120â¬', sub: 'garanti dans chaque box' },
              ].map((item) => (
                <View key={item.label} style={styles.infoCard}>
                  <Text style={styles.infoCardIcon}>{item.icon}</Text>
                  <Text style={styles.infoCardLabel}>{item.label}</Text>
                  <Text style={styles.infoCardSub}>{item.sub}</Text>
                </View>
              ))}
            </View>

            {/* CTA */}
            <View style={styles.ctaWrapper}>
              <Pressable
                onPress={handleValidate}
                style={({ pressed }) => ({
                  opacity: pressed ? 0.85 : 1,
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                })}
              >
                <LinearGradient
                  colors={['#3D8BFF', '#1A5FCC']}
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
