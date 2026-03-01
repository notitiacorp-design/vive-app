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
// Configuration â provide via env/config
// ---------------------------------------------------------------------------

// [Correction C] Validation des clÃ©s API au dÃ©marrage pour Ã©viter une configuration silencieuse avec une clÃ© vide
function getValidatedApiKey(key: string | undefined, platform: string): string {
  if (!key || key.trim() === '') {
    const message = `[VIVE RevenueCat] ClÃ© API RevenueCat manquante pour la plateforme ${platform}. DÃ©finissez la variable d'environnement correspondante.`;
    if (__DEV__) {
      throw new Error(message);
    } else {
      console.error(message);
    }
    return '';
  }
  return key;
}

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
 * Configure le SDK Purchases une seule fois (idempotent).
 * N'accepte plus d'appUserId â utiliser identifyUser() pour associer un utilisateur.
 */
export function configurePurchases(): void {
  if (_isConfigured) return;

  // [Correction C] Validation de la clÃ© API avant configuration
  const rawApiKey = Platform.OS === 'ios' ? RC_API_KEY_IOS : RC_API_KEY_ANDROID;
  const platform = Platform.OS === 'ios' ? 'iOS' : 'Android';
  const apiKey = getValidatedApiKey(rawApiKey, platform);

  if (!apiKey) {
    // getValidatedApiKey a dÃ©jÃ  loggÃ© l'erreur, on ne configure pas le SDK
    return;
  }

  if (__DEV__) {
    Purchases.setLogLevel(LOG_LEVEL.DEBUG);
  }

  // [Correction B] On ne passe plus d'appUserId ici â utiliser identifyUser() aprÃ¨s connexion
  Purchases.configure({ apiKey });
  _isConfigured = true;

  console.log('[VIVE RevenueCat] SDK Purchases configurÃ© avec succÃ¨s.');
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
// Sub-hooks (Correction D) â sÃ©paration des responsabilitÃ©s
// ---------------------------------------------------------------------------

/**
 * useRevenueCatInit â responsabilitÃ© unique : configuration initiale du SDK (une seule fois).
 * [Correction B] La configuration ne se fait qu'au montage, indÃ©pendamment de l'utilisateur.
 */
export function useRevenueCatInit(): void {
  useEffect(() => {
    configurePurchases();
  }, []); // Aucune dÃ©pendance : exÃ©cutÃ© une seule fois au montage
}

/**
 * useCustomerInfo â responsabilitÃ© unique : Ã©coute des mises Ã  jour en temps rÃ©el et rÃ©cupÃ©ration des donnÃ©es.
 * [Correction E] Utilise useRef pour stocker le listener et garantit la suppression avant d'en ajouter un nouveau.
 */
export function useCustomerInfo(): CustomerInfo | null {
  const queryClient = useQueryClient();
  // [Correction E] RÃ©fÃ©rence stable au listener pour Ã©viter les listeners multiples
  const listenerRef = useRef<((info: CustomerInfo) => void) | null>(null);

  useEffect(() => {
    // [Correction E] Supprimer l'Ã©ventuel listener prÃ©cÃ©dent avant d'en crÃ©er un nouveau
    if (listenerRef.current) {
      Purchases.removeCustomerInfoUpdateListener(listenerRef.current);
      listenerRef.current = null;
    }

    const listener = (info: CustomerInfo) => {
      queryClient.setQueryData<CustomerInfo>(RC_QUERY_KEYS.customerInfo, info);
    };

    listenerRef.current = listener;
    Purchases.addCustomerInfoUpdateListener(listener);

    return () => {
      if (listenerRef.current) {
        Purchases.removeCustomerInfoUpdateListener(listenerRef.current);
        listenerRef.current = null;
      }
    };
  // queryClient est stable par conception dans TanStack Query, mais on le liste pour la rigueur
  }, [queryClient]);

  const { data: customerInfo } = useQuery<CustomerInfo, PurchasesError>({
    queryKey: RC_QUERY_KEYS.customerInfo,
    queryFn: () => Purchases.getCustomerInfo(),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
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

  return customerInfo ?? null;
}

/**
 * useEntitlements â responsabilitÃ© unique : dÃ©rivation des entitlements depuis customerInfo.
 */
export function useEntitlements(customerInfo: CustomerInfo | null): EntitlementStatus {
  return deriveEntitlements(customerInfo);
}

// ---------------------------------------------------------------------------
// Main RevenueCat Hook (orchestrateur lÃ©ger â Correction D)
// ---------------------------------------------------------------------------

/**
 * Hook principal RevenueCat.
 * Orchestre useRevenueCatInit, useCustomerInfo et useEntitlements.
 * [Correction B] La configuration du SDK et l'identification de l'utilisateur sont maintenant sÃ©parÃ©es.
 *
 * @param appUserId - Optionnel : ID utilisateur backend. Utiliser identifyUser() aprÃ¨s connexion.
 */
export function useRevenueCat(appUserId?: string): RevenueCatState {
  // [Correction D] DÃ©lÃ¨gue l'initialisation Ã  useRevenueCatInit
  useRevenueCatInit();

  // [Correction B] Gestion du changement d'utilisateur via logIn/logOut uniquement
  const previousUserIdRef = useRef<string | undefined>(undefined);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!_isConfigured) return;

    const previousUserId = previousUserIdRef.current;

    if (appUserId && appUserId !== previousUserId) {
      // Nouvel utilisateur connectÃ© â utiliser logIn, pas reconfigure
      Purchases.logIn(appUserId)
        .then(({ customerInfo }) => {
          queryClient.setQueryData<CustomerInfo>(RC_QUERY_KEYS.customerInfo, customerInfo);
          console.log(`[VIVE RevenueCat] Utilisateur identifiÃ© : ${appUserId}`);
        })
        .catch((error: PurchasesError) => {
          console.error(`[VIVE RevenueCat] Ãchec de l'identification : [${error.code}] ${error.message}`);
        });
    } else if (!appUserId && previousUserId) {
      // Utilisateur dÃ©connectÃ© â utiliser logOut
      Purchases.logOut()
        .then((customerInfo) => {
          queryClient.setQueryData<CustomerInfo>(RC_QUERY_KEYS.customerInfo, customerInfo);
          console.log('[VIVE RevenueCat] Utilisateur dÃ©connectÃ©, retour en mode anonyme.');
        })
        .catch((error: PurchasesError) => {
          console.error(`[VIVE RevenueCat] Ãchec de la dÃ©connexion : [${error.code}] ${error.message}`);
        });
    }

    previousUserIdRef.current = appUserId;
  }, [appUserId, queryClient]);

  // [Correction D] DÃ©lÃ¨gue la rÃ©cupÃ©ration des donnÃ©es Ã  useCustomerInfo
  const customerInfo = useCustomerInfo();

  // [Correction D] DÃ©lÃ¨gue la dÃ©rivation Ã  useEntitlements
  const entitlements = useEntitlements(customerInfo);

  const isReady = customerInfo !== null;

  return {
    isReady,
    customerInfo,
    entitlements,
    isPremium: entitlements.isPremium,
    isElite: entitlements.isElite,
  };
}

// ---------------------------------------------------------------------------
// Purchase Hook
// ---------------------------------------------------------------------------

/**
 * Hook de mutation pour acheter un package RevenueCat.
 * En cas de succÃ¨s, met Ã  jour le cache customerInfo et invalide les requÃªtes.
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
      queryClient.invalidateQueries({ queryKey: RC_QUERY_KEYS.customerInfo });
    },
    onError: (error: PurchasesError) => {
      // L'annulation par l'utilisateur est attendue â ne pas logger comme erreur
      if (error.code !== PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) {
        console.error(
          `[VIVE RevenueCat] Achat Ã©chouÃ© : [${error.code}] ${error.message}`,
        );
      }
    },
  });
}

// ---------------------------------------------------------------------------
// Restore Purchases Hook
// ---------------------------------------------------------------------------

/**
 * Hook de mutation pour restaurer les abonnements prÃ©cÃ©demment achetÃ©s.
 * Met Ã  jour le cache customerInfo et dÃ©rive les clÃ©s d'entitlements restaurÃ©s.
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
        `[VIVE RevenueCat] Restauration Ã©chouÃ©e : [${error.code}] ${error.message}`,
      );
    },
  });
}

// ---------------------------------------------------------------------------
// Offerings Hook
// ---------------------------------------------------------------------------

/**
 * Hook React Query pour rÃ©cupÃ©rer les offres RevenueCat disponibles.
 * Les offres sont mises en cache pendant 10 minutes pour limiter les appels API.
 */
export function useOfferings(
  options: { enabled?: boolean } = {},
): UseQueryResult<Offerings, PurchasesError> {
  const { enabled = true } = options;

  return useQuery<Offerings, PurchasesError>({
    queryKey: RC_QUERY_KEYS.offerings,
    queryFn: () => Purchases.getOfferings(),
    enabled,
    staleTime: 10 * 60 * 1000, // Les offres changent rarement
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
 * Associe l'utilisateur anonyme RevenueCat Ã  un ID utilisateur backend.
 * Ã appeler aprÃ¨s la connexion de l'utilisateur.
 *
 * @param userId - Votre identifiant utilisateur backend
 */
export async function identifyUser(userId: string): Promise<CustomerInfo> {
  const { customerInfo } = await Purchases.logIn(userId);
  return customerInfo;
}

/**
 * DÃ©connecte l'utilisateur RevenueCat courant (retour en mode anonyme).
 * Ã appeler aprÃ¨s la dÃ©connexion de l'utilisateur.
 */
export async function logoutUser(): Promise<CustomerInfo> {
  const customerInfo = await Purchases.logOut();
  return customerInfo;
}

// ---------------------------------------------------------------------------
// Re-exports de types tiers utiles
// ---------------------------------------------------------------------------

// [Correction A] Suppression du bloc 'export {}' redondant â les fonctions sont dÃ©jÃ  exportÃ©es
// avec 'export function' et 'export async function' ci-dessus.
export type { CustomerInfo, Offerings, PurchasesPackage, PurchasesError };
