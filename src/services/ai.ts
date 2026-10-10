// Client du professeur IA. Le navigateur n'a JAMAIS accès à la clé : il appelle un backend
// (serveur de développement Vite ou fonction Supabase) qui, lui, contacte le fournisseur.
import type { TeacherRequest, TeacherResponse } from '../../supabase/functions/_shared/teacher-core.ts';
import { aiEndpoint, config, supabaseConfigured } from './config';
import { getSupabase } from './supabase';

export type { TeacherRequest, TeacherResponse };

export interface AiStatus {
  available: boolean;
  reason: string;
}

let cached: { at: number; status: AiStatus } | null = null;

async function authHeaders(): Promise<Record<string, string>> {
  const endpoint = aiEndpoint();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (endpoint && supabaseConfigured() && endpoint.startsWith(config.supabaseUrl)) {
    const sb = await getSupabase();
    const { data } = (await sb?.auth.getSession()) ?? { data: { session: null } };
    headers.apikey = config.supabaseAnonKey;
    if (data.session) headers.Authorization = `Bearer ${data.session.access_token}`;
  }
  return headers;
}

/** Vérifie si un professeur IA est réellement joignable et configuré. */
export async function checkAi(force = false): Promise<AiStatus> {
  if (!force && cached && Date.now() - cached.at < 60_000) return cached.status;
  const endpoint = aiEndpoint();
  let status: AiStatus;
  if (!endpoint) status = { available: false, reason: 'Aucun professeur IA n’est configuré sur cette installation.' };
  else if (typeof navigator !== 'undefined' && !navigator.onLine) status = { available: false, reason: 'Hors ligne : le professeur IA nécessite Internet.' };
  else {
    try {
      const headers = await authHeaders();
      const needsLogin = supabaseConfigured() && endpoint.startsWith(config.supabaseUrl) && !headers.Authorization;
      const res = await fetch(endpoint, { method: 'GET', headers });
      if (res.status === 401) status = { available: false, reason: 'Connectez-vous à votre compte pour utiliser le professeur IA.' };
      else if (!res.ok) status = { available: false, reason: `Professeur IA indisponible (${res.status}).` };
      else {
        const body = (await res.json()) as { configured?: boolean };
        status = body.configured
          ? needsLogin
            ? { available: false, reason: 'Un professeur IA est disponible : connectez-vous (bouton « Se connecter ») pour l’utiliser.' }
            : { available: true, reason: 'Professeur IA connecté.' }
          : { available: false, reason: 'Le serveur fonctionne mais aucune clé de modèle n’est configurée (voir README).' };
      }
    } catch {
      status = { available: false, reason: 'Le professeur IA est injoignable.' };
    }
  }
  cached = { at: Date.now(), status };
  return status;
}

export async function askTeacher(req: TeacherRequest): Promise<TeacherResponse> {
  const endpoint = aiEndpoint();
  if (!endpoint) throw new Error('Professeur IA non configuré.');
  const res = await fetch(endpoint, { method: 'POST', headers: await authHeaders(), body: JSON.stringify(req) });
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    /* rien */
  }
  if (!res.ok) {
    const msg = body && typeof body === 'object' && 'error' in body ? String((body as { error: unknown }).error) : `Erreur ${res.status}`;
    throw new Error(msg);
  }
  return body as TeacherResponse;
}
