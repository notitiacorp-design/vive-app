/**
 * src/lib/supabase.ts
 * VIVE App â Supabase client configuration
 *
 * Initialise le client Supabase JS avec persistence de l'authentification
 * via AsyncStorage et expose des helpers typÃ©s pour l'accÃ¨s session/utilisateur.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient, Session, User } from '@supabase/supabase-js';
import type { Database } from '../types/database.generated';

// ---------------------------------------------------------------------------
// Variables d'environnement
// Source unique de vÃ©ritÃ© : Expo (EXPO_PUBLIC_*)
// DÃ©finir EXPO_PUBLIC_SUPABASE_URL et EXPO_PUBLIC_SUPABASE_ANON_KEY dans .env
// ---------------------------------------------------------------------------
const SUPABASE_URL: string = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY: string = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn(
    '[VIVE/Supabase] SUPABASE_URL ou SUPABASE_ANON_KEY manquant. ' +
      'DÃ©finissez EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY dans votre fichier .env.',
  );
}

// ---------------------------------------------------------------------------
// Client Supabase (typÃ©)
// Les types Database sont gÃ©nÃ©rÃ©s via :
// supabase gen types typescript --project-id <id> > src/types/database.generated.ts
// ---------------------------------------------------------------------------
export const supabase: SupabaseClient<Database> = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      // Persiste les sessions entre les redÃ©marrages de l'application via AsyncStorage.
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  },
);

// ---------------------------------------------------------------------------
// Helpers d'authentification
// ---------------------------------------------------------------------------

/**
 * Retourne la session active courante, ou null si non authentifiÃ©.
 * PrÃ©fÃ©rer cette fonction Ã  l'accÃ¨s direct Ã  supabase.auth pour centraliser
 * la gestion des erreurs et garantir un typage correct de la valeur retournÃ©e.
 */
export async function getSession(): Promise<Session | null> {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.error('[VIVE/Supabase] Erreur getSession :', error.message);
      return null;
    }
    return data.session;
  } catch (err) {
    console.error('[VIVE/Supabase] Erreur inattendue getSession :', err);
    return null;
  }
}

/**
 * Retourne l'utilisateur actuellement authentifiÃ©, ou null si non authentifiÃ©.
 * Utilise getUser() (validÃ© cÃ´tÃ© serveur) plutÃ´t que session.user pour la sÃ©curitÃ©.
 */
export async function getUser(): Promise<User | null> {
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      // Supprime "Auth session missing" â signifie simplement que l'utilisateur est dÃ©connectÃ©.
      if (error.message !== 'Auth session missing!') {
        console.error('[VIVE/Supabase] Erreur getUser :', error.message);
      }
      return null;
    }
    return data.user;
  } catch (err) {
    console.error('[VIVE/Supabase] Erreur inattendue getUser :', err);
    return null;
  }
}

/**
 * DÃ©connecte l'utilisateur courant et efface la session locale.
 */
export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error('[VIVE/Supabase] Erreur signOut :', error.message);
  }
}

// ---------------------------------------------------------------------------
// Re-export du type Database pour usage externe sans import direct du fichier gÃ©nÃ©rÃ©
// ---------------------------------------------------------------------------
export type { Database };
