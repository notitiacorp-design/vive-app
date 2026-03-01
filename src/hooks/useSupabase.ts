/**
 * @file useSupabase.ts
 * @description React Query wrapper hooks for all Supabase operations in the VIVE app.
 * Covers profile, sleep scores, missions, check-ins, boxes, quests, and collectibles.
 *
 * NOTE DE SÃCURITÃ (correction #4):
 * Les donnÃ©es de santÃ© (SleepScore, HeartRate, HRV) ne doivent PAS Ãªtre persistÃ©es
 * dans un cache React Query persistÃ© (ex: AsyncStorage hydration). Assurez-vous que
 * le QueryClient utilisÃ© dans l'app n'a pas de persistor configurÃ© pour ces queries,
 * ou que le persistor exclut les clÃ©s 'supabase/sleepScores'.
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  UseQueryResult,
  UseMutationResult,
  UseQueryOptions,
  useInfiniteQuery,
  UseInfiniteQueryResult,
  InfiniteData,
} from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

// ---------------------------------------------------------------------------
// Custom Error Class (correction #2)
// ---------------------------------------------------------------------------

export type SupabaseErrorCode =
  | 'UNAUTHENTICATED'
  | 'FETCH_FAILED'
  | 'NOT_FOUND'
  | 'UPDATE_FAILED'
  | 'INSERT_FAILED'
  | 'FUNCTION_FAILED'
  | 'VALIDATION_ERROR';

export class SupabaseError extends Error {
  public readonly code: SupabaseErrorCode;

  constructor(code: SupabaseErrorCode, message: string) {
    super(message);
    this.name = 'SupabaseError';
    this.code = code;
    // NÃ©cessaire pour que instanceof fonctionne correctement avec TypeScript
    Object.setPrototypeOf(this, SupabaseError.prototype);
  }
}

// ---------------------------------------------------------------------------
// Database Types
// ---------------------------------------------------------------------------

export interface Profile {
  id: string;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  level: number;
  xp: number;
  streak_days: number;
  tier: 'free' | 'premium' | 'elite';
  onboarding_complete: boolean;
  created_at: string;
  updated_at: string;
}

export type ProfileUpdate = Partial<
  Pick<Profile, 'display_name' | 'avatar_url' | 'bio' | 'onboarding_complete'>
>;

export interface SleepScore {
  id: string;
  user_id: string;
  date: string;
  score: number; // 0â100
  duration_minutes: number;
  efficiency: number; // 0â1
  deep_sleep_minutes: number;
  rem_sleep_minutes: number;
  awakenings: number;
  hrv_avg: number | null;
  hr_avg: number | null;
  created_at: string;
}

export type MissionStatus = 'active' | 'completed' | 'failed' | 'skipped';

export interface Mission {
  id: string;
  user_id: string;
  title: string;
  description: string;
  category: 'sleep' | 'movement' | 'mindfulness' | 'nutrition' | 'recovery';
  xp_reward: number;
  status: MissionStatus;
  due_date: string;
  completed_at: string | null;
  created_at: string;
}

export interface Checkin {
  id: string;
  user_id: string;
  date: string;
  mood: 1 | 2 | 3 | 4 | 5;
  energy: 1 | 2 | 3 | 4 | 5;
  stress: 1 | 2 | 3 | 4 | 5;
  notes: string | null;
  created_at: string;
}

export type CheckinInput = Pick<Checkin, 'mood' | 'energy' | 'stress' | 'notes'> & {
  date: string;
};

export interface Box {
  id: string;
  user_id: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  opened: boolean;
  opened_at: string | null;
  rewarded_collectible_id: string | null;
  rewarded_xp: number;
  created_at: string;
}

export type QuestStatus = 'active' | 'completed' | 'expired';

export interface Quest {
  id: string;
  user_id: string;
  title: string;
  description: string;
  progress: number; // 0â100
  target: number;
  current: number;
  xp_reward: number;
  box_reward: Box['tier'] | null;
  status: QuestStatus;
  expires_at: string;
  completed_at: string | null;
  created_at: string;
}

export interface Collectible {
  id: string;
  user_id: string;
  collectible_type: string;
  name: string;
  description: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  image_url: string;
  obtained_at: string;
  source: 'box' | 'quest' | 'achievement' | 'event';
}

// ---------------------------------------------------------------------------
// Pagination Types (correction #6)
// ---------------------------------------------------------------------------

export interface CollectiblesPage {
  items: Collectible[];
  nextCursor: number | null;
}

export const COLLECTIBLES_PAGE_SIZE = 20;

// ---------------------------------------------------------------------------
// Query Key Factory
// ---------------------------------------------------------------------------

export const queryKeys = {
  profile: ['supabase', 'profile'] as const,
  sleepScores: (days: number) => ['supabase', 'sleepScores', days] as const,
  missions: ['supabase', 'missions'] as const,
  checkins: ['supabase', 'checkins'] as const,
  boxes: ['supabase', 'boxes'] as const,
  quests: ['supabase', 'quests'] as const,
  collectibles: ['supabase', 'collectibles'] as const,
  collectiblesInfinite: ['supabase', 'collectibles', 'infinite'] as const,
  currentUser: ['supabase', 'currentUser'] as const,
} as const;

// ---------------------------------------------------------------------------
// Centralized current user hook (correction #5)
// ---------------------------------------------------------------------------

/**
 * Hook centralisÃ© pour rÃ©cupÃ©rer l'utilisateur courant avec cache React Query.
 * Ãvite de multiples appels rÃ©seau Ã  supabase.auth.getUser() par query.
 */
export function useCurrentUser(): UseQueryResult<string, SupabaseError> {
  return useQuery<string, SupabaseError>({
    queryKey: queryKeys.currentUser,
    queryFn: async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) {
        throw new SupabaseError(
          'UNAUTHENTICATED',
          "L'utilisateur n'est pas authentifiÃ©",
        );
      }
      return data.user.id;
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}

// ---------------------------------------------------------------------------
// Auth Helper (correction #2 + #5)
// ---------------------------------------------------------------------------

/**
 * RÃ©cupÃ¨re l'ID utilisateur courant depuis Supabase Auth.
 * Lance une SupabaseError avec le code UNAUTHENTICATED si non connectÃ©.
 */
async function getCurrentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    throw new SupabaseError(
      'UNAUTHENTICATED',
      "L'utilisateur n'est pas authentifiÃ©",
    );
  }
  return data.user.id;
}

// ---------------------------------------------------------------------------
// Validation Helpers (correction #3)
// ---------------------------------------------------------------------------

const DISPLAY_NAME_MAX_LENGTH = 50;
const DISPLAY_NAME_MIN_LENGTH = 1;
// Lettres, chiffres, espaces, tirets, underscores, apostrophes
const DISPLAY_NAME_REGEX = /^[\p{L}\p{N} \-_'.]+$/u;
const BIO_MAX_LENGTH = 300;

function validateProfileUpdate(updates: ProfileUpdate): void {
  if (updates.display_name !== undefined) {
    const name = updates.display_name.trim();
    if (name.length < DISPLAY_NAME_MIN_LENGTH) {
      throw new SupabaseError(
        'VALIDATION_ERROR',
        'Le nom d\'affichage ne peut pas Ãªtre vide.',
      );
    }
    if (name.length > DISPLAY_NAME_MAX_LENGTH) {
      throw new SupabaseError(
        'VALIDATION_ERROR',
        `Le nom d'affichage ne doit pas dÃ©passer ${DISPLAY_NAME_MAX_LENGTH} caractÃ¨res.`,
      );
    }
    if (!DISPLAY_NAME_REGEX.test(name)) {
      throw new SupabaseError(
        'VALIDATION_ERROR',
        'Le nom d\'affichage contient des caractÃ¨res non autorisÃ©s.',
      );
    }
  }

  if (updates.bio !== undefined && updates.bio !== null) {
    if (updates.bio.length > BIO_MAX_LENGTH) {
      throw new SupabaseError(
        'VALIDATION_ERROR',
        `La biographie ne doit pas dÃ©passer ${BIO_MAX_LENGTH} caractÃ¨res.`,
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Profile Hooks
// ---------------------------------------------------------------------------

/**
 * Fetches the current user's profile from Supabase.
 * Returns a React Query result with the profile data.
 */
export function useProfile(
  queryOptions?: Omit<UseQueryOptions<Profile, SupabaseError>, 'queryKey' | 'queryFn'>,
): UseQueryResult<Profile, SupabaseError> {
  return useQuery<Profile, SupabaseError>({
    queryKey: queryKeys.profile,
    queryFn: async () => {
      const userId = await getCurrentUserId();

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        throw new SupabaseError(
          'FETCH_FAILED',
          `Impossible de rÃ©cupÃ©rer le profil : ${error.message}`,
        );
      }
      if (!data) {
        throw new SupabaseError('NOT_FOUND', 'Profil introuvable.');
      }

      return data as Profile;
    },
    staleTime: 2 * 60 * 1000,
    ...queryOptions,
  });
}

/**
 * Mutation hook to update the current user's profile.
 * Validates inputs before sending to Supabase.
 * Automatically invalidates the profile query on success.
 */
export function useUpdateProfile(): UseMutationResult<Profile, SupabaseError, ProfileUpdate> {
  const queryClient = useQueryClient();

  return useMutation<Profile, SupabaseError, ProfileUpdate>({
    mutationFn: async (updates: ProfileUpdate) => {
      // Validation cÃ´tÃ© client avant l'appel Supabase (correction #3)
      validateProfileUpdate(updates);

      // Trim du display_name si prÃ©sent
      const sanitizedUpdates: ProfileUpdate = {
        ...updates,
        ...(updates.display_name !== undefined
          ? { display_name: updates.display_name.trim() }
          : {}),
      };

      const userId = await getCurrentUserId();

      const { data, error } = await supabase
        .from('profiles')
        .update({ ...sanitizedUpdates, updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .select('*')
        .single();

      if (error) {
        throw new SupabaseError(
          'UPDATE_FAILED',
          `Impossible de mettre Ã  jour le profil : ${error.message}`,
        );
      }
      if (!data) {
        throw new SupabaseError(
          'NOT_FOUND',
          'Aucune donnÃ©e retournÃ©e aprÃ¨s la mise Ã  jour du profil.',
        );
      }

      return data as Profile;
    },
    onSuccess: (updatedProfile) => {
      queryClient.setQueryData<Profile>(queryKeys.profile, updatedProfile);
    },
    onError: (error) => {
      console.error(
        `[VIVE Supabase] Ãchec de la mise Ã  jour du profil [${error.code}]:`,
        error.message,
      );
    },
  });
}

// ---------------------------------------------------------------------------
// Sleep Score Hooks
// ---------------------------------------------------------------------------

/**
 * Fetches sleep scores for the past N days.
 * NOTE: Les donnÃ©es de santÃ© ne doivent PAS Ãªtre persistÃ©es dans le cache.
 *
 * @param days - Number of days to look back (default: 7)
 */
export function useSleepScores(
  days: number = 7,
  queryOptions?: Omit<UseQueryOptions<SleepScore[], SupabaseError>, 'queryKey' | 'queryFn'>,
): UseQueryResult<SleepScore[], SupabaseError> {
  return useQuery<SleepScore[], SupabaseError>({
    queryKey: queryKeys.sleepScores(days),
    queryFn: async () => {
      const userId = await getCurrentUserId();

      const since = new Date();
      since.setDate(since.getDate() - days);

      const { data, error } = await supabase
        .from('sleep_scores')
        .select('*')
        .eq('user_id', userId)
        .gte('date', since.toISOString().split('T')[0])
        .order('date', { ascending: false })
        .limit(days);

      if (error) {
        throw new SupabaseError(
          'FETCH_FAILED',
          `Impossible de rÃ©cupÃ©rer les scores de sommeil : ${error.message}`,
        );
      }

      return (data ?? []) as SleepScore[];
    },
    staleTime: 5 * 60 * 1000,
    // Marquer explicitement pour ne pas persister (correction #4)
    // Le persistor doit exclure la clÃ© 'supabase/sleepScores' cÃ´tÃ© configuration
    ...queryOptions,
  });
}

// ---------------------------------------------------------------------------
// Mission Hooks
// ---------------------------------------------------------------------------

/**
 * Fetches active missions for the current user.
 */
export function useMissions(
  queryOptions?: Omit<UseQueryOptions<Mission[], SupabaseError>, 'queryKey' | 'queryFn'>,
): UseQueryResult<Mission[], SupabaseError> {
  return useQuery<Mission[], SupabaseError>({
    queryKey: queryKeys.missions,
    queryFn: async () => {
      const userId = await getCurrentUserId();

      const { data, error } = await supabase
        .from('missions')
        .select('*')
        .eq('user_id', userId)
        .in('status', ['active'])
        .order('due_date', { ascending: true });

      if (error) {
        throw new SupabaseError(
          'FETCH_FAILED',
          `Impossible de rÃ©cupÃ©rer les missions : ${error.message}`,
        );
      }

      return (data ?? []) as Mission[];
    },
    staleTime: 2 * 60 * 1000,
    ...queryOptions,
  });
}

export interface UpdateMissionStatusInput {
  missionId: string;
  status: MissionStatus;
}

/**
 * Mutation hook to update a mission's status.
 * Automatically invalidates missions and profile (for XP) on success.
 */
export function useUpdateMissionStatus(): UseMutationResult<
  Mission,
  SupabaseError,
  UpdateMissionStatusInput
> {
  const queryClient = useQueryClient();

  return useMutation<Mission, SupabaseError, UpdateMissionStatusInput>({
    mutationFn: async ({ missionId, status }) => {
      const updates: Partial<Mission> = {
        status,
        completed_at:
          status === 'completed' ? new Date().toISOString() : null,
      };

      const { data, error } = await supabase
        .from('missions')
        .update(updates)
        .eq('id', missionId)
        .select('*')
        .single();

      if (error) {
        throw new SupabaseError(
          'UPDATE_FAILED',
          `Impossible de mettre Ã  jour la mission : ${error.message}`,
        );
      }
      if (!data) {
        throw new SupabaseError(
          'NOT_FOUND',
          'Aucune donnÃ©e retournÃ©e aprÃ¨s la mise Ã  jour de la mission.',
        );
      }

      return data as Mission;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.missions });
      // RafraÃ®chissement du profil car les missions complÃ©tÃ©es accordent de l'XP
      queryClient.invalidateQueries({ queryKey: queryKeys.profile });
    },
  });
}

// ---------------------------------------------------------------------------
// Check-in Hooks
// ---------------------------------------------------------------------------

/**
 * Mutation hook to submit a daily check-in.
 * Invalidates check-in and profile queries on success.
 */
export function useCheckin(): UseMutationResult<Checkin, SupabaseError, CheckinInput> {
  const queryClient = useQueryClient();

  return useMutation<Checkin, SupabaseError, CheckinInput>({
    mutationFn: async (input: CheckinInput) => {
      const userId = await getCurrentUserId();

      const { data, error } = await supabase
        .from('checkins')
        .upsert(
          {
            user_id: userId,
            date: input.date,
            mood: input.mood,
            energy: input.energy,
            stress: input.stress,
            notes: input.notes ?? null,
          },
          { onConflict: 'user_id,date' },
        )
        .select('*')
        .single();

      if (error) {
        throw new SupabaseError(
          'INSERT_FAILED',
          `Impossible de soumettre le check-in : ${error.message}`,
        );
      }
      if (!data) {
        throw new SupabaseError(
          'NOT_FOUND',
          'Aucune donnÃ©e retournÃ©e aprÃ¨s le check-in.',
        );
      }

      return data as Checkin;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.checkins });
      queryClient.invalidateQueries({ queryKey: queryKeys.profile });
      queryClient.invalidateQueries({ queryKey: queryKeys.missions });
    },
  });
}

// ---------------------------------------------------------------------------
// Box Hooks
// ---------------------------------------------------------------------------

/**
 * Fetches the user's box history, ordered by most recent first.
 */
export function useBoxes(
  queryOptions?: Omit<UseQueryOptions<Box[], SupabaseError>, 'queryKey' | 'queryFn'>,
): UseQueryResult<Box[], SupabaseError> {
  return useQuery<Box[], SupabaseError>({
    queryKey: queryKeys.boxes,
    queryFn: async () => {
      const userId = await getCurrentUserId();

      const { data, error } = await supabase
        .from('boxes')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        throw new SupabaseError(
          'FETCH_FAILED',
          `Impossible de rÃ©cupÃ©rer les boÃ®tes : ${error.message}`,
        );
      }

      return (data ?? []) as Box[];
    },
    staleTime: 2 * 60 * 1000,
    ...queryOptions,
  });
}

export interface OpenBoxInput {
  boxId: string;
}

export interface OpenBoxResult {
  box: Box;
  collectible: Collectible | null;
  xp: number;
}

/**
 * Mutation hook to open a box.
 * Calls a Supabase edge function for server-side reward logic.
 */
export function useOpenBox(): UseMutationResult<OpenBoxResult, SupabaseError, OpenBoxInput> {
  const queryClient = useQueryClient();

  return useMutation<OpenBoxResult, SupabaseError, OpenBoxInput>({
    mutationFn: async ({ boxId }) => {
      const { data, error } = await supabase.functions.invoke<OpenBoxResult>(
        'open-box',
        { body: { box_id: boxId } },
      );

      if (error) {
        throw new SupabaseError(
          'FUNCTION_FAILED',
          `Impossible d'ouvrir la boÃ®te : ${error.message}`,
        );
      }
      if (!data) {
        throw new SupabaseError(
          'NOT_FOUND',
          'Aucune donnÃ©e retournÃ©e par la fonction open-box.',
        );
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.boxes });
      queryClient.invalidateQueries({ queryKey: queryKeys.collectibles });
      queryClient.invalidateQueries({ queryKey: queryKeys.collectiblesInfinite });
      queryClient.invalidateQueries({ queryKey: queryKeys.profile });
    },
  });
}

// ---------------------------------------------------------------------------
// Quest Hooks
// ---------------------------------------------------------------------------

/**
 * Fetches active quests with their current progress.
 */
export function useQuests(
  queryOptions?: Omit<UseQueryOptions<Quest[], SupabaseError>, 'queryKey' | 'queryFn'>,
): UseQueryResult<Quest[], SupabaseError> {
  return useQuery<Quest[], SupabaseError>({
    queryKey: queryKeys.quests,
    queryFn: async () => {
      const userId = await getCurrentUserId();

      const { data, error } = await supabase
        .from('quests')
        .select('*')
        .eq('user_id', userId)
        .in('status', ['active'])
        .gt('expires_at', new Date().toISOString())
        .order('expires_at', { ascending: true });

      if (error) {
        throw new SupabaseError(
          'FETCH_FAILED',
          `Impossible de rÃ©cupÃ©rer les quÃªtes : ${error.message}`,
        );
      }

      return (data ?? []) as Quest[];
    },
    staleTime: 5 * 60 * 1000,
    ...queryOptions,
  });
}

// ---------------------------------------------------------------------------
// Collectible Hooks (correction #6 : pagination via useInfiniteQuery)
// ---------------------------------------------------------------------------

/**
 * Fetches collectibles owned by the current user with infinite scroll pagination.
 * Remplace useCollectibles() qui chargeait TOUT sans limite.
 *
 * @param pageSize - Nombre d'items par page (dÃ©faut: COLLECTIBLES_PAGE_SIZE)
 */
export function useCollectibles(
  pageSize: number = COLLECTIBLES_PAGE_SIZE,
): UseInfiniteQueryResult<InfiniteData<CollectiblesPage>, SupabaseError> {
  return useInfiniteQuery<CollectiblesPage, SupabaseError, InfiniteData<CollectiblesPage>, readonly string[], number>({
    queryKey: queryKeys.collectiblesInfinite,
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const offset = pageParam;
      const userId = await getCurrentUserId();

      const { data, error } = await supabase
        .from('collectibles')
        .select('*')
        .eq('user_id', userId)
        .order('obtained_at', { ascending: false })
        .range(offset, offset + pageSize - 1);

      if (error) {
        throw new SupabaseError(
          'FETCH_FAILED',
          `Impossible de rÃ©cupÃ©rer les collectibles : ${error.message}`,
        );
      }

      const items = (data ?? []) as Collectible[];
      const nextCursor = items.length === pageSize ? offset + pageSize : null;

      return { items, nextCursor };
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: 10 * 60 * 1000,
  });
}

// ---------------------------------------------------------------------------
// Convenience Re-exports
// ---------------------------------------------------------------------------

export {
  useProfile,
  useUpdateProfile,
  useSleepScores,
  useMissions,
  useUpdateMissionStatus,
  useCheckin,
  useBoxes,
  useOpenBox,
  useQuests,
  useCollectibles,
  useCurrentUser,
};
