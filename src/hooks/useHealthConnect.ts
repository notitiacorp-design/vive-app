/**
 * @file useHealthConnect.ts
 * @description Android Health Connect integration hook for VIVE app.
 * Provides React Query-based hooks for sleep, heart rate, HRV, and activity data.
 * All hooks are guarded with Platform.OS === 'android' checks.
 */

import { useCallback } from 'react';
import { Platform } from 'react-native';
import { useQuery, useQueryClient, UseQueryResult } from '@tanstack/react-query';
import {
  initialize,
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
  /** Maps Health Connect stage values to human-readable labels */
  value: 'INBED' | 'ASLEEP' | 'AWAKE' | 'CORE' | 'DEEP' | 'REM' | 'LIGHT';
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
 * Maps Health Connect sleep stage integers to human-readable labels.
 * Reference: https://developer.android.com/reference/kotlin/androidx/health/connect/client/records/SleepSessionRecord.Companion
 */
function mapSleepStage(
  stage: number,
): SleepSampleData['value'] {
  switch (stage) {
    case 0: return 'UNKNOWN' as any;
    case 1: return 'AWAKE';
    case 2: return 'ASLEEP';
    case 3: return 'INBED';
    case 4: return 'LIGHT';
    case 5: return 'DEEP';
    case 6: return 'REM';
    default: return 'ASLEEP';
  }
}

// ---------------------------------------------------------------------------
// SDK Availability Check
// ---------------------------------------------------------------------------

let _sdkAvailable: boolean | null = null;

async function checkSdkAvailability(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  if (_sdkAvailable !== null) return _sdkAvailable;

  try {
    const status = await getSdkStatus();
    _sdkAvailable = status === SdkAvailabilityStatus.SDK_AVAILABLE;
    return _sdkAvailable;
  } catch {
    _sdkAvailable = false;
    return false;
  }
}

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------

let _isInitialized = false;
let _initPromise: Promise<void> | null = null;

async function ensureInitialized(): Promise<void> {
  if (Platform.OS !== 'android') {
    throw new HealthConnectError(
      'PLATFORM_ERROR',
      'Health Connect is only available on Android',
    );
  }

  if (_isInitialized) return;
  if (_initPromise) return _initPromise;

  _initPromise = (async () => {
    const available = await checkSdkAvailability();
    if (!available) {
      _initPromise = null;
      throw new HealthConnectError(
        'SDK_NOT_INSTALLED',
        'Health Connect SDK is not available on this device. ' +
          'The user may need to install the Health Connect app.',
      );
    }

    const initialized = await initialize();
    if (!initialized) {
      _initPromise = null;
      throw new HealthConnectError(
        'NOT_INITIALIZED',
        'Health Connect failed to initialize.',
      );
    }

    _isInitialized = true;
  })();

  return _initPromise;
}

// ---------------------------------------------------------------------------
// Permission Request
// ---------------------------------------------------------------------------

/**
 * Requests all required Health Connect permissions.
 * Presents the system permission dialog to the user.
 */
export async function requestPermissions(): Promise<Permission[]> {
  if (Platform.OS !== 'android') {
    throw new HealthConnectError(
      'PLATFORM_ERROR',
      'Health Connect is only available on Android',
    );
  }

  await ensureInitialized();

  try {
    const granted = await requestPermission(REQUIRED_PERMISSIONS);
    return granted;
  } catch (error) {
    throw new HealthConnectError(
      'PERMISSION_DENIED',
      'Failed to request Health Connect permissions',
      error,
    );
  }
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

    for (const record of records as any[]) {
      // Each SleepSession may have multiple stages
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
        // Session-level record without stages
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
      'Failed to fetch sleep data from Health Connect',
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

    for (const record of records as any[]) {
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
      'Failed to fetch heart rate data from Health Connect',
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
    const { records } = await readRecords('HeartRateVariabilityRmssd', {
      timeRangeFilter: {
        operator: 'between',
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString(),
      },
    });

    return (records as any[]).map((r) => ({
      startDate: r.time,
      endDate: r.time,
      value: r.heartRateVariabilityMillis,
      sourceName: r.metadata?.dataOrigin ?? '',
    }));
  } catch (error) {
    throw new HealthConnectError(
      'FETCH_FAILED',
      'Failed to fetch HRV data from Health Connect',
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

    // Aggregate by day
    const dayMap = new Map<
      string,
      { steps: number; calories: number; minutes: number }
    >();

    for (const record of stepsResult.records as any[]) {
      const day = record.startTime.split('T')[0];
      const existing = dayMap.get(day) ?? { steps: 0, calories: 0, minutes: 0 };
      existing.steps += record.count ?? 0;
      dayMap.set(day, existing);
    }

    for (const record of caloriesResult.records as any[]) {
      const day = record.startTime.split('T')[0];
      const existing = dayMap.get(day) ?? { steps: 0, calories: 0, minutes: 0 };
      existing.calories += record.energy?.inKilocalories ?? 0;
      dayMap.set(day, existing);
    }

    for (const record of exerciseResult.records as any[]) {
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
  } catch (error) {
    throw new HealthConnectError(
      'FETCH_FAILED',
      'Failed to fetch activity data from Health Connect',
      error,
    );
  }
}

// ---------------------------------------------------------------------------
// WorkManager / Background Sync Helper
// ---------------------------------------------------------------------------

/**
 * Sets up WorkManager periodic sync for Health Connect data.
 * This is a placeholder — integrate with react-native-background-actions
 * or a native WorkManager module for production use.
 *
 * @param intervalMinutes - Sync interval in minutes (minimum 15 on Android)
 * @param onSync - Async callback invoked during background sync
 */
export function setupWorkManagerSync(
  intervalMinutes: number = 60,
  onSync: () => Promise<void>,
): void {
  if (Platform.OS !== 'android') return;

  // Wire up with your WorkManager native module or react-native-background-actions:
  // BackgroundService.start(onSync, {
  //   taskName: 'HealthConnectSync',
  //   taskTitle: 'VIVE Health Sync',
  //   taskDesc: 'Syncing your health data',
  //   taskIcon: { name: 'ic_launcher', type: 'mipmap' },
  //   color: '#7C3AED',
  //   parameters: { delay: intervalMinutes * 60 * 1000 },
  // });

  console.log(
    `[VIVE HealthConnect] WorkManager sync configured for every ${intervalMinutes}min. ` +
      `Wire up with your background task module.`,
  );
}

// ---------------------------------------------------------------------------
// React Query Hooks
// ---------------------------------------------------------------------------

/**
 * React Query hook for Health Connect sleep data.
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
          'Health Connect is only available on Android',
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
 * React Query hook for Health Connect heart rate data.
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
          'Health Connect is only available on Android',
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
 * React Query hook for Health Connect HRV data.
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
          'Health Connect is only available on Android',
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
 * React Query hook for Health Connect activity data.
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
          'Health Connect is only available on Android',
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
 * Convenience hook that initializes Health Connect and exposes helper utilities.
 */
export function useHealthConnect() {
  const queryClient = useQueryClient();

  const initialize = useCallback(async () => {
    await requestPermissions();
    await queryClient.invalidateQueries({ queryKey: ['healthconnect'] });
  }, [queryClient]);

  const isAvailable = Platform.OS === 'android';

  return {
    isAvailable,
    initialize,
    requestPermissions,
    setupWorkManagerSync,
    checkSdkAvailability,
  };
}

export default useHealthConnect;
