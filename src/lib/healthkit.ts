/**
 * src/lib/healthkit.ts
 * VIVE App — HealthKit wrapper (iOS only)
 *
 * Provides a clean, typed API over react-native-health.
 * All public functions are no-ops (returning empty/null) on Android so that
 * callers do not need platform guards everywhere.
 */

import { Platform } from 'react-native';
import AppleHealthKit, {
  HealthKitPermissions,
  HealthValue,
  HealthInputOptions,
} from 'react-native-health';

// ---------------------------------------------------------------------------
// Error class
// ---------------------------------------------------------------------------
export class HealthKitError extends Error {
  public readonly code: string;
  constructor(message: string, code = 'HEALTHKIT_ERROR') {
    super(message);
    this.name = 'HealthKitError';
    this.code = code;
    // Maintains proper prototype chain in transpiled ES5.
    Object.setPrototypeOf(this, HealthKitError.prototype);
  }
}

// ---------------------------------------------------------------------------
// Permissions
// ---------------------------------------------------------------------------
export const HEALTHKIT_PERMISSIONS: HealthKitPermissions = {
  permissions: {
    read: [
      AppleHealthKit.Constants.Permissions.HeartRate,
      AppleHealthKit.Constants.Permissions.HeartRateVariability,
      AppleHealthKit.Constants.Permissions.StepCount,
      AppleHealthKit.Constants.Permissions.SleepAnalysis,
      AppleHealthKit.Constants.Permissions.ActiveEnergyBurned,
      AppleHealthKit.Constants.Permissions.BasalEnergyBurned,
      AppleHealthKit.Constants.Permissions.RestingHeartRate,
      AppleHealthKit.Constants.Permissions.BodyMass,
      AppleHealthKit.Constants.Permissions.Height,
      AppleHealthKit.Constants.Permissions.OxygenSaturation,
      AppleHealthKit.Constants.Permissions.RespiratoryRate,
    ],
    write: [
      AppleHealthKit.Constants.Permissions.StepCount,
      AppleHealthKit.Constants.Permissions.ActiveEnergyBurned,
    ],
  },
};

// ---------------------------------------------------------------------------
// Return-type interfaces
// ---------------------------------------------------------------------------
export interface SleepSample {
  id: string;
  startDate: string;
  endDate: string;
  /** Duration in minutes. */
  durationMinutes: number;
  /** 'INBED' | 'ASLEEP' | 'AWAKE' | 'CORE' | 'DEEP' | 'REM' */
  value: string;
}

export interface HeartRateSample {
  startDate: string;
  endDate: string;
  /** Beats per minute. */
  value: number;
}

export interface HRVSample {
  startDate: string;
  endDate: string;
  /** SDNN in milliseconds. */
  value: number;
}

export interface StepSample {
  startDate: string;
  endDate: string;
  value: number;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Shared date-range options builder. */
function dateRangeOptions(
  start: Date,
  end: Date,
  limit = 1000,
  ascending = true,
): HealthInputOptions {
  return {
    startDate: start.toISOString(),
    endDate: end.toISOString(),
    limit,
    ascending,
  };
}

/** Safely run a HealthKit query; rejects with a HealthKitError on failure. */
function runQuery<T>(
  queryFn: (options: HealthInputOptions, callback: (err: string, results: T) => void) => void,
  options: HealthInputOptions,
): Promise<T> {
  return new Promise((resolve, reject) => {
    queryFn(options, (err, results) => {
      if (err) {
        reject(new HealthKitError(typeof err === 'string' ? err : JSON.stringify(err)));
      } else {
        resolve(results);
      }
    });
  });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Initialise HealthKit and request the required permissions.
 * Resolves `true` when permissions are granted, `false` on Android.
 * Rejects with a HealthKitError if HealthKit initialisation fails.
 */
export function initHealthKit(): Promise<boolean> {
  if (Platform.OS !== 'ios') {
    return Promise.resolve(false);
  }

  return new Promise((resolve, reject) => {
    AppleHealthKit.initHealthKit(HEALTHKIT_PERMISSIONS, (error) => {
      if (error) {
        reject(
          new HealthKitError(
            `HealthKit initialisation failed: ${error}`,
            'INIT_FAILED',
          ),
        );
      } else {
        if (__DEV__) {
          console.log('[VIVE/HealthKit] Initialised and permissions granted.');
        }
        resolve(true);
      }
    });
  });
}

/**
 * Query sleep analysis samples from HealthKit.
 *
 * @param start  Query window start.
 * @param end    Query window end.
 * @returns      Array of formatted sleep samples.
 */
export async function querySleepSamples(
  start: Date,
  end: Date,
): Promise<SleepSample[]> {
  if (Platform.OS !== 'ios') return [];

  try {
    const options = dateRangeOptions(start, end);
    const raw = await runQuery<HealthValue[]>(
      // react-native-health exposes this as getSleepSamples
      (opts, cb) => AppleHealthKit.getSleepSamples(opts, cb),
      options,
    );

    return raw.map((sample) => {
      const startMs = new Date(sample.startDate).getTime();
      const endMs = new Date(sample.endDate).getTime();
      return {
        id: `${sample.startDate}-${sample.value}`,
        startDate: sample.startDate,
        endDate: sample.endDate,
        durationMinutes: Math.round((endMs - startMs) / 60_000),
        value: String(sample.value),
      };
    });
  } catch (err) {
    console.error('[VIVE/HealthKit] querySleepSamples error:', err);
    throw err instanceof HealthKitError
      ? err
      : new HealthKitError(String(err), 'SLEEP_QUERY_FAILED');
  }
}

/**
 * Query heart-rate samples from HealthKit.
 *
 * @param start  Query window start.
 * @param end    Query window end.
 * @returns      Array of HR samples (bpm).
 */
export async function queryHeartRate(
  start: Date,
  end: Date,
): Promise<HeartRateSample[]> {
  if (Platform.OS !== 'ios') return [];

  try {
    const options = dateRangeOptions(start, end);
    const raw = await runQuery<HealthValue[]>(
      (opts, cb) => AppleHealthKit.getHeartRateSamples(opts, cb),
      options,
    );

    return raw.map((sample) => ({
      startDate: sample.startDate,
      endDate: sample.endDate,
      value: sample.value,
    }));
  } catch (err) {
    console.error('[VIVE/HealthKit] queryHeartRate error:', err);
    throw err instanceof HealthKitError
      ? err
      : new HealthKitError(String(err), 'HR_QUERY_FAILED');
  }
}

/**
 * Query heart-rate variability (HRV / SDNN) samples from HealthKit.
 *
 * @param start  Query window start.
 * @param end    Query window end.
 * @returns      Array of HRV samples (ms SDNN).
 */
export async function queryHRV(
  start: Date,
  end: Date,
): Promise<HRVSample[]> {
  if (Platform.OS !== 'ios') return [];

  try {
    const options = dateRangeOptions(start, end);
    const raw = await runQuery<HealthValue[]>(
      (opts, cb) => AppleHealthKit.getHeartRateVariabilitySamples(opts, cb),
      options,
    );

    return raw.map((sample) => ({
      startDate: sample.startDate,
      endDate: sample.endDate,
      // HealthKit returns HRV in seconds; convert to milliseconds.
      value: sample.value * 1000,
    }));
  } catch (err) {
    console.error('[VIVE/HealthKit] queryHRV error:', err);
    throw err instanceof HealthKitError
      ? err
      : new HealthKitError(String(err), 'HRV_QUERY_FAILED');
  }
}

/**
 * Query step-count samples from HealthKit.
 *
 * @param start  Query window start.
 * @param end    Query window end.
 * @returns      Array of step samples.
 */
export async function querySteps(
  start: Date,
  end: Date,
): Promise<StepSample[]> {
  if (Platform.OS !== 'ios') return [];

  try {
    const options = dateRangeOptions(start, end);
    const raw = await runQuery<HealthValue[]>(
      (opts, cb) => AppleHealthKit.getDailyStepCountSamples(opts, cb),
      options,
    );

    return raw.map((sample) => ({
      startDate: sample.startDate,
      endDate: sample.endDate,
      value: sample.value,
    }));
  } catch (err) {
    console.error('[VIVE/HealthKit] querySteps error:', err);
    throw err instanceof HealthKitError
      ? err
      : new HealthKitError(String(err), 'STEPS_QUERY_FAILED');
  }
}

/**
 * Query active energy burned samples from HealthKit.
 *
 * @param start  Query window start.
 * @param end    Query window end.
 * @returns      Array of calorie samples (kcal).
 */
export async function queryActiveCalories(
  start: Date,
  end: Date,
): Promise<StepSample[]> {
  if (Platform.OS !== 'ios') return [];

  try {
    const options: HealthInputOptions = {
      ...dateRangeOptions(start, end),
      unit: 'kilocalorie' as const,
    };
    const raw = await runQuery<HealthValue[]>(
      (opts, cb) => AppleHealthKit.getActiveEnergyBurned(opts, cb),
      options,
    );

    return raw.map((sample) => ({
      startDate: sample.startDate,
      endDate: sample.endDate,
      value: sample.value,
    }));
  } catch (err) {
    console.error('[VIVE/HealthKit] queryActiveCalories error:', err);
    throw err instanceof HealthKitError
      ? err
      : new HealthKitError(String(err), 'CALORIES_QUERY_FAILED');
  }
}
