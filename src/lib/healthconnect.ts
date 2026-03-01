/**
 * src/lib/healthconnect.ts
 * VIVE App â Health Connect wrapper (Android uniquement)
 *
 * Fournit une API typÃ©e et propre au-dessus de react-native-health-connect.
 * Toutes les fonctions publiques sont des no-ops (retournant vide/null) sur iOS
 * afin que les appelants n'aient pas besoin de gardes de plateforme partout.
 */

import { Platform } from 'react-native';
import {
  initialize,
  requestPermission,
  readRecords,
  getSdkStatus,
  SdkAvailabilityStatus,
  type Permission,
} from 'react-native-health-connect';

// ---------------------------------------------------------------------------
// Type explicite pour le filtre de plage temporelle (supprime l'usage de 'any')
// Correction [ModÃ©rÃ©][A] : type explicite TimeRangeFilter plutÃ´t que
// ReadRecordsOptions<any>['timeRangeFilter'] qui propage le 'any'.
// ---------------------------------------------------------------------------

export interface TimeRangeFilter {
  operator: 'between' | 'before' | 'after';
  startTime: string;
  endTime: string;
}

// ---------------------------------------------------------------------------
// Classe d'erreur
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
// Interfaces de types de retour publics
// ---------------------------------------------------------------------------

export interface HCSleepStage {
  startTime: string;
  endTime: string;
  /**
   * Constante de phase de sommeil Health Connect :
   * 0 = INCONNU, 1 = ÃVEILLÃ, 2 = ENDORMI, 3 = HORS_LIT,
   * 4 = LÃGER, 5 = PROFOND, 6 = REM
   */
  stage: number;
}

export interface HCSleepSession {
  startTime: string;
  endTime: string;
  /** DurÃ©e totale de la session en minutes. */
  durationMinutes: number;
  /** Intervalles de phases de sommeil individuels au sein de la session. */
  stages: HCSleepStage[];
}

export interface HCHeartRateSample {
  time: string;
  /** Battements par minute. */
  beatsPerMinute: number;
}

export interface HCHeartRateRecord {
  startTime: string;
  endTime: string;
  samples: HCHeartRateSample[];
}

export interface HCHRVRecord {
  time: string;
  /** RMSSD en millisecondes (racine carrÃ©e de la moyenne des diffÃ©rences successives au carrÃ©). */
  rmssd: number;
}

export interface HCStepRecord {
  startTime: string;
  endTime: string;
  count: number;
}

/**
 * Enregistrement de calories (actives ou totales) provenant de Health Connect.
 * Correction [Important][A] : type distinct pour les calories,
 * sÃ©parÃ© de HCStepRecord qui concerne les pas.
 */
export interface HCCalorieRecord {
  startTime: string;
  endTime: string;
  /** Ãnergie dÃ©pensÃ©e en kilocalories. */
  kilocalories: number;
}

// ---------------------------------------------------------------------------
// Permissions
// ---------------------------------------------------------------------------

/**
 * Ensemble complet des permissions Health Connect requises par VIVE.
 * Correction [Critique][A] : utilisation de 'HeartRateVariabilityRmssd'
 * qui est le nom exact du record type dans l'API react-native-health-connect,
 * harmonisÃ© avec useHealthConnect.ts.
 * Ajustez la liste pour correspondre aux dÃ©clarations dans AndroidManifest.xml.
 */
export const HEALTH_CONNECT_PERMISSIONS: Permission[] = [
  { accessType: 'read', recordType: 'HeartRate' },
  { accessType: 'read', recordType: 'HeartRateVariabilityRmssd' },
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
// Interfaces internes pour le mapping des records bruts
// ---------------------------------------------------------------------------

interface RawSleepStage {
  startTime: string;
  endTime: string;
  stage: number;
}

interface RawSleepRecord {
  startTime: string;
  endTime: string;
  stages?: RawSleepStage[];
}

interface RawHRSample {
  time: string;
  beatsPerMinute: number;
}

interface RawHRRecord {
  startTime: string;
  endTime: string;
  samples?: RawHRSample[];
}

interface RawHRVRecord {
  time: string;
  heartRateVariabilityMillis: number;
}

interface RawStepRecord {
  startTime: string;
  endTime: string;
  count: number;
}

interface RawCalorieRecord {
  startTime: string;
  endTime: string;
  energy?: {
    inKilocalories: number;
  };
}

// ---------------------------------------------------------------------------
// Helpers internes
// ---------------------------------------------------------------------------

/**
 * Construit un TimeRangeFilter standard pour une requÃªte sur une fenÃªtre de dates.
 * Correction [ModÃ©rÃ©][A] : type de retour explicite TimeRangeFilter,
 * suppression de ReadRecordsOptions<any>['timeRangeFilter'].
 */
function buildTimeRangeFilter(start: Date, end: Date): TimeRangeFilter {
  return {
    operator: 'between',
    startTime: start.toISOString(),
    endTime: end.toISOString(),
  };
}

/**
 * Mappe un enregistrement brut vers HCSleepSession.
 */
function mapSleepRecord(record: RawSleepRecord): HCSleepSession {
  const startMs = new Date(record.startTime).getTime();
  const endMs = new Date(record.endTime).getTime();
  const stages: HCSleepStage[] = (record.stages ?? []).map(
    (s: RawSleepStage): HCSleepStage => ({
      startTime: s.startTime,
      endTime: s.endTime,
      stage: s.stage,
    }),
  );
  return {
    startTime: record.startTime,
    endTime: record.endTime,
    durationMinutes: Math.round((endMs - startMs) / 60_000),
    stages,
  };
}

/**
 * Mappe un enregistrement brut vers HCHeartRateRecord.
 */
function mapHeartRateRecord(record: RawHRRecord): HCHeartRateRecord {
  return {
    startTime: record.startTime,
    endTime: record.endTime,
    samples: (record.samples ?? []).map(
      (s: RawHRSample): HCHeartRateSample => ({
        time: s.time,
        beatsPerMinute: s.beatsPerMinute,
      }),
    ),
  };
}

/**
 * Mappe un enregistrement brut vers HCHRVRecord.
 */
function mapHRVRecord(record: RawHRVRecord): HCHRVRecord {
  return {
    time: record.time,
    // Health Connect stocke la VFC sous forme de RMSSD en millisecondes.
    rmssd: record.heartRateVariabilityMillis,
  };
}

/**
 * Mappe un enregistrement brut vers HCStepRecord.
 */
function mapStepRecord(record: RawStepRecord): HCStepRecord {
  return {
    startTime: record.startTime,
    endTime: record.endTime,
    count: record.count,
  };
}

/**
 * Mappe un enregistrement brut vers HCCalorieRecord.
 */
function mapCalorieRecord(record: RawCalorieRecord): HCCalorieRecord {
  return {
    startTime: record.startTime,
    endTime: record.endTime,
    // L'Ã©nergie est retournÃ©e sous forme d'objet { inKilocalories: number }
    kilocalories: record.energy?.inKilocalories ?? 0,
  };
}

// ---------------------------------------------------------------------------
// API publique
// ---------------------------------------------------------------------------

/**
 * VÃ©rifie la disponibilitÃ© du SDK Health Connect et initialise le client.
 * Demande toutes les permissions listÃ©es dans HEALTH_CONNECT_PERMISSIONS.
 *
 * @returns `true`  lorsque le SDK est disponible et que les permissions sont
 *                  (au moins partiellement) accordÃ©es ; `false` sur iOS ou
 *                  lorsque le SDK est indisponible.
 * @throws  HealthConnectError si le SDK signale un statut d'erreur.
 */
export async function initHealthConnect(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;

  try {
    // VÃ©rifie la disponibilitÃ© du SDK (requiert Android 14+ ou l'APK Health Connect).
    const status = await getSdkStatus();

    if (status === SdkAvailabilityStatus.SDK_UNAVAILABLE) {
      throw new HealthConnectError(
        'Le SDK Health Connect est indisponible sur cet appareil.',
        'SDK_UNAVAILABLE',
      );
    }

    if (status === SdkAvailabilityStatus.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED) {
      throw new HealthConnectError(
        "Health Connect nÃ©cessite une mise Ã  jour du fournisseur. Veuillez mettre Ã  jour l'application Health Connect.",
        'PROVIDER_UPDATE_REQUIRED',
      );
    }

    // Initialise le SDK.
    const initialised = await initialize();
    if (!initialised) {
      throw new HealthConnectError(
        "Le SDK Health Connect n'a pas pu s'initialiser.",
        'INIT_FAILED',
      );
    }

    // Demande les permissions.
    const grantedPermissions = await requestPermission(HEALTH_CONNECT_PERMISSIONS);

    if (__DEV__) {
      console.log(
        `[VIVE/HealthConnect] InitialisÃ©. ${grantedPermissions.length} / ` +
          `${HEALTH_CONNECT_PERMISSIONS.length} permissions accordÃ©es.`,
      );
    }

    return grantedPermissions.length > 0;
  } catch (err) {
    if (err instanceof HealthConnectError) throw err;
    throw new HealthConnectError(
      `Ãchec de l'initialisation de Health Connect : ${String(err)}`,
      'INIT_ERROR',
    );
  }
}

/**
 * Interroge les sessions de sommeil depuis Health Connect.
 *
 * @param start  DÃ©but de la fenÃªtre de requÃªte.
 * @param end    Fin de la fenÃªtre de requÃªte.
 * @returns      Tableau de sessions de sommeil formatÃ©es.
 */
export async function querySleepSessions(
  start: Date,
  end: Date,
): Promise<HCSleepSession[]> {
  if (Platform.OS !== 'android') return [];

  try {
    const { records } = await readRecords('SleepSession', {
      timeRangeFilter: buildTimeRangeFilter(start, end),
    });

    return (records as unknown as RawSleepRecord[]).map(mapSleepRecord);
  } catch (err) {
    console.error('[VIVE/HealthConnect] Erreur querySleepSessions :', err);
    throw err instanceof HealthConnectError
      ? err
      : new HealthConnectError(String(err), 'SLEEP_QUERY_FAILED');
  }
}

/**
 * Interroge les enregistrements de frÃ©quence cardiaque depuis Health Connect.
 *
 * @param start  DÃ©but de la fenÃªtre de requÃªte.
 * @param end    Fin de la fenÃªtre de requÃªte.
 * @returns      Tableau d'enregistrements FC, chacun contenant un ou plusieurs Ã©chantillons.
 */
export async function queryHeartRate(
  start: Date,
  end: Date,
): Promise<HCHeartRateRecord[]> {
  if (Platform.OS !== 'android') return [];

  try {
    const { records } = await readRecords('HeartRate', {
      timeRangeFilter: buildTimeRangeFilter(start, end),
    });

    return (records as unknown as RawHRRecord[]).map(mapHeartRateRecord);
  } catch (err) {
    console.error('[VIVE/HealthConnect] Erreur queryHeartRate :', err);
    throw err instanceof HealthConnectError
      ? err
      : new HealthConnectError(String(err), 'HR_QUERY_FAILED');
  }
}

/**
 * Interroge les enregistrements de variabilitÃ© de la frÃ©quence cardiaque
 * (VFC / RMSSD) depuis Health Connect.
 *
 * Correction [Critique][A] : utilise 'HeartRateVariabilityRmssd'
 * (nom exact dans l'API react-native-health-connect), harmonisÃ© avec
 * useHealthConnect.ts.
 *
 * @param start  DÃ©but de la fenÃªtre de requÃªte.
 * @param end    Fin de la fenÃªtre de requÃªte.
 * @returns      Tableau d'enregistrements VFC.
 */
export async function queryHRV(
  start: Date,
  end: Date,
): Promise<HCHRVRecord[]> {
  if (Platform.OS !== 'android') return [];

  try {
    const { records } = await readRecords('HeartRateVariabilityRmssd', {
      timeRangeFilter: buildTimeRangeFilter(start, end),
    });

    return (records as unknown as RawHRVRecord[]).map(mapHRVRecord);
  } catch (err) {
    console.error('[VIVE/HealthConnect] Erreur queryHRV :', err);
    throw err instanceof HealthConnectError
      ? err
      : new HealthConnectError(String(err), 'HRV_QUERY_FAILED');
  }
}

/**
 * Interroge les enregistrements de nombre de pas depuis Health Connect.
 *
 * @param start  DÃ©but de la fenÃªtre de requÃªte.
 * @param end    Fin de la fenÃªtre de requÃªte.
 * @returns      Tableau d'enregistrements de pas.
 */
export async function querySteps(
  start: Date,
  end: Date,
): Promise<HCStepRecord[]> {
  if (Platform.OS !== 'android') return [];

  try {
    const { records } = await readRecords('Steps', {
      timeRangeFilter: buildTimeRangeFilter(start, end),
    });

    return (records as unknown as RawStepRecord[]).map(mapStepRecord);
  } catch (err) {
    console.error('[VIVE/HealthConnect] Erreur querySteps :', err);
    throw err instanceof HealthConnectError
      ? err
      : new HealthConnectError(String(err), 'STEPS_QUERY_FAILED');
  }
}

/**
 * Interroge les enregistrements de calories actives brÃ»lÃ©es depuis Health Connect.
 *
 * Correction [Important][A] : retourne dÃ©sormais HCCalorieRecord[]
 * (type sÃ©mantiquement correct pour des calories) plutÃ´t que HCStepRecord[].
 * Le champ 'kilocalories' remplace 'count' pour plus de clartÃ©.
 *
 * @param start  DÃ©but de la fenÃªtre de requÃªte.
 * @param end    Fin de la fenÃªtre de requÃªte.
 * @returns      Tableau d'enregistrements de calories (kcal).
 */
export async function queryActiveCalories(
  start: Date,
  end: Date,
): Promise<HCCalorieRecord[]> {
  if (Platform.OS !== 'android') return [];

  try {
    const { records } = await readRecords('ActiveCaloriesBurned', {
      timeRangeFilter: buildTimeRangeFilter(start, end),
    });

    return (records as unknown as RawCalorieRecord[]).map(mapCalorieRecord);
  } catch (err) {
    console.error('[VIVE/HealthConnect] Erreur queryActiveCalories :', err);
    throw err instanceof HealthConnectError
      ? err
      : new HealthConnectError(String(err), 'CALORIES_QUERY_FAILED');
  }
}
