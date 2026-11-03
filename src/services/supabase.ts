// Client Supabase chargé à la demande (aucun téléchargement si Supabase n'est pas configuré).
// - Flux PKCE : les liens des e-mails reviennent avec « ?code=… » (compatible avec la navigation « #/ » de l'application).
// - La session est conservée par le navigateur et renouvelée automatiquement : l'utilisateur reste
//   connecté d'une visite à l'autre, jusqu'à sa déconnexion ou l'expiration de la session.
import type { SupabaseClient } from '@supabase/supabase-js';
import { config, supabaseConfigured } from './config';

let clientPromise: Promise<SupabaseClient> | null = null;

/**
 * Les nouvelles clés « publishable » (sb_publishable_…) ne sont pas des jetons : Supabase demande de les envoyer
 * uniquement dans l'en-tête « apikey », jamais en « Authorization: Bearer ». La bibliothèque le fait encore pour
 * la connexion : on retire cet en-tête quand il ne contient que la clé (le jeton d'un utilisateur connecté est conservé).
 */
export function withoutKeyAsBearer(key: string, baseFetch: typeof fetch = (...a) => fetch(...a)): typeof fetch {
  if (!/^sb_(publishable|secret)_/.test(key)) return baseFetch;
  return (input, init) => {
    if (init?.headers) {
      const h = new Headers(init.headers);
      if (h.get('Authorization') === `Bearer ${key}`) {
        h.delete('Authorization');
        return baseFetch(input, { ...init, headers: h });
      }
    }
    return baseFetch(input, init);
  };
}

export function getSupabase(): Promise<SupabaseClient | null> {
  if (!supabaseConfigured()) return Promise.resolve(null);
  if (!clientPromise) {
    clientPromise = import('@supabase/supabase-js').then(({ createClient }) =>
      createClient(config.supabaseUrl, config.supabaseAnonKey, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' },
        global: { fetch: withoutKeyAsBearer(config.supabaseAnonKey) },
      }),
    );
  }
  return clientPromise;
}
