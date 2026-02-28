import React, { useState, useCallback } from 'react';
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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
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

// âââ Types âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
interface ConsentItem {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  enabled: boolean;
  key: ConsentKey;
}

type ConsentKey = 'analytics' | 'healthSharing' | 'marketing';

interface ConsentState {
  analytics: boolean;
  healthSharing: boolean;
  marketing: boolean;
}

// âââ Consent Toggle Row âââââââââââââââââââââââââââââââââââââââââââââââââââââââ
const ConsentRow: React.FC<{
  item: ConsentItem;
  onToggle: (key: ConsentKey, value: boolean) => void;
  isLast: boolean;
}> = ({ item, onToggle, isLast }) => (
  <View
    className={`px-4 py-4 ${
      !isLast ? 'border-b border-white/5' : ''
    }`}
  >
    <View className="flex-row items-start">
      <View className="w-8 h-8 rounded-xl bg-white/8 items-center justify-center mr-3 mt-0.5">
        {item.icon}
      </View>
      <View className="flex-1 mr-3">
        <Text className="text-sm font-semibold text-[#E8E8F0] mb-1">
          {item.title}
        </Text>
        <Text className="text-xs text-[#A8A8C0] leading-4">
          {item.description}
        </Text>
      </View>
      <Switch
        value={item.enabled}
        onValueChange={(val) => onToggle(item.key, val)}
        trackColor={{ false: '#1C1C28', true: '#3D8BFF40' }}
        thumbColor={item.enabled ? '#3D8BFF' : '#A8A8C0'}
        ios_backgroundColor="#1C1C28"
      />
    </View>
  </View>
);

// âââ Info Row ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
const InfoRow: React.FC<{ label: string; value: string; isLast?: boolean }> = ({
  label,
  value,
  isLast,
}) => (
  <View
    className={`flex-row justify-between px-4 py-3 ${
      !isLast ? 'border-b border-white/5' : ''
    }`}
  >
    <Text className="text-sm text-[#A8A8C0]">{label}</Text>
    <Text className="text-sm font-medium text-[#E8E8F0]">{value}</Text>
  </View>
);

// âââ Main Screen âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
export const DataPrivacyScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { user, clearAuth } = useAuthStore();

  const [consents, setConsents] = useState<ConsentState>({
    analytics: true,
    healthSharing: false,
    marketing: false,
  });
  const [savingConsent, setSavingConsent] = useState<ConsentKey | null>(null);
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // ââ Consent handler âââââââââââââââââââââââââââââââââââââââââââââââââââââ
  const handleConsentToggle = useCallback(
    async (key: ConsentKey, value: boolean) => {
      setConsents((prev) => ({ ...prev, [key]: value }));
      setSavingConsent(key);
      try {
        const { error } = await supabase
          .from('user_consents')
          .upsert(
            { user_id: user?.id, [key]: value, updated_at: new Date().toISOString() },
            { onConflict: 'user_id' },
          );
        if (error) throw error;
      } catch {
        // Revert on failure
        setConsents((prev) => ({ ...prev, [key]: !value }));
        Alert.alert('Erreur', 'Impossible de sauvegarder votre prÃ©fÃ©rence.');
      } finally {
        setSavingConsent(null);
      }
    },
    [user?.id],
  );

  // ââ Export handler ââââââââââââââââââââââââââââââââââââââââââââââââââââââ
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
                body: { user_id: user?.id, email: user?.email },
              });
              if (error) throw error;
              Alert.alert(
                'Demande envoyÃ©e â',
                `Un email sera envoyÃ© Ã  ${user?.email} dans les 48 heures.`,
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
  }, [user?.id, user?.email]);

  // ââ Delete account handler âââââââââââââââââââââââââââââââââââââââââââââââ
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
            // Second confirmation
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
                        { body: { user_id: user?.id } },
                      );
                      if (error) throw error;
                      await supabase.auth.signOut();
                      clearAuth();
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
  }, [user?.id, clearAuth]);

  // ââ Consent items ââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
  const consentItems: ConsentItem[] = [
    {
      id: 'analytics',
      key: 'analytics',
      title: 'Analyses & performance',
      description:
        'Nous aide Ã  amÃ©liorer l\'application en collectant des donnÃ©es d\'utilisation anonymisÃ©es (crashs, performances, parcours utilisateur).',
      icon: <BarChart2 size={15} color="#3D8BFF" />,
      enabled: consents.analytics,
    },
    {
      id: 'healthSharing',
      key: 'healthSharing',
      title: 'Partage donnÃ©es de santÃ©',
      description:
        'Autorise VIVE Ã  partager vos donnÃ©es agrÃ©gÃ©es de bien-Ãªtre avec des partenaires de recherche anonymisÃ©s pour amÃ©liorer les modÃ¨les de santÃ©.',
      icon: <Heart size={15} color="#F87171" />,
      enabled: consents.healthSharing,
    },
    {
      id: 'marketing',
      key: 'marketing',
      title: 'Communications marketing',
      description:
        'Recevez des offres personnalisÃ©es, nouvelles fonctionnalitÃ©s et conseils bien-Ãªtre par email. DÃ©sactivable Ã  tout moment.',
      icon: <Mail size={15} color="#A8A8C0" />,
      enabled: consents.marketing,
    },
  ];

  return (
    <View
      className="flex-1 bg-[#080810]"
      style={{ paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }}
    >
      <StatusBar barStyle="light-content" backgroundColor="#080810" />

      {/* ââ Nav Header ââââââââââââââââââââââââââââââââââââ */}
      <View className="flex-row items-center px-5 pt-5 pb-3">
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="w-9 h-9 rounded-xl bg-white/8 items-center justify-center mr-3"
        >
          <Text className="text-[#E8E8F0] text-base">â¹</Text>
        </TouchableOpacity>
        <Text className="text-xl font-bold text-[#E8E8F0]">ConfidentialitÃ©</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
      >
        {/* ââ Hero Banner âââââââââââââââââââââââââââââââââââ */}
        <View className="mx-5 mt-2 mb-6 bg-[#1C1C28] rounded-3xl p-5 border border-white/8">
          <View className="flex-row items-center gap-3 mb-3">
            <View className="w-11 h-11 rounded-2xl bg-[#3D8BFF]/15 border border-[#3D8BFF]/25 items-center justify-center">
              <Shield size={20} color="#3D8BFF" />
            </View>
            <View>
              <Text className="text-[#E8E8F0] font-bold text-base">
                Vos donnÃ©es vous appartiennent
              </Text>
              <Text className="text-[#A8A8C0] text-xs">ContrÃ´le total & transparence</Text>
            </View>
          </View>
          <Text className="text-[#A8A8C0] text-sm leading-5">
            VIVE s\'engage Ã  protÃ©ger votre vie privÃ©e. GÃ©rez ici vos consentements
            et droits RGPD.
          </Text>
        </View>

        {/* ââ Consentements âââââââââââââââââââââââââââââââââ */}
        <View className="mx-5 mb-5">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-xs font-semibold text-[#A8A8C0] uppercase tracking-widest">
              Consentements
            </Text>
            {savingConsent !== null && (
              <View className="flex-row items-center gap-1">
                <ActivityIndicator size="small" color="#3D8BFF" />
                <Text className="text-xs text-[#3D8BFF]">Sauvegardeâ¦</Text>
              </View>
            )}
          </View>

          <View className="bg-[#111118] rounded-2xl border border-white/6 overflow-hidden">
            {consentItems.map((item, index) => (
              <ConsentRow
                key={item.id}
                item={item}
                onToggle={handleConsentToggle}
                isLast={index === consentItems.length - 1}
              />
            ))}
          </View>
        </View>

        {/* ââ Export Data âââââââââââââââââââââââââââââââââââ */}
        <View className="mx-5 mb-5">
          <Text className="text-xs font-semibold text-[#A8A8C0] uppercase tracking-widest mb-2">
            Mes donnÃ©es
          </Text>

          <View className="bg-[#111118] rounded-2xl border border-white/6 overflow-hidden">
            <View className="px-4 py-4 border-b border-white/5">
              <View className="flex-row items-start gap-3">
                <View className="w-8 h-8 rounded-xl bg-white/8 items-center justify-center mt-0.5">
                  <Info size={14} color="#A8A8C0" />
                </View>
                <Text className="flex-1 text-xs text-[#A8A8C0] leading-4">
                  ConformÃ©ment au RGPD, vous pouvez obtenir une copie complÃ¨te de
                  vos donnÃ©es personnelles au format JSON.
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={handleExport}
              disabled={exporting}
              activeOpacity={0.8}
              className="flex-row items-center px-4 py-4"
            >
              <View className="w-8 h-8 rounded-xl bg-[#3D8BFF]/15 items-center justify-center mr-3">
                {exporting ? (
                  <ActivityIndicator size="small" color="#3D8BFF" />
                ) : (
                  <Download size={15} color="#3D8BFF" />
                )}
              </View>
              <View className="flex-1">
                <Text className="text-sm font-semibold text-[#3D8BFF]">
                  {exporting ? 'Traitement en coursâ¦' : 'Exporter mes donnÃ©es'}
                </Text>
                <Text className="text-xs text-[#A8A8C0] mt-0.5">
                  ReÃ§u par email sous 48h
                </Text>
              </View>
              <ChevronRight size={16} color="#3D8BFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* ââ RÃ©tention âââââââââââââââââââââââââââââââââââââ */}
        <View className="mx-5 mb-5">
          <Text className="text-xs font-semibold text-[#A8A8C0] uppercase tracking-widest mb-2">
            Conservation des donnÃ©es
          </Text>

          <View className="bg-[#111118] rounded-2xl border border-white/6 overflow-hidden">
            <InfoRow label="DonnÃ©es de compte" value="DurÃ©e de vie du compte" />
            <InfoRow label="DonnÃ©es de santÃ©" value="3 ans" />
            <InfoRow label="Logs d'activitÃ©" value="90 jours" />
            <InfoRow label="AprÃ¨s suppression" value="30 jours" isLast />
          </View>
        </View>

        {/* ââ Politique de confidentialitÃ© âââââââââââââââââââ */}
        <View className="mx-5 mb-5">
          <Text className="text-xs font-semibold text-[#A8A8C0] uppercase tracking-widest mb-2">
            Ressources
          </Text>

          <View className="bg-[#111118] rounded-2xl border border-white/6 overflow-hidden">
            <TouchableOpacity
              onPress={() =>
                Linking.openURL('https://vive.app/privacy')
              }
              activeOpacity={0.8}
              className="flex-row items-center px-4 py-4 border-b border-white/5"
            >
              <View className="w-8 h-8 rounded-xl bg-white/8 items-center justify-center mr-3">
                <Shield size={14} color="#A8A8C0" />
              </View>
              <Text className="flex-1 text-sm text-[#E8E8F0] font-medium">
                Politique de confidentialitÃ©
              </Text>
              <ExternalLink size={14} color="#A8A8C0" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => Linking.openURL('https://vive.app/terms')}
              activeOpacity={0.8}
              className="flex-row items-center px-4 py-4"
            >
              <View className="w-8 h-8 rounded-xl bg-white/8 items-center justify-center mr-3">
                <ExternalLink size={14} color="#A8A8C0" />
              </View>
              <Text className="flex-1 text-sm text-[#E8E8F0] font-medium">
                Conditions d\'utilisation
              </Text>
              <ExternalLink size={14} color="#A8A8C0" />
            </TouchableOpacity>
          </View>
        </View>

        {/* ââ Danger Zone âââââââââââââââââââââââââââââââââââ */}
        <View className="mx-5">
          <Text className="text-xs font-semibold text-[#A8A8C0] uppercase tracking-widest mb-2">
            Zone de danger
          </Text>

          <View className="bg-red-500/5 rounded-2xl border border-red-500/20 overflow-hidden">
            <View className="px-4 py-4 border-b border-red-500/10">
              <View className="flex-row items-start gap-3">
                <View className="w-8 h-8 rounded-xl bg-red-500/15 items-center justify-center mt-0.5">
                  <Info size={14} color="#F87171" />
                </View>
                <Text className="flex-1 text-xs text-red-400/80 leading-4">
                  La suppression de votre compte est dÃ©finitive. Toutes vos donnÃ©es
                  seront effacÃ©es dans un dÃ©lai de 30 jours. Aucune restauration
                  ne sera possible.
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={handleDeleteAccount}
              disabled={deleting}
              activeOpacity={0.8}
              className="flex-row items-center px-4 py-4"
            >
              <View className="w-8 h-8 rounded-xl bg-red-500/15 items-center justify-center mr-3">
                {deleting ? (
                  <ActivityIndicator size="small" color="#F87171" />
                ) : (
                  <Trash2 size={15} color="#F87171" />
                )}
              </View>
              <View className="flex-1">
                <Text className="text-sm font-semibold text-red-400">
                  {deleting ? 'Suppressionâ¦' : 'Supprimer mon compte'}
                </Text>
                <Text className="text-xs text-red-400/60 mt-0.5">
                  Action irrÃ©versible
                </Text>
              </View>
              <ChevronRight size={16} color="#F87171" />
            </TouchableOpacity>
          </View>
        </View>

        {/* ââ Footer ââââââââââââââââââââââââââââââââââââââââ */}
        <View className="mx-5 mt-8">
          <Text className="text-[#A8A8C0]/40 text-xs text-center leading-4">
            VIVE respecte le RÃ¨glement GÃ©nÃ©ral sur la Protection des DonnÃ©es
            (RGPD). Pour toute demande, contactez privacy@vive.app
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

export default DataPrivacyScreen;
