/**
 * @file useHealthKit.ts
 * @description IntÃ©gration iOS HealthKit pour l'application VIVE.
 * Fournit des hooks basÃ©s sur React Query pour les donnÃ©es de sommeil, frÃ©quence cardiaque, VFC et activitÃ©.
 * Tous les hooks sont protÃ©gÃ©s par des vÃ©rifications Platform.OS === 'ios'.
 */

import { useCallback } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useQueryClient, UseQueryResult } from '@tanstack/react-query';
import AppleHealthKit, {
  HealthKitPermissions,
} from 'react-native-health';
import {
  fetchSleepSamples,
  fetchHeartRate,
  fetchHRV as fetchHRVLib,
  fetchActivityData,
  HealthKitError as LibHealthKitError,
} from '../lib/healthkit';

// ---------------------------------------------------------------------------
// Constantes & ClÃ©s de Stockage
// ---------------------------------------------------------------------------

const HK_ANCHOR_PREFIX = '@vive/hk_anchor_';

const PERMISSIONS: HealthKitPermissions = {
  permissions: {
    read: [
      AppleHealthKit.Constants.Permissions.SleepAnalysis,
      AppleHealthKit.Constants.Permissions.HeartRate,
      AppleHealthKit.Constants.Permissions.HeartRateVariability,
      AppleHealthKit.Constants.Permissions.StepCount,
      AppleHealthKit.Constants.Permissions.ActiveEnergyBurned,
      AppleHealthKit.Constants.Permissions.AppleExerciseTime,
      AppleHealthKit.Constants.Permissions.ActivitySummary,
    ],
    write: [],
  },
};

// ---------------------------------------------------------------------------
// Types d'Erreur
// ---------------------------------------------------------------------------

/**
 * Codes d'erreur spÃ©cifiques au hook useHealthKit.
 * Distinct de HealthKitError dans src/lib/healthkit.ts qui utilise un code string brut.
 * UseHealthKitErrorCode utilise une union typÃ©e pour une discrimination d'erreur plus prÃ©cise
 * dans la logique de retry et les Ã©tats d'erreur UI.
 */
export type UseHealthKitErrorCode =
  | 'NOT_AVAILABLE'
  | 'PERMISSION_DENIED'
  | 'FETCH_FAILED'
  | 'NOT_INITIALIZED'
  | 'PLATFORM_ERROR';

/**
 * Classe d'erreur au niveau du hook pour les opÃ©rations HealthKit.
 * Distincte de LibHealthKitError (src/lib/healthkit.ts) qui utilise code: string.
 * Cette classe utilise une union UseHealthKitErrorCode typÃ©e pour une gestion prÃ©cise des erreurs
 * dans la logique de retry et les Ã©tats d'erreur UI.
 */
export class UseHealthKitError extends Error {
  readonly code: UseHealthKitErrorCode;
  readonly originalError?: unknown;

  constructor(code: UseHealthKitErrorCode, message: string, originalError?: unknown) {
    super(message);
    this.name = 'UseHealthKitError';
    this.code = code;
    this.originalError = originalError;
  }
}

// ---------------------------------------------------------------------------
// Types de DonnÃ©es
// ---------------------------------------------------------------------------

/**
 * Extension des types react-native-health avec sourceId et sourceName
 * pour une sÃ©curitÃ© de type complÃ¨te.
 */
export interface HKSleepSampleExtended {
  startDate: string;
  endDate: string;
  value: string;
  sourceId: string;
  sourceName: string;
}

export interface HKHeartRateSampleExtended {
  startDate: string;
  endDate: string;
  value: number;
  sourceId: string;
  sourceName: string;
}

export interface HKHRVSampleExtended {
  startDate: string;
  endDate: string;
  value: number;
  sourceId: string;
  sourceName: string;
}

export interface SleepSampleData {
  startDate: string;
  endDate: string;
  value: 'INBED' | 'ASLEEP' | 'AWAKE' | 'CORE' | 'DEEP' | 'REM';
  sourceId: string;
  sourceName: string;
}

export interface HeartRateSample {
  startDate: string;
  endDate: string;
  value: number; // bpm
  sourceName: string;
}

export interface HRVSample {
  startDate: string;
  endDate: string;
  value: number; // ms SDNN
  sourceName: string;
}

export interface ActivityData {
  steps: number;
  activeCalories: number;
  activeMinutes: number;
  date: string;
}

/**
 * Options pour les requÃªtes incrÃ©mentales avec ancrage.
 * UtilisÃ© comme type de base pour les hooks supportant la synchronisation incrÃ©mentale.
 */
export interface AnchorQueryOptions {
  startDate: Date;
  endDate: Date;
  useIncremental?: boolean;
}

// ---------------------------------------------------------------------------
// Ãtat Interne HealthKit
// ---------------------------------------------------------------------------

let _isInitialized = false;
let _initPromise: Promise<void> | null = null;

/**
 * S'assure que HealthKit est initialisÃ© avec les permissions requises.
 * Idempotent â peut Ãªtre appelÃ© plusieurs fois sans danger.
 */
function ensureInitialized(): Promise<void> {
  if (Platform.OS !== 'ios') {
    return Promise.reject(
      new UseHealthKitError('PLATFORM_ERROR', 'HealthKit est uniquement disponible sur iOS'),
    );
  }

  if (_isInitialized) return Promise.resolve();

  if (_initPromise) return _initPromise;

  _initPromise = new Promise<void>((resolve, reject) => {
    AppleHealthKit.initHealthKit(PERMISSIONS, (error) => {
      if (error) {
        _initPromise = null;
        reject(
          new UseHealthKitError(
            'PERMISSION_DENIED',
            `Ãchec de l'initialisation HealthKit : ${error}`,
            error,
          ),
        );
      } else {
        _isInitialized = true;
        // LibÃ©rer la mÃ©moire de la promesse aprÃ¨s rÃ©solution rÃ©ussie
        _initPromise = null;
        resolve();
      }
    });
  });

  return _initPromise;
}

// ---------------------------------------------------------------------------
// Support Ancre / IncrÃ©mental
// ---------------------------------------------------------------------------

async function getAnchorDate(key: string): Promise<Date | null> {
  try {
    const stored = await AsyncStorage.getItem(`${HK_ANCHOR_PREFIX}${key}`);
    return stored ? new Date(stored) : null;
  } catch {
    return null;
  }
}

async function setAnchorDate(key: string, date: Date): Promise<void> {
  try {
    await AsyncStorage.setItem(`${HK_ANCHOR_PREFIX}${key}`, date.toISOString());
  } catch {
    // Non-fatal â la prochaine synchronisation re-rÃ©cupÃ©rera les donnÃ©es
  }
}

// ---------------------------------------------------------------------------
// Demande de Permission
// ---------------------------------------------------------------------------

/**
 * Demande toutes les permissions HealthKit requises.
 * Doit Ãªtre appelÃ© une fois au dÃ©marrage de l'app ou quand l'utilisateur navigue vers la section santÃ©.
 */
export async function requestPermissions(): Promise<void> {
  if (Platform.OS !== 'ios') {
    throw new UseHealthKitError('PLATFORM_ERROR', 'HealthKit est uniquement disponible sur iOS');
  }
  await ensureInitialized();
}

// ---------------------------------------------------------------------------
// Configuration du Fetch en ArriÃ¨re-Plan
// ---------------------------------------------------------------------------

/**
 * Enregistre une tÃ¢che de fetch en arriÃ¨re-plan pour les donnÃ©es HealthKit.
 * Sur iOS, utilise BGTaskScheduler via react-native-background-fetch ou
 * react-native-background-task. Ã connecter avec votre bibliothÃ¨que de tÃ¢ches d'arriÃ¨re-plan.
 *
 * @param taskIdentifier - L'identifiant BGTaskScheduler enregistrÃ© dans Info.plist
 * @param onFetch - Callback invoquÃ© quand l'OS dÃ©clenche un fetch en arriÃ¨re-plan
 */
export function registerBackgroundFetchAsync(
  taskIdentifier: string,
  onFetch: () => Promise<void>,
): void {
  if (Platform.OS !== 'ios') return;

  // Ceci est un wrapper lÃ©ger â Ã  intÃ©grer avec votre bibliothÃ¨que de tÃ¢ches d'arriÃ¨re-plan prÃ©fÃ©rÃ©e.
  // Exemple avec react-native-background-fetch :
  // BackgroundFetch.configure({ minimumFetchInterval: 15 }, async (taskId) => {
  //   await onFetch();
  //   BackgroundFetch.finish(taskId);
  // }, (taskId) => {
  //   BackgroundFetch.finish(taskId);
  // });

  if (__DEV__) {
    console.log(
      `[VIVE HealthKit] Fetch en arriÃ¨re-plan enregistrÃ© pour la tÃ¢che : ${taskIdentifier}. ` +
        `Ã connecter avec votre bibliothÃ¨que de tÃ¢ches d'arriÃ¨re-plan.`,
    );
  }

  // RÃ©fÃ©rence Ã  onFetch pour Ã©viter l'avertissement de paramÃ¨tre inutilisÃ©
  void onFetch;
}

// ---------------------------------------------------------------------------
// Helper de Retry
// ---------------------------------------------------------------------------

function shouldRetry(failureCount: number, error: UseHealthKitError): boolean {
  if (error.code === 'PERMISSION_DENIED' || error.code === 'PLATFORM_ERROR') {
    return false;
  }
  return failureCount < 2;
}

// ---------------------------------------------------------------------------
// Helper de traitement par batch
// ---------------------------------------------------------------------------

/**
 * ExÃ©cute des tÃ¢ches asynchrones par lots sÃ©quentiels avec une concurrence limitÃ©e.
 * Ãvite de saturer l'API HealthKit avec trop d'appels simultanÃ©s.
 *
 * @param tasks - Tableau de fonctions retournant des promesses
 * @param batchSize - Nombre maximum de tÃ¢ches exÃ©cutÃ©es simultanÃ©ment
 */
async function runInBatches<T>(
  tasks: Array<() => Promise<T>>,
  batchSize: number,
): Promise<Array<PromiseSettledResult<T>>> {
  const results: Array<PromiseSettledResult<T>> = [];

  for (let i = 0; i < tasks.length; i += batchSize) {
    const batch = tasks.slice(i, i + batchSize);
    const batchResults = await Promise.allSettled(batch.map((task) => task()));
    results.push(...batchResults);
  }

  return results;
}

// ---------------------------------------------------------------------------
// Hooks React Query
// ---------------------------------------------------------------------------

/**
 * Hook React Query pour les donnÃ©es de sommeil HealthKit.
 *
 * @param startDate - DÃ©but de la fenÃªtre de requÃªte
 * @param endDate - Fin de la fenÃªtre de requÃªte
 * @param options - Options de requÃªte optionnelles avec support incrÃ©mental
 *
 * @note Les paramÃ¨tres `startDate` et `endDate` DOIVENT Ãªtre des rÃ©fÃ©rences stables
 * (ex: produites par `useMemo`) pour Ã©viter des boucles de re-fetch infinies.
 * Chaque rendu passant un `new Date()` inline produira une nouvelle chaÃ®ne ISO
 * dans la clÃ© de requÃªte, amenant React Query Ã  traiter cela comme une nouvelle requÃªte.
 *
 * @example
 * // Correct â dates mÃ©moÃ¯sÃ©es
 * const startDate = useMemo(() => subDays(new Date(), 7), []);
 * const endDate = useMemo(() => new Date(), []);
 * const { data } = useSleepData(startDate, endDate);
 *
 * // Incorrect â new Date() Ã  chaque rendu dÃ©clenche des re-fetches infinis
 * const { data } = useSleepData(new Date(Date.now() - 7 * 86400000), new Date());
 */
export function useSleepData(
  startDate: Date,
  endDate: Date,
  options: { enabled?: boolean; useIncremental?: boolean } = {},
): UseQueryResult<SleepSampleData[], UseHealthKitError> {
  const { enabled = true, useIncremental = false } = options;

  return useQuery<SleepSampleData[], UseHealthKitError>({
    queryKey: ['healthkit', 'sleep', startDate.toISOString(), endDate.toISOString()],
    queryFn: async () => {
      if (Platform.OS !== 'ios') {
        throw new UseHealthKitError(
          'PLATFORM_ERROR',
          'HealthKit est uniquement disponible sur iOS',
        );
      }

      await ensureInitialized();

      let effectiveStart = startDate;

      if (useIncremental) {
        const anchor = await getAnchorDate('sleep');
        if (anchor && anchor > startDate) {
          effectiveStart = anchor;
        }
      }

      try {
        const rawData = await fetchSleepSamples(effectiveStart, endDate);

        // Conversion typÃ©e sÃ©curisÃ©e via interface Ã©tendue
        const data: SleepSampleData[] = (rawData as HKSleepSampleExtended[]).map((sample) => ({
          startDate: sample.startDate,
          endDate: sample.endDate,
          value: sample.value as SleepSampleData['value'],
          sourceId: sample.sourceId ?? '',
          sourceName: sample.sourceName ?? '',
        }));

        if (useIncremental && data.length > 0) {
          await setAnchorDate('sleep', endDate);
        }

        return data;
      } catch (err) {
        if (err instanceof LibHealthKitError) {
          throw new UseHealthKitError('FETCH_FAILED', err.message, err);
        }
        throw new UseHealthKitError(
          'FETCH_FAILED',
          `Ãchec de la rÃ©cupÃ©ration des donnÃ©es de sommeil : ${err}`,
          err,
        );
      }
    },
    enabled: enabled && Platform.OS === 'ios',
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: shouldRetry,
  });
}

/**
 * Hook React Query pour les donnÃ©es de frÃ©quence cardiaque HealthKit.
 *
 * @param startDate - DÃ©but de la fenÃªtre de requÃªte
 * @param endDate - Fin de la fenÃªtre de requÃªte
 * @param options - Options de requÃªte optionnelles
 *
 * @note Les paramÃ¨tres `startDate` et `endDate` DOIVENT Ãªtre des rÃ©fÃ©rences stables
 * (ex: produites par `useMemo`) pour Ã©viter des boucles de re-fetch infinies.
 *
 * @example
 * // Correct â dates mÃ©moÃ¯sÃ©es
 * const startDate = useMemo(() => subDays(new Date(), 1), []);
 * const endDate = useMemo(() => new Date(), []);
 * const { data } = useHeartRate(startDate, endDate);
 */
export function useHeartRate(
  startDate: Date,
  endDate: Date,
  options: { enabled?: boolean } = {},
): UseQueryResult<HeartRateSample[], UseHealthKitError> {
  const { enabled = true } = options;

  return useQuery<HeartRateSample[], UseHealthKitError>({
    queryKey: ['healthkit', 'heartRate', startDate.toISOString(), endDate.toISOString()],
    queryFn: async () => {
      if (Platform.OS !== 'ios') {
        throw new UseHealthKitError(
          'PLATFORM_ERROR',
          'HealthKit est uniquement disponible sur iOS',
        );
      }

      await ensureInitialized();

      try {
        const rawData = await fetchHeartRate(startDate, endDate);

        // Conversion typÃ©e sÃ©curisÃ©e via interface Ã©tendue
        const data: HeartRateSample[] = (rawData as HKHeartRateSampleExtended[]).map(
          (sample) => ({
            startDate: sample.startDate,
            endDate: sample.endDate,
            value: sample.value,
            sourceName: sample.sourceName ?? '',
          }),
        );

        return data;
      } catch (err) {
        if (err instanceof LibHealthKitError) {
          throw new UseHealthKitError('FETCH_FAILED', err.message, err);
        }
        throw new UseHealthKitError(
          'FETCH_FAILED',
          `Ãchec de la rÃ©cupÃ©ration des donnÃ©es de frÃ©quence cardiaque : ${err}`,
          err,
        );
      }
    },
    enabled: enabled && Platform.OS === 'ios',
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: shouldRetry,
  });
}

/**
 * Hook React Query pour les donnÃ©es VFC HealthKit.
 *
 * @param startDate - DÃ©but de la fenÃªtre de requÃªte
 * @param endDate - Fin de la fenÃªtre de requÃªte
 * @param options - Options de requÃªte incrÃ©mentales optionnelles
 *
 * @note Les paramÃ¨tres `startDate` et `endDate` DOIVENT Ãªtre des rÃ©fÃ©rences stables
 * (ex: produites par `useMemo`) pour Ã©viter des boucles de re-fetch infinies.
 *
 * @example
 * // Correct â dates mÃ©moÃ¯sÃ©es
 * const startDate = useMemo(() => subDays(new Date(), 7), []);
 * const endDate = useMemo(() => new Date(), []);
 * const { data } = useHRV(startDate, endDate);
 */
export function useHRV(
  startDate: Date,
  endDate: Date,
  options: { enabled?: boolean; useIncremental?: boolean } = {},
): UseQueryResult<HRVSample[], UseHealthKitError> {
  const { enabled = true, useIncremental = false } = options;

  return useQuery<HRVSample[], UseHealthKitError>({
    queryKey: ['healthkit', 'hrv', startDate.toISOString(), endDate.toISOString()],
    queryFn: async () => {
      if (Platform.OS !== 'ios') {
        throw new UseHealthKitError(
          'PLATFORM_ERROR',
          'HealthKit est uniquement disponible sur iOS',
        );
      }

      await ensureInitialized();

      let effectiveStart = startDate;

      if (useIncremental) {
        const anchor = await getAnchorDate('hrv');
        if (anchor && anchor > startDate) {
          effectiveStart = anchor;
        }
      }

      try {
        const rawData = await fetchHRVLib(effectiveStart, endDate);

        // Conversion typÃ©e sÃ©curisÃ©e via interface Ã©tendue
        const data: HRVSample[] = (rawData as HKHRVSampleExtended[]).map((sample) => ({
          startDate: sample.startDate,
          endDate: sample.endDate,
          value: sample.value,
          sourceName: sample.sourceName ?? '',
        }));

        if (useIncremental && data.length > 0) {
          await setAnchorDate('hrv', endDate);
        }

        return data;
      } catch (err) {
        if (err instanceof LibHealthKitError) {
          throw new UseHealthKitError('FETCH_FAILED', err.message, err);
        }
        throw new UseHealthKitError(
          'FETCH_FAILED',
          `Ãchec de la rÃ©cupÃ©ration des donnÃ©es VFC : ${err}`,
          err,
        );
      }
    },
    enabled: enabled && Platform.OS === 'ios',
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: shouldRetry,
  });
}

/**
 * Calcule le nombre de jours entre deux dates.
 */
function getDayCount(startDate: Date, endDate: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.ceil((endDate.getTime() - startDate.getTime()) / msPerDay);
}

/**
 * Hook React Query pour les donnÃ©es d'activitÃ© HealthKit (pas, calories, minutes actives).
 * Utilise un traitement par batch de 7 jours maximum pour Ã©viter de saturer l'API HealthKit.
 *
 * @param startDate - DÃ©but de la fenÃªtre de requÃªte
 * @param endDate - Fin de la fenÃªtre de requÃªte
 * @param options - Options de requÃªte optionnelles
 *
 * @note Les paramÃ¨tres `startDate` et `endDate` DOIVENT Ãªtre des rÃ©fÃ©rences stables
 * (ex: produites par `useMemo`) pour Ã©viter des boucles de re-fetch infinies.
 *
 * @example
 * // Correct â dates mÃ©moÃ¯sÃ©es
 * const startDate = useMemo(() => subDays(new Date(), 7), []);
 * const endDate = useMemo(() => new Date(), []);
 * const { data } = useActivityData(startDate, endDate);
 */
export function useActivityData(
  startDate: Date,
  endDate: Date,
  options: { enabled?: boolean } = {},
): UseQueryResult<ActivityData[], UseHealthKitError> {
  const { enabled = true } = options;

  return useQuery<ActivityData[], UseHealthKitError>({
    queryKey: ['healthkit', 'activity', startDate.toISOString(), endDate.toISOString()],
    queryFn: async () => {
      if (Platform.OS !== 'ios') {
        throw new UseHealthKitError(
          'PLATFORM_ERROR',
          'HealthKit est uniquement disponible sur iOS',
        );
      }

      await ensureInitialized();

      try {
        const dayCount = getDayCount(startDate, endDate);
        const msPerDay = 24 * 60 * 60 * 1000;

        // CrÃ©er une tÃ¢che par jour
        const dayTasks: Array<() => Promise<ActivityData>> = Array.from(
          { length: dayCount },
          (_, index) => {
            return async (): Promise<ActivityData> => {
              const dayStart = new Date(startDate.getTime() + index * msPerDay);
              const dayEnd = new Date(dayStart.getTime() + msPerDay);

              // Utiliser Promise.allSettled pour les 3 appels par jour avec gestion des erreurs partielles
              const [stepsResult, caloriesResult, minutesResult] = await Promise.allSettled([
                fetchActivityData(dayStart, dayEnd).then((d) =>
                  Array.isArray(d) && d.length > 0 ? (d[0] as ActivityData).steps : 0,
                ),
                fetchActivityData(dayStart, dayEnd).then((d) =>
                  Array.isArray(d) && d.length > 0 ? (d[0] as ActivityData).activeCalories : 0,
                ),
                fetchActivityData(dayStart, dayEnd).then((d) =>
                  Array.isArray(d) && d.length > 0 ? (d[0] as ActivityData).activeMinutes : 0,
                ),
              ]);

              return {
                date: dayStart.toISOString(),
                steps: stepsResult.status === 'fulfilled' ? stepsResult.value : 0,
                activeCalories:
                  caloriesResult.status === 'fulfilled' ? caloriesResult.value : 0,
                activeMinutes:
                  minutesResult.status === 'fulfilled' ? minutesResult.value : 0,
              };
            };
          },
        );

        // Traiter par batch de 7 jours maximum pour limiter la concurrence
        const BATCH_SIZE = 7;
        const settledResults = await runInBatches(dayTasks, BATCH_SIZE);

        // Extraire les rÃ©sultats rÃ©ussis et ignorer les Ã©checs
        const data: ActivityData[] = settledResults
          .filter(
            (result): result is PromiseFulfilledResult<ActivityData> =>
              result.status === 'fulfilled',
          )
          .map((result) => result.value);

        return data;
      } catch (err) {
        if (err instanceof LibHealthKitError) {
          throw new UseHealthKitError('FETCH_FAILED', err.message, err);
        }
        throw new UseHealthKitError(
          'FETCH_FAILED',
          `Ãchec de la rÃ©cupÃ©ration des donnÃ©es d'activitÃ© : ${err}`,
          err,
        );
      }
    },
    enabled: enabled && Platform.OS === 'ios',
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: shouldRetry,
  });
}

/**
 * Hook pratique qui initialise HealthKit et retourne la fonction de demande de permission.
 * Ã utiliser au niveau supÃ©rieur de votre Ã©cran de donnÃ©es de santÃ©.
 */
export function useHealthKit() {
  const queryClient = useQueryClient();

  const initialize = useCallback(async () => {
    await requestPermissions();
    // Invalider les requÃªtes pÃ©rimÃ©es aprÃ¨s l'octroi des permissions
    await queryClient.invalidateQueries({ queryKey: ['healthkit'] });
  }, [queryClient]);

  const isAvailable = Platform.OS === 'ios';

  return {
    isAvailable,
    initialize,
    requestPermissions,
    registerBackgroundFetchAsync,
  };
}

export default useHealthKit;
