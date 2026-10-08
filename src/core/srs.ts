// Répétition espacée (variante simplifiée de l'algorithme SM-2).
// Un mot n'est jamais considéré comme « maîtrisé » après une seule bonne réponse :
// il faut au moins 3 réussites consécutives ET un intervalle d'au moins 7 jours.

export type Grade = 0 | 1 | 2 | 3; // 0 = à revoir, 1 = difficile, 2 = bien, 3 = facile
export type CardStatus = 'new' | 'learning' | 'fragile' | 'mastered';

export interface SrsCard {
  id: string;
  /** Facteur de facilité (1.3 → 3.0). */
  ease: number;
  /** Intervalle actuel en jours (0 = en apprentissage, révision dans la journée). */
  interval: number;
  /** Date ISO de la prochaine révision. */
  due: string;
  reps: number;
  lapses: number;
  /** Réussites consécutives. */
  streak: number;
  lastReviewedAt?: string;
  /** 10 dernières notes. */
  history: Grade[];
}

export const MASTERED_MIN_INTERVAL = 7;
export const MASTERED_MIN_STREAK = 3;
const MINUTE = 60_000;
const DAY = 86_400_000;

export function newCard(id: string, now: Date): SrsCard {
  return { id, ease: 2.5, interval: 0, due: now.toISOString(), reps: 0, lapses: 0, streak: 0, history: [] };
}

/** Applique une note et calcule la prochaine révision. */
export function reviewCard(card: SrsCard, grade: Grade, now: Date): SrsCard {
  const c: SrsCard = { ...card, history: [...card.history, grade].slice(-10), reps: card.reps + 1, lastReviewedAt: now.toISOString() };
  let dueMs: number;
  if (grade === 0) {
    if (card.interval >= 1) c.lapses = card.lapses + 1;
    c.ease = Math.max(1.3, card.ease - 0.2);
    c.interval = 0;
    c.streak = 0;
    dueMs = now.getTime() + 10 * MINUTE;
  } else if (grade === 1) {
    c.ease = Math.max(1.3, card.ease - 0.15);
    c.streak = card.streak + 1;
    c.interval = card.interval < 1 ? 0.5 : Math.max(1, Math.round(card.interval * 1.2 * 10) / 10);
    dueMs = c.interval < 1 ? now.getTime() + 6 * 60 * MINUTE : now.getTime() + c.interval * DAY;
  } else {
    c.streak = card.streak + 1;
    if (grade === 3) c.ease = Math.min(3, card.ease + 0.15);
    if (card.interval < 1) c.interval = grade === 3 ? 3 : 1;
    else if (card.interval < 3) c.interval = grade === 3 ? 6 : 3;
    else c.interval = Math.round(card.interval * c.ease * (grade === 3 ? 1.3 : 1) * 10) / 10;
    c.interval = Math.min(c.interval, 180);
    dueMs = now.getTime() + c.interval * DAY;
  }
  c.due = new Date(dueMs).toISOString();
  return c;
}

export function cardStatus(card: SrsCard | undefined): CardStatus {
  if (!card || card.reps === 0) return 'new';
  if (card.interval >= MASTERED_MIN_INTERVAL && card.streak >= MASTERED_MIN_STREAK) return 'mastered';
  if (card.lapses > 0 && card.streak < MASTERED_MIN_STREAK) return 'fragile';
  if (card.ease < 2.0 && card.streak < MASTERED_MIN_STREAK) return 'fragile';
  return 'learning';
}

export const STATUS_LABELS: Record<CardStatus, string> = {
  new: 'Nouveau',
  learning: 'En cours',
  fragile: 'Fragile',
  mastered: 'Maîtrisé',
};

export function isDue(card: SrsCard, now: Date): boolean {
  return new Date(card.due).getTime() <= now.getTime();
}

/**
 * File de révision : cartes dues, les plus fragiles et les plus en retard d'abord.
 */
export function dueQueue(cards: SrsCard[], now: Date, limit = 50): SrsCard[] {
  const priority = (c: SrsCard) => {
    const status = cardStatus(c);
    const overdueDays = (now.getTime() - new Date(c.due).getTime()) / DAY;
    return (status === 'fragile' ? 100 : status === 'learning' ? 50 : 0) + Math.min(overdueDays, 30);
  };
  return cards
    .filter((c) => isDue(c, now))
    .sort((a, b) => priority(b) - priority(a))
    .slice(0, limit);
}

/** Note automatique d'une réponse tapée. */
export function gradeFromOutcome(outcome: 'correct' | 'typo' | 'partial' | 'incorrect' | 'skipped', fast = false): Grade {
  if (outcome === 'correct') return fast ? 3 : 2;
  if (outcome === 'typo' || outcome === 'partial') return 1;
  return 0;
}
