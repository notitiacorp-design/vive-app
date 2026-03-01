/**
 * src/lib/supabase.ts
 * VIVE App â Supabase client configuration
 *
 * Initialise le client Supabase JS avec persistence de l'authentification
 * via AsyncStorage et expose des helpers typÃ©s pour l'accÃ¨s session/utilisateur.
 *
 * SÃCURITÃ : La clÃ© anon (SUPABASE_ANON_KEY) est une clÃ© publique intentionnellement
 * exposÃ©e cÃ´tÃ© client. Elle ne donne accÃ¨s qu'aux tables avec RLS (Row Level Security)
 * activÃ©e. Tables protÃ©gÃ©es par RLS : profiles, posts, comments, user_settings.
 * Ne jamais utiliser la clÃ© service_role cÃ´tÃ© client.
 *
 * TYPES : Les types Database sont gÃ©nÃ©rÃ©s via la CLI Supabase :
 *   supabase gen types typescript --project-id <id> > src/types/database.generated.ts
 * Relancer cette commande aprÃ¨s chaque migration de schÃ©ma.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createClient,
  SupabaseClient,
  Session,
  User,
} from '@supabase/supabase-js';
import type { Database } from '../types/database.generated';

// ---------------------------------------------------------------------------
// Variables d'environnement
// Source unique de vÃ©ritÃ© : Expo (EXPO_PUBLIC_*)
// DÃ©finir EXPO_PUBLIC_SUPABASE_URL et EXPO_PUBLIC_SUPABASE_ANON_KEY dans .env
// Ne jamais utiliser require() dynamique ou @ts-ignore pour rÃ©cupÃ©rer ces valeurs.
// ---------------------------------------------------------------------------

const SUPABASE_URL: string = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY: string =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  // Avertissement visible en dÃ©veloppement ; en production, l'app sera
  // non fonctionnelle sans ces variables mais ne crashera pas silencieusement.
  console.warn(
    '[VIVE/Supabase] SUPABASE_URL ou SUPABASE_ANON_KEY manquant. ' +
      'DÃ©finissez EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY ' +
      'dans votre fichier .env Ã  la racine du projet.',
  );
}

// ---------------------------------------------------------------------------
// Client Supabase typÃ©
// Instance singleton â ne pas recrÃ©er le client dans les composants.
// Importez directement { supabase } depuis ce fichier.
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
      // DÃ©sactivÃ© en React Native : pas de gestion d'URL de redirection OAuth.
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
      console.error('[VIVE/Supabase] Erreur lors de la rÃ©cupÃ©ration de la session :', error.message);
      return null;
    }
    return data.session;
  } catch (err) {
    console.error('[VIVE/Supabase] Erreur inattendue lors de la rÃ©cupÃ©ration de la session :', err);
    return null;
  }
}

/**
 * Retourne l'utilisateur actuellement authentifiÃ©, ou null si non authentifiÃ©.
 * Utilise getUser() (validÃ© cÃ´tÃ© serveur) plutÃ´t que session.user pour la sÃ©curitÃ©.
 * La vÃ©rification serveur garantit que le token JWT n'a pas Ã©tÃ© rÃ©voquÃ©.
 */
export async function getUser(): Promise<User | null> {
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      // "Auth session missing" signifie simplement que l'utilisateur est dÃ©connectÃ© :
      // ce n'est pas une erreur applicative, on ne la journalise pas.
      if (error.message !== 'Auth session missing!') {
        console.error('[VIVE/Supabase] Erreur lors de la rÃ©cupÃ©ration de l\'utilisateur :', error.message);
      }
      return null;
    }
    return data.user;
  } catch (err) {
    console.error('[VIVE/Supabase] Erreur inattendue lors de la rÃ©cupÃ©ration de l\'utilisateur :', err);
    return null;
  }
}

/**
 * DÃ©connecte l'utilisateur courant et efface la session locale dans AsyncStorage.
 * Ã appeler depuis un handler UI (bouton dÃ©connexion) ou en cas de token expirÃ©.
 */
export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error('[VIVE/Supabase] Erreur lors de la dÃ©connexion :', error.message);
  }
}

// ---------------------------------------------------------------------------
// Re-export du type Database pour usage externe sans import direct du fichier gÃ©nÃ©rÃ©.
// Permet d'Ã©crire : import type { Database } from '@/lib/supabase'
// au lieu de : import type { Database } from '@/types/database.generated'
// ---------------------------------------------------------------------------
export type { Database };
