import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  Platform,
  StatusBar,
  StyleSheet,
  ListRenderItem,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';

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

// âââ ThÃ¨me âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
const Theme = {
  bg: '#080810',
  surface: '#1C1C28',
  surfaceAlt: '#111118',
  textPrimary: '#E8E8F0',
  textSecondary: '#A8A8C0',
  accent: '#3D8BFF',
  danger: '#F87171',
  dangerBg: 'rgba(239,68,68,0.10)',
  dangerBorder: 'rgba(239,68,68,0.25)',
  dangerIcon: 'rgba(239,68,68,0.15)',
  borderSubtle: 'rgba(255,255,255,0.05)',
  borderMedium: 'rgba(255,255,255,0.06)',
  borderStrong: 'rgba(255,255,255,0.08)',
  accentBg: 'rgba(61,139,255,0.20)',
  accentBorder: 'rgba(61,139,255,0.30)',
  iconBg: 'rgba(255,255,255,0.08)',
  premiumBg: 'rgba(61,139,255,0.20)',
  premiumBorder: 'rgba(61,139,255,0.40)',
  eliteBg: 'rgba(234,179,8,0.20)',
  eliteBorder: 'rgba(234,179,8,0.40)',
  eliteText: '#FBBF24',
  badgeBg: 'rgba(61,139,255,0.20)',
  versionText: 'rgba(168,168,192,0.50)',
  footerText: 'rgba(168,168,192,0.30)',
} as const;

const APP_VERSION = '1.0.0';
const BUILD_NUMBER = '42';

// âââ Types âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
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

// âââ Plan Badge ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
interface PlanBadgeProps {
  plan: string;
}

const PlanBadge: React.FC<PlanBadgeProps> = React.memo(({ plan }) => {
  const isPremium = plan === 'Premium';
  const isElite = plan === 'Elite';

  const containerStyle = useMemo(
    () => [
      styles.planBadge,
      isElite
        ? styles.planBadgeElite
        : isPremium
        ? styles.planBadgePremium
        : styles.planBadgeFree,
    ],
    [isElite, isPremium],
  );

  const textStyle = useMemo(
    () => [
      styles.planBadgeText,
      isElite
        ? styles.planBadgeTextElite
        : isPremium
        ? styles.planBadgeTextPremium
        : styles.planBadgeTextFree,
    ],
    [isElite, isPremium],
  );

  return (
    <View style={containerStyle}>
      {(isElite || isPremium) && (
        <Crown size={10} color={isElite ? Theme.eliteText : Theme.accent} />
      )}
      <Text style={textStyle}>{plan}</Text>
    </View>
  );
});

PlanBadge.displayName = 'PlanBadge';

// âââ Setting Row âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
interface SettingRowProps {
  item: SettingItem;
  isLast: boolean;
}

const SettingRow: React.FC<SettingRowProps> = React.memo(({ item, isLast }) => {
  const rowStyle = useMemo(
    () => [styles.settingRow, !isLast && styles.settingRowBorder],
    [isLast],
  );

  const iconContainerStyle = useMemo(
    () => [styles.settingIconContainer, item.danger && styles.settingIconContainerDanger],
    [item.danger],
  );

  const labelStyle = useMemo(
    () => [styles.settingLabel, item.danger && styles.settingLabelDanger],
    [item.danger],
  );

  return (
    <TouchableOpacity
      onPress={item.onPress}
      activeOpacity={0.7}
      style={rowStyle}
    >
      <View style={iconContainerStyle}>{item.icon}</View>
      <Text style={labelStyle}>{item.label}</Text>
      {item.badge !== undefined && (
        <View style={styles.badgeContainer}>
          <Text style={styles.badgeText}>{item.badge}</Text>
        </View>
      )}
      <ChevronRight
        size={16}
        color={item.danger ? Theme.danger : Theme.textSecondary}
      />
    </TouchableOpacity>
  );
});

SettingRow.displayName = 'SettingRow';

// âââ Section Block ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
interface SectionBlockProps {
  section: SettingSection;
}

const SectionBlock: React.FC<SectionBlockProps> = React.memo(({ section }) => (
  <View style={styles.sectionContainer}>
    <Text style={styles.sectionTitle}>{section.title}</Text>
    <View style={styles.sectionCard}>
      {section.items.map((item, index) => (
        <SettingRow
          key={item.id}
          item={item}
          isLast={index === section.items.length - 1}
        />
      ))}
    </View>
  </View>
));

SectionBlock.displayName = 'SectionBlock';

// âââ Hook: useSections âââââââââââââââââââââââââââââââââââââââââââââââââââââââ
function useSections(
  navigation: NavigationProp,
  plan: string,
  handleLogout: () => void,
): SettingSection[] {
  return useMemo(
    () => [
      {
        title: 'Compte',
        items: [
          {
            id: 'account',
            label: 'Mon compte',
            icon: <User size={16} color={Theme.textSecondary} />,
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
            icon: <CreditCard size={16} color={Theme.accent} />,
            onPress: () => navigation.navigate('Subscription'),
            badge: plan !== 'Free' ? plan : undefined,
          },
        ],
      },
      {
        title: 'SantÃ©',
        items: [
          {
            id: 'health',
            label: 'DonnÃ©es de santÃ©',
            icon: <Heart size={16} color={Theme.danger} />,
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
            icon: <Bell size={16} color={Theme.textSecondary} />,
            onPress: () => navigation.navigate('Notifications'),
          },
        ],
      },
      {
        title: 'ConfidentialitÃ©',
        items: [
          {
            id: 'privacy',
            label: 'DonnÃ©es & confidentialitÃ©',
            icon: <Shield size={16} color={Theme.textSecondary} />,
            onPress: () => navigation.navigate('DataPrivacy'),
          },
        ],
      },
      {
        title: 'Ã propos',
        items: [
          {
            id: 'about',
            label: 'Ã propos de VIVE',
            icon: <Info size={16} color={Theme.textSecondary} />,
            onPress: () => navigation.navigate('About'),
          },
        ],
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [navigation, plan],
  );
}

// âââ Main Screen âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
export const SettingsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const { user, plan, clearAuth } = useAuthStore();

  const handleLogout = useCallback(() => {
    Alert.alert(
      'Se dÃ©connecter',
      'Ãtes-vous sÃ»r de vouloir vous dÃ©connecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'DÃ©connecter',
          style: 'destructive',
          onPress: async () => {
            try {
              await supabase.auth.signOut();
              clearAuth();
            } catch {
              Alert.alert('Erreur', 'Impossible de se dÃ©connecter.');
            }
          },
        },
      ],
    );
  }, [clearAuth]);

  const currentPlan = plan ?? 'Free';
  const sections = useSections(navigation, currentPlan, handleLogout);

  const displayName = useMemo(
    () =>
      user?.user_metadata?.full_name ??
      user?.email?.split('@')[0] ??
      'Utilisateur',
    [user],
  );

  const email = user?.email ?? '';

  const avatarLetter = useMemo(
    () => displayName.charAt(0).toUpperCase(),
    [displayName],
  );

  const contentContainerStyle = useMemo(
    () => [styles.listContent, { paddingBottom: insets.bottom + 32 }],
    [insets.bottom],
  );

  const containerStyle = useMemo(
    () => [
      styles.container,
      Platform.OS === 'android' && { paddingTop: StatusBar.currentHeight ?? 0 },
    ],
    [],
  );

  const renderItem: ListRenderItem<SettingSection> = useCallback(
    ({ item }) => <SectionBlock section={item} />,
    [],
  );

  const keyExtractor = useCallback(
    (item: SettingSection) => item.title,
    [],
  );

  const ListHeaderComponent = useMemo(
    () => (
      <>
        {/* ââ Header ââââââââââââââââââââââââââââââââââââââââ */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>RÃ©glages</Text>
        </View>

        {/* ââ User Card âââââââââââââââââââââââââââââââââââââ */}
        <View style={styles.userCard}>
          <View style={styles.userCardInner}>
            <View style={styles.avatarContainer}>
              <Text style={styles.avatarText}>{avatarLetter}</Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName} numberOfLines={1}>
                {displayName}
              </Text>
              <Text style={styles.userEmail} numberOfLines={1}>
                {email}
              </Text>
              <PlanBadge plan={currentPlan} />
            </View>
          </View>
        </View>
      </>
    ),
    [avatarLetter, currentPlan, displayName, email],
  );

  const ListFooterComponent = useMemo(
    () => (
      <>
        {/* ââ Logout ââââââââââââââââââââââââââââââââââââââââ */}
        <View style={styles.logoutContainer}>
          <TouchableOpacity
            onPress={handleLogout}
            activeOpacity={0.8}
            style={styles.logoutButton}
          >
            <LogOut size={18} color={Theme.danger} />
            <Text style={styles.logoutText}>Se dÃ©connecter</Text>
          </TouchableOpacity>
        </View>

        {/* ââ Version âââââââââââââââââââââââââââââââââââââââ */}
        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>
            VIVE v{APP_VERSION} ({BUILD_NUMBER})
          </Text>
          <Text style={styles.footerText}>
            Fait avec â¥ pour votre bien-Ãªtre
          </Text>
        </View>
      </>
    ),
    [handleLogout],
  );

  return (
    <View style={containerStyle}>
      <StatusBar barStyle="light-content" backgroundColor={Theme.bg} />
      <FlatList<SettingSection>
        data={sections}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListHeaderComponent={ListHeaderComponent}
        ListFooterComponent={ListFooterComponent}
        contentContainerStyle={contentContainerStyle}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

// âââ Styles âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.bg,
  },
  listContent: {
    flexGrow: 1,
  },
  // Header
  header: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Theme.textPrimary,
    letterSpacing: -0.5,
  },
  // User Card
  userCard: {
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 24,
    backgroundColor: Theme.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Theme.borderStrong,
  },
  userCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: Theme.accentBg,
    borderWidth: 1,
    borderColor: Theme.accentBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: Theme.accent,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 15,
    fontWeight: '600',
    color: Theme.textPrimary,
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 13,
    color: Theme.textSecondary,
    marginBottom: 6,
  },
  // Plan Badge
  planBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    borderWidth: 1,
  },
  planBadgeElite: {
    backgroundColor: Theme.eliteBg,
    borderColor: Theme.eliteBorder,
  },
  planBadgePremium: {
    backgroundColor: Theme.premiumBg,
    borderColor: Theme.premiumBorder,
  },
  planBadgeFree: {
    backgroundColor: Theme.iconBg,
    borderColor: Theme.borderStrong,
  },
  planBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  planBadgeTextElite: {
    color: Theme.eliteText,
  },
  planBadgeTextPremium: {
    color: Theme.accent,
  },
  planBadgeTextFree: {
    color: Theme.textSecondary,
  },
  // Section
  sectionContainer: {
    marginHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: Theme.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  sectionCard: {
    backgroundColor: Theme.surfaceAlt,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Theme.borderMedium,
    overflow: 'hidden',
  },
  // Setting Row
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  settingRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Theme.borderSubtle,
  },
  settingIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: Theme.iconBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  settingIconContainerDanger: {
    backgroundColor: Theme.dangerIcon,
  },
  settingLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: Theme.textPrimary,
  },
  settingLabelDanger: {
    color: Theme.danger,
  },
  // Badge
  badgeContainer: {
    backgroundColor: Theme.badgeBg,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    marginRight: 8,
  },
  badgeText: {
    color: Theme.accent,
    fontSize: 11,
    fontWeight: '600',
  },
  // Logout
  logoutContainer: {
    marginHorizontal: 20,
    marginTop: 8,
  },
  logoutButton: {
    backgroundColor: Theme.dangerBg,
    borderWidth: 1,
    borderColor: Theme.dangerBorder,
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  logoutText: {
    color: Theme.danger,
    fontWeight: '600',
    fontSize: 14,
  },
  // Version
  versionContainer: {
    alignItems: 'center',
    marginTop: 32,
  },
  versionText: {
    color: Theme.versionText,
    fontSize: 11,
  },
  footerText: {
    color: Theme.footerText,
    fontSize: 11,
    marginTop: 4,
  },
});

export default SettingsScreen;