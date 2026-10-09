// Fusion de deux versions des données (synchronisation entre appareils).
// Règle : on ne perd aucune donnée d'apprentissage. Les historiques sont réunis,
// et pour chaque élément on garde la version la plus avancée ou la plus récente.
import type { ActivityProgress, DailyStats, LearnerState } from './state';
import { MAX_ATTEMPTS, MAX_CONVERSATIONS, MAX_NOTIFICATIONS } from './state';

function unionById<T extends { id: string }>(a: T[], b: T[], sortKey: (x: T) => string, max: number, desc = false): T[] {
  const map = new Map<string, T>();
  for (const x of [...a, ...b]) map.set(x.id, x);
  const out = [...map.values()].sort((x, y) => sortKey(x).localeCompare(sortKey(y)));
  if (desc) out.reverse();
  return desc ? out.slice(0, max) : out.slice(-max);
}

function mergeRecord<T>(a: Record<string, T>, b: Record<string, T>, pick: (x: T, y: T) => T): Record<string, T> {
  const out: Record<string, T> = { ...a };
  for (const [k, v] of Object.entries(b)) out[k] = k in out ? pick(out[k], v) : v;
  return out;
}

const later = (x?: string, y?: string) => (x ?? '') >= (y ?? '');

function mergeActivity(x: ActivityProgress, y: ActivityProgress): ActivityProgress {
  return {
    status: x.status === 'done' || y.status === 'done' ? 'done' : 'started',
    bestScore: Math.max(x.bestScore, y.bestScore),
    lastScore: later(x.completedAt, y.completedAt) ? x.lastScore : y.lastScore,
    attempts: Math.max(x.attempts, y.attempts),
    completedAt: later(x.completedAt, y.completedAt) ? x.completedAt : y.completedAt,
    timeSpentSec: Math.max(x.timeSpentSec, y.timeSpentSec),
  };
}

function mergeDaily(x: DailyStats, y: DailyStats): DailyStats {
  // Les compteurs d'une même journée sur deux appareils : on garde le maximum de chaque compteur
  // (on évite ainsi de compter deux fois une même journée déjà synchronisée).
  const out = { ...x };
  for (const k of Object.keys(y) as (keyof DailyStats)[]) out[k] = Math.max(x[k] ?? 0, y[k] ?? 0);
  return out;
}

export function mergeStates(local: LearnerState, remote: LearnerState): LearnerState {
  const attempts = unionById(local.attempts, remote.attempts, (a) => a.at, MAX_ATTEMPTS);
  const newer = later(local.updatedAt, remote.updatedAt) ? local : remote;
  const daily = mergeRecord(local.daily, remote.daily, mergeDaily);
  return {
    ...newer,
    id: remote.id || local.id,
    createdAt: later(local.createdAt, remote.createdAt) ? remote.createdAt : local.createdAt,
    updatedAt: newer.updatedAt,
    revision: Math.max(local.revision, remote.revision) + 1,
    profile: { ...newer.profile, onboarded: local.profile.onboarded || remote.profile.onboarded },
    settings: later(local.settings.updatedAt, remote.settings.updatedAt) ? local.settings : remote.settings,
    program: {
      ...newer.program,
      startedAt: [local.program.startedAt, remote.program.startedAt].filter(Boolean).sort()[0],
      extensionEnabled: local.program.extensionEnabled || remote.program.extensionEnabled,
      extensionFocus: local.program.extensionFocus.length ? local.program.extensionFocus : remote.program.extensionFocus,
      skippedRemediation: Array.from(new Set([...local.program.skippedRemediation, ...remote.program.skippedRemediation])),
    },
    activities: mergeRecord(local.activities, remote.activities, mergeActivity),
    attempts,
    // La maîtrise des notions : on garde la version la plus récemment mise à jour.
    concepts: mergeRecord(local.concepts, remote.concepts, (x, y) => (later(x.lastAt, y.lastAt) ? x : y)),
    // Vocabulaire : la carte révisée le plus récemment.
    vocab: mergeRecord(local.vocab, remote.vocab, (x, y) => (later(x.lastReviewedAt, y.lastReviewedAt) ? x : y)),
    mistakes: mergeRecord(local.mistakes, remote.mistakes, (x, y) => (later(x.resolvedAt ?? x.lastWrongAt, y.resolvedAt ?? y.lastWrongAt) ? x : y)),
    assessments: unionById(local.assessments, remote.assessments, (a) => a.at, 50),
    daily,
    xp: Math.max(local.xp, remote.xp, Object.values(daily).reduce((a, d) => a + d.xp, 0)),
    badges: mergeRecord(local.badges, remote.badges, (x, y) => (x <= y ? x : y)),
    notifications: unionById(local.notifications, remote.notifications, (n) => n.at, MAX_NOTIFICATIONS, true),
    session: newer.session,
    conversations: unionById(local.conversations, remote.conversations, (c) => c.updatedAt, MAX_CONVERSATIONS, true),
    challenges: unionById(local.challenges, remote.challenges, (c) => c.startsAt, 30),
    meta: { ...local.meta, dirty: true },
  };
}

/** Résumé lisible des différences, affiché à l'utilisateur après une fusion. */
export function describeConflict(local: LearnerState, remote: LearnerState): string {
  const la = Object.values(local.activities).filter((a) => a.status === 'done').length;
  const ra = Object.values(remote.activities).filter((a) => a.status === 'done').length;
  return `Cet appareil : ${la} activités, ${local.attempts.length} réponses. Serveur : ${ra} activités, ${remote.attempts.length} réponses.`;
}
