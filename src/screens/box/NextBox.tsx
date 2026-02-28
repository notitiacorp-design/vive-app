import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ImageBackground,
  Animated,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getDeliveryDate(): Date {
  const now = new Date();
  const target = new Date(now);
  // Next delivery: first day of next month
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

// ─── Sub-components ───────────────────────────────────────────────────────────

function CountdownUnit({ value, label }: { value: number; label: string }) {
  return (
    <View className="items-center mx-3">
      <View
        style={{
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
        }}
      >
        <Text
          style={{ color: '#E8E8F0', fontSize: 30, fontWeight: '700', letterSpacing: 1 }}
        >
          {pad(value)}
        </Text>
      </View>
      <Text style={{ color: '#A8A8C0', fontSize: 11, marginTop: 6, fontWeight: '500', letterSpacing: 1.2, textTransform: 'uppercase' }}>
        {label}
      </Text>
    </View>
  );
}

function BoxIllustration() {
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.04, duration: 1800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1800, useNativeDriver: true }),
      ])
    ).start();
  }, [pulseAnim]);

  return (
    <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
      <View
        style={{
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
        }}
      >
        {/* Blurred/locked hero placeholder */}
        <View
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: '#3D8BFF08',
          }}
        />
        {/* Lock icon SVG-like using Views */}
        <View style={{ alignItems: 'center' }}>
          <View
            style={{
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
            }}
          >
            <View
              style={{
                width: 14,
                height: 10,
                borderRadius: 2,
                backgroundColor: '#080810',
              }}
            />
          </View>
          <View
            style={{
              width: 24,
              height: 28,
              borderTopLeftRadius: 12,
              borderTopRightRadius: 12,
              borderWidth: 3,
              borderBottomWidth: 0,
              borderColor: '#3D8BFF',
              marginBottom: -4,
            }}
          />
        </View>
        <Text style={{ color: '#A8A8C0', fontSize: 12, marginTop: 16, fontWeight: '500', letterSpacing: 0.8 }}>
          Contenu mystère
        </Text>
        {/* Blurred overlay */}
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 60,
            backgroundColor: '#1C1C2880',
          }}
        />
      </View>
    </Animated.View>
  );
}

function HeroTeaser() {
  return (
    <View
      style={{
        backgroundColor: '#111118',
        borderRadius: 20,
        padding: 20,
        marginHorizontal: 20,
        borderWidth: 1,
        borderColor: '#1C1C28',
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
        <View
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: '#3D8BFF',
            marginRight: 8,
            shadowColor: '#3D8BFF',
            shadowOpacity: 0.8,
            shadowRadius: 4,
          }}
        />
        <Text style={{ color: '#A8A8C0', fontSize: 11, fontWeight: '600', letterSpacing: 1.4, textTransform: 'uppercase' }}>
          Module héros · Révélation
        </Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: 14,
            backgroundColor: '#1C1C28',
            borderWidth: 1,
            borderColor: '#3D8BFF22',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 14,
          }}
        >
          {/* Question mark placeholder */}
          <Text style={{ color: '#3D8BFF', fontSize: 28, fontWeight: '700' }}>?</Text>
        </View>
        <View style={{ flex: 1 }}>
          <View
            style={{
              height: 14,
              borderRadius: 7,
              backgroundColor: '#1C1C28',
              marginBottom: 8,
              width: '70%',
            }}
          />
          <View
            style={{
              height: 10,
              borderRadius: 5,
              backgroundColor: '#1C1C28',
              marginBottom: 6,
              width: '90%',
            }}
          />
          <View
            style={{
              height: 10,
              borderRadius: 5,
              backgroundColor: '#1C1C28',
              width: '55%',
            }}
          />
        </View>
      </View>
      <View
        style={{
          marginTop: 16,
          padding: 10,
          backgroundColor: '#3D8BFF11',
          borderRadius: 10,
          borderWidth: 1,
          borderColor: '#3D8BFF22',
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        <Text style={{ color: '#3D8BFF', fontSize: 12, fontWeight: '500' }}>
          ✦ Révélé à J-0 lors de la validation
        </Text>
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function NextBox() {
  const navigation = useNavigation<NavigationProp>();
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(calculateTimeLeft(getDeliveryDate()));
  const deliveryDate = React.useRef(getDeliveryDate()).current;
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

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
    <View style={{ flex: 1, backgroundColor: '#080810' }}>
      <StatusBar barStyle="light-content" backgroundColor="#080810" />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Header gradient */}
          <LinearGradient
            colors={['#0D1A2D', '#080810']}
            style={{ paddingTop: 20, paddingBottom: 40, alignItems: 'center' }}
          >
            <Animated.View style={{ opacity: fadeAnim, alignItems: 'center' }}>
              {/* Badge */}
              <View
                style={{
                  backgroundColor: '#3D8BFF1A',
                  borderWidth: 1,
                  borderColor: '#3D8BFF44',
                  borderRadius: 20,
                  paddingHorizontal: 14,
                  paddingVertical: 5,
                  marginBottom: 20,
                }}
              >
                <Text style={{ color: '#3D8BFF', fontSize: 11, fontWeight: '600', letterSpacing: 1.4, textTransform: 'uppercase' }}>
                  VIVE BOX · {monthLabel.toUpperCase()}
                </Text>
              </View>

              <Text
                style={{
                  color: '#E8E8F0',
                  fontSize: 28,
                  fontWeight: '700',
                  textAlign: 'center',
                  marginBottom: 6,
                  letterSpacing: -0.5,
                }}
              >
                Votre prochaine box
              </Text>
              <Text
                style={{
                  color: '#A8A8C0',
                  fontSize: 15,
                  textAlign: 'center',
                  marginBottom: 32,
                  paddingHorizontal: 32,
                }}
              >
                Préparez-vous à recevoir votre sélection premium personnalisée
              </Text>

              {/* Box illustration */}
              <BoxIllustration />
            </Animated.View>
          </LinearGradient>

          <Animated.View style={{ opacity: fadeAnim }}>
            {/* Countdown section */}
            <View style={{ alignItems: 'center', marginBottom: 32, paddingTop: 8 }}>
              <Text
                style={{
                  color: '#A8A8C0',
                  fontSize: 12,
                  fontWeight: '600',
                  letterSpacing: 1.6,
                  textTransform: 'uppercase',
                  marginBottom: 16,
                }}
              >
                Livraison dans
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <CountdownUnit value={timeLeft.days} label="Jours" />
                <Text style={{ color: '#3D8BFF', fontSize: 28, fontWeight: '300', marginBottom: 18 }}>:</Text>
                <CountdownUnit value={timeLeft.hours} label="Heures" />
                <Text style={{ color: '#3D8BFF', fontSize: 28, fontWeight: '300', marginBottom: 18 }}>:</Text>
                <CountdownUnit value={timeLeft.minutes} label="Minutes" />
              </View>
              {/* J-X label */}
              <View
                style={{
                  marginTop: 16,
                  backgroundColor: '#3D8BFF',
                  borderRadius: 10,
                  paddingHorizontal: 16,
                  paddingVertical: 4,
                }}
              >
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13, letterSpacing: 0.5 }}>
                  J-{timeLeft.days}
                </Text>
              </View>
            </View>

            {/* Hero item teaser */}
            <Text
              style={{
                color: '#E8E8F0',
                fontSize: 17,
                fontWeight: '700',
                marginLeft: 20,
                marginBottom: 12,
                letterSpacing: -0.2,
              }}
            >
              Aperçu de votre sélection
            </Text>
            <HeroTeaser />

            {/* Info cards */}
            <View style={{ flexDirection: 'row', marginHorizontal: 20, marginTop: 16, gap: 12 }}>
              {[
                { icon: '✦', label: '3–5 produits', sub: 'sélectionnés pour vous' },
                { icon: '◈', label: 'Valeur +120€', sub: 'garanti dans chaque box' },
              ].map((item) => (
                <View
                  key={item.label}
                  style={{
                    flex: 1,
                    backgroundColor: '#111118',
                    borderRadius: 16,
                    padding: 14,
                    borderWidth: 1,
                    borderColor: '#1C1C28',
                  }}
                >
                  <Text style={{ color: '#3D8BFF', fontSize: 18, marginBottom: 6 }}>{item.icon}</Text>
                  <Text style={{ color: '#E8E8F0', fontSize: 13, fontWeight: '600' }}>{item.label}</Text>
                  <Text style={{ color: '#A8A8C0', fontSize: 11, marginTop: 2 }}>{item.sub}</Text>
                </View>
              ))}
            </View>

            {/* CTA */}
            <View style={{ marginHorizontal: 20, marginTop: 32 }}>
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
                  style={{
                    borderRadius: 16,
                    paddingVertical: 18,
                    alignItems: 'center',
                    shadowColor: '#3D8BFF',
                    shadowOpacity: 0.4,
                    shadowRadius: 20,
                    shadowOffset: { width: 0, height: 8 },
                  }}
                >
                  <Text
                    style={{
                      color: '#fff',
                      fontSize: 16,
                      fontWeight: '700',
                      letterSpacing: 0.3,
                    }}
                  >
                    Valider ma box →
                  </Text>
                </LinearGradient>
              </Pressable>
              <Text
                style={{
                  color: '#A8A8C0',
                  fontSize: 12,
                  textAlign: 'center',
                  marginTop: 10,
                }}
              >
                Validation disponible jusqu'au dernier jour du mois
              </Text>
            </View>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
