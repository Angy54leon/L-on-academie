// Synchronisation avec Supabase (si un compte est configuré et connecté).
import { pushNotification } from '../core/learner';
import { describeConflict } from '../core/merge';
import { parseState, type LearnerState } from '../core/state';
import { decideSync, publicSummary, type RemoteRow } from '../core/sync';
import { getAccount, onLogin, setAccount } from '../state/account';
import { getState, replaceState, subscribe } from '../state/store';
import { addBackup } from './storage';
import { getSupabase } from './supabase';

let running = false;
let timer: ReturnType<typeof setTimeout> | undefined;

function withSynced(s: LearnerState, revision: number): LearnerState {
  return { ...s, meta: { ...s.meta, syncedRevision: revision, lastSyncedAt: new Date().toISOString(), dirty: false } };
}

export async function syncNow(): Promise<{ ok: boolean; message: string }> {
  const account = getAccount();
  if (!account.user) return { ok: false, message: 'Connectez-vous pour synchroniser.' };
  if (typeof navigator !== 'undefined' && !navigator.onLine) return { ok: false, message: 'Hors ligne : la synchronisation reprendra au retour de la connexion.' };
  if (running) return { ok: false, message: 'Synchronisation déjà en cours.' };
  const sb = await getSupabase();
  if (!sb) return { ok: false, message: 'Supabase n’est pas configuré.' };
  running = true;
  setAccount({ syncing: true, syncError: undefined });
  try {
    const { data, error } = await sb.from('learner_states').select('state, revision').eq('user_id', account.user.id).maybeSingle();
    if (error) throw new Error(error.message);
    let remote: RemoteRow | null = null;
    if (data) {
      const parsed = parseState(data.state);
      if (!parsed.ok) throw new Error('Données distantes illisibles.');
      remote = { state: parsed.state, revision: data.revision as number };
    }
    const local = getState();
    const decision = decideSync(local, remote);
    if (decision.action === 'none') {
      setAccount({ syncing: false, lastSync: new Date().toISOString() });
      return { ok: true, message: 'Déjà à jour.' };
    }
    if (decision.action === 'pull') {
      replaceState(withSynced({ ...decision.state, meta: { ...decision.state.meta, deviceId: local.meta.deviceId } }, remote!.revision));
      setAccount({ syncing: false, lastSync: new Date().toISOString() });
      return { ok: true, message: 'Progression récupérée depuis votre compte.' };
    }
    let toPush = decision.state;
    if (decision.action === 'merge') {
      // Conflit : on conserve une copie des deux versions avant de fusionner.
      const at = new Date().toISOString();
      addBackup({ at, reason: 'Avant fusion (version de cet appareil)', state: local });
      addBackup({ at, reason: 'Avant fusion (version du serveur)', state: remote!.state });
      toPush = pushNotification(toPush, {
        at,
        kind: 'sync',
        title: 'Données fusionnées entre deux appareils',
        body: `Des modifications existaient sur cet appareil et sur le serveur. Elles ont été réunies sans rien supprimer. ${describeConflict(local, remote!.state)} Les deux versions d’origine sont disponibles dans Paramètres › Sauvegardes.`,
        link: '/parametres',
      });
    }
    const { data: rev, error: pushError } = await sb.rpc('push_state', {
      expected_revision: decision.expectedRevision,
      new_state: toPush,
      summary: publicSummary(toPush, new Date()),
    });
    if (pushError) throw new Error(pushError.message);
    if (rev === null || rev === undefined || rev === -1) {
      // Quelqu'un a écrit entre-temps : on recommence au prochain passage.
      setAccount({ syncing: false });
      running = false;
      scheduleSync(2000);
      return { ok: false, message: 'Modification concurrente détectée, nouvelle tentative…' };
    }
    replaceState(withSynced(toPush, rev as number));
    setAccount({ syncing: false, lastSync: new Date().toISOString() });
    return { ok: true, message: decision.action === 'merge' ? 'Données fusionnées et synchronisées.' : 'Progression sauvegardée en ligne.' };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Erreur de synchronisation.';
    setAccount({ syncing: false, syncError: message });
    return { ok: false, message };
  } finally {
    running = false;
  }
}

export function scheduleSync(delay = 8000) {
  clearTimeout(timer);
  timer = setTimeout(() => {
    if (getAccount().user && getState().meta.dirty) void syncNow();
  }, delay);
}

let started = false;
/** Active la synchronisation automatique (connexion, retour en ligne, modifications). */
export function startAutoSync() {
  if (started) return;
  started = true;
  onLogin(() => void syncNow());
  subscribe(() => {
    if (getAccount().user && getState().meta.dirty) scheduleSync();
  });
  window.addEventListener('online', () => {
    if (getAccount().user) void syncNow();
  });
}
