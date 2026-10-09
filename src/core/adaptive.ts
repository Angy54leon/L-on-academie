// Adaptation du parcours, fondée sur les résultats réellement enregistrés (jamais au hasard).
import { getDay, getItem, getWord, programItems, PROGRAM_LENGTH, type Activity, type Item } from '../content';
import { cardStatus } from './srs';
import { currentDay, dueCards, isDayUnlocked, lastAssessment, openMistakes, weakConcepts } from './progress';
import type { LearnerState } from './state';

export type LearnerLevel = 1 | 2 | 3;

export const LEVEL_LABELS: Record<LearnerLevel, string> = {
  1: 'Soutien renforcé',
  2: 'Standard',
  3: 'Défi',
};

/** Générateur pseudo-aléatoire reproductible (mulberry32). */
export function seededRandom(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(list: T[], rand: () => number): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Niveau d'accompagnement :
 *  - avec moins de 12 réponses, on se fie au test de positionnement ;
 *  - ensuite, à la réussite pondérée des 30 dernières réponses (hors évaluations).
 */
export function learnerLevel(state: LearnerState): LearnerLevel {
  const recent = state.attempts.filter((a) => a.source !== 'assessment' && a.outcome !== 'skipped').slice(-30);
  if (recent.length < 12) {
    const placement = lastAssessment(state, 'placement');
    if (!placement) return 2;
    if (placement.overall < 35) return 1;
    if (placement.overall >= 70) return 3;
    return 2;
  }
  let num = 0;
  let den = 0;
  for (const a of recent) {
    const w = a.difficulty;
    num += a.score * w;
    den += w;
  }
  const acc = num / den;
  if (acc >= 0.85) return 3;
  if (acc < 0.6) return 1;
  return 2;
}

/**
 * Niveau d'immersion (0 = consignes en français … 3 = tout en anglais).
 * Augmente avec le jour du parcours, ajusté selon le niveau d'accompagnement.
 */
export function immersionLevel(state: LearnerState, day = currentDay(state)): number {
  if (state.settings.immersion !== 'auto') return state.settings.immersion;
  const base = day <= 3 ? 0 : day <= 7 ? 1 : day <= 11 ? 2 : 3;
  const lvl = learnerLevel(state);
  return Math.max(0, Math.min(3, base + (lvl === 1 ? -1 : lvl === 3 ? 1 : 0)));
}

export function hintsVisible(state: LearnerState): boolean {
  if (state.settings.showHints === 'always') return true;
  if (state.settings.showHints === 'never') return false;
  return learnerLevel(state) === 1;
}

/** Jours dont le contenu peut être réutilisé (déjà débloqués : pas de « spoiler »). */
function unlockedDays(state: LearnerState): Set<number> {
  const set = new Set<number>();
  const max = state.program.extensionEnabled ? 24 : PROGRAM_LENGTH;
  for (let d = 1; d <= max; d++) if (isDayUnlocked(state, d)) set.add(d);
  return set;
}

function recentlyCorrect(state: LearnerState, itemId: string): boolean {
  const last = [...state.attempts].reverse().find((a) => a.itemId === itemId);
  return !!last && last.correct;
}

/** Exercices de remédiation : même notion, plus simples, issus des jours déjà débloqués. */
export function remediationPool(state: LearnerState, concepts: string[], exclude: Set<string>, maxDifficulty = 3): Item[] {
  const days = unlockedDays(state);
  return programItems()
    .filter(({ item, day }) => days.has(day) && concepts.includes(item.concept) && !exclude.has(item.id))
    .filter(({ item }) => item.difficulty <= maxDifficulty && item.type !== 'free' && item.type !== 'speak')
    .filter(({ item }) => !recentlyCorrect(state, item.id))
    .map(({ item }) => item);
}

/**
 * Sélection adaptative des exercices d'une activité.
 * Les tests et évaluations ne sont jamais modifiés (pour rester comparables).
 */
export function buildSessionItems(activity: Activity, state: LearnerState, seed: number): string[] {
  const ids = activity.items.map((i) => i.id);
  if (activity.kind === 'test' || activity.kind === 'lesson' || activity.kind === 'vocabulary' || activity.items.length < 5) return ids;
  const level = learnerLevel(state);
  const rand = seededRandom(seed);
  const own = new Set(ids);
  if (level === 1) {
    // Soutien : on commence par le plus simple et on ajoute 2 exercices de remédiation sur les notions fragiles.
    const sorted = [...activity.items].sort((a, b) => a.difficulty - b.difficulty).map((i) => i.id);
    const concepts = Array.from(new Set(activity.items.map((i) => i.concept)));
    const weak = weakConcepts(state, 8).filter((c) => concepts.includes(c));
    const extra = shuffle(remediationPool(state, weak.length ? weak : concepts, own, 2), rand)
      .slice(0, 2)
      .map((i) => i.id);
    return [...extra, ...sorted];
  }
  if (level === 3) {
    // Défi : on retire les exercices les plus simples et on ajoute des exercices exigeants déjà débloqués.
    const harder = activity.items.filter((i) => i.difficulty > 1).map((i) => i.id);
    const base = harder.length >= 5 ? harder : ids;
    const concepts = Array.from(new Set(activity.items.map((i) => i.concept)));
    const challenge = shuffle(
      remediationPool(state, concepts, own).filter((i) => i.difficulty === 3),
      rand,
    )
      .slice(0, 2)
      .map((i) => i.id);
    return [...base, ...challenge];
  }
  return ids;
}

function makeActivity(id: string, title: string, summary: string, items: Item[]): Activity {
  const skills = Array.from(new Set(items.map((i) => i.skill)));
  return {
    id,
    kind: 'review',
    title,
    summary,
    minutes: Math.max(5, Math.round(items.length * 1.2)),
    skills: skills.length ? skills : ['grammar'],
    items,
  };
}

function vocabItemsForReview(state: LearnerState, now: Date, limit: number): Item[] {
  const due = dueCards(state, now, limit);
  const fragile = Object.values(state.vocab)
    .filter((c) => cardStatus(c) === 'fragile' && !due.includes(c))
    .slice(0, Math.max(0, limit - due.length));
  return [...due, ...fragile]
    .slice(0, limit)
    .map((c) => (c.reps === 0 ? getItem(`v:${c.id}:recognize`) : getItem(`v:${c.id}:recall`)))
    .filter((i): i is Item => !!i && !!getWord(i.id.split(':')[1]));
}

/**
 * Activités construites à la volée à partir des données de l'apprenant :
 *  - remediation-<jour> : consolidation après un test de validation < 70 %
 *  - d<jour>-targeted   : révision ciblée de l'extension
 *  - express            : session express (~15 min)
 *  - mistakes           : erreurs à corriger
 */
export function buildDynamicActivity(id: string, state: LearnerState, now: Date): Activity | undefined {
  const seed = now.getFullYear() * 1000 + now.getMonth() * 40 + now.getDate();
  const rand = seededRandom(seed + id.length);
  const mistakesItems = () =>
    openMistakes(state)
      .map((m) => getItem(m.itemId))
      .filter((i): i is Item => !!i);

  const rem = /^remediation-(\d+)$/.exec(id);
  if (rem) {
    const day = Number(rem[1]);
    const d = getDay(day);
    if (!d) return undefined;
    const dayActivityIds = new Set(d.activities.map((a) => a.id));
    const wrongConcepts = Array.from(
      new Set(state.attempts.filter((a) => a.activityId && dayActivityIds.has(a.activityId) && !a.correct).map((a) => a.concept)),
    );
    const concepts = wrongConcepts.length ? wrongConcepts : d.concepts;
    const dayMistakes = mistakesItems().filter((i) => concepts.includes(i.concept)).slice(0, 5);
    const exclude = new Set(dayMistakes.map((i) => i.id));
    const pool = shuffle(remediationPool(state, concepts, exclude, 2), rand).slice(0, 12 - dayMistakes.length);
    const items = [...pool, ...dayMistakes];
    if (!items.length) return undefined;
    return makeActivity(id, `Consolidation du jour ${day}`, 'Exercices plus simples sur les notions où vous avez fait des erreurs, puis reprise de vos erreurs.', items);
  }

  if (/^d\d+-targeted$/.test(id) || id === 'targeted') {
    const weak = weakConcepts(state, 6);
    const fromMistakes = shuffle(mistakesItems(), rand).slice(0, 6);
    const exclude = new Set(fromMistakes.map((i) => i.id));
    const fromWeak = shuffle(remediationPool(state, weak, exclude), rand).slice(0, 8);
    const vocab = vocabItemsForReview(state, now, 6);
    let items = [...fromWeak, ...fromMistakes, ...vocab];
    if (items.length < 6) {
      // Peu de difficultés enregistrées : révision variée des notions déjà vues.
      const days = unlockedDays(state);
      const general = shuffle(
        programItems().filter(({ item, day }) => days.has(day) && item.difficulty >= 2 && item.type !== 'free' && item.type !== 'speak'),
        rand,
      )
        .slice(0, 12 - items.length)
        .map(({ item }) => item);
      items = [...items, ...general];
    }
    return makeActivity(id, 'Révision ciblée', weak.length ? 'Choisie d’après vos notions fragiles et vos erreurs récurrentes.' : 'Révision variée (peu d’erreurs enregistrées : bravo !).', shuffle(items, rand));
  }

  if (id === 'express') {
    const vocab = vocabItemsForReview(state, now, 8);
    const mistakes = shuffle(mistakesItems(), rand).slice(0, 4);
    const exclude = new Set(mistakes.map((i) => i.id));
    const weak = shuffle(remediationPool(state, weakConcepts(state, 4), exclude), rand).slice(0, 3);
    let items = [...vocab, ...mistakes, ...weak];
    if (items.length < 8) {
      const days = unlockedDays(state);
      items = [
        ...items,
        ...shuffle(
          programItems().filter(({ item, day }) => days.has(day) && item.type !== 'free' && item.type !== 'speak'),
          rand,
        )
          .slice(0, 12 - items.length)
          .map(({ item }) => item),
      ];
    }
    return makeActivity('express', 'Session express (15 min)', 'Vocabulaire à réviser, erreurs à corriger et notions fragiles.', shuffle(items, rand));
  }

  if (id === 'mistakes') {
    const items = mistakesItems().slice(0, 15);
    if (!items.length) return undefined;
    return makeActivity('mistakes', 'Erreurs à corriger', 'Une erreur est résolue après deux bonnes réponses consécutives.', items);
  }
  return undefined;
}

export function isDynamicId(id: string): boolean {
  return /^remediation-\d+$/.test(id) || /^d\d+-targeted$/.test(id) || id === 'express' || id === 'mistakes' || id === 'targeted';
}
