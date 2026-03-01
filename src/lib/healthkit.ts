/**
 * src/lib/healthkit.ts
 * VIVE App â HealthKit wrapper (iOS only)
 *
 * Provides a clean, typed API over react-native-health.
 * All public functions are no-ops (returning empty/null) on Android so that
 * callers do not need platform guards everywhere.
 *
 * Ce fichier constitue la source de vÃ©ritÃ© unique pour la logique HealthKit.
 * Le hook useHealthKit.ts doit utiliser ces fonctions plutÃ´t que de dupliquer
 * la logique d'accÃ¨s aux donnÃ©es.
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
  /** DurÃ©e en minutes. */
  durationMinutes: number;
  /** 'INBED' | 'ASLEEP' | 'AWAKE' | 'CORE' | 'DEEP' | 'REM' */
  value: string;
}

export interface HeartRateSample {
  startDate: string;
  endDate: string;
  /** Battements par minute. */
  value: number;
}

export interface HRVSample {
  startDate: string;
  endDate: string;
  /** SDNN en millisecondes. */
  value: number;
}

export interface StepSample {
  startDate: string;
  endDate: string;
  /** Nombre de pas. */
  value: number;
}

/**
 * Interface sÃ©mantiquement correcte pour les donnÃ©es de calories.
 * Distincte de StepSample pour Ã©viter la confusion entre les types de donnÃ©es.
 */
export interface CalorieSample {
  startDate: string;
  endDate: string;
  /** Ãnergie dÃ©pensÃ©e en kilocalories (kcal). */
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

/**
 * Type reprÃ©sentant une erreur HealthKit â peut Ãªtre une chaÃ®ne, un objet,
 * ou null selon le callback natif react-native-health.
 */
type HealthKitCallbackError = string | object | null;

/**
 * Convertit une erreur de callback HealthKit en message lisible.
 */
function formatHealthKitError(err: HealthKitCallbackError): string {
  if (err === null) return 'Erreur inconnue HealthKit';
  if (typeof err === 'string') return err;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

/**
 * Safely run a HealthKit query; rejects with a HealthKitError on failure.
 * Le callback err est typÃ© comme 'string | object | null' car HealthKit
 * peut retourner des erreurs sous diffÃ©rentes formes selon le type de requÃªte.
 */
function runQuery<T>(
  queryFn: (
    options: HealthInputOptions,
    callback: (err: HealthKitCallbackError, results: T) => void,
  ) => void,
  options: HealthInputOptions,
): Promise<T> {
  return new Promise((resolve, reject) => {
    queryFn(options, (err, results) => {
      if (err) {
        reject(new HealthKitError(formatHealthKitError(err)));
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
 * Initialise HealthKit et demande les permissions requises.
 * RÃ©sout `true` lorsque les permissions sont accordÃ©es, `false` sur Android.
 * Rejette avec une HealthKitError si l'initialisation HealthKit Ã©choue.
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
            `Ãchec de l'initialisation HealthKit : ${error}`,
            'INIT_FAILED',
          ),
        );
      } else {
        if (__DEV__) {
          console.log('[VIVE/HealthKit] InitialisÃ© et permissions accordÃ©es.');
        }
        resolve(true);
      }
    });
  });
}

/**
 * Interroge les Ã©chantillons d'analyse du sommeil depuis HealthKit.
 *
 * @param start  DÃ©but de la fenÃªtre de requÃªte.
 * @param end    Fin de la fenÃªtre de requÃªte.
 * @returns      Tableau d'Ã©chantillons de sommeil formatÃ©s.
 */
export async function querySleepSamples(
  start: Date,
  end: Date,
): Promise<SleepSample[]> {
  if (Platform.OS !== 'ios') return [];

  try {
    const options = dateRangeOptions(start, end);
    const raw = await runQuery<HealthValue[]>(
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
    console.error('[VIVE/HealthKit] Erreur querySleepSamples :', err);
    throw err instanceof HealthKitError
      ? err
      : new HealthKitError(String(err), 'SLEEP_QUERY_FAILED');
  }
}

/**
 * Interroge les Ã©chantillons de frÃ©quence cardiaque depuis HealthKit.
 *
 * @param start  DÃ©but de la fenÃªtre de requÃªte.
 * @param end    Fin de la fenÃªtre de requÃªte.
 * @returns      Tableau d'Ã©chantillons FC (bpm).
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
    console.error('[VIVE/HealthKit] Erreur queryHeartRate :', err);
    throw err instanceof HealthKitError
      ? err
      : new HealthKitError(String(err), 'HR_QUERY_FAILED');
  }
}

/**
 * Interroge les Ã©chantillons de variabilitÃ© de la frÃ©quence cardiaque (VFC / SDNN)
 * depuis HealthKit.
 *
 * @param start  DÃ©but de la fenÃªtre de requÃªte.
 * @param end    Fin de la fenÃªtre de requÃªte.
 * @returns      Tableau d'Ã©chantillons VFC (ms SDNN).
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
      // HealthKit retourne la VFC en secondes ; conversion en millisecondes.
      value: sample.value * 1000,
    }));
  } catch (err) {
    console.error('[VIVE/HealthKit] Erreur queryHRV :', err);
    throw err instanceof HealthKitError
      ? err
      : new HealthKitError(String(err), 'HRV_QUERY_FAILED');
  }
}

/**
 * Interroge les Ã©chantillons de nombre de pas depuis HealthKit.
 *
 * @param start  DÃ©but de la fenÃªtre de requÃªte.
 * @param end    Fin de la fenÃªtre de requÃªte.
 * @returns      Tableau d'Ã©chantillons de pas.
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
    console.error('[VIVE/HealthKit] Erreur querySteps :', err);
    throw err instanceof HealthKitError
      ? err
      : new HealthKitError(String(err), 'STEPS_QUERY_FAILED');
  }
}

/**
 * Interroge les Ã©chantillons d'Ã©nergie active dÃ©pensÃ©e depuis HealthKit.
 * Retourne des CalorieSample (et non StepSample) pour reflÃ©ter correctement
 * la sÃ©mantique des donnÃ©es de calories.
 *
 * @param start  DÃ©but de la fenÃªtre de requÃªte.
 * @param end    Fin de la fenÃªtre de requÃªte.
 * @returns      Tableau d'Ã©chantillons de calories (kcal).
 */
export async function queryActiveCalories(
  start: Date,
  end: Date,
): Promise<CalorieSample[]> {
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
    console.error('[VIVE/HealthKit] Erreur queryActiveCalories :', err);
    throw err instanceof HealthKitError
      ? err
      : new HealthKitError(String(err), 'CALORIES_QUERY_FAILED');
  }
}
