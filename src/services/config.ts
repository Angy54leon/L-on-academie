// Configuration publique de l'application (lue depuis les variables VITE_*).
// ⚠️ Les variables VITE_* sont visibles dans le navigateur : n'y mettez JAMAIS de clé secrète.
// La clé anonyme Supabase (anon key) est publique par conception : la sécurité repose sur les politiques RLS.

const env = import.meta.env;

export const config = {
  supabaseUrl: (env.VITE_SUPABASE_URL as string | undefined)?.trim() || '',
  supabaseAnonKey: (env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() || '',
  /** Point d'accès du professeur IA. Par défaut : /api/teacher en développement, ou la fonction Supabase. */
  aiEndpoint: (env.VITE_AI_ENDPOINT as string | undefined)?.trim() || '',
  appUrl: (env.VITE_APP_URL as string | undefined)?.trim() || '',
};

export function supabaseConfigured(): boolean {
  // HTTPS obligatoire, sauf pour un Supabase local de développement (supabase start : http://127.0.0.1:54321).
  const url = config.supabaseUrl;
  return (/^https:\/\/.+/.test(url) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/.test(url)) && config.supabaseAnonKey.length > 20;
}

export function aiEndpoint(): string | null {
  if (config.aiEndpoint) return config.aiEndpoint;
  if (supabaseConfigured()) return `${config.supabaseUrl.replace(/\/$/, '')}/functions/v1/teacher`;
  if (env.DEV) return '/api/teacher';
  return null;
}

/** Lien de partage de l'application (pour les invitations). */
export function appUrl(): string {
  if (config.appUrl) return config.appUrl;
  if (typeof window !== 'undefined') return window.location.origin + window.location.pathname;
  return '';
}
