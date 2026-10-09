// Logique de synchronisation (pure, testable). L'accès réseau est dans services/sync.ts.
import { mergeStates } from './merge';
import { currentStreak, isDayDone, sumDays, vocabCounts } from './progress';
import type { LearnerState } from './state';

export type SyncDecision =
  | { action: 'none' }
  | { action: 'push'; expectedRevision: number | null; state: LearnerState }
  | { action: 'pull'; state: LearnerState }
  | { action: 'merge'; expectedRevision: number; state: LearnerState };

export interface RemoteRow {
  state: LearnerState;
  revision: number;
}

/** Un état « vierge » (rien appris) peut être remplacé par l'état distant sans fusion. */
export function isPristine(s: LearnerState): boolean {
  return s.attempts.length === 0 && s.assessments.length === 0 && Object.keys(s.activities).length === 0;
}

/**
 * Décide quoi faire en comparant l'état local et la ligne distante.
 * - Rien sur le serveur → envoyer.
 * - Le serveur n'a pas changé depuis la dernière synchro → envoyer si modifications locales.
 * - Le serveur a changé et pas de modifications locales → récupérer.
 * - Les deux ont changé → FUSIONNER (jamais d'écrasement silencieux).
 */
export function decideSync(local: LearnerState, remote: RemoteRow | null): SyncDecision {
  if (!remote) return { action: 'push', expectedRevision: null, state: local };
  const base = local.meta.syncedRevision;
  if (base !== undefined && remote.revision === base) {
    return local.meta.dirty ? { action: 'push', expectedRevision: remote.revision, state: local } : { action: 'none' };
  }
  if (!local.meta.dirty || isPristine(local)) return { action: 'pull', state: remote.state };
  return { action: 'merge', expectedRevision: remote.revision, state: mergeStates(local, remote.state) };
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
