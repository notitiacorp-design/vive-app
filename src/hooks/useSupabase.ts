/**
 * @file useSupabase.ts
 * @description React Query wrapper hooks for all Supabase operations in the VIVE app.
 * Covers profile, sleep scores, missions, check-ins, boxes, quests, and collectibles.
 */

import { useCallback } from 'react';
import {
  useQuery,
  useMutation,
  useQueryClient,
  UseQueryResult,
  UseMutationResult,
  UseQueryOptions,
} from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

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
  score: number; // 0–100
  duration_minutes: number;
  efficiency: number; // 0–1
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
  progress: number; // 0–100
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
} as const;

// ---------------------------------------------------------------------------
// Auth Helper
// ---------------------------------------------------------------------------

async function getCurrentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    throw new Error('User not authenticated');
  }
  return data.user.id;
}

// ---------------------------------------------------------------------------
// Profile Hooks
// ---------------------------------------------------------------------------

/**
 * Fetches the current user's profile from Supabase.
 * Returns a React Query result with the profile data.
 */
export function useProfile(
  queryOptions?: Partial<UseQueryOptions<Profile, Error>>,
): UseQueryResult<Profile, Error> {
  return useQuery<Profile, Error>({
    queryKey: queryKeys.profile,
    queryFn: async () => {
      const userId = await getCurrentUserId();

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) throw new Error(`Failed to fetch profile: ${error.message}`);
      if (!data) throw new Error('Profile not found');

      return data as Profile;
    },
    staleTime: 2 * 60 * 1000,
    ...queryOptions,
  });
}

/**
 * Mutation hook to update the current user's profile.
 * Automatically invalidates the profile query on success.
 */
export function useUpdateProfile(): UseMutationResult<Profile, Error, ProfileUpdate> {
  const queryClient = useQueryClient();

  return useMutation<Profile, Error, ProfileUpdate>({
    mutationFn: async (updates: ProfileUpdate) => {
      const userId = await getCurrentUserId();

      const { data, error } = await supabase
        .from('profiles')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .select('*')
        .single();

      if (error) throw new Error(`Failed to update profile: ${error.message}`);
      if (!data) throw new Error('No data returned from profile update');

      return data as Profile;
    },
    onSuccess: (updatedProfile) => {
      queryClient.setQueryData<Profile>(queryKeys.profile, updatedProfile);
    },
    onError: (error) => {
      console.error('[VIVE Supabase] Profile update failed:', error.message);
    },
  });
}

// ---------------------------------------------------------------------------
// Sleep Score Hooks
// ---------------------------------------------------------------------------

/**
 * Fetches sleep scores for the past N days.
 *
 * @param days - Number of days to look back (default: 7)
 */
export function useSleepScores(
  days: number = 7,
  queryOptions?: Partial<UseQueryOptions<SleepScore[], Error>>,
): UseQueryResult<SleepScore[], Error> {
  return useQuery<SleepScore[], Error>({
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

      if (error) throw new Error(`Failed to fetch sleep scores: ${error.message}`);

      return (data ?? []) as SleepScore[];
    },
    staleTime: 5 * 60 * 1000,
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
  queryOptions?: Partial<UseQueryOptions<Mission[], Error>>,
): UseQueryResult<Mission[], Error> {
  return useQuery<Mission[], Error>({
    queryKey: queryKeys.missions,
    queryFn: async () => {
      const userId = await getCurrentUserId();

      const { data, error } = await supabase
        .from('missions')
        .select('*')
        .eq('user_id', userId)
        .in('status', ['active'])
        .order('due_date', { ascending: true });

      if (error) throw new Error(`Failed to fetch missions: ${error.message}`);

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
  Error,
  UpdateMissionStatusInput
> {
  const queryClient = useQueryClient();

  return useMutation<Mission, Error, UpdateMissionStatusInput>({
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

      if (error) throw new Error(`Failed to update mission: ${error.message}`);
      if (!data) throw new Error('No data returned from mission update');

      return data as Mission;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.missions });
      // Also refresh profile since completing missions awards XP
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
export function useCheckin(): UseMutationResult<Checkin, Error, CheckinInput> {
  const queryClient = useQueryClient();

  return useMutation<Checkin, Error, CheckinInput>({
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

      if (error) throw new Error(`Failed to submit check-in: ${error.message}`);
      if (!data) throw new Error('No data returned from check-in');

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
  queryOptions?: Partial<UseQueryOptions<Box[], Error>>,
): UseQueryResult<Box[], Error> {
  return useQuery<Box[], Error>({
    queryKey: queryKeys.boxes,
    queryFn: async () => {
      const userId = await getCurrentUserId();

      const { data, error } = await supabase
        .from('boxes')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw new Error(`Failed to fetch boxes: ${error.message}`);

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
export function useOpenBox(): UseMutationResult<OpenBoxResult, Error, OpenBoxInput> {
  const queryClient = useQueryClient();

  return useMutation<OpenBoxResult, Error, OpenBoxInput>({
    mutationFn: async ({ boxId }) => {
      const { data, error } = await supabase.functions.invoke<OpenBoxResult>(
        'open-box',
        { body: { box_id: boxId } },
      );

      if (error) throw new Error(`Failed to open box: ${error.message}`);
      if (!data) throw new Error('No data returned from open-box function');

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.boxes });
      queryClient.invalidateQueries({ queryKey: queryKeys.collectibles });
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
  queryOptions?: Partial<UseQueryOptions<Quest[], Error>>,
): UseQueryResult<Quest[], Error> {
  return useQuery<Quest[], Error>({
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

      if (error) throw new Error(`Failed to fetch quests: ${error.message}`);

      return (data ?? []) as Quest[];
    },
    staleTime: 5 * 60 * 1000,
    ...queryOptions,
  });
}

// ---------------------------------------------------------------------------
// Collectible Hooks
// ---------------------------------------------------------------------------

/**
 * Fetches all collectibles owned by the current user.
 */
export function useCollectibles(
  queryOptions?: Partial<UseQueryOptions<Collectible[], Error>>,
): UseQueryResult<Collectible[], Error> {
  return useQuery<Collectible[], Error>({
    queryKey: queryKeys.collectibles,
    queryFn: async () => {
      const userId = await getCurrentUserId();

      const { data, error } = await supabase
        .from('collectibles')
        .select('*')
        .eq('user_id', userId)
        .order('obtained_at', { ascending: false });

      if (error) throw new Error(`Failed to fetch collectibles: ${error.message}`);

      return (data ?? []) as Collectible[];
    },
    staleTime: 10 * 60 * 1000,
    ...queryOptions,
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
};
