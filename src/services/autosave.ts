// Sauvegarde automatique en ligne de la progression du compte connecté.
//
// Fonctionnement :
//  1. Chaque modification est d'abord écrite dans le stockage local (instantané, fonctionne hors ligne).
//  2. Elle est ensuite envoyée en ligne : 1,5 s après la dernière modification, et au plus tard 8 s
//     après la première modification en attente (pas de requête à chaque clic, mais très peu de risque de perte).
//  3. Envoi immédiat quand l'onglet est masqué ou quitté ; tentative « keepalive » à la fermeture.
//  4. En cas d'échec : nouvelles tentatives (2 s, 4 s, 8 s… jusqu'à 60 s) et reprise au retour de la connexion.
//  5. Contrôle de version : si les données en ligne ont changé (autre appareil), on récupère et on FUSIONNE
//     avant de réessayer. Le serveur refuse aussi de remplacer une progression par une progression vide.
//  L'état « Progression sauvegardée » n'est affiché qu'après confirmation du serveur.
import { useSyncExternalStore } from 'react';
import { mergeStates } from '../core/merge';
import { parseState } from '../core/state';
import { interpretPushResult, publicSummary, stateForServer, type RemoteRow } from '../core/sync';
import { getState, subscribe, update } from '../state/store';
import { config } from './config';
import { getSupabase } from './supabase';
import type { SupabaseClient } from '@supabase/supabase-js';

export type SaveStatus = 'disabled' | 'pending' | 'saving' | 'saved' | 'offline' | 'error';

export interface SaveState {
  status: SaveStatus;
  lastSavedAt?: string;
  message?: string;
  /** Date (ms) de la prochaine tentative automatique. */
  retryAt?: number;
}

const DEBOUNCE_MS = 1500;
const MAX_WAIT_MS = 8000;
const MAX_BACKOFF_MS = 60_000;
const REMOTE_CHECK_MS = 5 * 60_000;

let save: SaveState = { status: 'disabled' };
const saveListeners = new Set<() => void>();
const savedListeners = new Set<() => void>();

function setSave(patch: Partial<SaveState>, replace = false) {
  save = replace ? (patch as SaveState) : { ...save, ...patch };
  for (const l of saveListeners) l();
}

export function getSaveState(): SaveState {
  return save;
}

export function useSaveState(): SaveState {
  return useSyncExternalStore(
    (l) => {
      saveListeners.add(l);
      return () => saveListeners.delete(l);
    },
    () => save,
    () => save,
  );
}

/** Appelé après chaque sauvegarde confirmée par le serveur. */
export function onSaved(l: () => void): () => void {
  savedListeners.add(l);
  return () => savedListeners.delete(l);
}

let userId: string | null = null;
let accessToken: string | null = null;
let timer: ReturnType<typeof setTimeout> | undefined;
let retryTimer: ReturnType<typeof setTimeout> | undefined;
let remoteTimer: ReturnType<typeof setInterval> | undefined;
let firstPendingAt: number | null = null;
let inFlight: Promise<boolean> | null = null;
let rerun = false;
let backoff = 0;
let resetRequested = false;
let lastRemoteCheck = 0;
const cleanups: (() => void)[] = [];

export function setAutosaveToken(token: string | null) {
  accessToken = token;
}

/** La prochaine sauvegarde remplacera volontairement la progression en ligne (bouton « Recommencer »). */
export function requestReset() {
  resetRequested = true;
}

export async function fetchRemote(sb: SupabaseClient, uid: string): Promise<RemoteRow | null> {
  const { data, error } = await sb.from('learner_states').select('state, revision').eq('user_id', uid).maybeSingle();
  if (error) throw Object.assign(new Error(error.message), { pg: error });
  if (!data) return null;
  const parsed = parseState(data.state);
  if (!parsed.ok) throw new Error(`Données en ligne illisibles (${parsed.error}).`);
  return { state: parsed.state, revision: data.revision as number };
}

function isNetworkError(e: { message?: string } | null | undefined): boolean {
  return /failed to fetch|networkerror|network request failed|fetch failed|load failed|timeout/i.test(e?.message ?? '');
}

function isAuthError(e: { message?: string; code?: string } | null | undefined): boolean {
  return e?.code === 'PGRST301' || e?.code === 'PGRST303' || /jwt|expired|not authenticated/i.test(e?.message ?? '');
}

function schedule(delay = DEBOUNCE_MS) {
  if (!userId) return;
  const now = Date.now();
  if (firstPendingAt === null) firstPendingAt = now;
  const wait = Math.max(0, Math.min(delay, firstPendingAt + MAX_WAIT_MS - now));
  clearTimeout(timer);
  timer = setTimeout(() => void saveNow(), wait);
}

function onStoreChange() {
  if (!userId || !getState().meta.dirty) return;
  if (save.status !== 'saving' && save.status !== 'offline' && save.status !== 'error') setSave({ status: 'pending', message: undefined });
  if (save.status === 'error' || save.status === 'offline') return; // une nouvelle tentative est déjà programmée
  schedule();
}

/** Envoie immédiatement les modifications en attente. Renvoie true si le serveur a confirmé. */
export function saveNow(): Promise<boolean> {
  if (!userId) return Promise.resolve(false);
  if (inFlight) {
    rerun = true;
    return inFlight;
  }
  clearTimeout(retryTimer);
  inFlight = doSave().finally(() => {
    inFlight = null;
    if (rerun) {
      rerun = false;
      if (getState().meta.dirty && save.status !== 'error' && save.status !== 'offline') schedule(300);
    }
  });
  return inFlight;
}

/**
 * Appelle push_state. Si seule la première migration SQL est installée (ancienne fonction à 3 paramètres),
 * on se rabat sur elle pour ne pas bloquer la sauvegarde, et on le signale dans la console.
 */
let legacyPush = false;
async function callPush(sb: SupabaseClient, args: { expected_revision: number | null; new_state: unknown; summary: unknown; allow_reset: boolean }) {
  if (!legacyPush) {
    const r = await sb.rpc('push_state', args);
    if (!r.error || !(r.error.code === 'PGRST202' || /could not find the function/i.test(r.error.message))) return r;
    legacyPush = true;
    console.warn('LÉON ACADÉMIE : exécutez supabase/migrations/20261010000000_autosave.sql (protection contre les remplacements par une progression vide).');
  }
  const { allow_reset: _ignored, ...legacy } = args;
  return sb.rpc('push_state', legacy);
}

async function doSave(): Promise<boolean> {
  clearTimeout(timer);
  firstPendingAt = null;
  const uid = userId;
  const sb = await getSupabase();
  if (!sb || !uid) return false;
  if (!getState().meta.dirty) {
    if (save.status !== 'saved') setSave({ status: 'saved', message: undefined });
    return true;
  }
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    setSave({ status: 'offline', message: 'Hors ligne — vos modifications sont conservées sur cet appareil et seront envoyées au retour de la connexion.' });
    return false;
  }
  setSave({ status: 'saving', message: undefined });
  try {
    for (let attempt = 0; attempt < 4; attempt++) {
      if (userId !== uid) return false; // déconnexion pendant l'envoi
      const snap = getState();
      const { data, error } = await callPush(sb, {
        expected_revision: snap.meta.syncedRevision ?? null,
        new_state: stateForServer(snap),
        summary: publicSummary(snap, new Date()),
        allow_reset: resetRequested,
      });
      if (error) return await failure(error, sb);
      const out = interpretPushResult(data);
      if (out.kind === 'saved') {
        resetRequested = false;
        markSaved(out.revision, snap.revision);
        return true;
      }
      // Les données en ligne ont changé (autre appareil) ou le serveur a refusé un remplacement par du vide :
      // on récupère la version en ligne et on fusionne avant de réessayer. Rien n'est perdu.
      const remote = await fetchRemote(sb, uid);
      if (userId !== uid) return false;
      update((s) => {
        if (!remote) return { ...s, meta: { ...s.meta, syncedRevision: undefined, dirty: true } };
        // Remise à zéro volontaire : on ne réintroduit pas l'ancienne progression, on vise seulement la bonne révision.
        if (resetRequested) return { ...s, meta: { ...s.meta, syncedRevision: remote.revision, dirty: true } };
        const merged = mergeStates(s, remote.state);
        return { ...merged, meta: { ...s.meta, syncedRevision: remote.revision, dirty: true } };
      }, { silent: true });
    }
    return await failure({ message: 'Conflits répétés avec la version en ligne.' }, sb);
  } catch (e) {
    return await failure(e as { message?: string }, sb);
  }
}

function markSaved(revision: number, sentRevision: number) {
  const at = new Date().toISOString();
  backoff = 0;
  update((s) => ({ ...s, meta: { ...s.meta, syncedRevision: revision, lastSyncedAt: at, dirty: s.revision !== sentRevision } }), { silent: true });
  const stillDirty = getState().meta.dirty;
  setSave({ status: stillDirty ? 'pending' : 'saved', lastSavedAt: at, message: undefined, retryAt: undefined });
  for (const l of savedListeners) l();
  if (stillDirty) schedule(500);
}

async function failure(e: { message?: string; code?: string } | null, sb: SupabaseClient): Promise<boolean> {
  const err = (e as { pg?: { message?: string; code?: string } })?.pg ?? e;
  if (isAuthError(err)) {
    const { data } = await sb.auth.refreshSession().catch(() => ({ data: { session: null } }));
    if (data.session) {
      accessToken = data.session.access_token;
      retry(500);
      setSave({ status: 'pending' });
      return false;
    }
    setSave({ status: 'error', message: 'Votre session a expiré : reconnectez-vous pour reprendre la sauvegarde en ligne. Vos modifications restent sur cet appareil.', retryAt: undefined });
    return false;
  }
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    setSave({ status: 'offline', message: 'Hors ligne — vos modifications sont conservées sur cet appareil et seront envoyées au retour de la connexion.', retryAt: undefined });
    return false;
  }
  backoff = backoff ? Math.min(MAX_BACKOFF_MS, backoff * 2) : 2000;
  const detail = isNetworkError(err) ? 'serveur injoignable' : err?.message ?? 'erreur inconnue';
  setSave({ status: 'error', message: `Problème de sauvegarde (${detail}) — nouvelle tentative dans ${Math.round(backoff / 1000)} s. Vos modifications restent sur cet appareil.`, retryAt: Date.now() + backoff });
  retry(backoff);
  return false;
}

function retry(ms: number) {
  clearTimeout(retryTimer);
  retryTimer = setTimeout(() => void saveNow(), ms);
}

/**
 * Vérifie si une version plus récente existe en ligne (progression faite sur un autre appareil)
 * et l'installe, ou envoie les modifications locales en attente (avec fusion si nécessaire).
 */
export async function checkRemote(force = false): Promise<void> {
  const uid = userId;
  if (!uid) return;
  if (!force && Date.now() - lastRemoteCheck < 30_000) return;
  lastRemoteCheck = Date.now();
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
  if (getState().meta.dirty) {
    await saveNow();
    return;
  }
  const sb = await getSupabase();
  if (!sb) return;
  try {
    const { data, error } = await sb.from('learner_states').select('revision').eq('user_id', uid).maybeSingle();
    if (error || !data || userId !== uid) return;
    if (data.revision === getState().meta.syncedRevision) return;
    const remote = await fetchRemote(sb, uid);
    if (!remote || userId !== uid) return;
    update((s) => {
      // Si une modification locale est arrivée entre-temps, on fusionne au lieu de remplacer.
      if (s.meta.dirty) return { ...mergeStates(s, remote.state), meta: { ...s.meta, syncedRevision: remote.revision, dirty: true } };
      return { ...remote.state, meta: { ...s.meta, ownerId: uid, syncedRevision: remote.revision, lastSyncedAt: new Date().toISOString(), dirty: false } };
    }, { silent: true });
    if (getState().meta.dirty) void saveNow();
    else setSave({ status: 'saved', lastSavedAt: new Date().toISOString() });
  } catch {
    /* une vérification ratée n'est pas grave : elle sera refaite */
  }
}

/** Dernière chance à la fermeture de l'onglet : envoi « keepalive » (limité à ~60 Ko par le navigateur). */
function keepaliveFlush() {
  const s = getState();
  if (!userId || !s.meta.dirty || !accessToken || !config.supabaseUrl) return;
  const body = JSON.stringify({
    expected_revision: s.meta.syncedRevision ?? null,
    new_state: stateForServer(s),
    summary: publicSummary(s, new Date()),
    ...(legacyPush ? {} : { allow_reset: false }),
  });
  if (body.length > 60_000) return; // trop gros pour keepalive : les envois réguliers ont déjà eu lieu
  try {
    void fetch(`${config.supabaseUrl.replace(/\/$/, '')}/rest/v1/rpc/push_state`, {
      method: 'POST',
      keepalive: true,
      headers: { apikey: config.supabaseAnonKey, Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body,
    });
  } catch {
    /* rien */
  }
}

/** Démarre la sauvegarde automatique pour le compte connecté. */
export function startAutosave(uid: string) {
  stopAutosave();
  userId = uid;
  backoff = 0;
  setSave({ status: getState().meta.dirty ? 'pending' : 'saved', lastSavedAt: getState().meta.lastSyncedAt }, true);
  cleanups.push(subscribe(onStoreChange));
  const onOnline = () => {
    backoff = 0;
    if (getState().meta.dirty) void saveNow();
    else void checkRemote(true);
  };
  const onOffline = () => {
    if (getState().meta.dirty) setSave({ status: 'offline', message: 'Hors ligne — vos modifications sont conservées sur cet appareil et seront envoyées au retour de la connexion.' });
  };
  const onVisibility = () => {
    if (document.visibilityState === 'hidden') {
      if (getState().meta.dirty) void saveNow();
    } else void checkRemote();
  };
  const onFocus = () => void checkRemote();
  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('focus', onFocus);
  window.addEventListener('pagehide', keepaliveFlush);
  cleanups.push(() => {
    window.removeEventListener('online', onOnline);
    window.removeEventListener('offline', onOffline);
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('focus', onFocus);
    window.removeEventListener('pagehide', keepaliveFlush);
  });
  remoteTimer = setInterval(() => void checkRemote(true), REMOTE_CHECK_MS);
  if (getState().meta.dirty) schedule(0);
}

export function stopAutosave() {
  userId = null;
  clearTimeout(timer);
  clearTimeout(retryTimer);
  clearInterval(remoteTimer);
  firstPendingAt = null;
  resetRequested = false;
  while (cleanups.length) cleanups.pop()!();
  setSave({ status: 'disabled' }, true);
}

/** Pour la déconnexion : envoie ce qui reste, avec un délai maximal. */
export async function flushWithTimeout(ms: number): Promise<boolean> {
  if (!userId || !getState().meta.dirty) return true;
  return Promise.race([saveNow(), new Promise<boolean>((r) => setTimeout(() => r(false), ms))]);
}
