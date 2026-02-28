/**
 * src/lib/revenuecat.ts
 * VIVE App — RevenueCat configuration & helpers
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
// Environment variables
// ---------------------------------------------------------------------------
const RC_IOS_API_KEY: string =
  (process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY as string) ||
  // @ts-ignore
  (typeof __DEV__ !== 'undefined' && require('react-native-config')?.default?.REVENUECAT_IOS_KEY) ||
  '';

const RC_ANDROID_API_KEY: string =
  (process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY as string) ||
  // @ts-ignore
  (typeof __DEV__ !== 'undefined' && require('react-native-config')?.default?.REVENUECAT_ANDROID_KEY) ||
  '';

// ---------------------------------------------------------------------------
// Constants exported for use across the app
// ---------------------------------------------------------------------------

/** RevenueCat entitlement identifiers (must match your RC dashboard). */
export const ENTITLEMENTS = {
  /** Access to premium features: advanced metrics, trends, AI coach. */
  PREMIUM: 'premium',
  /** Full elite access: all premium features + live coaching + priority support. */
  ELITE: 'elite',
} as const;

export type EntitlementId = (typeof ENTITLEMENTS)[keyof typeof ENTITLEMENTS];

/** RevenueCat offering identifiers (must match your RC dashboard). */
export const OFFERINGS = {
  DEFAULT: 'default',
  PREMIUM_MONTHLY: 'premium_monthly',
  PREMIUM_ANNUAL: 'premium_annual',
  ELITE_MONTHLY: 'elite_monthly',
  ELITE_ANNUAL: 'elite_annual',
} as const;

export type OfferingId = (typeof OFFERINGS)[keyof typeof OFFERINGS];

/** Product identifiers — mirrors your App Store / Play Store product IDs. */
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
 * Initialises the RevenueCat SDK.
 *
 * Must be called once at app startup (before any purchase or entitlement
 * checks). Safe to call multiple times — RevenueCat guards against
 * double-initialisation internally.
 *
 * @param userId  Optional Supabase user ID for RevenueCat customer aliasing.
 *                Pass undefined / null before the user authenticates; call
 *                `Purchases.logIn(userId)` separately after sign-in.
 */
export async function configureRevenueCat(userId?: string | null): Promise<void> {
  const apiKey = Platform.select({
    ios: RC_IOS_API_KEY,
    android: RC_ANDROID_API_KEY,
    default: RC_IOS_API_KEY, // fallback for simulators / web storybook
  });

  if (!apiKey) {
    console.warn(
      '[VIVE/RevenueCat] Missing API key for platform:', Platform.OS,
      '— set EXPO_PUBLIC_REVENUECAT_IOS_KEY / EXPO_PUBLIC_REVENUECAT_ANDROID_KEY.',
    );
    return;
  }

  // Enable verbose logging in dev mode for easier debugging.
  if (__DEV__) {
    Purchases.setLogLevel(LOG_LEVEL.DEBUG);
  }

  const config: PurchasesConfiguration = {
    apiKey,
    // Attach the Supabase UUID so purchases are linked to the correct user
    // immediately on first launch (avoids anonymous→identified migration edge
    // cases in RevenueCat's backend).
    ...(userId ? { appUserID: userId } : {}),
  };

  try {
    Purchases.configure(config);

    if (__DEV__) {
      console.log(
        '[VIVE/RevenueCat] Configured successfully.',
        userId ? `User: ${userId}` : 'Anonymous session.',
      );
    }
  } catch (err) {
    console.error('[VIVE/RevenueCat] Configuration failed:', err);
  }
}

/**
 * Associate an authenticated Supabase user ID with the RevenueCat customer.
 * Call this immediately after a successful sign-in.
 */
export async function loginRevenueCat(userId: string): Promise<void> {
  try {
    const { customerInfo } = await Purchases.logIn(userId);
    if (__DEV__) {
      console.log('[VIVE/RevenueCat] Logged in. Active entitlements:',
        Object.keys(customerInfo.entitlements.active));
    }
  } catch (err) {
    console.error('[VIVE/RevenueCat] logIn failed:', err);
  }
}

/**
 * Reset the RevenueCat customer back to an anonymous ID.
 * Call this on sign-out to avoid cross-user entitlement leakage.
 */
export async function logoutRevenueCat(): Promise<void> {
  try {
    await Purchases.logOut();
    if (__DEV__) {
      console.log('[VIVE/RevenueCat] Logged out — anonymous session restored.');
    }
  } catch (err) {
    console.error('[VIVE/RevenueCat] logOut failed:', err);
  }
}

/**
 * Returns whether the user currently has an active entitlement.
 *
 * @param entitlementId  One of the ENTITLEMENTS constants.
 */
export async function hasEntitlement(entitlementId: EntitlementId): Promise<boolean> {
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    return entitlementId in customerInfo.entitlements.active;
  } catch (err) {
    console.error('[VIVE/RevenueCat] hasEntitlement check failed:', err);
    return false;
  }
}
