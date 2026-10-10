// Logique de synchronisation (pure, testable). L'accès réseau est dans services/autosave.ts et services/session.ts.
// Principe : la base en ligne est la source de vérité du compte ; la copie locale sert de cache
// hors ligne et de file d'attente des modifications non encore envoyées. On ne remplace JAMAIS
// une progression existante par une progression vide : en cas de doute, on fusionne.
import { mergeStates } from './merge';
import { currentStreak, isDayDone, sumDays, vocabCounts } from './progress';
import { createInitialState, type LearnerState } from './state';

export interface RemoteRow {
  state: LearnerState;
  revision: number;
}

/** La progression contient-elle quelque chose ? (même règle que la fonction SQL state_has_progress) */
export function hasProgress(s: LearnerState | null | undefined): boolean {
  if (!s) return false;
  return s.attempts.length > 0 || Object.keys(s.activities).length > 0 || s.assessments.length > 0 || s.profile.onboarded;
}

/** Un état « vierge » (rien appris) peut être remplacé sans fusion. */
export function isPristine(s: LearnerState): boolean {
  return !hasProgress(s);
}

export type GuestPolicy = 'merge' | 'ignore';

export interface RestoreInput {
  userId: string;
  /** Ligne en ligne du compte (null si le compte n'a encore rien sauvegardé). */
  remote: RemoteRow | null;
  /** Copie locale de CE compte sur cet appareil (null si première connexion ici). */
  cache: LearnerState | null;
  /** Données utilisées sans compte sur cet appareil (null si aucune ou déjà traitées). */
  guest: LearnerState | null;
  /** Décision de l'utilisateur sur les données sans compte, si elle a été demandée. */
  guestPolicy?: GuestPolicy;
  now?: Date;
}

export interface RestorePlan {
  /** L'utilisateur doit choisir quoi faire des données sans compte avant de continuer. */
  needsGuestChoice: boolean;
  state: LearnerState;
  /** Faut-il envoyer l'état en ligne juste après la restauration ? */
  push: boolean;
  /** Les données sans compte ont été intégrées au compte. */
  usedGuest: boolean;
}

/** Fusion où `primary` fournit le profil et les réglages quand l'autre version est vierge. */
function mergeInto(base: LearnerState, extra: LearnerState): LearnerState {
  const merged = mergeStates(base, extra);
  if (!hasProgress(base) && hasProgress(extra)) {
    return { ...merged, profile: extra.profile, settings: extra.settings, program: { ...merged.program, ...extra.program } };
  }
  return merged;
}

/** Calcule l'état à installer à la connexion (sans effet de bord). */
export function planRestore(input: RestoreInput): RestorePlan {
  const { userId, remote, cache, guest, guestPolicy } = input;
  let state: LearnerState;
  let push: boolean;

  if (remote) {
    const cacheIsOurs = cache && (!cache.meta.ownerId || cache.meta.ownerId === userId);
    if (cache && cacheIsOurs && cache.meta.dirty && hasProgress(cache)) {
      // Des modifications faites sur cet appareil n'avaient pas encore été envoyées.
      if (cache.meta.syncedRevision === remote.revision) state = cache;
      else state = mergeInto(remote.state, cache);
      push = true;
    } else {
      state = remote.state;
      push = false;
    }
  } else {
    // Le compte n'a encore rien en ligne : on part de la copie locale s'il y en a une.
    state = cache && (!cache.meta.ownerId || cache.meta.ownerId === userId) ? cache : createInitialState(input.now);
    push = true;
  }

  let usedGuest = false;
  if (guest && hasProgress(guest)) {
    if (!hasProgress(state)) {
      // Première connexion avec un compte vide : on récupère automatiquement le travail fait sans compte.
      state = mergeInto(state, guest);
      usedGuest = true;
      push = true;
    } else if (guestPolicy === 'merge') {
      state = mergeInto(state, guest);
      usedGuest = true;
      push = true;
    } else if (guestPolicy !== 'ignore') {
      return { needsGuestChoice: true, state, push: false, usedGuest: false };
    }
  }

  return {
    needsGuestChoice: false,
    state: {
      ...state,
      meta: {
        ...state.meta,
        deviceId: cache?.meta.deviceId ?? guest?.meta.deviceId ?? state.meta.deviceId,
        ownerId: userId,
        syncedRevision: remote?.revision,
        dirty: push,
      },
    },
    push,
    usedGuest,
  };
}

/** Résultat d'un envoi (valeur renvoyée par la fonction SQL push_state). */
export type PushOutcome = { kind: 'saved'; revision: number } | { kind: 'conflict' } | { kind: 'refused-empty' };

export function interpretPushResult(value: unknown): PushOutcome {
  const n = typeof value === 'number' ? value : Number(value);
  if (Number.isFinite(n) && n > 0) return { kind: 'saved', revision: n };
  if (n === -2) return { kind: 'refused-empty' };
  return { kind: 'conflict' };
}

/** Prépare la copie envoyée en ligne (les informations propres à l'appareil ne sont pas utiles). */
export function stateForServer(s: LearnerState): LearnerState {
  return { ...s, meta: { deviceId: s.meta.deviceId, ownerId: s.meta.ownerId, dirty: false } };
}

/** Résumé public (seules ces données peuvent être partagées avec un groupe, selon les réglages). */
export interface PublicSummary {
  displayName: string;
  xpTotal: number;
  xpWeek: number;
  streak: number;
  daysCompleted: number;
  wordsMastered: number;
  badges: number;
  shareProgress: boolean;
  shareStreak: boolean;
  shareBadges: boolean;
}

export function publicSummary(s: LearnerState, now: Date): PublicSummary {
  let days = 0;
  for (let d = 1; d <= 24; d++) if (isDayDone(s, d)) days++;
  return {
    displayName: s.profile.displayName || 'Apprenant',
    xpTotal: s.xp,
    xpWeek: sumDays(s, now, 7, 'xp'),
    streak: currentStreak(s, now),
    daysCompleted: days,
    wordsMastered: vocabCounts(s).mastered,
    badges: Object.keys(s.badges).length,
    shareProgress: s.settings.privacy.shareProgress,
    shareStreak: s.settings.privacy.shareStreak,
    shareBadges: s.settings.privacy.shareBadges,
  };
}
