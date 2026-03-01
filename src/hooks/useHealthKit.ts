/**
 * @file useHealthKit.ts
 * @description iOS HealthKit integration hook for VIVE app.
 * Provides React Query-based hooks for sleep, heart rate, HRV, and activity data.
 * All hooks are guarded with Platform.OS === 'ios' checks.
 */

import { useCallback } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useQueryClient, UseQueryResult } from '@tanstack/react-query';
import AppleHealthKit, {
  HealthKitPermissions,
  HealthValue,
  SleepSample,
} from 'react-native-health';
import {
  fetchSleepSamples,
  fetchHeartRate,
  fetchHRV as fetchHRVLib,
  fetchActivityData,
  HealthKitError as LibHealthKitError,
} from '../lib/healthkit';

// ---------------------------------------------------------------------------
// Constants & Storage Keys
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
// Error Types
// ---------------------------------------------------------------------------

/**
 * Error codes specific to the useHealthKit hook layer.
 * Note: This is distinct from the HealthKitError in src/lib/healthkit.ts,
 * which uses a plain string code. UseHealthKitError uses a typed union
 * (UseHealthKitErrorCode) for richer error discrimination at the hook level.
 */
export type UseHealthKitErrorCode =
  | 'NOT_AVAILABLE'
  | 'PERMISSION_DENIED'
  | 'FETCH_FAILED'
  | 'NOT_INITIALIZED'
  | 'PLATFORM_ERROR';

/**
 * Hook-level error class for HealthKit operations.
 * Distinct from LibHealthKitError (src/lib/healthkit.ts) which uses code: string.
 * This class uses a typed UseHealthKitErrorCode union for precise error handling
 * in retry logic and UI error states.
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
// Data Types
// ---------------------------------------------------------------------------

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

export interface AnchorQueryOptions {
  startDate: Date;
  endDate: Date;
  useIncremental?: boolean;
}

// ---------------------------------------------------------------------------
// Internal HealthKit State
// ---------------------------------------------------------------------------

let _isInitialized = false;
let _initPromise: Promise<void> | null = null;

/**
 * Ensures HealthKit is initialized with required permissions.
 * Idempotent â safe to call multiple times.
 */
function ensureInitialized(): Promise<void> {
  if (Platform.OS !== 'ios') {
    return Promise.reject(
      new UseHealthKitError('PLATFORM_ERROR', 'HealthKit is only available on iOS'),
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
            `HealthKit initialization failed: ${error}`,
            error,
          ),
        );
      } else {
        _isInitialized = true;
        resolve();
      }
    });
  });

  return _initPromise;
}

// ---------------------------------------------------------------------------
// Anchor / Incremental Support
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
    // Non-fatal â next sync will re-fetch
  }
}

// ---------------------------------------------------------------------------
// Permission Request
// ---------------------------------------------------------------------------

/**
 * Requests all required HealthKit permissions.
 * Should be called once on app launch or when the user navigates to the health section.
 */
export async function requestPermissions(): Promise<void> {
  if (Platform.OS !== 'ios') {
    throw new UseHealthKitError('PLATFORM_ERROR', 'HealthKit is only available on iOS');
  }
  await ensureInitialized();
}

// ---------------------------------------------------------------------------
// Background Fetch Setup
// ---------------------------------------------------------------------------

/**
 * Registers a background fetch task for HealthKit data.
 * On iOS, this uses BGTaskScheduler via react-native-background-fetch or
 * react-native-background-task. Wire up with your background task library.
 *
 * @param taskIdentifier - The BGTaskScheduler identifier registered in Info.plist
 * @param onFetch - Callback invoked when the OS triggers a background fetch
 */
export function registerBackgroundFetchAsync(
  taskIdentifier: string,
  onFetch: () => Promise<void>,
): void {
  if (Platform.OS !== 'ios') return;

  // This is a thin wrapper â integrate with your preferred background task library.
  // Example with react-native-background-fetch:
  // BackgroundFetch.configure({ minimumFetchInterval: 15 }, async (taskId) => {
  //   await onFetch();
  //   BackgroundFetch.finish(taskId);
  // }, (taskId) => {
  //   BackgroundFetch.finish(taskId);
  // });

  console.log(
    `[VIVE HealthKit] Background fetch registered for task: ${taskIdentifier}. ` +
      `Wire up with your background task library.`,
  );
}

// ---------------------------------------------------------------------------
// Retry helper
// ---------------------------------------------------------------------------

function shouldRetry(failureCount: number, error: UseHealthKitError): boolean {
  if (error.code === 'PERMISSION_DENIED' || error.code === 'PLATFORM_ERROR') {
    return false;
  }
  return failureCount < 2;
}

// ---------------------------------------------------------------------------
// React Query Hooks
// ---------------------------------------------------------------------------

/**
 * React Query hook for HealthKit sleep data.
 *
 * @param startDate - Start of the query window
 * @param endDate - End of the query window
 * @param options - Optional incremental query options
 *
 * @note The `startDate` and `endDate` parameters MUST be stable references
 * (e.g. produced by `useMemo`) to avoid triggering infinite re-fetch loops.
 * Each render that passes a `new Date()` inline will produce a new ISO string
 * in the query key, causing React Query to treat it as a new query.
 *
 * @example
 * // Correct â memoised dates
 * const startDate = useMemo(() => subDays(new Date(), 7), []);
 * const endDate = useMemo(() => new Date(), []);
 * const { data } = useSleepData(startDate, endDate);
 *
 * // Incorrect â new Date() on every render triggers infinite refetches
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
        throw new UseHealthKitError('PLATFORM_ERROR', 'HealthKit is only available on iOS');
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
        const data = await fetchSleepSamples(effectiveStart, endDate);

        if (useIncremental && data.length > 0) {
          await setAnchorDate('sleep', endDate);
        }

        return data as SleepSampleData[];
      } catch (err) {
        if (err instanceof LibHealthKitError) {
          throw new UseHealthKitError(
            'FETCH_FAILED',
            err.message,
            err,
          );
        }
        throw new UseHealthKitError('FETCH_FAILED', `Failed to fetch sleep data: ${err}`, err);
      }
    },
    enabled: enabled && Platform.OS === 'ios',
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: shouldRetry,
  });
}

/**
 * React Query hook for HealthKit heart rate data.
 *
 * @param startDate - Start of the query window
 * @param endDate - End of the query window
 * @param options - Optional query options
 *
 * @note The `startDate` and `endDate` parameters MUST be stable references
 * (e.g. produced by `useMemo`) to avoid triggering infinite re-fetch loops.
 * Each render that passes a `new Date()` inline will produce a new ISO string
 * in the query key, causing React Query to treat it as a new query.
 *
 * @example
 * // Correct â memoised dates
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
        throw new UseHealthKitError('PLATFORM_ERROR', 'HealthKit is only available on iOS');
      }

      await ensureInitialized();

      try {
        const data = await fetchHeartRate(startDate, endDate);
        return data as HeartRateSample[];
      } catch (err) {
        if (err instanceof LibHealthKitError) {
          throw new UseHealthKitError('FETCH_FAILED', err.message, err);
        }
        throw new UseHealthKitError(
          'FETCH_FAILED',
          `Failed to fetch heart rate data: ${err}`,
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
 * React Query hook for HealthKit HRV data.
 *
 * @param startDate - Start of the query window
 * @param endDate - End of the query window
 * @param options - Optional incremental query options
 *
 * @note The `startDate` and `endDate` parameters MUST be stable references
 * (e.g. produced by `useMemo`) to avoid triggering infinite re-fetch loops.
 * Each render that passes a `new Date()` inline will produce a new ISO string
 * in the query key, causing React Query to treat it as a new query.
 *
 * @example
 * // Correct â memoised dates
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
        throw new UseHealthKitError('PLATFORM_ERROR', 'HealthKit is only available on iOS');
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
        const data = await fetchHRVLib(effectiveStart, endDate);

        if (useIncremental && data.length > 0) {
          await setAnchorDate('hrv', endDate);
        }

        return data as HRVSample[];
      } catch (err) {
        if (err instanceof LibHealthKitError) {
          throw new UseHealthKitError('FETCH_FAILED', err.message, err);
        }
        throw new UseHealthKitError('FETCH_FAILED', `Failed to fetch HRV data: ${err}`, err);
      }
    },
    enabled: enabled && Platform.OS === 'ios',
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: shouldRetry,
  });
}

/**
 * React Query hook for HealthKit activity data (steps, calories, active minutes).
 *
 * @param startDate - Start of the query window
 * @param endDate - End of the query window
 * @param options - Optional query options
 *
 * @note The `startDate` and `endDate` parameters MUST be stable references
 * (e.g. produced by `useMemo`) to avoid triggering infinite re-fetch loops.
 * Each render that passes a `new Date()` inline will produce a new ISO string
 * in the query key, causing React Query to treat it as a new query.
 *
 * @example
 * // Correct â memoised dates
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
        throw new UseHealthKitError('PLATFORM_ERROR', 'HealthKit is only available on iOS');
      }

      await ensureInitialized();

      try {
        const data = await fetchActivityData(startDate, endDate);
        return data as ActivityData[];
      } catch (err) {
        if (err instanceof LibHealthKitError) {
          throw new UseHealthKitError('FETCH_FAILED', err.message, err);
        }
        throw new UseHealthKitError(
          'FETCH_FAILED',
          `Failed to fetch activity data: ${err}`,
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
 * Convenience hook that initializes HealthKit and returns permission request function.
 * Use this at the top level of your health data screen.
 */
export function useHealthKit() {
  const queryClient = useQueryClient();

  const initialize = useCallback(async () => {
    await requestPermissions();
    // Invalidate any stale queries after permission grant
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
