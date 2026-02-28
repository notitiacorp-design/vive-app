/**
 * @file useRevenueCat.ts
 * @description RevenueCat integration hooks for VIVE app.
 * Provides hooks for subscription status, purchasing, restoring, and offerings.
 */

import { useEffect, useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import {
  useQuery,
  useMutation,
  useQueryClient,
  UseQueryResult,
  UseMutationResult,
} from '@tanstack/react-query';
import Purchases, {
  CustomerInfo,
  Offerings,
  PurchasesPackage,
  PurchasesError,
  LOG_LEVEL,
  PURCHASES_ERROR_CODE,
} from 'react-native-purchases';

// ---------------------------------------------------------------------------
// Configuration — provide via env/config
// ---------------------------------------------------------------------------

const RC_API_KEY_IOS = process.env.REVENUECAT_IOS_KEY ?? '';
const RC_API_KEY_ANDROID = process.env.REVENUECAT_ANDROID_KEY ?? '';

// ---------------------------------------------------------------------------
// Entitlement Identifiers
// ---------------------------------------------------------------------------

const ENTITLEMENT_PREMIUM = 'premium';
const ENTITLEMENT_ELITE = 'elite';

// ---------------------------------------------------------------------------
// Query Keys
// ---------------------------------------------------------------------------

const RC_QUERY_KEYS = {
  customerInfo: ['revenuecat', 'customerInfo'] as const,
  offerings: ['revenuecat', 'offerings'] as const,
} as const;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EntitlementStatus {
  isPremium: boolean;
  isElite: boolean;
  activeProductIdentifiers: string[];
  expirationDates: Record<string, string | null>;
}

export interface RevenueCatState {
  isReady: boolean;
  customerInfo: CustomerInfo | null;
  entitlements: EntitlementStatus;
  isPremium: boolean;
  isElite: boolean;
}

export interface PurchaseInput {
  pkg: PurchasesPackage;
}

export interface PurchaseResult {
  customerInfo: CustomerInfo;
  productIdentifier: string;
}

export interface RestoreResult {
  customerInfo: CustomerInfo;
  restoredEntitlements: string[];
}

// ---------------------------------------------------------------------------
// Initialization Helper
// ---------------------------------------------------------------------------

let _isConfigured = false;

/**
 * Configures the Purchases SDK. Safe to call multiple times (idempotent).
 * Pass `appUserId` to associate purchases with your backend user.
 *
 * @param appUserId - Optional backend user ID for cross-platform purchase tracking
 */
export function configurePurchases(appUserId?: string): void {
  if (_isConfigured) return;

  const apiKey = Platform.OS === 'ios' ? RC_API_KEY_IOS : RC_API_KEY_ANDROID;

  if (!apiKey) {
    console.warn(
      '[VIVE RevenueCat] API key not configured. Set REVENUECAT_IOS_KEY / REVENUECAT_ANDROID_KEY.',
    );
    return;
  }

  if (__DEV__) {
    Purchases.setLogLevel(LOG_LEVEL.DEBUG);
  }

  Purchases.configure({ apiKey, appUserID: appUserId });
  _isConfigured = true;

  console.log('[VIVE RevenueCat] Purchases configured successfully.');
}

// ---------------------------------------------------------------------------
// Entitlement Derivation
// ---------------------------------------------------------------------------

function deriveEntitlements(customerInfo: CustomerInfo | null): EntitlementStatus {
  if (!customerInfo) {
    return {
      isPremium: false,
      isElite: false,
      activeProductIdentifiers: [],
      expirationDates: {},
    };
  }

  const active = customerInfo.entitlements.active;

  const isPremium =
    ENTITLEMENT_PREMIUM in active || ENTITLEMENT_ELITE in active;
  const isElite = ENTITLEMENT_ELITE in active;

  const activeProductIdentifiers = Object.values(active).map(
    (e) => e.productIdentifier,
  );

  const expirationDates: Record<string, string | null> = {};
  for (const [key, entitlement] of Object.entries(active)) {
    expirationDates[key] = entitlement.expirationDate;
  }

  return { isPremium, isElite, activeProductIdentifiers, expirationDates };
}

// ---------------------------------------------------------------------------
// Main RevenueCat Hook
// ---------------------------------------------------------------------------

/**
 * Primary RevenueCat hook.
 * Initializes the SDK on mount, listens for customerInfo updates,
 * and exposes subscription status.
 *
 * @param appUserId - Optional backend user ID
 */
export function useRevenueCat(appUserId?: string): RevenueCatState {
  const queryClient = useQueryClient();
  const listenerRef = useRef<((info: CustomerInfo) => void) | null>(null);

  // Configure SDK on mount
  useEffect(() => {
    configurePurchases(appUserId);

    // Register listener for real-time customer info updates
    listenerRef.current = (info: CustomerInfo) => {
      queryClient.setQueryData<CustomerInfo>(RC_QUERY_KEYS.customerInfo, info);
    };

    Purchases.addCustomerInfoUpdateListener(listenerRef.current);

    return () => {
      if (listenerRef.current) {
        Purchases.removeCustomerInfoUpdateListener(listenerRef.current);
        listenerRef.current = null;
      }
    };
  }, [appUserId, queryClient]);

  const { data: customerInfo, isSuccess } = useQuery<CustomerInfo, PurchasesError>({
    queryKey: RC_QUERY_KEYS.customerInfo,
    queryFn: () => Purchases.getCustomerInfo(),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: (failureCount, error) => {
      // Don't retry on network-independent errors
      if (
        (error as PurchasesError).code ===
        PURCHASES_ERROR_CODE.CONFIGURATION_ERROR
      ) {
        return false;
      }
      return failureCount < 2;
    },
  });

  const entitlements = deriveEntitlements(customerInfo ?? null);

  return {
    isReady: isSuccess,
    customerInfo: customerInfo ?? null,
    entitlements,
    isPremium: entitlements.isPremium,
    isElite: entitlements.isElite,
  };
}

// ---------------------------------------------------------------------------
// Purchase Hook
// ---------------------------------------------------------------------------

/**
 * Mutation hook for purchasing a RevenueCat package.
 * On success, updates the cached customerInfo and invalidates queries.
 *
 * @example
 * const { mutate: purchase, isPending } = usePurchase();
 * purchase({ pkg: monthlyPackage });
 */
export function usePurchase(): UseMutationResult<
  PurchaseResult,
  PurchasesError,
  PurchaseInput
> {
  const queryClient = useQueryClient();

  return useMutation<PurchaseResult, PurchasesError, PurchaseInput>({
    mutationFn: async ({ pkg }: PurchaseInput) => {
      const { customerInfo, productIdentifier } =
        await Purchases.purchasePackage(pkg);
      return { customerInfo, productIdentifier };
    },
    onSuccess: ({ customerInfo }) => {
      queryClient.setQueryData<CustomerInfo>(
        RC_QUERY_KEYS.customerInfo,
        customerInfo,
      );
      // Invalidate to ensure fresh data on next read
      queryClient.invalidateQueries({ queryKey: RC_QUERY_KEYS.customerInfo });
    },
    onError: (error: PurchasesError) => {
      // USER_CANCELLED is expected — don't log as error
      if (error.code !== PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) {
        console.error(
          `[VIVE RevenueCat] Purchase failed: [${error.code}] ${error.message}`,
        );
      }
    },
  });
}

// ---------------------------------------------------------------------------
// Restore Purchases Hook
// ---------------------------------------------------------------------------

/**
 * Mutation hook to restore previously purchased subscriptions.
 * Updates cached customerInfo and derives restored entitlement keys.
 */
export function useRestorePurchases(): UseMutationResult<
  RestoreResult,
  PurchasesError,
  void
> {
  const queryClient = useQueryClient();

  return useMutation<RestoreResult, PurchasesError, void>({
    mutationFn: async () => {
      const customerInfo = await Purchases.restorePurchases();
      const restoredEntitlements = Object.keys(
        customerInfo.entitlements.active,
      );
      return { customerInfo, restoredEntitlements };
    },
    onSuccess: ({ customerInfo }) => {
      queryClient.setQueryData<CustomerInfo>(
        RC_QUERY_KEYS.customerInfo,
        customerInfo,
      );
      queryClient.invalidateQueries({ queryKey: RC_QUERY_KEYS.customerInfo });
    },
    onError: (error: PurchasesError) => {
      console.error(
        `[VIVE RevenueCat] Restore failed: [${error.code}] ${error.message}`,
      );
    },
  });
}

// ---------------------------------------------------------------------------
// Offerings Hook
// ---------------------------------------------------------------------------

/**
 * React Query hook that fetches available RevenueCat offerings.
 * Offerings are cached for 10 minutes to avoid excessive API calls.
 */
export function useOfferings(
  options: { enabled?: boolean } = {},
): UseQueryResult<Offerings, PurchasesError> {
  const { enabled = true } = options;

  return useQuery<Offerings, PurchasesError>({
    queryKey: RC_QUERY_KEYS.offerings,
    queryFn: () => Purchases.getOfferings(),
    enabled,
    staleTime: 10 * 60 * 1000, // Offerings change infrequently
    gcTime: 60 * 60 * 1000,
    retry: (failureCount, error) => {
      if (
        (error as PurchasesError).code ===
        PURCHASES_ERROR_CODE.CONFIGURATION_ERROR
      ) {
        return false;
      }
      return failureCount < 2;
    },
  });
}

// ---------------------------------------------------------------------------
// Identify / Logout Helpers
// ---------------------------------------------------------------------------

/**
 * Associates the RevenueCat anonymous user with a backend user ID.
 * Call this after sign-in.
 *
 * @param userId - Your backend user ID
 */
export async function identifyUser(userId: string): Promise<CustomerInfo> {
  const { customerInfo } = await Purchases.logIn(userId);
  return customerInfo;
}

/**
 * Logs out the current RevenueCat user (reverts to anonymous).
 * Call this after sign-out.
 */
export async function logoutUser(): Promise<CustomerInfo> {
  const customerInfo = await Purchases.logOut();
  return customerInfo;
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export {
  useRevenueCat,
  usePurchase,
  useRestorePurchases,
  useOfferings,
  configurePurchases,
  identifyUser,
  logoutUser,
};

export type { CustomerInfo, Offerings, PurchasesPackage, PurchasesError };
