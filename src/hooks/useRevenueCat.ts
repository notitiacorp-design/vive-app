/**
 * @file useRevenueCat.ts
 * @description Hooks d'intÃ©gration RevenueCat pour l'application VIVE.
 * Fournit des hooks pour le statut d'abonnement, les achats, la restauration et les offres.
 */

import { useEffect, useRef } from 'react';
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
// Configuration â Ã  fournir via variables d'environnement
// ---------------------------------------------------------------------------

/**
 * Valide qu'une clÃ© API est non-vide et lÃ¨ve une erreur explicite en dÃ©veloppement.
 * [Correction issue 4] Ãvite une configuration silencieuse du SDK avec une clÃ© vide.
 */
function getValidatedApiKey(key: string | undefined, platform: string): string {
  if (!key || key.trim() === '') {
    const message =
      `[VIVE RevenueCat] ClÃ© API RevenueCat manquante pour la plateforme ${platform}. ` +
      `DÃ©finissez la variable d'environnement correspondante.`;
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
// Identifiants des entitlements
// ---------------------------------------------------------------------------

const ENTITLEMENT_PREMIUM = 'premium';
const ENTITLEMENT_ELITE = 'elite';

// ---------------------------------------------------------------------------
// ClÃ©s de requÃªte React Query
// ---------------------------------------------------------------------------

const RC_QUERY_KEYS = {
  customerInfo: ['revenuecat', 'customerInfo'] as const,
  offerings: ['revenuecat', 'offerings'] as const,
} as const;

// ---------------------------------------------------------------------------
// Types exportÃ©s
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
// Aide Ã  l'initialisation
// ---------------------------------------------------------------------------

let _isConfigured = false;

/**
 * Configure le SDK Purchases une seule fois (idempotent).
 * [Correction issue 3] La configuration n'accepte plus d'appUserId â
 * utiliser identifyUser() pour associer un utilisateur aprÃ¨s connexion.
 * [Correction issue 4] La clÃ© API est validÃ©e avant la configuration.
 */
export function configurePurchases(): void {
  if (_isConfigured) return;

  const platform = Platform.OS === 'ios' ? 'iOS' : 'Android';
  const rawApiKey = Platform.OS === 'ios' ? RC_API_KEY_IOS : RC_API_KEY_ANDROID;
  const apiKey = getValidatedApiKey(rawApiKey, platform);

  if (!apiKey) {
    // getValidatedApiKey a dÃ©jÃ  logguÃ© l'erreur, on n'initialise pas le SDK
    return;
  }

  if (__DEV__) {
    Purchases.setLogLevel(LOG_LEVEL.DEBUG);
  }

  Purchases.configure({ apiKey });
  _isConfigured = true;

  console.log('[VIVE RevenueCat] SDK Purchases configurÃ© avec succÃ¨s.');
}

// ---------------------------------------------------------------------------
// DÃ©rivation des entitlements
// [Correction issue 6] Fonction pure, dÃ©plaÃ§able dans src/lib/revenuecat.ts
// pour rÃ©utilisation hors contexte React.
// ---------------------------------------------------------------------------

export function deriveEntitlements(customerInfo: CustomerInfo | null): EntitlementStatus {
  if (!customerInfo) {
    return {
      isPremium: false,
      isElite: false,
      activeProductIdentifiers: [],
      expirationDates: {},
    };
  }

  const active = customerInfo.entitlements.active;

  const isPremium = ENTITLEMENT_PREMIUM in active || ENTITLEMENT_ELITE in active;
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
// Sous-hooks â sÃ©paration des responsabilitÃ©s
// [Correction issue 5] Chaque hook a une responsabilitÃ© unique.
// ---------------------------------------------------------------------------

/**
 * useRevenueCatInit â configuration initiale du SDK (exÃ©cutÃ©e une seule fois).
 * [Correction issue 3] SÃ©parÃ© du hook principal pour Ã©viter la reconfiguration
 * du SDK Ã  chaque changement d'utilisateur.
 */
export function useRevenueCatInit(): void {
  useEffect(() => {
    configurePurchases();
  }, []); // Pas de dÃ©pendances : exÃ©cutÃ© une seule fois au montage
}

/**
 * useCustomerInfo â Ã©coute des mises Ã  jour en temps rÃ©el et rÃ©cupÃ©ration des donnÃ©es.
 * [Correction issue 7] Utilise useRef pour stocker la rÃ©fÃ©rence au listener et
 * garantit la suppression du listener prÃ©cÃ©dent avant d'en enregistrer un nouveau.
 */
export function useCustomerInfo(): CustomerInfo | null {
  const queryClient = useQueryClient();

  // [Correction issue 7] RÃ©fÃ©rence stable au listener pour Ã©viter les listeners multiples
  const listenerRef = useRef<((info: CustomerInfo) => void) | null>(null);

  useEffect(() => {
    // Supprimer l'Ã©ventuel listener prÃ©cÃ©dent avant d'en crÃ©er un nouveau
    if (listenerRef.current) {
      Purchases.removeCustomerInfoUpdateListener(listenerRef.current);
      listenerRef.current = null;
    }

    const listener = (info: CustomerInfo): void => {
      queryClient.setQueryData<CustomerInfo>(RC_QUERY_KEYS.customerInfo, info);
    };

    listenerRef.current = listener;
    Purchases.addCustomerInfoUpdateListener(listener);

    // Cleanup : suppression du listener au dÃ©montage
    return () => {
      if (listenerRef.current) {
        Purchases.removeCustomerInfoUpdateListener(listenerRef.current);
        listenerRef.current = null;
      }
    };
  }, [queryClient]); // queryClient est stable par conception dans TanStack Query

  // [Correction issue 2] Suppression du cast redondant 'as PurchasesError' :
  // le type gÃ©nÃ©rique UseQuery<CustomerInfo, PurchasesError> garantit dÃ©jÃ  le type de l'erreur.
  const { data: customerInfo } = useQuery<CustomerInfo, PurchasesError>({
    queryKey: RC_QUERY_KEYS.customerInfo,
    queryFn: () => Purchases.getCustomerInfo(),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: (failureCount, error) => {
      if (error.code === PURCHASES_ERROR_CODE.CONFIGURATION_ERROR) {
        return false;
      }
      return failureCount < 2;
    },
  });

  return customerInfo ?? null;
}

/**
 * useEntitlements â dÃ©rivation des entitlements depuis customerInfo.
 * [Correction issue 5] ResponsabilitÃ© unique : transformer customerInfo en EntitlementStatus.
 */
export function useEntitlements(customerInfo: CustomerInfo | null): EntitlementStatus {
  return deriveEntitlements(customerInfo);
}

// ---------------------------------------------------------------------------
// Hook RevenueCat principal (orchestrateur lÃ©ger)
// [Correction issue 5] DÃ©lÃ¨gue chaque responsabilitÃ© Ã  un sous-hook dÃ©diÃ©.
// ---------------------------------------------------------------------------

/**
 * Hook principal RevenueCat.
 * Orchestre useRevenueCatInit, useCustomerInfo et useEntitlements.
 *
 * [Correction issue 3] La configuration du SDK (une fois) et l'identification
 * de l'utilisateur (logIn/logOut) sont dÃ©sormais sÃ©parÃ©es.
 *
 * @param appUserId - Optionnel : ID utilisateur backend.
 *                   PrÃ©fÃ©rer identifyUser() pour une association aprÃ¨s connexion.
 */
export function useRevenueCat(appUserId?: string): RevenueCatState {
  // [Correction issue 5] DÃ©lÃ¨gue l'initialisation Ã  useRevenueCatInit
  useRevenueCatInit();

  const queryClient = useQueryClient();

  // [Correction issue 3] Suivi de l'utilisateur prÃ©cÃ©dent pour appeler logIn/logOut
  // uniquement en cas de changement rÃ©el â sans reconfigurer le SDK.
  const previousUserIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!_isConfigured) return;

    const previousUserId = previousUserIdRef.current;

    if (appUserId && appUserId !== previousUserId) {
      // Nouvel utilisateur connectÃ© â utiliser logIn, pas reconfigure
      Purchases.logIn(appUserId)
        .then(({ customerInfo }) => {
          queryClient.setQueryData<CustomerInfo>(
            RC_QUERY_KEYS.customerInfo,
            customerInfo,
          );
          console.log(`[VIVE RevenueCat] Utilisateur identifiÃ© : ${appUserId}`);
        })
        .catch((error: PurchasesError) => {
          console.error(
            `[VIVE RevenueCat] Ãchec de l'identification : [${error.code}] ${error.message}`,
          );
        });
    } else if (!appUserId && previousUserId) {
      // Utilisateur dÃ©connectÃ© â revenir en mode anonyme via logOut
      Purchases.logOut()
        .then((customerInfo) => {
          queryClient.setQueryData<CustomerInfo>(
            RC_QUERY_KEYS.customerInfo,
            customerInfo,
          );
          console.log(
            '[VIVE RevenueCat] Utilisateur dÃ©connectÃ©, retour en mode anonyme.',
          );
        })
        .catch((error: PurchasesError) => {
          console.error(
            `[VIVE RevenueCat] Ãchec de la dÃ©connexion : [${error.code}] ${error.message}`,
          );
        });
    }

    previousUserIdRef.current = appUserId;
  }, [appUserId, queryClient]);

  // [Correction issue 5] DÃ©lÃ¨gue la rÃ©cupÃ©ration des donnÃ©es Ã  useCustomerInfo
  const customerInfo = useCustomerInfo();

  // [Correction issue 5] DÃ©lÃ¨gue la dÃ©rivation des entitlements Ã  useEntitlements
  const entitlements = useEntitlements(customerInfo);

  return {
    isReady: customerInfo !== null,
    customerInfo,
    entitlements,
    isPremium: entitlements.isPremium,
    isElite: entitlements.isElite,
  };
}

// ---------------------------------------------------------------------------
// Hook d'achat
// ---------------------------------------------------------------------------

/**
 * Hook de mutation pour acheter un package RevenueCat.
 * En cas de succÃ¨s, met Ã  jour le cache customerInfo et invalide les requÃªtes.
 *
 * @example
 * const { mutate: acheter, isPending } = usePurchase();
 * acheter({ pkg: packageMensuel });
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
      // L'annulation par l'utilisateur est attendue â ne pas traiter comme une erreur
      if (error.code !== PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) {
        console.error(
          `[VIVE RevenueCat] Achat Ã©chouÃ© : [${error.code}] ${error.message}`,
        );
      }
    },
  });
}

// ---------------------------------------------------------------------------
// Hook de restauration des achats
// ---------------------------------------------------------------------------

/**
 * Hook de mutation pour restaurer les abonnements prÃ©cÃ©demment achetÃ©s.
 * Met Ã  jour le cache customerInfo et retourne les clÃ©s d'entitlements restaurÃ©s.
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
// Hook des offres disponibles
// ---------------------------------------------------------------------------

/**
 * Hook React Query pour rÃ©cupÃ©rer les offres RevenueCat disponibles.
 * Les offres sont mises en cache pendant 10 minutes pour limiter les appels API.
 *
 * [Correction issue 2] Suppression du cast redondant 'as PurchasesError' dans le callback retry.
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
      if (error.code === PURCHASES_ERROR_CODE.CONFIGURATION_ERROR) {
        return false;
      }
      return failureCount < 2;
    },
  });
}

// ---------------------------------------------------------------------------
// Fonctions utilitaires â identification et dÃ©connexion
// [Correction issue 1] Le bloc 'export {}' redondant est supprimÃ©.
// Ces fonctions sont dÃ©jÃ  exportÃ©es via 'export async function'.
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
// RÃ©-exports de types tiers utiles
// ---------------------------------------------------------------------------

export type { CustomerInfo, Offerings, PurchasesPackage, PurchasesError };
