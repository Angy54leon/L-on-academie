// Stockage local (dans le navigateur). Fonctionne hors ligne et sans compte.
import { createInitialState, parseState, type LearnerState } from '../core/state';

const STATE_KEY = 'leon-academie:state:v1';
const BACKUP_KEY = 'leon-academie:backups';
const MAX_BACKUPS = 5;

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

export interface LoadResult {
  state: LearnerState;
  /** Message à afficher si les données n'ont pas pu être lues. */
  warning?: string;
}

export function loadState(): LoadResult {
  const raw = safeGet(STATE_KEY);
  if (!raw) return { state: createInitialState() };
  try {
    const parsed = parseState(JSON.parse(raw));
    if (parsed.ok) return { state: parsed.state };
    // Données invalides : on les met de côté au lieu de les effacer silencieusement.
    addBackup({ at: new Date().toISOString(), reason: 'Données locales illisibles (mises de côté)', state: JSON.parse(raw) });
    return { state: createInitialState(), warning: `Vos données locales étaient illisibles et ont été sauvegardées à part (${parsed.error}).` };
  } catch {
    return { state: createInitialState(), warning: 'Vos données locales étaient corrompues. Un nouveau profil a été créé.' };
  }
}

/** Retourne false si le stockage est plein ou indisponible (navigation privée…). */
export function saveState(state: LearnerState): boolean {
  return safeSet(STATE_KEY, JSON.stringify(state));
}

export function listBackups(): Backup[] {
  const raw = safeGet(BACKUP_KEY);
  if (!raw) return [];
  try {
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function addBackup(b: Backup): void {
  const list = [b, ...listBackups()].slice(0, MAX_BACKUPS);
  if (!safeSet(BACKUP_KEY, JSON.stringify(list))) {
    // Stockage plein : on ne garde que la sauvegarde la plus récente.
    safeSet(BACKUP_KEY, JSON.stringify([b]));
  }
}

export function clearBackups(): void {
  try {
    localStorage.removeItem(BACKUP_KEY);
  } catch {
    /* rien */
  }
}

export function clearAllLocalData(): void {
  try {
    for (const k of Object.keys(localStorage)) if (k.startsWith('leon-academie:')) localStorage.removeItem(k);
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
