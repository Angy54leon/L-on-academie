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

/** Erreur du professeur IA, avec un message en français et l'indication qu'un nouvel essai a du sens. */
export class AiError extends Error {
  constructor(
    message: string,
    public retryable: boolean,
    public status = 0,
  ) {
    super(message);
  }
}

export interface AskOptions {
  /** Annulation (changement de page, nouvelle conversation). */
  signal?: AbortSignal;
  /** Délai maximal côté navigateur (ms) : l'interface ne reste jamais bloquée. */
  timeoutMs?: number;
}

function isTeacherResponse(body: unknown): body is TeacherResponse {
  return !!body && typeof body === 'object' && typeof (body as TeacherResponse).reply === 'string' && !!(body as TeacherResponse).reply.trim();
}

export async function askTeacher(req: TeacherRequest, opts: AskOptions = {}): Promise<TeacherResponse> {
  const endpoint = aiEndpoint();
  if (!endpoint) throw new AiError('Professeur IA non configuré sur cette installation.', false);
  if (typeof navigator !== 'undefined' && navigator.onLine === false) throw new AiError('Vous êtes hors ligne. Votre message est conservé : réessayez dès le retour de la connexion.', true);
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, opts.timeoutMs ?? 45000);
  const onAbort = () => controller.abort();
  opts.signal?.addEventListener('abort', onAbort);
  try {
    let res: Response;
    try {
      res = await fetch(endpoint, { method: 'POST', headers: await authHeaders(), body: JSON.stringify(req), signal: controller.signal });
    } catch {
      if (opts.signal?.aborted) throw new AiError('Demande annulée.', false);
      if (timedOut) throw new AiError('Le professeur IA met trop de temps à répondre. Votre message est conservé : réessayez.', true);
      throw new AiError('Connexion impossible avec le professeur IA (réseau). Votre message est conservé : réessayez.', true);
    }
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      /* corps vide ou non JSON */
    }
    if (!res.ok) {
      const serverMsg = body && typeof body === 'object' && 'error' in body ? String((body as { error: unknown }).error) : '';
      if (res.status === 401) throw new AiError(serverMsg || 'Connectez-vous pour utiliser le professeur IA.', false, 401);
      if (res.status === 429) throw new AiError(serverMsg || 'Limite d’échanges atteinte. Réessayez plus tard ou passez au partenaire local.', false, 429);
      if (res.status === 400) throw new AiError(serverMsg || 'Message refusé par le serveur.', false, 400);
      throw new AiError(serverMsg || `Le professeur IA est momentanément indisponible (erreur ${res.status}). Réessayez.`, true, res.status);
    }
    if (!isTeacherResponse(body)) throw new AiError('Le professeur IA a renvoyé une réponse vide. Réessayez.', true, res.status);
    return body;
  } finally {
    clearTimeout(timer);
    opts.signal?.removeEventListener('abort', onAbort);
  }
}
