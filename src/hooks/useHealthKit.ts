/**
 * @file useHealthKit.ts
 * @description iOS HealthKit integration hook for VIVE app.
 * Provides React Query-based hooks for sleep, heart rate, HRV, and activity data.
 * All hooks are guarded with Platform.OS === 'ios' checks.
 */

import { useCallback, useEffect } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useQueryClient, UseQueryResult } from '@tanstack/react-query';
import AppleHealthKit, {
  HealthKitPermissions,
  HealthValue,
  HKActivitySummary,
  SleepSample,
} from 'react-native-health';

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

export type HealthKitErrorCode =
  | 'NOT_AVAILABLE'
  | 'PERMISSION_DENIED'
  | 'FETCH_FAILED'
  | 'NOT_INITIALIZED'
  | 'PLATFORM_ERROR';

export class HealthKitError extends Error {
  readonly code: HealthKitErrorCode;
  readonly originalError?: unknown;

  constructor(code: HealthKitErrorCode, message: string, originalError?: unknown) {
    super(message);
    this.name = 'HealthKitError';
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
      new HealthKitError('PLATFORM_ERROR', 'HealthKit is only available on iOS'),
    );
  }

  if (_isInitialized) return Promise.resolve();

  if (_initPromise) return _initPromise;

  _initPromise = new Promise<void>((resolve, reject) => {
    AppleHealthKit.initHealthKit(PERMISSIONS, (error) => {
      if (error) {
        _initPromise = null;
        reject(
          new HealthKitError(
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
    throw new HealthKitError('PLATFORM_ERROR', 'HealthKit is only available on iOS');
  }
  await ensureInitialized();
}

// ---------------------------------------------------------------------------
// Fetch Helpers
// ---------------------------------------------------------------------------

async function fetchSleepSamples(
  startDate: Date,
  endDate: Date,
): Promise<SleepSampleData[]> {
  await ensureInitialized();

  return new Promise((resolve, reject) => {
    const options = {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      limit: 0,
    };

    AppleHealthKit.getSleepSamples(options, (error, results) => {
      if (error) {
        reject(
          new HealthKitError('FETCH_FAILED', `Failed to fetch sleep data: ${error}`, error),
        );
        return;
      }

      const mapped: SleepSampleData[] = (results as SleepSample[]).map((s) => ({
        startDate: s.startDate,
        endDate: s.endDate,
        value: s.value as SleepSampleData['value'],
        sourceId: (s as any).sourceId ?? '',
        sourceName: (s as any).sourceName ?? '',
      }));

      resolve(mapped);
    });
  });
}

async function fetchHeartRate(
  startDate: Date,
  endDate: Date,
): Promise<HeartRateSample[]> {
  await ensureInitialized();

  return new Promise((resolve, reject) => {
    const options = {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      ascending: true,
      limit: 0,
    };

    AppleHealthKit.getHeartRateSamples(options, (error, results) => {
      if (error) {
        reject(
          new HealthKitError(
            'FETCH_FAILED',
            `Failed to fetch heart rate data: ${error}`,
            error,
          ),
        );
        return;
      }

      const mapped: HeartRateSample[] = (results as HealthValue[]).map((r) => ({
        startDate: r.startDate,
        endDate: r.endDate,
        value: r.value,
        sourceName: (r as any).sourceName ?? '',
      }));

      resolve(mapped);
    });
  });
}

async function fetchHRV(startDate: Date, endDate: Date): Promise<HRVSample[]> {
  await ensureInitialized();

  return new Promise((resolve, reject) => {
    const options = {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      ascending: true,
      limit: 0,
    };

    AppleHealthKit.getHeartRateVariabilitySamples(options, (error, results) => {
      if (error) {
        reject(
          new HealthKitError('FETCH_FAILED', `Failed to fetch HRV data: ${error}`, error),
        );
        return;
      }

      const mapped: HRVSample[] = (results as HealthValue[]).map((r) => ({
        startDate: r.startDate,
        endDate: r.endDate,
        value: r.value,
        sourceName: (r as any).sourceName ?? '',
      }));

      resolve(mapped);
    });
  });
}

async function fetchActivityData(
  startDate: Date,
  endDate: Date,
): Promise<ActivityData[]> {
  await ensureInitialized();

  const dayMs = 24 * 60 * 60 * 1000;
  const days: ActivityData[] = [];

  // Build an array of day-boundary pairs
  const cursor = new Date(startDate);
  cursor.setHours(0, 0, 0, 0);

  const promises: Promise<ActivityData>[] = [];

  while (cursor <= endDate) {
    const dayStart = new Date(cursor);
    const dayEnd = new Date(cursor.getTime() + dayMs - 1);
    const dateStr = dayStart.toISOString().split('T')[0];

    promises.push(
      new Promise<ActivityData>((resolve) => {
        const stepOptions = {
          date: dayStart.toISOString(),
          includeManuallyAdded: false,
        };

        const calOptions = {
          startDate: dayStart.toISOString(),
          endDate: dayEnd.toISOString(),
        };

        let steps = 0;
        let calories = 0;
        let activeMinutes = 0;
        let pending = 3;

        const tryResolve = () => {
          pending -= 1;
          if (pending === 0) {
            resolve({ steps, activeCalories: calories, activeMinutes, date: dateStr });
          }
        };

        AppleHealthKit.getStepCount(stepOptions, (_err, result) => {
          steps = result?.value ?? 0;
          tryResolve();
        });

        AppleHealthKit.getActiveEnergyBurned(calOptions, (_err, results) => {
          calories = Array.isArray(results)
            ? results.reduce((sum, r) => sum + (r.value ?? 0), 0)
            : 0;
          tryResolve();
        });

        AppleHealthKit.getAppleExerciseTime(calOptions, (_err, results) => {
          activeMinutes = Array.isArray(results)
            ? results.reduce((sum, r) => sum + (r.value ?? 0), 0)
            : 0;
          tryResolve();
        });
      }),
    );

    cursor.setTime(cursor.getTime() + dayMs);
  }

  const results = await Promise.all(promises);
  return results;
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
// React Query Hooks
// ---------------------------------------------------------------------------

/**
 * React Query hook for HealthKit sleep data.
 *
 * @param startDate - Start of the query window
 * @param endDate - End of the query window
 * @param options - Optional incremental query options
 */
export function useSleepData(
  startDate: Date,
  endDate: Date,
  options: { enabled?: boolean; useIncremental?: boolean } = {},
): UseQueryResult<SleepSampleData[], HealthKitError> {
  const { enabled = true, useIncremental = false } = options;

  return useQuery<SleepSampleData[], HealthKitError>({
    queryKey: ['healthkit', 'sleep', startDate.toISOString(), endDate.toISOString()],
    queryFn: async () => {
      if (Platform.OS !== 'ios') {
        throw new HealthKitError('PLATFORM_ERROR', 'HealthKit is only available on iOS');
      }

      let effectiveStart = startDate;

      if (useIncremental) {
        const anchor = await getAnchorDate('sleep');
        if (anchor && anchor > startDate) {
          effectiveStart = anchor;
        }
      }

      const data = await fetchSleepSamples(effectiveStart, endDate);

      if (useIncremental && data.length > 0) {
        await setAnchorDate('sleep', endDate);
      }

      return data;
    },
    enabled: enabled && Platform.OS === 'ios',
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: (failureCount, error) => {
      if (error.code === 'PERMISSION_DENIED' || error.code === 'PLATFORM_ERROR') {
        return false;
      }
      return failureCount < 2;
    },
  });
}

/**
 * React Query hook for HealthKit heart rate data.
 *
 * @param startDate - Start of the query window
 * @param endDate - End of the query window
 */
export function useHeartRate(
  startDate: Date,
  endDate: Date,
  options: { enabled?: boolean } = {},
): UseQueryResult<HeartRateSample[], HealthKitError> {
  const { enabled = true } = options;

  return useQuery<HeartRateSample[], HealthKitError>({
    queryKey: ['healthkit', 'heartRate', startDate.toISOString(), endDate.toISOString()],
    queryFn: async () => {
      if (Platform.OS !== 'ios') {
        throw new HealthKitError('PLATFORM_ERROR', 'HealthKit is only available on iOS');
      }
      return fetchHeartRate(startDate, endDate);
    },
    enabled: enabled && Platform.OS === 'ios',
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: (failureCount, error) => {
      if (error.code === 'PERMISSION_DENIED' || error.code === 'PLATFORM_ERROR') {
        return false;
      }
      return failureCount < 2;
    },
  });
}

/**
 * React Query hook for HealthKit HRV data.
 *
 * @param startDate - Start of the query window
 * @param endDate - End of the query window
 */
export function useHRV(
  startDate: Date,
  endDate: Date,
  options: { enabled?: boolean; useIncremental?: boolean } = {},
): UseQueryResult<HRVSample[], HealthKitError> {
  const { enabled = true, useIncremental = false } = options;

  return useQuery<HRVSample[], HealthKitError>({
    queryKey: ['healthkit', 'hrv', startDate.toISOString(), endDate.toISOString()],
    queryFn: async () => {
      if (Platform.OS !== 'ios') {
        throw new HealthKitError('PLATFORM_ERROR', 'HealthKit is only available on iOS');
      }

      let effectiveStart = startDate;

      if (useIncremental) {
        const anchor = await getAnchorDate('hrv');
        if (anchor && anchor > startDate) {
          effectiveStart = anchor;
        }
      }

      const data = await fetchHRV(effectiveStart, endDate);

      if (useIncremental && data.length > 0) {
        await setAnchorDate('hrv', endDate);
      }

      return data;
    },
    enabled: enabled && Platform.OS === 'ios',
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: (failureCount, error) => {
      if (error.code === 'PERMISSION_DENIED' || error.code === 'PLATFORM_ERROR') {
        return false;
      }
      return failureCount < 2;
    },
  });
}

/**
 * React Query hook for HealthKit activity data (steps, calories, active minutes).
 *
 * @param startDate - Start of the query window
 * @param endDate - End of the query window
 */
export function useActivityData(
  startDate: Date,
  endDate: Date,
  options: { enabled?: boolean } = {},
): UseQueryResult<ActivityData[], HealthKitError> {
  const { enabled = true } = options;

  return useQuery<ActivityData[], HealthKitError>({
    queryKey: ['healthkit', 'activity', startDate.toISOString(), endDate.toISOString()],
    queryFn: async () => {
      if (Platform.OS !== 'ios') {
        throw new HealthKitError('PLATFORM_ERROR', 'HealthKit is only available on iOS');
      }
      return fetchActivityData(startDate, endDate);
    },
    enabled: enabled && Platform.OS === 'ios',
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: (failureCount, error) => {
      if (error.code === 'PERMISSION_DENIED' || error.code === 'PLATFORM_ERROR') {
        return false;
      }
      return failureCount < 2;
    },
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
