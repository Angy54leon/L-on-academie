// Magasin d'état de l'application : une seule source de vérité, sauvegardée localement.
// Les composants lisent l'état avec `useLearner()` et le modifient avec `update()`.
import { useSyncExternalStore } from 'react';
import { touch } from '../core/learner';
import { dailyNotifications } from '../core/notifications';
import { awardBadges, type BadgeDef } from '../core/rewards';
import type { LearnerState } from '../core/state';
import { loadState, saveState } from '../services/storage';

type Listener = () => void;

const initial = loadState();
let state: LearnerState = dailyNotifications(initial.state, new Date());
let startupWarning = initial.warning;
let storageFailed = false;
const listeners = new Set<Listener>();
const badgeListeners = new Set<(b: BadgeDef[]) => void>();
let saveTimer: ReturnType<typeof setTimeout> | undefined;

function persistSoon() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(flush, 250);
}

export function flush() {
  clearTimeout(saveTimer);
  storageFailed = !saveState(state);
}

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush();
  });
}
persistSoon();

function emit() {
  for (const l of listeners) l();
}

export function getState(): LearnerState {
  return state;
}

/**
 * Applique une modification. `fn` reçoit l'état et la date courante et renvoie le nouvel état.
 * Les badges sont vérifiés après chaque modification.
 */
export function update(fn: (s: LearnerState, now: Date) => LearnerState, opts: { silent?: boolean } = {}): void {
  const now = new Date();
  const next = fn(state, now);
  if (next === state) return;
  let s = opts.silent ? next : touch(next, now);
  const res = awardBadges(s, now);
  s = res.state;
  state = s;
  persistSoon();
  emit();
  if (res.earned.length) for (const l of badgeListeners) l(res.earned);
}

/** Remplace entièrement l'état (import, synchronisation, réinitialisation). */
export function replaceState(next: LearnerState): void {
  state = next;
  flush();
  emit();
}

export function subscribe(l: Listener): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function onBadges(l: (b: BadgeDef[]) => void): () => void {
  badgeListeners.add(l);
  return () => badgeListeners.delete(l);
}

export function useLearner(): LearnerState {
  return useSyncExternalStore(subscribe, getState, getState);
}

export function consumeStartupWarning(): string | undefined {
  const w = startupWarning;
  startupWarning = undefined;
  return w;
}

export function isStorageFailing(): boolean {
  return storageFailed;
}
