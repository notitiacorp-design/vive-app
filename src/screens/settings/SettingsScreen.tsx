import React, { useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';

// ─── Icons (lucide-react-native) ────────────────────────────────────────────
import {
  User,
  CreditCard,
  Heart,
  Bell,
  Shield,
  Info,
  ChevronRight,
  LogOut,
  Crown,
} from 'lucide-react-native';

// ─── Types ───────────────────────────────────────────────────────────────────
type RootStackParamList = {
  Settings: undefined;
  Subscription: undefined;
  DataPrivacy: undefined;
  Notifications: undefined;
  HealthSettings: undefined;
  Account: undefined;
  About: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Settings'>;

interface SettingItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  onPress: () => void;
  danger?: boolean;
  badge?: string;
}

interface SettingSection {
  title: string;
  items: SettingItem[];
}

// ─── Plan Badge ──────────────────────────────────────────────────────────────
const PlanBadge: React.FC<{ plan: string }> = ({ plan }) => {
  const isPremium = plan === 'Premium';
  const isElite = plan === 'Elite';

  const badgeClass = isElite
    ? 'bg-yellow-500/20 border border-yellow-500/40'
    : isPremium
    ? 'bg-blue-500/20 border border-blue-500/40'
    : 'bg-white/10 border border-white/20';

  const textClass = isElite
    ? 'text-yellow-400'
    : isPremium
    ? 'text-blue-400'
    : 'text-[#A8A8C0]';

  return (
    <View className={`px-2.5 py-1 rounded-full flex-row items-center gap-1 ${badgeClass}`}>
      {isElite || isPremium ? (
        <Crown size={10} color={isElite ? '#FBBF24' : '#3D8BFF'} />
      ) : null}
      <Text className={`text-xs font-semibold ${textClass}`}>{plan}</Text>
    </View>
  );
};

// ─── Section Row ─────────────────────────────────────────────────────────────
const SettingRow: React.FC<{ item: SettingItem; isLast: boolean }> = ({
  item,
  isLast,
}) => (
  <TouchableOpacity
    onPress={item.onPress}
    activeOpacity={0.7}
    className={`flex-row items-center px-4 py-3.5 ${
      !isLast ? 'border-b border-white/5' : ''
    }`}
  >
    <View
      className={`w-8 h-8 rounded-xl items-center justify-center mr-3 ${
        item.danger ? 'bg-red-500/15' : 'bg-white/8'
      }`}
    >
      {item.icon}
    </View>
    <Text
      className={`flex-1 text-sm font-medium ${
        item.danger ? 'text-red-400' : 'text-[#E8E8F0]'
      }`}
    >
      {item.label}
    </Text>
    {item.badge ? (
      <View className="bg-[#3D8BFF]/20 px-2 py-0.5 rounded-full mr-2">
        <Text className="text-[#3D8BFF] text-xs font-semibold">{item.badge}</Text>
      </View>
    ) : null}
    <ChevronRight size={16} color={item.danger ? '#F87171' : '#A8A8C0'} />
  </TouchableOpacity>
);

// ─── Main Screen ─────────────────────────────────────────────────────────────
export const SettingsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const { user, plan, clearAuth } = useAuthStore();

  const handleLogout = useCallback(() => {
    Alert.alert(
      'Se déconnecter',
      'Êtes-vous sûr de vouloir vous déconnecter\ ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Déconnecter',
          style: 'destructive',
          onPress: async () => {
            try {
              await supabase.auth.signOut();
              clearAuth();
            } catch (error) {
              Alert.alert('Erreur', 'Impossible de se déconnecter.');
            }
          },
        },
      ],
    );
  }, [clearAuth]);

  const sections: SettingSection[] = [
    {
      title: 'Compte',
      items: [
        {
          id: 'account',
          label: 'Mon compte',
          icon: <User size={16} color="#A8A8C0" />,
          onPress: () => navigation.navigate('Account'),
        },
      ],
    },
    {
      title: 'Abonnement',
      items: [
        {
          id: 'subscription',
          label: 'Mon abonnement',
          icon: <CreditCard size={16} color="#3D8BFF" />,
          onPress: () => navigation.navigate('Subscription'),
          badge: plan !== 'Free' ? plan : undefined,
        },
      ],
    },
    {
      title: 'Santé',
      items: [
        {
          id: 'health',
          label: 'Données de santé',
          icon: <Heart size={16} color="#F87171" />,
          onPress: () => navigation.navigate('HealthSettings'),
        },
      ],
    },
    {
      title: 'Notifications',
      items: [
        {
          id: 'notifications',
          label: 'Notifications',
          icon: <Bell size={16} color="#A8A8C0" />,
          onPress: () => navigation.navigate('Notifications'),
        },
      ],
    },
    {
      title: 'Confidentialité',
      items: [
        {
          id: 'privacy',
          label: 'Données & confidentialité',
          icon: <Shield size={16} color="#A8A8C0" />,
          onPress: () => navigation.navigate('DataPrivacy'),
        },
      ],
    },
    {
      title: 'À propos',
      items: [
        {
          id: 'about',
          label: 'À propos de VIVE',
          icon: <Info size={16} color="#A8A8C0" />,
          onPress: () => navigation.navigate('About'),
        },
      ],
    },
  ];

  const displayName =
    user?.user_metadata?.full_name ??
    user?.email?.split('@')[0] ??
    'Utilisateur';

  const email = user?.email ?? '';
  const currentPlan = plan ?? 'Free';
  const APP_VERSION = '1.0.0';
  const BUILD_NUMBER = '42';

  return (
    <View
      className="flex-1 bg-[#080810]"
      style={{ paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }}
    >
      <StatusBar barStyle="light-content" backgroundColor="#080810" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
      >
        {/* ── Header ──────────────────────────────────────── */}
        <View className="px-5 pt-6 pb-2">
          <Text className="text-2xl font-bold text-[#E8E8F0] tracking-tight">
            Réglages
          </Text>
        </View>

        {/* ── User Card ───────────────────────────────────── */}
        <View className="mx-5 mt-4 mb-6 bg-[#1C1C28] rounded-2xl p-4 border border-white/8">
          <View className="flex-row items-center">
            {/* Avatar */}
            <View className="w-14 h-14 rounded-2xl bg-[#3D8BFF]/20 border border-[#3D8BFF]/30 items-center justify-center mr-3">
              <Text className="text-xl font-bold text-[#3D8BFF]">
                {displayName.charAt(0).toUpperCase()}
              </Text>
            </View>

            {/* Info */}
            <View className="flex-1">
              <Text
                className="text-base font-semibold text-[#E8E8F0] mb-0.5"
                numberOfLines={1}
              >
                {displayName}
              </Text>
              <Text
                className="text-sm text-[#A8A8C0] mb-1.5"
                numberOfLines={1}
              >
                {email}
              </Text>
              <PlanBadge plan={currentPlan} />
            </View>
          </View>
        </View>

        {/* ── Sections ────────────────────────────────────── */}
        {sections.map((section) => (
          <View key={section.title} className="mx-5 mb-4">
            <Text className="text-xs font-semibold text-[#A8A8C0] uppercase tracking-widest mb-2 px-1">
              {section.title}
            </Text>
            <View className="bg-[#111118] rounded-2xl border border-white/6 overflow-hidden">
              {section.items.map((item, index) => (
                <SettingRow
                  key={item.id}
                  item={item}
                  isLast={index === section.items.length - 1}
                />
              ))}
            </View>
          </View>
        ))}

        {/* ── Logout ──────────────────────────────────────── */}
        <View className="mx-5 mt-2">
          <TouchableOpacity
            onPress={handleLogout}
            activeOpacity={0.8}
            className="bg-red-500/10 border border-red-500/25 rounded-2xl py-4 flex-row items-center justify-center gap-2"
          >
            <LogOut size={18} color="#F87171" />
            <Text className="text-red-400 font-semibold text-sm">
              Se déconnecter
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Version ─────────────────────────────────────── */}
        <View className="items-center mt-8">
          <Text className="text-[#A8A8C0]/50 text-xs">
            VIVE v{APP_VERSION} ({BUILD_NUMBER})
          </Text>
          <Text className="text-[#A8A8C0]/30 text-xs mt-1">
            Fait avec ♥ pour votre bien-être
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

export default SettingsScreen;
