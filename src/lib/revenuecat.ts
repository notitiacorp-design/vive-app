/**
 * src/lib/revenuecat.ts
 * VIVE App â RevenueCat configuration & helpers
 *
 * Call configureRevenueCat() once, as early as possible in the app lifecycle
 * (e.g. inside App.tsx before rendering any screens).
 */

import { Platform } from 'react-native';
import Purchases, {
  LOG_LEVEL,
  type PurchasesConfiguration,
} from 'react-native-purchases';

// ---------------------------------------------------------------------------
// Environment variables â utilisation exclusive de process.env.EXPO_PUBLIC_*
// ---------------------------------------------------------------------------
const RC_IOS_API_KEY: string = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? '';
const RC_ANDROID_API_KEY: string = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? '';

// ---------------------------------------------------------------------------
// Constants exported for use across the app
// ---------------------------------------------------------------------------

/** Identifiants d'entitlement RevenueCat (doivent correspondre au dashboard RC). */
export const ENTITLEMENTS = {
  /** AccÃ¨s aux fonctionnalitÃ©s premium : mÃ©triques avancÃ©es, tendances, coach IA. */
  PREMIUM: 'premium',
  /** AccÃ¨s Ã©lite complet : toutes les fonctionnalitÃ©s premium + coaching live + support prioritaire. */
  ELITE: 'elite',
} as const;

export type EntitlementId = (typeof ENTITLEMENTS)[keyof typeof ENTITLEMENTS];

/** Identifiants d'offres RevenueCat (doivent correspondre au dashboard RC). */
export const OFFERINGS = {
  DEFAULT: 'default',
  PREMIUM_MONTHLY: 'premium_monthly',
  PREMIUM_ANNUAL: 'premium_annual',
  ELITE_MONTHLY: 'elite_monthly',
  ELITE_ANNUAL: 'elite_annual',
} as const;

export type OfferingId = (typeof OFFERINGS)[keyof typeof OFFERINGS];

/** Identifiants de produits â correspond aux IDs App Store / Play Store. */
export const PRODUCT_IDS = {
  PREMIUM_MONTHLY: 'vive_premium_monthly',
  PREMIUM_ANNUAL: 'vive_premium_annual',
  ELITE_MONTHLY: 'vive_elite_monthly',
  ELITE_ANNUAL: 'vive_elite_annual',
} as const;

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/**
 * Initialise le SDK RevenueCat.
 *
 * Doit Ãªtre appelÃ© une seule fois au dÃ©marrage de l'application (avant tout
 * achat ou vÃ©rification d'entitlement). Peut Ãªtre appelÃ© plusieurs fois en
 * toute sÃ©curitÃ© â RevenueCat gÃ¨re la double initialisation en interne.
 *
 * @param userId  Identifiant utilisateur Supabase optionnel pour l'aliasing client RevenueCat.
 *                Passer undefined / null avant l'authentification de l'utilisateur ; appeler
 *                `Purchases.logIn(userId)` sÃ©parÃ©ment aprÃ¨s la connexion.
 */
export async function configureRevenueCat(userId?: string | null): Promise<void> {
  const apiKey = Platform.select({
    ios: RC_IOS_API_KEY,
    android: RC_ANDROID_API_KEY,
    default: RC_IOS_API_KEY,
  });

  if (!apiKey) {
    console.warn(
      '[VIVE/RevenueCat] ClÃ© API manquante pour la plateforme :',
      Platform.OS,
      'â DÃ©finissez EXPO_PUBLIC_REVENUECAT_IOS_KEY / EXPO_PUBLIC_REVENUECAT_ANDROID_KEY.',
    );
    return;
  }

  if (__DEV__) {
    Purchases.setLogLevel(LOG_LEVEL.DEBUG);
  }

  const config: PurchasesConfiguration = {
    apiKey,
    ...(userId ? { appUserID: userId } : {}),
  };

  try {
    Purchases.configure(config);

    if (__DEV__) {
      console.log(
        '[VIVE/RevenueCat] Configuration rÃ©ussie.',
        userId ? `Utilisateur : ${userId}` : 'Session anonyme.',
      );
    }
  } catch (err) {
    console.error('[VIVE/RevenueCat] Ãchec de la configuration :', err);
  }
}

/**
 * Associe un identifiant utilisateur Supabase authentifiÃ© au client RevenueCat.
 * Appeler immÃ©diatement aprÃ¨s une connexion rÃ©ussie.
 */
export async function loginRevenueCat(userId: string): Promise<void> {
  try {
    const { customerInfo } = await Purchases.logIn(userId);
    if (__DEV__) {
      console.log(
        '[VIVE/RevenueCat] ConnectÃ©. Entitlements actifs :',
        Object.keys(customerInfo.entitlements.active),
      );
    }
  } catch (err) {
    console.error('[VIVE/RevenueCat] Ãchec de la connexion :', err);
  }
}

/**
 * RÃ©initialise le client RevenueCat vers un ID anonyme.
 * Appeler lors de la dÃ©connexion pour Ã©viter les fuites d'entitlement entre utilisateurs.
 */
export async function logoutRevenueCat(): Promise<void> {
  try {
    await Purchases.logOut();
    if (__DEV__) {
      console.log('[VIVE/RevenueCat] DÃ©connectÃ© â session anonyme restaurÃ©e.');
    }
  } catch (err) {
    console.error('[VIVE/RevenueCat] Ãchec de la dÃ©connexion :', err);
  }
}

/**
 * Retourne si l'utilisateur possÃ¨de actuellement un entitlement actif.
 *
 * @param entitlementId  Un des identifiants de ENTITLEMENTS.
 */
export async function hasEntitlement(entitlementId: EntitlementId): Promise<boolean> {
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    return entitlementId in customerInfo.entitlements.active;
  } catch (err) {
    console.error('[VIVE/RevenueCat] Ãchec de la vÃ©rification d\'entitlement :', err);
    return false;
  }
}
