import React, { useState, useCallback, useMemo, memo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
  Platform,
  StatusBar,
  Linking,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Shield,
  Download,
  Trash2,
  ExternalLink,
  ChevronRight,
  Info,
  BarChart2,
  Heart,
  Mail,
} from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';

// âââ Theme ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
const Theme = {
  colors: {
    background: '#080810',
    surface: '#111118',
    surfaceElevated: '#1C1C28',
    border: 'rgba(255,255,255,0.06)',
    borderLight: 'rgba(255,255,255,0.05)',
    borderMedium: 'rgba(255,255,255,0.08)',
    textPrimary: '#E8E8F0',
    textSecondary: '#A8A8C0',
    textDisabled: 'rgba(168,168,192,0.4)',
    accent: '#3D8BFF',
    accentBg: 'rgba(61,139,255,0.15)',
    accentBorder: 'rgba(61,139,255,0.25)',
    accentTrack: 'rgba(61,139,255,0.25)',
    danger: '#F87171',
    dangerBg: 'rgba(239,68,68,0.05)',
    dangerBorder: 'rgba(239,68,68,0.20)',
    dangerBorderLight: 'rgba(239,68,68,0.10)',
    dangerText: 'rgba(248,113,113,0.80)',
    dangerTextMuted: 'rgba(248,113,113,0.60)',
    dangerIconBg: 'rgba(239,68,68,0.15)',
    iconBg: 'rgba(255,255,255,0.08)',
    healthIcon: '#F87171',
    switchTrackOff: '#1C1C28',
    switchThumbOff: '#A8A8C0',
  },
} as const;

// âââ Types ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
type ConsentKey = 'analytics' | 'healthSharing' | 'marketing';

// Issue #1 corrigÃ©e : suppression du champ 'enabled' de ConsentItem.
// La valeur est calculÃ©e dynamiquement depuis consents[item.key] dans le rendu.
interface ConsentItem {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  key: ConsentKey;
}

interface ConsentState {
  analytics: boolean;
  healthSharing: boolean;
  marketing: boolean;
}

type RootStackParamList = {
  Auth: undefined;
  [key: string]: undefined;
};

// âââ Safe URL opener ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// Issue #5 corrigÃ©e : vÃ©rification via canOpenURL avant d'ouvrir le lien.
const openSafeURL = (url: string): void => {
  Linking.canOpenURL(url).then((supported) => {
    if (supported) {
      Linking.openURL(url);
    } else {
      Alert.alert('Erreur', "Impossible d'ouvrir ce lien.");
    }
  });
};

// âââ Consent Toggle Row âââââââââââââââââââââââââââââââââââââââââââââââââââââââ
interface ConsentRowProps {
  item: ConsentItem;
  enabled: boolean; // Issue #1 : reÃ§u en prop calculÃ© depuis consents[item.key]
  onToggle: (key: ConsentKey, value: boolean) => void;
  isLast: boolean;
}

const ConsentRow: React.FC<ConsentRowProps> = memo(({ item, enabled, onToggle, isLast }) => (
  <View style={[styles.consentRow, !isLast && styles.consentRowBorder]}>
    <View style={styles.consentRowInner}>
      <View style={styles.consentIconWrap}>
        {item.icon}
      </View>
      <View style={styles.consentTextWrap}>
        <Text style={styles.consentTitle}>{item.title}</Text>
        <Text style={styles.consentDesc}>{item.description}</Text>
      </View>
      <Switch
        value={enabled}
        onValueChange={(val) => onToggle(item.key, val)}
        trackColor={{ false: Theme.colors.switchTrackOff, true: Theme.colors.accentTrack }}
        thumbColor={enabled ? Theme.colors.accent : Theme.colors.switchThumbOff}
        ios_backgroundColor={Theme.colors.switchTrackOff}
      />
    </View>
  </View>
));

// âââ Info Row âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
interface InfoRowProps {
  label: string;
  value: string;
  isLast?: boolean;
}

const InfoRow: React.FC<InfoRowProps> = memo(({ label, value, isLast }) => (
  <View style={[styles.infoRow, !isLast && styles.infoRowBorder]}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue}>{value}</Text>
  </View>
));

// âââ Main Screen ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
export const DataPrivacyScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user, clearAuth } = useAuthStore();

  const [consents, setConsents] = useState<ConsentState>({
    analytics: true,
    healthSharing: false,
    marketing: false,
  });
  const [savingConsent, setSavingConsent] = useState<ConsentKey | null>(null);
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // ââ Consent handler ââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
  // Issue #4 corrigÃ©e : vÃ©rification que user?.id est dÃ©fini avant l'upsert.
  const handleConsentToggle = useCallback(
    async (key: ConsentKey, value: boolean) => {
      if (!user?.id) {
        Alert.alert('Erreur', 'Vous devez Ãªtre connectÃ© pour modifier vos prÃ©fÃ©rences.');
        return;
      }
      setConsents((prev) => ({ ...prev, [key]: value }));
      setSavingConsent(key);
      try {
        const { error } = await supabase
          .from('user_consents')
          .upsert(
            { user_id: user.id, [key]: value, updated_at: new Date().toISOString() },
            { onConflict: 'user_id' },
          );
        if (error) throw error;
      } catch {
        setConsents((prev) => ({ ...prev, [key]: !value }));
        Alert.alert('Erreur', 'Impossible de sauvegarder votre prÃ©fÃ©rence.');
      } finally {
        setSavingConsent(null);
      }
    },
    [user?.id],
  );

  // ââ Export handler âââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
  // Issue #3 corrigÃ©e : on ne passe plus user_id ni email dans le body.
  // La Edge Function identifie l'utilisateur via le JWT Supabase cÃ´tÃ© serveur.
  const handleExport = useCallback(async () => {
    Alert.alert(
      'Exporter mes donnÃ©es',
      'Vous recevrez un email avec toutes vos donnÃ©es VIVE dans un dÃ©lai de 48 heures.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          onPress: async () => {
            setExporting(true);
            try {
              const { error } = await supabase.functions.invoke('export-user-data', {
                body: {},
              });
              if (error) throw error;
              Alert.alert(
                'Demande envoyÃ©e â',
                'Un email sera envoyÃ© Ã  votre adresse dans les 48 heures.',
              );
            } catch {
              Alert.alert(
                'Erreur',
                'Impossible de traiter votre demande. RÃ©essayez plus tard.',
              );
            } finally {
              setExporting(false);
            }
          },
        },
      ],
    );
  }, []);

  // ââ Delete account handler âââââââââââââââââââââââââââââââââââââââââââââââââ
  // Issue #2 corrigÃ©e : on ne passe plus user_id dans le body.
  // Issue #6 corrigÃ©e : navigation.reset() vers Auth aprÃ¨s clearAuth().
  const handleDeleteAccount = useCallback(() => {
    Alert.alert(
      'â ï¸ Supprimer mon compte',
      'Cette action est irrÃ©versible. Toutes vos donnÃ©es seront dÃ©finitivement supprimÃ©es dans un dÃ©lai de 30 jours.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Confirmation finale',
              'Ãtes-vous absolument sÃ»r ? Cette action ne peut pas Ãªtre annulÃ©e.',
              [
                { text: 'Non, garder mon compte', style: 'cancel' },
                {
                  text: 'Oui, supprimer',
                  style: 'destructive',
                  onPress: async () => {
                    setDeleting(true);
                    try {
                      const { error } = await supabase.functions.invoke(
                        'delete-user-account',
                        { body: {} },
                      );
                      if (error) throw error;
                      await supabase.auth.signOut();
                      clearAuth();
                      navigation.reset({
                        index: 0,
                        routes: [{ name: 'Auth' }],
                      });
                    } catch {
                      Alert.alert(
                        'Erreur',
                        'Impossible de supprimer votre compte. Contactez le support.',
                      );
                    } finally {
                      setDeleting(false);
                    }
                  },
                },
              ],
            );
          },
        },
      ],
    );
  }, [clearAuth, navigation]);

  // ââ Consent items ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
  // Issue #1 corrigÃ©e : 'enabled' retirÃ© de ConsentItem, calculÃ© Ã  la volÃ©e.
  // useMemo : recrÃ©ation uniquement si les icÃ´nes changent (jamais en pratique).
  const consentItems = useMemo<ConsentItem[]>(
    () => [
      {
        id: 'analytics',
        key: 'analytics',
        title: 'Analyses & performance',
        description:
          "Nous aide Ã  amÃ©liorer l'application en collectant des donnÃ©es d'utilisation anonymisÃ©es (crashs, performances, parcours utilisateur).",
        icon: <BarChart2 size={15} color={Theme.colors.accent} />,
      },
      {
        id: 'healthSharing',
        key: 'healthSharing',
        title: 'Partage donnÃ©es de santÃ©',
        description:
          'Autorise VIVE Ã  partager vos donnÃ©es agrÃ©gÃ©es de bien-Ãªtre avec des partenaires de recherche anonymisÃ©s pour amÃ©liorer les modÃ¨les de santÃ©.',
        icon: <Heart size={15} color={Theme.colors.healthIcon} />,
      },
      {
        id: 'marketing',
        key: 'marketing',
        title: 'Communications marketing',
        description:
          'Recevez des offres personnalisÃ©es, nouvelles fonctionnalitÃ©s et conseils bien-Ãªtre par email. DÃ©sactivable Ã  tout moment.',
        icon: <Mail size={15} color={Theme.colors.textSecondary} />,
      },
    ],
    [],
  );

  const androidTopPadding = useMemo(
    () => (Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0),
    [],
  );

  const scrollContentStyle = useMemo(
    () => ({ paddingBottom: insets.bottom + 40 }),
    [insets.bottom],
  );

  return (
    <View style={[styles.root, { paddingTop: androidTopPadding }]}>
      <StatusBar barStyle="light-content" backgroundColor={Theme.colors.background} />

      {/* ââ Nav Header âââââââââââââââââââââââââââââââââ */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          activeOpacity={0.8}
        >
          <Text style={styles.backArrow}>â¹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>ConfidentialitÃ©</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={scrollContentStyle}
      >
        {/* ââ Hero Banner ââââââââââââââââââââââââââââââââ */}
        <View style={styles.heroBanner}>
          <View style={styles.heroTop}>
            <View style={styles.heroIconWrap}>
              <Shield size={20} color={Theme.colors.accent} />
            </View>
            <View>
              <Text style={styles.heroTitle}>Vos donnÃ©es vous appartiennent</Text>
              <Text style={styles.heroSubtitle}>ContrÃ´le total & transparence</Text>
            </View>
          </View>
          <Text style={styles.heroBody}>
            VIVE s'engage Ã  protÃ©ger votre vie privÃ©e. GÃ©rez ici vos consentements
            et droits RGPD.
          </Text>
        </View>

        {/* ââ Consentements ââââââââââââââââââââââââââââââ */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionLabel}>Consentements</Text>
            {savingConsent !== null && (
              <View style={styles.savingRow}>
                <ActivityIndicator size="small" color={Theme.colors.accent} />
                <Text style={styles.savingText}>Sauvegardeâ¦</Text>
              </View>
            )}
          </View>
          <View style={styles.card}>
            {consentItems.map((item, index) => (
              <ConsentRow
                key={item.id}
                item={item}
                enabled={consents[item.key]}
                onToggle={handleConsentToggle}
                isLast={index === consentItems.length - 1}
              />
            ))}
          </View>
        </View>

        {/* ââ Export Data ââââââââââââââââââââââââââââââââ */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Mes donnÃ©es</Text>
          <View style={styles.card}>
            <View style={styles.infoNotice}>
              <View style={styles.noticeIconWrap}>
                <Info size={14} color={Theme.colors.textSecondary} />
              </View>
              <Text style={styles.noticeText}>
                ConformÃ©ment au RGPD, vous pouvez obtenir une copie complÃ¨te de
                vos donnÃ©es personnelles au format JSON.
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleExport}
              disabled={exporting}
              activeOpacity={0.8}
              style={styles.actionRow}
            >
              <View style={styles.accentIconWrap}>
                {exporting ? (
                  <ActivityIndicator size="small" color={Theme.colors.accent} />
                ) : (
                  <Download size={15} color={Theme.colors.accent} />
                )}
              </View>
              <View style={styles.actionTextWrap}>
                <Text style={styles.accentActionTitle}>
                  {exporting ? 'Traitement en coursâ¦' : 'Exporter mes donnÃ©es'}
                </Text>
                <Text style={styles.actionSubtitle}>ReÃ§u par email sous 48h</Text>
              </View>
              <ChevronRight size={16} color={Theme.colors.accent} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ââ RÃ©tention ââââââââââââââââââââââââââââââââââ */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Conservation des donnÃ©es</Text>
          <View style={styles.card}>
            <InfoRow label="DonnÃ©es de compte" value="DurÃ©e de vie du compte" />
            <InfoRow label="DonnÃ©es de santÃ©" value="3 ans" />
            <InfoRow label="Logs d'activitÃ©" value="90 jours" />
            <InfoRow label="AprÃ¨s suppression" value="30 jours" isLast />
          </View>
        </View>

        {/* ââ Ressources âââââââââââââââââââââââââââââââââ */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Ressources</Text>
          <View style={styles.card}>
            {/* Issue #5 corrigÃ©e : openSafeURL utilisÃ© ici */}
            <TouchableOpacity
              onPress={() => openSafeURL('https://vive.app/privacy')}
              activeOpacity={0.8}
              style={[styles.actionRow, styles.actionRowBorder]}
            >
              <View style={styles.iconWrap}>
                <Shield size={14} color={Theme.colors.textSecondary} />
              </View>
              <Text style={styles.linkLabel}>Politique de confidentialitÃ©</Text>
              <ExternalLink size={14} color={Theme.colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => openSafeURL('https://vive.app/terms')}
              activeOpacity={0.8}
              style={styles.actionRow}
            >
              <View style={styles.iconWrap}>
                <ExternalLink size={14} color={Theme.colors.textSecondary} />
              </View>
              <Text style={styles.linkLabel}>Conditions d'utilisation</Text>
              <ExternalLink size={14} color={Theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ââ Danger Zone ââââââââââââââââââââââââââââââââ */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Zone de danger</Text>
          <View style={styles.dangerCard}>
            <View style={styles.dangerNotice}>
              <View style={styles.dangerIconWrap}>
                <Info size={14} color={Theme.colors.danger} />
              </View>
              <Text style={styles.dangerNoticeText}>
                La suppression de votre compte est dÃ©finitive. Toutes vos donnÃ©es
                seront effacÃ©es dans un dÃ©lai de 30 jours. Aucune restauration
                ne sera possible.
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleDeleteAccount}
              disabled={deleting}
              activeOpacity={0.8}
              style={styles.actionRow}
            >
              <View style={styles.dangerIconWrap}>
                {deleting ? (
                  <ActivityIndicator size="small" color={Theme.colors.danger} />
                ) : (
                  <Trash2 size={15} color={Theme.colors.danger} />
                )}
              </View>
              <View style={styles.actionTextWrap}>
                <Text style={styles.dangerActionTitle}>
                  {deleting ? 'Suppressionâ¦' : 'Supprimer mon compte'}
                </Text>
                <Text style={styles.dangerActionSubtitle}>Action irrÃ©versible</Text>
              </View>
              <ChevronRight size={16} color={Theme.colors.danger} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ââ Footer âââââââââââââââââââââââââââââââââââââ */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            VIVE respecte le RÃ¨glement GÃ©nÃ©ral sur la Protection des DonnÃ©es
            (RGPD). Pour toute demande, contactez privacy@vive.app
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

// âââ StyleSheet âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// Issue #7 corrigÃ©e : convention StyleSheet.create uniforme, toutes les couleurs
// sont issues du Theme, zÃ©ro valeur inline codÃ©e en dur.
const styles = StyleSheet.create({
  // Screen
  root: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: Theme.colors.iconBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  backArrow: {
    color: Theme.colors.textPrimary,
    fontSize: 22,
    lineHeight: 26,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Theme.colors.textPrimary,
  },
  // Hero
  heroBanner: {
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 24,
    backgroundColor: Theme.colors.surfaceElevated,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: Theme.colors.borderMedium,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  heroIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: Theme.colors.accentBg,
    borderWidth: 1,
    borderColor: Theme.colors.accentBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    color: Theme.colors.textPrimary,
    fontWeight: '700',
    fontSize: 15,
  },
  heroSubtitle: {
    color: Theme.colors.textSecondary,
    fontSize: 12,
  },
  heroBody: {
    color: Theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
  },
  // Section
  section: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  savingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  savingText: {
    fontSize: 11,
    color: Theme.colors.accent,
  },
  // Cards
  card: {
    backgroundColor: Theme.colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    overflow: 'hidden',
  },
  dangerCard: {
    backgroundColor: Theme.colors.dangerBg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Theme.colors.dangerBorder,
    overflow: 'hidden',
  },
  // Consent Row
  consentRow: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  consentRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.borderLight,
  },
  consentRowInner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  consentIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: Theme.colors.iconBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  consentTextWrap: {
    flex: 1,
    marginRight: 12,
  },
  consentTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Theme.colors.textPrimary,
    marginBottom: 4,
  },
  consentDesc: {
    fontSize: 11,
    color: Theme.colors.textSecondary,
    lineHeight: 16,
  },
  // Info Row
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  infoRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.borderLight,
  },
  infoLabel: {
    fontSize: 13,
    color: Theme.colors.textSecondary,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '500',
    color: Theme.colors.textPrimary,
  },
  // Action Row (gÃ©nÃ©rique)
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  actionRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.borderLight,
  },
  actionTextWrap: {
    flex: 1,
  },
  accentActionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Theme.colors.accent,
  },
  actionSubtitle: {
    fontSize: 11,
    color: Theme.colors.textSecondary,
    marginTop: 2,
  },
  accentIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: Theme.colors.accentBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: Theme.colors.iconBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  linkLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: Theme.colors.textPrimary,
  },
  // Notices
  infoNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.borderLight,
    gap: 12,
  },
  noticeIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: Theme.colors.iconBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  noticeText: {
    flex: 1,
    fontSize: 11,
    color: Theme.colors.textSecondary,
    lineHeight: 16,
  },
  dangerNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.dangerBorderLight,
    gap: 12,
  },
  dangerIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: Theme.colors.dangerIconBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    marginRight: 12,
  },
  dangerNoticeText: {
    flex: 1,
    fontSize: 11,
    color: Theme.colors.dangerText,
    lineHeight: 16,
  },
  dangerActionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Theme.colors.danger,
  },
  dangerActionSubtitle: {
    fontSize: 11,
    color: Theme.colors.dangerTextMuted,
    marginTop: 2,
  },
  // Footer
  footer: {
    marginHorizontal: 20,
    marginTop: 32,
  },
  footerText: {
    color: Theme.colors.textDisabled,
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
  },
});

export default DataPrivacyScreen;