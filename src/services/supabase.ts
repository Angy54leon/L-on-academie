// Client Supabase chargé à la demande (aucun téléchargement si Supabase n'est pas configuré).
import type { SupabaseClient } from '@supabase/supabase-js';
import { config, supabaseConfigured } from './config';

let clientPromise: Promise<SupabaseClient> | null = null;

export function getSupabase(): Promise<SupabaseClient | null> {
  if (!supabaseConfigured()) return Promise.resolve(null);
  if (!clientPromise) {
    clientPromise = import('@supabase/supabase-js').then(({ createClient }) =>
      createClient(config.supabaseUrl, config.supabaseAnonKey, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      }),
    );
  }
  return clientPromise;
}
