// Stockage local (dans le navigateur).
// Les données sont rangées par « espace » :
//   - « guest »       : utilisation sans compte (clé historique, compatible avec les versions précédentes) ;
//   - « user:<id> »   : copie locale des données d'un compte (cache hors ligne de la base en ligne).
// Deux personnes utilisant le même navigateur ne mélangent donc jamais leurs données.
import { createInitialState, parseState, type LearnerState } from '../core/state';

export type Scope = 'guest' | `user:${string}`;

const PREFIX = 'leon-academie:';
const GUEST_STATE_KEY = 'leon-academie:state:v1';
const ACTIVE_SCOPE_KEY = 'leon-academie:active-scope';
const GUEST_MODE_KEY = 'leon-academie:guest-mode';
const MAX_BACKUPS = 5;

function stateKey(scope: Scope): string {
  return scope === 'guest' ? GUEST_STATE_KEY : `${GUEST_STATE_KEY}:${scope}`;
}

function backupKey(scope: Scope): string {
  return scope === 'guest' ? 'leon-academie:backups' : `leon-academie:backups:${scope}`;
}

export interface Backup {
  at: string;
  reason: string;
  state: LearnerState;
}

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function safeRemove(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    /* rien */
  }
}

export interface LoadResult {
  state: LearnerState;
  /** false si aucune donnée n'existait pour cet espace. */
  found: boolean;
  /** Message à afficher si les données n'ont pas pu être lues. */
  warning?: string;
}

export function loadScope(scope: Scope): LoadResult {
  const raw = safeGet(stateKey(scope));
  if (!raw) return { state: createInitialState(), found: false };
  try {
    const parsed = parseState(JSON.parse(raw));
    if (parsed.ok) return { state: parsed.state, found: true };
    // Données invalides : on les met de côté au lieu de les effacer silencieusement.
    addBackup(scope, { at: new Date().toISOString(), reason: 'Données locales illisibles (mises de côté)', state: JSON.parse(raw) });
    return { state: createInitialState(), found: false, warning: `Vos données locales étaient illisibles et ont été sauvegardées à part (${parsed.error}).` };
  } catch {
    return { state: createInitialState(), found: false, warning: 'Vos données locales étaient corrompues. Un nouveau profil a été créé.' };
  }
}

/** Retourne false si le stockage est plein ou indisponible (navigation privée…). */
export function saveScope(scope: Scope, state: LearnerState): boolean {
  return safeSet(stateKey(scope), JSON.stringify(state));
}

export function removeScope(scope: Scope): void {
  safeRemove(stateKey(scope));
}

/** Dernier espace utilisé (pour rouvrir directement les données du compte, même hors ligne). */
export function getActiveScope(): Scope {
  const v = safeGet(ACTIVE_SCOPE_KEY);
  return v && (v === 'guest' || v.startsWith('user:')) ? (v as Scope) : 'guest';
}

export function setActiveScope(scope: Scope): void {
  safeSet(ACTIVE_SCOPE_KEY, scope);
}

/** L'utilisateur a choisi d'utiliser l'application sans compte. */
export function isGuestModeChosen(): boolean {
  return safeGet(GUEST_MODE_KEY) === '1';
}

export function setGuestModeChosen(v: boolean): void {
  if (v) safeSet(GUEST_MODE_KEY, '1');
  else safeRemove(GUEST_MODE_KEY);
}

/** Mémorise une décision par compte (ex. : données de l'appareil déjà migrées ou ignorées). */
export function getFlag(name: string): string | null {
  return safeGet(`${PREFIX}flag:${name}`);
}

export function setFlag(name: string, value: string | null): void {
  if (value === null) safeRemove(`${PREFIX}flag:${name}`);
  else safeSet(`${PREFIX}flag:${name}`, value);
}

export function listBackups(scope: Scope): Backup[] {
  const raw = safeGet(backupKey(scope));
  if (!raw) return [];
  try {
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function addBackup(scope: Scope, b: Backup): void {
  const list = [b, ...listBackups(scope)].slice(0, MAX_BACKUPS);
  if (!safeSet(backupKey(scope), JSON.stringify(list))) {
    // Stockage plein : on ne garde que la sauvegarde la plus récente.
    safeSet(backupKey(scope), JSON.stringify([b]));
  }
}

export function clearBackups(scope: Scope): void {
  safeRemove(backupKey(scope));
}

/** Efface toutes les données locales de LÉON ACADÉMIE de ce navigateur (les données en ligne ne sont pas touchées). */
export function clearAllLocalData(): void {
  try {
    for (const k of Object.keys(localStorage)) if (k.startsWith(PREFIX)) localStorage.removeItem(k);
  } catch {
    /* rien */
  }
}

/** Fichier d'export (sauvegarde manuelle ou transfert vers un autre appareil sans compte). */
export function exportState(state: LearnerState): Blob {
  return new Blob([JSON.stringify({ app: 'leon-academie', exportedAt: new Date().toISOString(), state }, null, 2)], { type: 'application/json' });
}

export function importState(text: string): { ok: true; state: LearnerState } | { ok: false; error: string } {
  try {
    const data = JSON.parse(text);
    const candidate = data && data.app === 'leon-academie' ? data.state : data;
    const parsed = parseState(candidate);
    return parsed.ok ? { ok: true, state: parsed.state } : { ok: false, error: `Fichier invalide : ${parsed.error}` };
  } catch {
    return { ok: false, error: 'Ce fichier n’est pas un export LÉON ACADÉMIE valide.' };
  }
}
