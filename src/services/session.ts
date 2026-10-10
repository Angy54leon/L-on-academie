// Orchestration de la session : démarrage, connexion, restauration de la progression, déconnexion.
//
// À la connexion :
//   1. on identifie le compte ;
//   2. on récupère sa progression en ligne (source de vérité) ;
//   3. on la combine prudemment avec la copie locale de ce compte (modifications pas encore envoyées)
//      et, si besoin, avec le travail fait sans compte sur cet appareil ;
//   4. seulement ensuite, on affiche le tableau de bord.
import { toast } from '../components/ui';
import { createInitialState, type LearnerState } from '../core/state';
import { hasProgress, planRestore, type GuestPolicy, type RemoteRow } from '../core/sync';
import { isDayDone } from '../core/progress';
import { getAccount, setAccount } from '../state/account';
import { getScope, getState, switchScope } from '../state/store';
import { fetchRemote, flushWithTimeout, onSaved, saveNow, setAutosaveToken, startAutosave, stopAutosave } from './autosave';
import { frenchAuthError } from './auth';
import { supabaseConfigured } from './config';
import { addBackup, getActiveScope, getFlag, loadScope, removeScope, saveScope, setFlag, setGuestModeChosen, type Scope } from './storage';
import { getSupabase } from './supabase';

interface User {
  id: string;
  email: string;
}

let initialized = false;
let restoreSeq = 0;
let pendingChoice: { user: User; remote: RemoteRow | null; cache: LearnerState | null; guest: LearnerState } | null = null;

const userScope = (id: string): Scope => `user:${id}`;

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([p, new Promise<T>((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);
}

function summarize(s: LearnerState) {
  let days = 0;
  for (let d = 1; d <= 24; d++) if (isDayDone(s, d)) days++;
  return { days, answers: s.attempts.length };
}

/** Données utilisées sans compte sur cet appareil, à proposer au compte (null si rien à faire). */
function guestCandidate(uid: string): LearnerState | null {
  const guest = getScope() === 'guest' ? getState() : (() => {
    const l = loadScope('guest');
    return l.found ? l.state : null;
  })();
  if (!guest || !hasProgress(guest)) return null;
  if (getFlag('guest-migration') === uid) return null; // déjà intégrées, nettoyage en attente
  if (getFlag(`guest-ignored:${uid}`) === guest.updatedAt) return null; // déjà refusées (et inchangées depuis)
  return guest;
}

/** Après une sauvegarde en ligne confirmée, les données sans compte intégrées au compte sont archivées. */
function archiveGuestIfMigrated() {
  const uid = getAccount().user?.id;
  if (!uid || getFlag('guest-migration') !== uid) return;
  const l = loadScope('guest');
  if (l.found && hasProgress(l.state)) {
    addBackup('guest', { at: new Date().toISOString(), reason: `Données sans compte transférées dans le compte ${getAccount().user?.email}`, state: l.state });
  }
  saveScope('guest', createInitialState());
  setFlag('guest-migration', null);
}
onSaved(archiveGuestIfMigrated);

function install(user: User, state: LearnerState) {
  switchScope(userScope(user.id), { ...state, meta: { ...state.meta, ownerId: user.id } });
  setFlag('last-user', JSON.stringify(user));
  setGuestModeChosen(false);
  setAccount({ status: 'signed-in', user, guestMode: false, notice: undefined, restoreError: undefined, choice: undefined });
}

function applyPlan(user: User, plan: ReturnType<typeof planRestore>) {
  install(user, plan.state);
  startAutosave(user.id);
  if (plan.usedGuest) setFlag('guest-migration', user.id);
  if (plan.push) void saveNow();
}

/** Récupère la progression en ligne du compte et l'installe (avant d'afficher le tableau de bord). */
export async function restore(user: User): Promise<void> {
  const seq = ++restoreSeq;
  setAccount({ status: 'restoring', user, notice: undefined, restoreError: undefined });
  const sb = await getSupabase();
  if (!sb) return;
  const cacheLoad = loadScope(userScope(user.id));
  const cache = cacheLoad.found && (!cacheLoad.state.meta.ownerId || cacheLoad.state.meta.ownerId === user.id) ? cacheLoad.state : null;
  let remote: RemoteRow | null;
  try {
    remote = await withTimeout(fetchRemote(sb, user.id), 12_000);
  } catch (e) {
    if (seq !== restoreSeq) return;
    if (cache && typeof navigator !== 'undefined' && navigator.onLine === false) {
      // Hors ligne au démarrage : on rouvre la copie de ce compte ; elle sera fusionnée avec la version en ligne au retour du réseau.
      continueWithCache('Hors ligne : votre progression enregistrée sur cet appareil est affichée. Elle sera synchronisée au retour de la connexion.');
      return;
    }
    const message = e instanceof Error && e.message !== 'timeout' ? frenchAuthError(e.message) : 'Le serveur ne répond pas.';
    // Sans réponse du serveur, on ne montre JAMAIS une progression vide à la place de la vraie.
    setAccount({ status: 'restore-error', restoreError: message, canUseCache: !!cache });
    return;
  }
  if (seq !== restoreSeq) return;
  const guest = guestCandidate(user.id);
  const plan = planRestore({ userId: user.id, remote, cache, guest });
  if (plan.needsGuestChoice && guest) {
    pendingChoice = { user, remote, cache, guest };
    const a = summarize(plan.state);
    const g = summarize(guest);
    setAccount({ status: 'choice', choice: { accountDays: a.days, accountAnswers: a.answers, deviceDays: g.days, deviceAnswers: g.answers } });
    return;
  }
  applyPlan(user, plan);
}

/** Réponse de l'utilisateur à la question « que faire des données de cet appareil ? ». */
export function resolveGuestChoice(policy: GuestPolicy) {
  if (!pendingChoice) return;
  const { user, remote, cache, guest } = pendingChoice;
  pendingChoice = null;
  if (policy === 'ignore') setFlag(`guest-ignored:${user.id}`, guest.updatedAt);
  applyPlan(user, planRestore({ userId: user.id, remote, cache, guest, guestPolicy: policy }));
}

/** Après un échec de restauration : réessayer. */
export function retryRestore() {
  const u = getAccount().user;
  if (u) void restore(u);
}

/** Après un échec de restauration : continuer avec la copie locale de ce compte (elle sera fusionnée plus tard). */
export function continueWithCache(message = 'Copie locale utilisée : elle sera fusionnée avec votre compte dès que le serveur répondra.') {
  const u = getAccount().user;
  if (!u) return;
  const l = loadScope(userScope(u.id));
  if (!l.found) return;
  install(u, l.state);
  startAutosave(u.id);
  toast(message);
}

function toGuest(notice?: string) {
  stopAutosave();
  switchScope('guest', loadScope('guest').state);
  setGuestModeChosen(false);
  setAccount({ status: 'signed-out', user: null, guestMode: false, notice, choice: undefined, restoreError: undefined });
}

/** Déconnexion volontaire : on envoie d'abord ce qui reste à sauvegarder. */
export async function signOutFlow(): Promise<boolean> {
  const sb = await getSupabase();
  const saved = await flushWithTimeout(6000);
  stopAutosave();
  try {
    const { error } = (await sb?.auth.signOut()) ?? { error: null };
    if (error) await sb?.auth.signOut({ scope: 'local' });
  } catch {
    await sb?.auth.signOut({ scope: 'local' }).catch(() => undefined);
  }
  toGuest(saved ? 'Vous êtes déconnecté. Votre progression est sauvegardée en ligne.' : 'Vous êtes déconnecté. Certaines modifications n’ont pas pu être envoyées : elles restent sur cet appareil et seront envoyées à votre prochaine connexion ici.');
  return saved;
}

/** Après suppression du compte : on efface aussi sa copie locale. */
export async function afterAccountDeleted() {
  const u = getAccount().user;
  const sb = await getSupabase();
  stopAutosave();
  await sb?.auth.signOut({ scope: 'local' }).catch(() => undefined);
  if (u) removeScope(userScope(u.id));
  setFlag('last-user', null);
  toGuest('Votre compte a été supprimé.');
}

export function chooseGuestMode() {
  setGuestModeChosen(true);
  setAccount({ guestMode: true });
}

function cleanUrl() {
  if (window.location.search) window.history.replaceState(null, '', window.location.pathname + window.location.hash);
}

/** Démarrage : vérifie la session enregistrée et restaure la progression du compte. */
export async function initSession(): Promise<void> {
  if (initialized || !supabaseConfigured()) return;
  initialized = true;
  const params = new URLSearchParams(window.location.search);
  const fromReset = params.has('reinitialisation');
  const fromConfirm = params.has('confirmation');
  const hadCode = params.has('code');
  const urlError = params.get('error_description') || params.get('error');
  const sb = await getSupabase();
  if (!sb) return;

  let session = null;
  try {
    const { data } = await sb.auth.getSession();
    session = data.session;
  } catch {
    session = null;
  }
  cleanUrl();

  sb.auth.onAuthStateChange((event, s) => {
    // Ne pas appeler d'autres méthodes Supabase directement dans ce rappel (recommandation Supabase).
    setTimeout(() => {
      if (s?.access_token) setAutosaveToken(s.access_token);
      const current = getAccount();
      if (event === 'SIGNED_IN' && s?.user && current.user?.id !== s.user.id) void restore({ id: s.user.id, email: s.user.email ?? '' });
      if (event === 'PASSWORD_RECOVERY') window.location.hash = '#/nouveau-mot-de-passe';
      if (event === 'SIGNED_OUT' && current.user) toGuest('Votre session a expiré ou vous avez été déconnecté. Reconnectez-vous pour retrouver votre progression.');
    }, 0);
  });

  if (session?.user) {
    setAutosaveToken(session.access_token);
    await restore({ id: session.user.id, email: session.user.email ?? '' });
    if (fromReset) window.location.hash = '#/nouveau-mot-de-passe';
    else if (fromConfirm) {
      if (getAccount().status === 'signed-in') window.location.hash = '#/dashboard';
      toast('Adresse e-mail confirmée. Bienvenue !');
    }
    return;
  }

  const active = getActiveScope();
  const lastUser = (() => {
    try {
      return JSON.parse(getFlag('last-user') ?? 'null') as User | null;
    } catch {
      return null;
    }
  })();
  if (active.startsWith('user:') && navigator.onLine === false && lastUser && active === userScope(lastUser.id)) {
    // Hors ligne au démarrage : on rouvre la copie locale du compte ; la session sera revérifiée au retour du réseau.
    setAccount({ status: 'signed-in', user: lastUser });
    window.addEventListener(
      'online',
      () => {
        initialized = false;
        void initSession();
      },
      { once: true },
    );
    return;
  }

  let notice: string | undefined;
  if (active.startsWith('user:')) notice = 'Votre session a expiré. Reconnectez-vous pour retrouver votre progression.';
  if (urlError) notice = frenchAuthError(urlError);
  else if (hadCode || fromConfirm) notice = fromReset ? 'Ce lien de réinitialisation doit être ouvert dans le navigateur où vous l’avez demandé, ou il a expiré. Redemandez-en un.' : 'Si vous venez de confirmer votre adresse, connectez-vous ci-dessous.';
  if (active.startsWith('user:')) switchScope('guest', loadScope('guest').state);
  setAccount({ status: 'signed-out', user: null, notice });
}
