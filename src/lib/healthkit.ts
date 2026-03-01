/**
 * src/lib/healthkit.ts
 * VIVE App â Enveloppe HealthKit (iOS uniquement)
 *
 * Fournit une API typÃ©e et propre au-dessus de react-native-health.
 * Toutes les fonctions publiques sont des no-ops (retournant vide/null) sur Android
 * afin que les appelants n'aient pas besoin de gardes de plateforme partout.
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
// Classe d'erreur
// ---------------------------------------------------------------------------

/**
 * Erreur spÃ©cifique Ã  HealthKit, contenant un code d'erreur identifiable.
 */
export class HealthKitError extends Error {
  public readonly code: string;

  constructor(message: string, code = 'HEALTHKIT_ERROR') {
    super(message);
    this.name = 'HealthKitError';
    this.code = code;
    // Maintient la chaÃ®ne de prototype correcte en ES5 transpilÃ©.
    Object.setPrototypeOf(this, HealthKitError.prototype);
  }
}

// ---------------------------------------------------------------------------
// Permissions
// ---------------------------------------------------------------------------

/**
 * DÃ©claration des permissions HealthKit requises par l'application VIVE.
 */
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
// Interfaces de types de retour
// ---------------------------------------------------------------------------

/**
 * ReprÃ©sente un Ã©chantillon d'analyse du sommeil provenant de HealthKit.
 */
export interface SleepSample {
  /** Identifiant unique dÃ©rivÃ© de la date de dÃ©but et de la valeur. */
  id: string;
  /** Date de dÃ©but de l'Ã©chantillon au format ISO 8601. */
  startDate: string;
  /** Date de fin de l'Ã©chantillon au format ISO 8601. */
  endDate: string;
  /** DurÃ©e en minutes. */
  durationMinutes: number;
  /** Phase de sommeil : 'INBED' | 'ASLEEP' | 'AWAKE' | 'CORE' | 'DEEP' | 'REM' */
  value: string;
}

/**
 * ReprÃ©sente un Ã©chantillon de frÃ©quence cardiaque provenant de HealthKit.
 */
export interface HeartRateSample {
  /** Date de dÃ©but de l'Ã©chantillon au format ISO 8601. */
  startDate: string;
  /** Date de fin de l'Ã©chantillon au format ISO 8601. */
  endDate: string;
  /** Battements par minute (bpm). */
  value: number;
}

/**
 * ReprÃ©sente un Ã©chantillon de variabilitÃ© de la frÃ©quence cardiaque (VFC)
 * provenant de HealthKit.
 */
export interface HRVSample {
  /** Date de dÃ©but de l'Ã©chantillon au format ISO 8601. */
  startDate: string;
  /** Date de fin de l'Ã©chantillon au format ISO 8601. */
  endDate: string;
  /** SDNN en millisecondes. */
  value: number;
}

/**
 * ReprÃ©sente un Ã©chantillon de nombre de pas provenant de HealthKit.
 */
export interface StepSample {
  /** Date de dÃ©but de l'Ã©chantillon au format ISO 8601. */
  startDate: string;
  /** Date de fin de l'Ã©chantillon au format ISO 8601. */
  endDate: string;
  /** Nombre de pas enregistrÃ©s sur la pÃ©riode. */
  value: number;
}

/**
 * ReprÃ©sente un Ã©chantillon de calories dÃ©pensÃ©es provenant de HealthKit.
 * Interface sÃ©mantiquement distincte de StepSample pour Ã©viter toute confusion
 * entre les types de donnÃ©es (calories â  pas).
 */
export interface CalorieSample {
  /** Date de dÃ©but de l'Ã©chantillon au format ISO 8601. */
  startDate: string;
  /** Date de fin de l'Ã©chantillon au format ISO 8601. */
  endDate: string;
  /** Ãnergie dÃ©pensÃ©e en kilocalories (kcal). */
  value: number;
}

// ---------------------------------------------------------------------------
// Helpers internes
// ---------------------------------------------------------------------------

/**
 * Construit les options de plage de dates communes aux requÃªtes HealthKit.
 *
 * @param start     DÃ©but de la fenÃªtre de requÃªte.
 * @param end       Fin de la fenÃªtre de requÃªte.
 * @param limit     Nombre maximum de rÃ©sultats retournÃ©s (dÃ©faut : 1000).
 * @param ascending Ordre chronologique croissant si vrai (dÃ©faut : true).
 * @returns         Options formatÃ©es pour react-native-health.
 */
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
 * Type reprÃ©sentant une erreur de callback HealthKit.
 * Peut Ãªtre une chaÃ®ne de caractÃ¨res, un objet structurÃ© ou null
 * selon le type de requÃªte et la version de react-native-health.
 */
type HealthKitCallbackError = string | object | null;

/**
 * Convertit une erreur de callback HealthKit en message lisible par l'humain.
 * GÃ¨re les cas oÃ¹ l'erreur est null, une chaÃ®ne ou un objet structurÃ©.
 *
 * @param err L'erreur brute retournÃ©e par le callback HealthKit.
 * @returns   Une chaÃ®ne de caractÃ¨res dÃ©crivant l'erreur.
 */
function formatHealthKitError(err: HealthKitCallbackError): string {
  if (err === null) {
    return 'Erreur inconnue HealthKit';
  }
  if (typeof err === 'string') {
    return err;
  }
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

/**
 * ExÃ©cute une requÃªte HealthKit de faÃ§on sÃ©curisÃ©e via une Promise.
 * Rejette avec une HealthKitError en cas d'Ã©chec.
 *
 * Le paramÃ¨tre err du callback est typÃ© comme 'HealthKitCallbackError'
 * (string | object | null) car HealthKit peut retourner des erreurs sous
 * diffÃ©rentes formes selon le type de requÃªte native.
 *
 * @param queryFn Fonction de requÃªte HealthKit acceptant options et callback.
 * @param options Options de la requÃªte (plage de dates, limites, etc.).
 * @returns       Promesse rÃ©solue avec les rÃ©sultats typÃ©s T.
 */
function runQuery<T>(
  queryFn: (
    options: HealthInputOptions,
    callback: (err: HealthKitCallbackError, results: T) => void,
  ) => void,
  options: HealthInputOptions,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
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
// API publique
// ---------------------------------------------------------------------------

/**
 * Initialise HealthKit et demande les permissions requises.
 *
 * RÃ©sout `true` lorsque les permissions sont accordÃ©es sur iOS.
 * RÃ©sout `false` immÃ©diatement sur Android sans lever d'erreur.
 * Rejette avec une HealthKitError si l'initialisation HealthKit Ã©choue.
 *
 * @returns Promesse rÃ©solue avec un boolÃ©en indiquant le succÃ¨s.
 */
export function initHealthKit(): Promise<boolean> {
  if (Platform.OS !== 'ios') {
    return Promise.resolve(false);
  }

  return new Promise<boolean>((resolve, reject) => {
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
 * @param start DÃ©but de la fenÃªtre de requÃªte.
 * @param end   Fin de la fenÃªtre de requÃªte.
 * @returns     Tableau d'Ã©chantillons de sommeil formatÃ©s, ou tableau vide sur Android.
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
 * @param start DÃ©but de la fenÃªtre de requÃªte.
 * @param end   Fin de la fenÃªtre de requÃªte.
 * @returns     Tableau d'Ã©chantillons FC (bpm), ou tableau vide sur Android.
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
 * Interroge les Ã©chantillons de variabilitÃ© de la frÃ©quence cardiaque
 * (VFC / SDNN) depuis HealthKit.
 *
 * @param start DÃ©but de la fenÃªtre de requÃªte.
 * @param end   Fin de la fenÃªtre de requÃªte.
 * @returns     Tableau d'Ã©chantillons VFC (ms SDNN), ou tableau vide sur Android.
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
 * @param start DÃ©but de la fenÃªtre de requÃªte.
 * @param end   Fin de la fenÃªtre de requÃªte.
 * @returns     Tableau d'Ã©chantillons de pas, ou tableau vide sur Android.
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
 *
 * Retourne des {@link CalorieSample} (et non {@link StepSample}) afin de
 * reflÃ©ter correctement la sÃ©mantique des donnÃ©es de calories et d'Ã©viter
 * toute ambiguÃ¯tÃ© de type entre pas et kilocalories.
 *
 * @param start DÃ©but de la fenÃªtre de requÃªte.
 * @param end   Fin de la fenÃªtre de requÃªte.
 * @returns     Tableau d'Ã©chantillons de calories (kcal), ou tableau vide sur Android.
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
