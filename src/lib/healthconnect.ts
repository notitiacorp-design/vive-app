/**
 * src/lib/healthconnect.ts
 * VIVE App — Health Connect wrapper (Android only)
 *
 * Provides a clean, typed API over react-native-health-connect.
 * All public functions are no-ops (returning empty/null) on iOS so that
 * callers do not need platform guards everywhere.
 */

import { Platform } from 'react-native';
import {
  initialize,
  requestPermission,
  readRecords,
  getSdkStatus,
  SdkAvailabilityStatus,
  type Permission,
  type ReadRecordsOptions,
} from 'react-native-health-connect';

// ---------------------------------------------------------------------------
// Error class
// ---------------------------------------------------------------------------
export class HealthConnectError extends Error {
  public readonly code: string;
  constructor(message: string, code = 'HEALTH_CONNECT_ERROR') {
    super(message);
    this.name = 'HealthConnectError';
    this.code = code;
    Object.setPrototypeOf(this, HealthConnectError.prototype);
  }
}

// ---------------------------------------------------------------------------
// Return-type interfaces
// ---------------------------------------------------------------------------

export interface HCSleepSession {
  startTime: string;
  endTime: string;
  /** Total duration of the session in minutes. */
  durationMinutes: number;
  /** Individual sleep stage intervals within the session. */
  stages: HCSleepStage[];
}

export interface HCSleepStage {
  startTime: string;
  endTime: string;
  /**
   * Health Connect sleep stage constant:
   * 0 = UNKNOWN, 1 = AWAKE, 2 = SLEEPING, 3 = OUT_OF_BED,
   * 4 = LIGHT, 5 = DEEP, 6 = REM
   */
  stage: number;
}

export interface HCHeartRateSample {
  time: string;
  /** Beats per minute. */
  beatsPerMinute: number;
}

export interface HCHeartRateRecord {
  startTime: string;
  endTime: string;
  samples: HCHeartRateSample[];
}

export interface HCHRVSample {
  time: string;
  /** Root mean square of successive differences (RMSSD) in milliseconds. */
  rmssd: number;
}

export interface HCHRVRecord {
  time: string;
  /** RMSSD in milliseconds. */
  rmssd: number;
}

export interface HCStepRecord {
  startTime: string;
  endTime: string;
  count: number;
}

// ---------------------------------------------------------------------------
// Permissions
// ---------------------------------------------------------------------------

/**
 * Full set of Health Connect permissions required by VIVE.
 * Adjust the list to match your app's declared uses in AndroidManifest.xml.
 */
export const HEALTH_CONNECT_PERMISSIONS: Permission[] = [
  { accessType: 'read', recordType: 'HeartRate' },
  { accessType: 'read', recordType: 'HeartRateVariability' },
  { accessType: 'read', recordType: 'Steps' },
  { accessType: 'read', recordType: 'SleepSession' },
  { accessType: 'read', recordType: 'ActiveCaloriesBurned' },
  { accessType: 'read', recordType: 'TotalCaloriesBurned' },
  { accessType: 'read', recordType: 'RestingHeartRate' },
  { accessType: 'read', recordType: 'OxygenSaturation' },
  { accessType: 'read', recordType: 'RespiratoryRate' },
  { accessType: 'read', recordType: 'Weight' },
  { accessType: 'read', recordType: 'Height' },
  { accessType: 'write', recordType: 'Steps' },
  { accessType: 'write', recordType: 'ActiveCaloriesBurned' },
];

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Build a standard TimeRangeFilter for a date-window query. */
function timeRangeFilter(start: Date, end: Date): ReadRecordsOptions<any>['timeRangeFilter'] {
  return {
    operator: 'between',
    startTime: start.toISOString(),
    endTime: end.toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Check Health Connect SDK availability and initialise the client.
 * Requests all permissions listed in HEALTH_CONNECT_PERMISSIONS.
 *
 * @returns `true`  when the SDK is available and permissions are (at least
 *                  partially) granted; `false` on iOS or when unavailable.
 * @throws  HealthConnectError if the SDK reports an error status.
 */
export async function initHealthConnect(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;

  try {
    // Check SDK availability (requires Android 14+ or Health Connect APK).
    const status = await getSdkStatus();

    if (status === SdkAvailabilityStatus.SDK_UNAVAILABLE) {
      throw new HealthConnectError(
        'Health Connect SDK is unavailable on this device.',
        'SDK_UNAVAILABLE',
      );
    }

    if (status === SdkAvailabilityStatus.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED) {
      throw new HealthConnectError(
        'Health Connect requires a provider update. Please update the Health Connect app.',
        'PROVIDER_UPDATE_REQUIRED',
      );
    }

    // Initialise the SDK.
    const initialised = await initialize();
    if (!initialised) {
      throw new HealthConnectError(
        'Health Connect SDK failed to initialise.',
        'INIT_FAILED',
      );
    }

    // Request permissions.
    const grantedPermissions = await requestPermission(HEALTH_CONNECT_PERMISSIONS);

    if (__DEV__) {
      console.log(
        `[VIVE/HealthConnect] Initialised. Granted ${grantedPermissions.length} / ` +
          `${HEALTH_CONNECT_PERMISSIONS.length} permissions.`,
      );
    }

    return grantedPermissions.length > 0;
  } catch (err) {
    if (err instanceof HealthConnectError) throw err;
    throw new HealthConnectError(
      `Health Connect init failed: ${err}`,
      'INIT_ERROR',
    );
  }
}

/**
 * Query sleep sessions from Health Connect.
 *
 * @param start  Query window start.
 * @param end    Query window end.
 * @returns      Array of formatted sleep sessions.
 */
export async function querySleepSessions(
  start: Date,
  end: Date,
): Promise<HCSleepSession[]> {
  if (Platform.OS !== 'android') return [];

  try {
    const { records } = await readRecords('SleepSession', {
      timeRangeFilter: timeRangeFilter(start, end),
    });

    return records.map((record: any) => {
      const startMs = new Date(record.startTime).getTime();
      const endMs = new Date(record.endTime).getTime();
      const stages: HCSleepStage[] = (record.stages ?? []).map((s: any) => ({
        startTime: s.startTime,
        endTime: s.endTime,
        stage: s.stage,
      }));

      return {
        startTime: record.startTime,
        endTime: record.endTime,
        durationMinutes: Math.round((endMs - startMs) / 60_000),
        stages,
      };
    });
  } catch (err) {
    console.error('[VIVE/HealthConnect] querySleepSessions error:', err);
    throw err instanceof HealthConnectError
      ? err
      : new HealthConnectError(String(err), 'SLEEP_QUERY_FAILED');
  }
}

/**
 * Query heart-rate records from Health Connect.
 *
 * @param start  Query window start.
 * @param end    Query window end.
 * @returns      Array of HR records, each containing one or more samples.
 */
export async function queryHeartRate(
  start: Date,
  end: Date,
): Promise<HCHeartRateRecord[]> {
  if (Platform.OS !== 'android') return [];

  try {
    const { records } = await readRecords('HeartRate', {
      timeRangeFilter: timeRangeFilter(start, end),
    });

    return records.map((record: any) => ({
      startTime: record.startTime,
      endTime: record.endTime,
      samples: (record.samples ?? []).map((s: any) => ({
        time: s.time,
        beatsPerMinute: s.beatsPerMinute,
      })),
    }));
  } catch (err) {
    console.error('[VIVE/HealthConnect] queryHeartRate error:', err);
    throw err instanceof HealthConnectError
      ? err
      : new HealthConnectError(String(err), 'HR_QUERY_FAILED');
  }
}

/**
 * Query heart-rate variability (HRV / RMSSD) records from Health Connect.
 *
 * @param start  Query window start.
 * @param end    Query window end.
 * @returns      Array of HRV records.
 */
export async function queryHRV(
  start: Date,
  end: Date,
): Promise<HCHRVRecord[]> {
  if (Platform.OS !== 'android') return [];

  try {
    const { records } = await readRecords('HeartRateVariability', {
      timeRangeFilter: timeRangeFilter(start, end),
    });

    return records.map((record: any) => ({
      time: record.time,
      // Health Connect stores HRV as RMSSD in milliseconds.
      rmssd: record.heartRateVariabilityMillis,
    }));
  } catch (err) {
    console.error('[VIVE/HealthConnect] queryHRV error:', err);
    throw err instanceof HealthConnectError
      ? err
      : new HealthConnectError(String(err), 'HRV_QUERY_FAILED');
  }
}

/**
 * Query step-count records from Health Connect.
 *
 * @param start  Query window start.
 * @param end    Query window end.
 * @returns      Array of step records.
 */
export async function querySteps(
  start: Date,
  end: Date,
): Promise<HCStepRecord[]> {
  if (Platform.OS !== 'android') return [];

  try {
    const { records } = await readRecords('Steps', {
      timeRangeFilter: timeRangeFilter(start, end),
    });

    return records.map((record: any) => ({
      startTime: record.startTime,
      endTime: record.endTime,
      count: record.count,
    }));
  } catch (err) {
    console.error('[VIVE/HealthConnect] querySteps error:', err);
    throw err instanceof HealthConnectError
      ? err
      : new HealthConnectError(String(err), 'STEPS_QUERY_FAILED');
  }
}

/**
 * Query active calories burned records from Health Connect.
 *
 * @param start  Query window start.
 * @param end    Query window end.
 * @returns      Array of calorie records (kcal).
 */
export async function queryActiveCalories(
  start: Date,
  end: Date,
): Promise<HCStepRecord[]> {
  if (Platform.OS !== 'android') return [];

  try {
    const { records } = await readRecords('ActiveCaloriesBurned', {
      timeRangeFilter: timeRangeFilter(start, end),
    });

    return records.map((record: any) => ({
      startTime: record.startTime,
      endTime: record.endTime,
      // Energy is returned as an object { inKilocalories: number }
      count: record.energy?.inKilocalories ?? 0,
    }));
  } catch (err) {
    console.error('[VIVE/HealthConnect] queryActiveCalories error:', err);
    throw err instanceof HealthConnectError
      ? err
      : new HealthConnectError(String(err), 'CALORIES_QUERY_FAILED');
  }
}
