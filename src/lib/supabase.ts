import { createClient } from '@supabase/supabase-js';

// âââ Environment ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
// These should be set in your .env file and loaded via react-native-dotenv
// or expo-constants. Replace with your actual Supabase project credentials.

const SUPABASE_URL = process.env.SUPABASE_URL ?? 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY ?? 'your-anon-key';

// âââ Client âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});

// âââ Types ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ

export interface Database {
  public: {
    Tables: {
      box_validations: {
        Row: {
          id: string;
          user_id: string;
          hero_module_id: string;
          hero_module_name: string | null;
          box_name: string | null;
          missions_accepted: string[];
          missions_completed: number;
          missions_total: number;
          products: string[] | null;
          notes: string | null;
          status: 'pending' | 'validated' | 'delivered' | 'active' | 'completed';
          validated_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          hero_module_id: string;
          hero_module_name?: string | null;
          box_name?: string | null;
          missions_accepted: string[];
          missions_completed?: number;
          missions_total?: number;
          products?: string[] | null;
          notes?: string | null;
          status?: 'pending' | 'validated' | 'delivered' | 'active' | 'completed';
          validated_at: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          hero_module_id?: string;
          hero_module_name?: string | null;
          box_name?: string | null;
          missions_accepted?: string[];
          missions_completed?: number;
          missions_total?: number;
          products?: string[] | null;
          notes?: string | null;
          status?: 'pending' | 'validated' | 'delivered' | 'active' | 'completed';
          validated_at?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}
