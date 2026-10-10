// Magasin d'état de l'application : une seule source de vérité en mémoire,
// recopiée en continu dans le stockage local de l'espace courant (sans compte, ou compte connecté).
// Les composants lisent l'état avec `useLearner()` et le modifient avec `update()`.
import { useSyncExternalStore } from 'react';
import { touch } from '../core/learner';
import { dailyNotifications } from '../core/notifications';
import { awardBadges, type BadgeDef } from '../core/rewards';
import type { LearnerState } from '../core/state';
import { getActiveScope, loadScope, saveScope, setActiveScope, type Scope } from '../services/storage';

type Listener = () => void;

// Au démarrage on rouvre le dernier espace utilisé. Si c'était un compte, sa session
// est vérifiée ensuite (services/session.ts) avant d'afficher le tableau de bord.
let scope: Scope = getActiveScope();
const initial = loadScope(scope);
let state: LearnerState = dailyNotifications(initial.state, new Date());
let startupWarning = initial.warning;
let storageFailed = false;
const listeners = new Set<Listener>();
const badgeListeners = new Set<(b: BadgeDef[]) => void>();
let saveTimer: ReturnType<typeof setTimeout> | undefined;

function persistSoon() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(flush, 200);
}

/** Écrit immédiatement l'état dans le stockage local de l'espace courant. */
export function flush() {
  clearTimeout(saveTimer);
  storageFailed = !saveScope(scope, state);
}

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush();
  });
}

function emit() {
  for (const l of listeners) l();
}

export function getState(): LearnerState {
  return state;
}

export function getScope(): Scope {
  return scope;
}

/**
 * Applique une modification. `fn` reçoit l'état et la date courante et renvoie le nouvel état.
 * Par défaut, la modification est marquée « à sauvegarder en ligne » (révision + dirty).
 * `silent` sert aux mises à jour techniques (ex. confirmation de sauvegarde) qui ne doivent pas
 * déclencher une nouvelle sauvegarde.
 */
export function update(fn: (s: LearnerState, now: Date) => LearnerState, opts: { silent?: boolean } = {}): void {
  const now = new Date();
  const next = fn(state, now);
  if (next === state) return;
  let s = opts.silent ? next : touch(next, now);
  let earned: BadgeDef[] = [];
  if (!opts.silent) {
    const res = awardBadges(s, now);
    s = res.state;
    earned = res.earned;
  }
  state = s;
  persistSoon();
  emit();
  if (earned.length) for (const l of badgeListeners) l(earned);
}

/** Remplace entièrement l'état de l'espace courant (import, restauration…). */
export function replaceState(next: LearnerState): void {
  state = next;
  flush();
  emit();
}

/**
 * Change d'espace de données (connexion, déconnexion). L'état de l'espace précédent est
 * d'abord enregistré localement, puis le nouvel état est installé et enregistré.
 */
export function switchScope(nextScope: Scope, nextState: LearnerState): void {
  flush();
  scope = nextScope;
  setActiveScope(nextScope);
  state = dailyNotifications(nextState, new Date());
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
