// Indicateurs de progression calculés à partir des données réellement enregistrées.
import { ALL_DAYS, getActivity, getDay, isAssessmentActivity, PROGRAM_LENGTH, VOCAB, dayTest, type Skill, SKILLS } from '../content';
import { cardStatus, dueQueue, type CardStatus } from './srs';
import { addDays, dateKey, type DailyStats, type LearnerState } from './state';

export const PASS_SCORE = 0.7;

export type DayStatus = 'locked' | 'available' | 'in-progress' | 'done';

export function activityDone(state: LearnerState, activityId: string): boolean {
  return state.activities[activityId]?.status === 'done';
}

export function assessmentDone(state: LearnerState, kind: 'placement' | 'final' | 'extension'): boolean {
  return state.assessments.some((a) => a.kind === kind);
}

export function lastAssessment(state: LearnerState, kind: 'placement' | 'final' | 'extension') {
  return [...state.assessments].reverse().find((a) => a.kind === kind);
}

/** Un jour est terminé quand son test de validation (ou son évaluation) est fait. */
export function isDayDone(state: LearnerState, day: number): boolean {
  const test = dayTest(day);
  if (!test) return false;
  if (isAssessmentActivity(test)) return assessmentDone(state, day === PROGRAM_LENGTH ? 'final' : 'extension');
  return activityDone(state, test.id);
}

export function isDayUnlocked(state: LearnerState, day: number): boolean {
  if (day === 1) return true;
  if (day > PROGRAM_LENGTH && !state.program.extensionEnabled) return false;
  return isDayDone(state, day - 1);
}

export function dayCompletion(state: LearnerState, day: number): number {
  const d = getDay(day);
  if (!d) return 0;
  const done = d.activities.filter((a) => (isAssessmentActivity(a) ? isDayDone(state, day) : activityDone(state, a.id))).length;
  return done / d.activities.length;
}

export function dayStatus(state: LearnerState, day: number): DayStatus {
  if (!isDayUnlocked(state, day)) return 'locked';
  const c = dayCompletion(state, day);
  if (isDayDone(state, day) && c >= 1) return 'done';
  if (c > 0) return 'in-progress';
  return isDayDone(state, day) ? 'done' : 'available';
}

/** Jour en cours : le premier jour débloqué qui n'est pas terminé. */
export function currentDay(state: LearnerState): number {
  const max = state.program.extensionEnabled ? ALL_DAYS.length : PROGRAM_LENGTH;
  for (let d = 1; d <= max; d++) if (!isDayDone(state, d)) return d;
  return max;
}

export function programFinished(state: LearnerState): boolean {
  return isDayDone(state, PROGRAM_LENGTH);
}

/** Le test du jour a été réussi à moins de 70 % : on conseille une remédiation avant d'avancer. */
export function needsRemediation(state: LearnerState, day: number): boolean {
  const test = dayTest(day);
  if (!test || isAssessmentActivity(test)) return false;
  const p = state.activities[test.id];
  return !!p && p.status === 'done' && p.bestScore < PASS_SCORE && !state.program.skippedRemediation.includes(day);
}

// ------------------------------------------------------------------ Régularité

/** Un jour compte pour la série s'il y a eu un apprentissage réel (pas seulement de l'ouverture d'appli). */
export function isActiveDay(d: DailyStats | undefined): boolean {
  if (!d) return false;
  return d.activitiesDone >= 1 || d.reviews >= 15 || d.itemsCorrect >= 15 || d.conversationTurns >= 8;
}

export function currentStreak(state: LearnerState, today: Date): number {
  let streak = 0;
  let d = new Date(today);
  if (!isActiveDay(state.daily[dateKey(d)])) d = addDays(d, -1);
  while (isActiveDay(state.daily[dateKey(d)])) {
    streak++;
    d = addDays(d, -1);
  }
  return streak;
}

export function bestStreak(state: LearnerState): number {
  const keys = Object.keys(state.daily).filter((k) => isActiveDay(state.daily[k])).sort();
  let best = 0;
  let run = 0;
  let prev: Date | null = null;
  for (const k of keys) {
    const d = new Date(`${k}T12:00:00`);
    run = prev && Math.round((d.getTime() - prev.getTime()) / 86_400_000) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  return best;
}

export function today(state: LearnerState, now: Date): DailyStats {
  return state.daily[dateKey(now)] ?? { seconds: 0, xp: 0, itemsCorrect: 0, itemsTotal: 0, reviews: 0, activitiesDone: 0, conversationTurns: 0, aiCalls: 0 };
}

export function lastNDays(state: LearnerState, now: Date, n: number): { key: string; date: Date; stats: DailyStats }[] {
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const date = addDays(now, -i);
    const key = dateKey(date);
    out.push({ key, date, stats: today(state, date) });
  }
  return out;
}

export function sumDays(state: LearnerState, now: Date, n: number, field: keyof DailyStats): number {
  return lastNDays(state, now, n).reduce((a, d) => a + (d.stats[field] ?? 0), 0);
}

export function totalSeconds(state: LearnerState): number {
  return Object.values(state.daily).reduce((a, d) => a + d.seconds, 0);
}

// ------------------------------------------------------------------ Compétences et notions

export interface SkillStat {
  skill: Skill;
  attempts: number;
  accuracy: number | null;
}

/** Précision par compétence sur les exercices (hors évaluations), 200 dernières tentatives par compétence. */
export function skillStats(state: LearnerState): SkillStat[] {
  return SKILLS.map((skill) => {
    const list = state.attempts.filter((a) => a.skill === skill && a.source !== 'assessment' && a.outcome !== 'skipped').slice(-200);
    if (!list.length) return { skill, attempts: 0, accuracy: null };
    return { skill, attempts: list.length, accuracy: list.reduce((acc, a) => acc + a.score, 0) / list.length };
  });
}

export interface ConceptMastery {
  concept: string;
  ewma: number;
  attempts: number;
  status: 'weak' | 'learning' | 'strong';
}

export function conceptMastery(state: LearnerState): ConceptMastery[] {
  return Object.entries(state.concepts).map(([concept, c]) => ({
    concept,
    ewma: c.ewma,
    attempts: c.attempts,
    status: c.attempts >= 2 && c.ewma < 0.6 ? 'weak' : c.attempts >= 4 && c.ewma >= 0.85 ? 'strong' : 'learning',
  }));
}

export function weakConcepts(state: LearnerState, limit = 5): string[] {
  return conceptMastery(state)
    .filter((c) => c.status === 'weak' && c.concept !== 'comprehension' && c.concept !== 'pronunciation')
    .sort((a, b) => a.ewma - b.ewma)
    .slice(0, limit)
    .map((c) => c.concept);
}

export function openMistakes(state: LearnerState) {
  return Object.values(state.mistakes)
    .filter((m) => !m.resolvedAt)
    .sort((a, b) => b.wrongCount - a.wrongCount || b.lastWrongAt.localeCompare(a.lastWrongAt));
}

// ------------------------------------------------------------------ Vocabulaire

/** Mots déjà introduits (jours commencés) ou présents dans la file de révision. */
export function introducedWordIds(state: LearnerState): string[] {
  const days = new Set<number>();
  for (const id of Object.keys(state.activities)) {
    const a = getActivity(id);
    if (a?.kind === 'vocabulary') {
      const n = Number(/^d(\d+)-/.exec(id)?.[1]);
      if (n) days.add(n);
    }
  }
  const ids = new Set(Object.keys(state.vocab));
  for (const w of VOCAB) if (days.has(w.day)) ids.add(w.id);
  return [...ids];
}

export function vocabCounts(state: LearnerState): Record<CardStatus, number> {
  const counts: Record<CardStatus, number> = { new: 0, learning: 0, fragile: 0, mastered: 0 };
  for (const id of introducedWordIds(state)) counts[cardStatus(state.vocab[id])]++;
  return counts;
}

export function dueCards(state: LearnerState, now: Date, limit = 50) {
  return dueQueue(Object.values(state.vocab), now, limit);
}

// ------------------------------------------------------------------ Recommandation

export interface Recommendation {
  title: string;
  reason: string;
  link: string;
  kind: 'resume' | 'placement' | 'review' | 'mistakes' | 'activity' | 'remediation' | 'assessment' | 'extension' | 'free';
}

/** Le prochain exercice recommandé, déterminé par les données réelles. */
export function nextRecommendation(state: LearnerState, now: Date): Recommendation {
  if (!assessmentDone(state, 'placement'))
    return { kind: 'placement', title: 'Test de positionnement', reason: 'Pour adapter le parcours à votre niveau réel.', link: '/evaluation/placement' };
  if (state.session) {
    const a = state.session.dynamic ? undefined : getActivity(state.session.activityId);
    return {
      kind: 'resume',
      title: a ? `Reprendre : ${a.title}` : 'Reprendre la session en cours',
      reason: `Session interrompue — ${state.session.index}/${state.session.itemIds.length} exercices faits.`,
      link: `/activite/${encodeURIComponent(state.session.activityId)}`,
    };
  }
  const due = dueCards(state, now).length;
  if (due >= 15) return { kind: 'review', title: `Réviser ${due} mots`, reason: 'Ces mots sont sur le point d’être oubliés.', link: '/revision' };
  const mistakes = openMistakes(state).length;
  if (mistakes >= 8) return { kind: 'mistakes', title: `Corriger ${mistakes} erreurs`, reason: 'Retravaillez vos erreurs avant d’avancer.', link: '/revision?onglet=erreurs' };
  const day = currentDay(state);
  if (day > 1 && needsRemediation(state, day - 1))
    return {
      kind: 'remediation',
      title: `Consolider le jour ${day - 1}`,
      reason: 'Votre test de validation est sous 70 % : une révision ciblée est conseillée.',
      link: `/activite/${encodeURIComponent(`remediation-${day - 1}`)}`,
    };
  if (programFinished(state) && !state.program.extensionEnabled)
    return { kind: 'extension', title: 'Voir votre rapport final', reason: 'Découvrez vos progrès et la suite possible.', link: '/rapport' };
  const d = getDay(day);
  if (d && isDayUnlocked(state, day)) {
    const next = d.activities.find((a) => (isAssessmentActivity(a) ? !isDayDone(state, day) : !activityDone(state, a.id)));
    if (next) {
      if (isAssessmentActivity(next))
        return { kind: 'assessment', title: next.title, reason: `Jour ${day} — ${d.title}`, link: `/evaluation/${day === PROGRAM_LENGTH ? 'final' : 'extension'}` };
      return { kind: 'activity', title: next.title, reason: `Jour ${day} — ${d.title}`, link: `/activite/${encodeURIComponent(next.id)}` };
    }
  }
  if (due > 0) return { kind: 'review', title: `Réviser ${due} mots`, reason: 'Entretenez votre vocabulaire.', link: '/revision' };
  return { kind: 'free', title: 'Conversation libre', reason: 'Pratiquez avec le professeur ou le partenaire local.', link: '/conversation' };
}
