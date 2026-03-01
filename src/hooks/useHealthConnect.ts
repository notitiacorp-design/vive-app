/**
 * @file useHealthConnect.ts
 * @description Android Health Connect integration hook pour l'application VIVE.
 * Fournit des hooks basÃ©s sur React Query pour les donnÃ©es de sommeil, frÃ©quence cardiaque, HRV et activitÃ©.
 * Tous les hooks sont protÃ©gÃ©s par des vÃ©rifications Platform.OS === 'android'.
 *
 * @note Les paramÃ¨tres startDate et endDate passÃ©s aux hooks doivent Ãªtre mÃ©moÃ¯sÃ©s par le composant
 * appelant (via useMemo ou useState) pour Ã©viter des re-dÃ©clenchements de requÃªtes Ã  chaque render,
 * car les objets Date crÃ©Ã©s inline crÃ©ent une nouvelle rÃ©fÃ©rence Ã  chaque render.
 */

import { useCallback } from 'react';
import { Platform } from 'react-native';
import { useQuery, useQueryClient, UseQueryResult } from '@tanstack/react-query';
import {
  initialize as initializeSDK,
  requestPermission,
  readRecords,
  getSdkStatus,
  SdkAvailabilityStatus,
  Permission,
} from 'react-native-health-connect';

// ---------------------------------------------------------------------------
// Error Types
// ---------------------------------------------------------------------------

export type HealthConnectErrorCode =
  | 'NOT_AVAILABLE'
  | 'PERMISSION_DENIED'
  | 'FETCH_FAILED'
  | 'NOT_INITIALIZED'
  | 'SDK_NOT_INSTALLED'
  | 'PLATFORM_ERROR';

export class HealthConnectError extends Error {
  readonly code: HealthConnectErrorCode;
  readonly originalError?: unknown;

  constructor(
    code: HealthConnectErrorCode,
    message: string,
    originalError?: unknown,
  ) {
    super(message);
    this.name = 'HealthConnectError';
    this.code = code;
    this.originalError = originalError;
  }
}

// ---------------------------------------------------------------------------
// Shared Data Types (same interface as HealthKit for cross-platform parity)
// ---------------------------------------------------------------------------

export interface SleepSampleData {
  startDate: string;
  endDate: string;
  /**
   * Mappe les valeurs de stade Health Connect vers des libellÃ©s lisibles.
   * 'UNKNOWN' est inclus pour le stade 0 (non dÃ©fini par Health Connect).
   */
  value: 'INBED' | 'ASLEEP' | 'AWAKE' | 'CORE' | 'DEEP' | 'REM' | 'LIGHT' | 'UNKNOWN';
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
  value: number; // ms RMSSD
  sourceName: string;
}

export interface ActivityData {
  steps: number;
  activeCalories: number;
  activeMinutes: number;
  date: string;
}

// ---------------------------------------------------------------------------
// Typed Health Connect Record Interfaces
// ---------------------------------------------------------------------------

interface HealthConnectMetadata {
  dataOrigin?: string;
  id?: string;
}

interface SleepStage {
  startTime: string;
  endTime: string;
  stage: number;
}

interface SleepSessionRecord {
  startTime: string;
  endTime: string;
  stages?: SleepStage[];
  metadata?: HealthConnectMetadata;
}

interface HeartRateSampleRecord {
  time: string;
  beatsPerMinute: number;
}

interface HeartRateRecord {
  samples?: HeartRateSampleRecord[];
  metadata?: HealthConnectMetadata;
}

interface StepsRecord {
  startTime: string;
  endTime: string;
  count?: number;
  metadata?: HealthConnectMetadata;
}

interface EnergyValue {
  inKilocalories?: number;
}

interface ActiveCaloriesBurnedRecord {
  startTime: string;
  endTime: string;
  energy?: EnergyValue;
  metadata?: HealthConnectMetadata;
}

interface ExerciseSessionRecord {
  startTime: string;
  endTime: string;
  metadata?: HealthConnectMetadata;
}

interface HRVRecord {
  time: string;
  heartRateVariabilityMillis: number;
  metadata?: HealthConnectMetadata;
}

// ---------------------------------------------------------------------------
// Type Guards
// ---------------------------------------------------------------------------

function isSleepSessionRecord(record: unknown): record is SleepSessionRecord {
  return (
    typeof record === 'object' &&
    record !== null &&
    'startTime' in record &&
    'endTime' in record
  );
}

function isHeartRateRecord(record: unknown): record is HeartRateRecord {
  return typeof record === 'object' && record !== null;
}

function isStepsRecord(record: unknown): record is StepsRecord {
  return (
    typeof record === 'object' &&
    record !== null &&
    'startTime' in record
  );
}

function isActiveCaloriesBurnedRecord(
  record: unknown,
): record is ActiveCaloriesBurnedRecord {
  return (
    typeof record === 'object' &&
    record !== null &&
    'startTime' in record
  );
}

function isExerciseSessionRecord(
  record: unknown,
): record is ExerciseSessionRecord {
  return (
    typeof record === 'object' &&
    record !== null &&
    'startTime' in record &&
    'endTime' in record
  );
}

function isHRVRecord(record: unknown): record is HRVRecord {
  return (
    typeof record === 'object' &&
    record !== null &&
    'time' in record &&
    'heartRateVariabilityMillis' in record
  );
}

// ---------------------------------------------------------------------------
// Health Connect Permission Definitions
// ---------------------------------------------------------------------------

const REQUIRED_PERMISSIONS: Permission[] = [
  { accessType: 'read', recordType: 'SleepSession' },
  { accessType: 'read', recordType: 'HeartRate' },
  { accessType: 'read', recordType: 'HeartRateVariabilityRmssd' },
  { accessType: 'read', recordType: 'Steps' },
  { accessType: 'read', recordType: 'ActiveCaloriesBurned' },
  { accessType: 'read', recordType: 'ExerciseSession' },
];

// ---------------------------------------------------------------------------
// Sleep Stage Mapping
// ---------------------------------------------------------------------------

/**
 * Mappe les entiers de stade de sommeil Health Connect vers des libellÃ©s lisibles.
 * RÃ©fÃ©rence: https://developer.android.com/reference/kotlin/androidx/health/connect/client/records/SleepSessionRecord.Companion
 */
function mapSleepStage(stage: number): SleepSampleData['value'] {
  switch (stage) {
    case 0:
      return 'UNKNOWN';
    case 1:
      return 'AWAKE';
    case 2:
      return 'ASLEEP';
    case 3:
      return 'INBED';
    case 4:
      return 'LIGHT';
    case 5:
      return 'DEEP';
    case 6:
      return 'REM';
    default:
      return 'ASLEEP';
  }
}

// ---------------------------------------------------------------------------
// SDK State Encapsulation
// ---------------------------------------------------------------------------

/**
 * Encapsule l'Ã©tat du SDK Health Connect pour permettre la rÃ©initialisation
 * en cas d'erreur ou lors des tests.
 */
const sdkState = {
  available: null as boolean | null,
  initialized: false,
  initPromise: null as Promise<void> | null,

  /** RÃ©initialise l'Ã©tat complet du SDK (utile pour les tests et la gestion d'erreurs). */
  reset(): void {
    this.available = null;
    this.initialized = false;
    this.initPromise = null;
  },
};

// ---------------------------------------------------------------------------
// SDK Availability Check
// ---------------------------------------------------------------------------

async function checkSdkAvailability(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  if (sdkState.available !== null) return sdkState.available;

  try {
    const status = await getSdkStatus();
    sdkState.available = status === SdkAvailabilityStatus.SDK_AVAILABLE;
    return sdkState.available;
  } catch {
    sdkState.available = false;
    return false;
  }
}

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------

async function ensureInitialized(): Promise<void> {
  if (Platform.OS !== 'android') {
    throw new HealthConnectError(
      'PLATFORM_ERROR',
      'Health Connect est uniquement disponible sur Android',
    );
  }

  if (sdkState.initialized) return;
  if (sdkState.initPromise) return sdkState.initPromise;

  sdkState.initPromise = (async () => {
    const available = await checkSdkAvailability();
    if (!available) {
      sdkState.reset();
      throw new HealthConnectError(
        'SDK_NOT_INSTALLED',
        "Le SDK Health Connect n'est pas disponible sur cet appareil. " +
          "L'utilisateur doit peut-Ãªtre installer l'application Health Connect.",
      );
    }

    const initialized = await initializeSDK();
    if (!initialized) {
      sdkState.reset();
      throw new HealthConnectError(
        'NOT_INITIALIZED',
        "Health Connect n'a pas pu Ãªtre initialisÃ©.",
      );
    }

    sdkState.initialized = true;
  })();

  return sdkState.initPromise;
}

// ---------------------------------------------------------------------------
// Permission Request
// ---------------------------------------------------------------------------

/**
 * Demande toutes les permissions Health Connect requises.
 * Affiche la boÃ®te de dialogue systÃ¨me de permissions Ã  l'utilisateur.
 */
export async function requestPermissions(): Promise<Permission[]> {
  if (Platform.OS !== 'android') {
    throw new HealthConnectError(
      'PLATFORM_ERROR',
      'Health Connect est uniquement disponible sur Android',
    );
  }

  await ensureInitialized();

  try {
    const granted = await requestPermission(REQUIRED_PERMISSIONS);
    return granted;
  } catch (error) {
    throw new HealthConnectError(
      'PERMISSION_DENIED',
      'Ãchec de la demande de permissions Health Connect',
      error,
    );
  }
}

// ---------------------------------------------------------------------------
// Aggregation Helper (pure function, testable independently)
// ---------------------------------------------------------------------------

interface DayAggregation {
  steps: number;
  calories: number;
  minutes: number;
}

/**
 * AgrÃ¨ge les donnÃ©es d'activitÃ© par jour Ã  partir des enregistrements bruts Health Connect.
 * Fonction pure â ne dÃ©pend d'aucun Ã©tat externe, facilement testable.
 */
export function aggregateActivityByDay(
  stepsRecords: unknown[],
  caloriesRecords: unknown[],
  exerciseRecords: unknown[],
): ActivityData[] {
  const dayMap = new Map<string, DayAggregation>();

  for (const record of stepsRecords) {
    if (!isStepsRecord(record)) continue;
    const day = record.startTime.split('T')[0];
    const existing = dayMap.get(day) ?? { steps: 0, calories: 0, minutes: 0 };
    existing.steps += record.count ?? 0;
    dayMap.set(day, existing);
  }

  for (const record of caloriesRecords) {
    if (!isActiveCaloriesBurnedRecord(record)) continue;
    const day = record.startTime.split('T')[0];
    const existing = dayMap.get(day) ?? { steps: 0, calories: 0, minutes: 0 };
    existing.calories += record.energy?.inKilocalories ?? 0;
    dayMap.set(day, existing);
  }

  for (const record of exerciseRecords) {
    if (!isExerciseSessionRecord(record)) continue;
    const day = record.startTime.split('T')[0];
    const existing = dayMap.get(day) ?? { steps: 0, calories: 0, minutes: 0 };
    const durationMs =
      new Date(record.endTime).getTime() -
      new Date(record.startTime).getTime();
    existing.minutes += Math.floor(durationMs / 60000);
    dayMap.set(day, existing);
  }

  return Array.from(dayMap.entries()).map(([date, data]) => ({
    date,
    steps: data.steps,
    activeCalories: data.calories,
    activeMinutes: data.minutes,
  }));
}

// ---------------------------------------------------------------------------
// Fetch Helpers
// ---------------------------------------------------------------------------

async function fetchSleepSamples(
  startDate: Date,
  endDate: Date,
): Promise<SleepSampleData[]> {
  await ensureInitialized();

  try {
    const { records } = await readRecords('SleepSession', {
      timeRangeFilter: {
        operator: 'between',
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString(),
      },
    });

    const samples: SleepSampleData[] = [];

    for (const rawRecord of records) {
      if (!isSleepSessionRecord(rawRecord)) continue;
      const record: SleepSessionRecord = rawRecord;

      if (record.stages && Array.isArray(record.stages)) {
        for (const stage of record.stages) {
          samples.push({
            startDate: stage.startTime,
            endDate: stage.endTime,
            value: mapSleepStage(stage.stage),
            sourceId: record.metadata?.dataOrigin ?? '',
            sourceName: record.metadata?.dataOrigin ?? '',
          });
        }
      } else {
        // Enregistrement de session sans stades dÃ©taillÃ©s
        samples.push({
          startDate: record.startTime,
          endDate: record.endTime,
          value: 'ASLEEP',
          sourceId: record.metadata?.dataOrigin ?? '',
          sourceName: record.metadata?.dataOrigin ?? '',
        });
      }
    }

    return samples;
  } catch (error) {
    throw new HealthConnectError(
      'FETCH_FAILED',
      'Ãchec de la rÃ©cupÃ©ration des donnÃ©es de sommeil depuis Health Connect',
      error,
    );
  }
}

async function fetchHeartRate(
  startDate: Date,
  endDate: Date,
): Promise<HeartRateSample[]> {
  await ensureInitialized();

  try {
    const { records } = await readRecords('HeartRate', {
      timeRangeFilter: {
        operator: 'between',
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString(),
      },
    });

    const samples: HeartRateSample[] = [];

    for (const rawRecord of records) {
      if (!isHeartRateRecord(rawRecord)) continue;
      const record: HeartRateRecord = rawRecord;

      if (record.samples && Array.isArray(record.samples)) {
        for (const sample of record.samples) {
          samples.push({
            startDate: sample.time,
            endDate: sample.time,
            value: sample.beatsPerMinute,
            sourceName: record.metadata?.dataOrigin ?? '',
          });
        }
      }
    }

    return samples;
  } catch (error) {
    throw new HealthConnectError(
      'FETCH_FAILED',
      'Ãchec de la rÃ©cupÃ©ration des donnÃ©es de frÃ©quence cardiaque depuis Health Connect',
      error,
    );
  }
}

async function fetchHRV(
  startDate: Date,
  endDate: Date,
): Promise<HRVSample[]> {
  await ensureInitialized();

  try {
    // Utilisation de 'HeartRateVariabilityRmssd' â type officiel dans Health Connect SDK
    // Ref: https://developer.android.com/reference/kotlin/androidx/health/connect/client/records/HeartRateVariabilityRmssdRecord
    const { records } = await readRecords('HeartRateVariabilityRmssd', {
      timeRangeFilter: {
        operator: 'between',
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString(),
      },
    });

    const samples: HRVSample[] = [];

    for (const rawRecord of records) {
      if (!isHRVRecord(rawRecord)) continue;
      const record: HRVRecord = rawRecord;
      samples.push({
        startDate: record.time,
        endDate: record.time,
        value: record.heartRateVariabilityMillis,
        sourceName: record.metadata?.dataOrigin ?? '',
      });
    }

    return samples;
  } catch (error) {
    throw new HealthConnectError(
      'FETCH_FAILED',
      'Ãchec de la rÃ©cupÃ©ration des donnÃ©es HRV depuis Health Connect',
      error,
    );
  }
}

async function fetchActivityData(
  startDate: Date,
  endDate: Date,
): Promise<ActivityData[]> {
  await ensureInitialized();

  try {
    const timeRangeFilter = {
      operator: 'between' as const,
      startTime: startDate.toISOString(),
      endTime: endDate.toISOString(),
    };

    const [stepsResult, caloriesResult, exerciseResult] = await Promise.all([
      readRecords('Steps', { timeRangeFilter }),
      readRecords('ActiveCaloriesBurned', { timeRangeFilter }),
      readRecords('ExerciseSession', { timeRangeFilter }),
    ]);

    return aggregateActivityByDay(
      stepsResult.records,
      caloriesResult.records,
      exerciseResult.records,
    );
  } catch (error) {
    throw new HealthConnectError(
      'FETCH_FAILED',
      "Ãchec de la rÃ©cupÃ©ration des donnÃ©es d'activitÃ© depuis Health Connect",
      error,
    );
  }
}

// ---------------------------------------------------------------------------
// WorkManager / Background Sync Helper
// ---------------------------------------------------------------------------

/**
 * Configure la synchronisation pÃ©riodique WorkManager pour les donnÃ©es Health Connect.
 * Il s'agit d'un placeholder â Ã  intÃ©grer avec react-native-background-actions
 * ou un module WorkManager natif pour un usage en production.
 *
 * @param intervalMinutes - Intervalle de synchronisation en minutes (minimum 15 sur Android)
 * @param onSync - Callback asynchrone invoquÃ© lors de la synchronisation en arriÃ¨re-plan
 */
export function setupWorkManagerSync(
  intervalMinutes: number = 60,
  onSync: () => Promise<void>,
): void {
  if (Platform.OS !== 'android') return;

  // Ã connecter avec votre module natif WorkManager ou react-native-background-actions:
  // BackgroundService.start(onSync, {
  //   taskName: 'HealthConnectSync',
  //   taskTitle: 'VIVE Health Sync',
  //   taskDesc: 'Synchronisation de vos donnÃ©es de santÃ©',
  //   taskIcon: { name: 'ic_launcher', type: 'mipmap' },
  //   color: '#7C3AED',
  //   parameters: { delay: intervalMinutes * 60 * 1000 },
  // });

  if (__DEV__) {
    console.log(
      `[VIVE HealthConnect] Synchronisation WorkManager configurÃ©e toutes les ${intervalMinutes}min. ` +
        `Ã connecter avec votre module de tÃ¢che en arriÃ¨re-plan.`,
    );
  }

  // RÃ©fÃ©rence Ã  onSync pour Ã©viter le warning TypeScript de paramÃ¨tre inutilisÃ©
  void onSync;
}

// ---------------------------------------------------------------------------
// React Query Hooks
// ---------------------------------------------------------------------------

/**
 * Hook React Query pour les donnÃ©es de sommeil Health Connect.
 *
 * @note startDate et endDate doivent Ãªtre mÃ©moÃ¯sÃ©s par le composant appelant
 * (via useMemo ou useState) pour Ã©viter des re-dÃ©clenchements de requÃªtes inutiles.
 */
export function useSleepData(
  startDate: Date,
  endDate: Date,
  options: { enabled?: boolean } = {},
): UseQueryResult<SleepSampleData[], HealthConnectError> {
  const { enabled = true } = options;

  return useQuery<SleepSampleData[], HealthConnectError>({
    queryKey: [
      'healthconnect',
      'sleep',
      startDate.toISOString(),
      endDate.toISOString(),
    ],
    queryFn: () => {
      if (Platform.OS !== 'android') {
        throw new HealthConnectError(
          'PLATFORM_ERROR',
          'Health Connect est uniquement disponible sur Android',
        );
      }
      return fetchSleepSamples(startDate, endDate);
    },
    enabled: enabled && Platform.OS === 'android',
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: (failureCount, error) => {
      if (
        error.code === 'PERMISSION_DENIED' ||
        error.code === 'PLATFORM_ERROR' ||
        error.code === 'SDK_NOT_INSTALLED'
      ) {
        return false;
      }
      return failureCount < 2;
    },
  });
}

/**
 * Hook React Query pour les donnÃ©es de frÃ©quence cardiaque Health Connect.
 *
 * @note startDate et endDate doivent Ãªtre mÃ©moÃ¯sÃ©s par le composant appelant
 * (via useMemo ou useState) pour Ã©viter des re-dÃ©clenchements de requÃªtes inutiles.
 */
export function useHeartRate(
  startDate: Date,
  endDate: Date,
  options: { enabled?: boolean } = {},
): UseQueryResult<HeartRateSample[], HealthConnectError> {
  const { enabled = true } = options;

  return useQuery<HeartRateSample[], HealthConnectError>({
    queryKey: [
      'healthconnect',
      'heartRate',
      startDate.toISOString(),
      endDate.toISOString(),
    ],
    queryFn: () => {
      if (Platform.OS !== 'android') {
        throw new HealthConnectError(
          'PLATFORM_ERROR',
          'Health Connect est uniquement disponible sur Android',
        );
      }
      return fetchHeartRate(startDate, endDate);
    },
    enabled: enabled && Platform.OS === 'android',
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: (failureCount, error) => {
      if (
        error.code === 'PERMISSION_DENIED' ||
        error.code === 'PLATFORM_ERROR' ||
        error.code === 'SDK_NOT_INSTALLED'
      ) {
        return false;
      }
      return failureCount < 2;
    },
  });
}

/**
 * Hook React Query pour les donnÃ©es HRV Health Connect.
 *
 * @note startDate et endDate doivent Ãªtre mÃ©moÃ¯sÃ©s par le composant appelant
 * (via useMemo ou useState) pour Ã©viter des re-dÃ©clenchements de requÃªtes inutiles.
 */
export function useHRV(
  startDate: Date,
  endDate: Date,
  options: { enabled?: boolean } = {},
): UseQueryResult<HRVSample[], HealthConnectError> {
  const { enabled = true } = options;

  return useQuery<HRVSample[], HealthConnectError>({
    queryKey: [
      'healthconnect',
      'hrv',
      startDate.toISOString(),
      endDate.toISOString(),
    ],
    queryFn: () => {
      if (Platform.OS !== 'android') {
        throw new HealthConnectError(
          'PLATFORM_ERROR',
          'Health Connect est uniquement disponible sur Android',
        );
      }
      return fetchHRV(startDate, endDate);
    },
    enabled: enabled && Platform.OS === 'android',
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: (failureCount, error) => {
      if (
        error.code === 'PERMISSION_DENIED' ||
        error.code === 'PLATFORM_ERROR' ||
        error.code === 'SDK_NOT_INSTALLED'
      ) {
        return false;
      }
      return failureCount < 2;
    },
  });
}

/**
 * Hook React Query pour les donnÃ©es d'activitÃ© Health Connect.
 *
 * @note startDate et endDate doivent Ãªtre mÃ©moÃ¯sÃ©s par le composant appelant
 * (via useMemo ou useState) pour Ã©viter des re-dÃ©clenchements de requÃªtes inutiles.
 */
export function useActivityData(
  startDate: Date,
  endDate: Date,
  options: { enabled?: boolean } = {},
): UseQueryResult<ActivityData[], HealthConnectError> {
  const { enabled = true } = options;

  return useQuery<ActivityData[], HealthConnectError>({
    queryKey: [
      'healthconnect',
      'activity',
      startDate.toISOString(),
      endDate.toISOString(),
    ],
    queryFn: () => {
      if (Platform.OS !== 'android') {
        throw new HealthConnectError(
          'PLATFORM_ERROR',
          'Health Connect est uniquement disponible sur Android',
        );
      }
      return fetchActivityData(startDate, endDate);
    },
    enabled: enabled && Platform.OS === 'android',
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: (failureCount, error) => {
      if (
        error.code === 'PERMISSION_DENIED' ||
        error.code === 'PLATFORM_ERROR' ||
        error.code === 'SDK_NOT_INSTALLED'
      ) {
        return false;
      }
      return failureCount < 2;
    },
  });
}

/**
 * Hook de commoditÃ© qui initialise Health Connect et expose des utilitaires.
 */
export function useHealthConnect() {
  const queryClient = useQueryClient();

  /**
   * Initialise Health Connect et invalide toutes les queries existantes.
   * RenommÃ© en 'initializeHealthConnect' pour Ã©viter le shadowing de l'import 'initialize'
   * du SDK react-native-health-connect.
   */
  const initializeHealthConnect = useCallback(async () => {
    await requestPermissions();
    await queryClient.invalidateQueries({ queryKey: ['healthconnect'] });
  }, [queryClient]);

  const isAvailable = Platform.OS === 'android';

  return {
    isAvailable,
    initialize: initializeHealthConnect,
    requestPermissions,
    setupWorkManagerSync,
    checkSdkAvailability,
    /** RÃ©initialise l'Ã©tat interne du SDK (utile pour les tests). */
    resetSdkState: () => sdkState.reset(),
  };
}

export default useHealthConnect;
