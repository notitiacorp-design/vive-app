/**
 * src/lib/supabase.ts
 * VIVE App — Supabase client configuration
 *
 * Initialises the Supabase JS client with AsyncStorage-backed auth
 * persistence and exposes typed helpers for session / user access.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient, Session, User } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Environment variables
// Support both Expo (EXPO_PUBLIC_*) and react-native-config (non-Expo) setups.
// ---------------------------------------------------------------------------
const SUPABASE_URL: string =
  (process.env.EXPO_PUBLIC_SUPABASE_URL as string) ||
  // @ts-ignore — react-native-config injects these at build time
  (typeof __DEV__ !== 'undefined' && require('react-native-config')?.default?.SUPABASE_URL) ||
  '';

const SUPABASE_ANON_KEY: string =
  (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string) ||
  // @ts-ignore
  (typeof __DEV__ !== 'undefined' && require('react-native-config')?.default?.SUPABASE_ANON_KEY) ||
  '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn(
    '[VIVE/Supabase] Missing SUPABASE_URL or SUPABASE_ANON_KEY. ' +
      'Set EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY in your .env file.',
  );
}

// ---------------------------------------------------------------------------
// Database types (placeholder — replace with generated output from
// `supabase gen types typescript --project-id <id> > src/types/database.ts`)
// ---------------------------------------------------------------------------
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          full_name: string | null;
          avatar_url: string | null;
          subscription_tier: 'free' | 'premium' | 'elite' | null;
          onboarding_completed: boolean;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          avatar_url?: string | null;
          subscription_tier?: 'free' | 'premium' | 'elite' | null;
          onboarding_completed?: boolean;
        };
        Update: {
          full_name?: string | null;
          avatar_url?: string | null;
          subscription_tier?: 'free' | 'premium' | 'elite' | null;
          onboarding_completed?: boolean;
          updated_at?: string;
        };
      };
      health_snapshots: {
        Row: {
          id: string;
          user_id: string;
          recorded_at: string;
          steps: number | null;
          heart_rate_avg: number | null;
          hrv_avg: number | null;
          sleep_hours: number | null;
          calories_active: number | null;
          source: 'healthkit' | 'health_connect' | 'manual';
        };
        Insert: {
          user_id: string;
          recorded_at: string;
          steps?: number | null;
          heart_rate_avg?: number | null;
          hrv_avg?: number | null;
          sleep_hours?: number | null;
          calories_active?: number | null;
          source: 'healthkit' | 'health_connect' | 'manual';
        };
        Update: {
          steps?: number | null;
          heart_rate_avg?: number | null;
          hrv_avg?: number | null;
          sleep_hours?: number | null;
          calories_active?: number | null;
        };
      };
      wellness_scores: {
        Row: {
          id: string;
          user_id: string;
          score_date: string;
          overall_score: number;
          sleep_score: number | null;
          recovery_score: number | null;
          activity_score: number | null;
        };
        Insert: {
          user_id: string;
          score_date: string;
          overall_score: number;
          sleep_score?: number | null;
          recovery_score?: number | null;
          activity_score?: number | null;
        };
        Update: {
          overall_score?: number;
          sleep_score?: number | null;
          recovery_score?: number | null;
          activity_score?: number | null;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      subscription_tier: 'free' | 'premium' | 'elite';
      health_source: 'healthkit' | 'health_connect' | 'manual';
    };
  };
}

// ---------------------------------------------------------------------------
// Supabase client (typed)
// ---------------------------------------------------------------------------
export const supabase: SupabaseClient<Database> = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      // Persist sessions across app restarts using AsyncStorage.
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  },
);

// ---------------------------------------------------------------------------
// Auth helpers
// ---------------------------------------------------------------------------

/**
 * Returns the currently active session, or null if unauthenticated.
 * Prefer this over accessing supabase.auth directly to centralise error
 * handling and ensure the returned value is always typed correctly.
 */
export async function getSession(): Promise<Session | null> {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.error('[VIVE/Supabase] getSession error:', error.message);
      return null;
    }
    return data.session;
  } catch (err) {
    console.error('[VIVE/Supabase] getSession unexpected error:', err);
    return null;
  }
}

/**
 * Returns the currently authenticated user, or null if unauthenticated.
 * Uses getUser() (server-validated) rather than session.user for security.
 */
export async function getUser(): Promise<User | null> {
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      // Suppress "Auth session missing" — it just means the user is logged out.
      if (error.message !== 'Auth session missing!') {
        console.error('[VIVE/Supabase] getUser error:', error.message);
      }
      return null;
    }
    return data.user;
  } catch (err) {
    console.error('[VIVE/Supabase] getUser unexpected error:', err);
    return null;
  }
}

/**
 * Convenience: sign out the current user and clear the local session.
 */
export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error('[VIVE/Supabase] signOut error:', error.message);
  }
}
