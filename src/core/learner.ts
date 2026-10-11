// Transitions d'état de l'apprenant. Fonctions PURES : (état, données) → nouvel état.
// Toute la progression affichée provient de ces enregistrements réels.
import type { Item } from '../content/schema';
import type { CheckResult } from './answerCheck';
import { gradeFromOutcome, newCard, reviewCard, type Grade } from './srs';
import {
  dateKey,
  MAX_ATTEMPTS,
  MAX_CONVERSATIONS,
  MAX_NOTIFICATIONS,
  randomId,
  type AppNotification,
  type AssessmentResult,
  type ConversationLog,
  type DailyStats,
  type LearnerState,
  type Profile,
  type SessionState,
  type Settings,
} from './state';

const EWMA_ALPHA = 0.3;

export const XP = {
  correctFirstTry: 10,
  correctRetry: 4,
  typo: 7,
  partial: 3,
  vocabReview: 2,
  activityBonus: 20,
  conversationTurn: 3,
};

/** Marque l'état comme modifié (révision + date + à synchroniser). */
export function touch(state: LearnerState, now: Date): LearnerState {
  return {
    ...state,
    updatedAt: now.toISOString(),
    revision: state.revision + 1,
    meta: { ...state.meta, dirty: true },
  };
}

function emptyDaily(): DailyStats {
  return { seconds: 0, xp: 0, itemsCorrect: 0, itemsTotal: 0, reviews: 0, activitiesDone: 0, conversationTurns: 0, aiCalls: 0 };
}

export function updateDaily(state: LearnerState, now: Date, patch: Partial<Record<keyof DailyStats, number>>): LearnerState {
  const key = dateKey(now);
  const cur = state.daily[key] ?? emptyDaily();
  const next = { ...cur };
  for (const [k, v] of Object.entries(patch) as [keyof DailyStats, number][]) next[k] = (cur[k] ?? 0) + v;
  return { ...state, daily: { ...state.daily, [key]: next } };
}

function addXp(state: LearnerState, now: Date, amount: number): LearnerState {
  if (amount <= 0) return state;
  return updateDaily({ ...state, xp: state.xp + amount }, now, { xp: amount });
}

export interface AttemptInput {
  item: Item;
  result: CheckResult;
  activityId?: string;
  source: 'activity' | 'review' | 'assessment' | 'conversation';
  firstTry: boolean;
  userAnswer?: string;
}

/** Enregistre une réponse : historique, maîtrise des notions, erreurs, vocabulaire, XP. */
export function recordAttempt(state: LearnerState, input: AttemptInput, now: Date): LearnerState {
  const { item, result, source, firstTry } = input;
  if (result.outcome === 'skipped' && source === 'assessment') {
    // Exercice impossible (ex. micro indisponible) : on n'enregistre rien.
    return state;
  }
  const at = now.toISOString();
  const attempt = {
    id: randomId('a'),
    at,
    itemId: item.id,
    activityId: input.activityId,
    concept: item.concept,
    skill: item.skill,
    outcome: result.outcome,
    correct: result.correct,
    score: result.score,
    difficulty: item.difficulty,
    source,
    firstTry,
  };
  let s: LearnerState = { ...state, attempts: [...state.attempts, attempt].slice(-MAX_ATTEMPTS) };

  // Maîtrise de la notion (moyenne mobile exponentielle).
  const prev = s.concepts[item.concept];
  const value = result.correct ? 1 : result.score >= 0.5 ? 0.5 : 0;
  s = {
    ...s,
    concepts: {
      ...s.concepts,
      [item.concept]: {
        ewma: prev ? prev.ewma * (1 - EWMA_ALPHA) + value * EWMA_ALPHA : value,
        attempts: (prev?.attempts ?? 0) + 1,
        correct: (prev?.correct ?? 0) + (result.correct ? 1 : 0),
        lastAt: at,
        lastWrongAt: result.correct ? prev?.lastWrongAt : at,
      },
    },
  };

  // Erreurs à corriger : ajout, ou progression vers la résolution (2 réussites de suite).
  const autoGraded = item.type !== 'free' && item.type !== 'speak';
  if (autoGraded && source !== 'conversation' && source !== 'assessment') {
    const m = s.mistakes[item.id];
    if (!result.correct && result.outcome !== 'skipped') {
      s = {
        ...s,
        mistakes: {
          ...s.mistakes,
          [item.id]: {
            itemId: item.id,
            activityId: input.activityId ?? m?.activityId,
            concept: item.concept,
            addedAt: m?.addedAt ?? at,
            lastWrongAt: at,
            wrongCount: (m?.wrongCount ?? 0) + 1,
            correctStreak: 0,
            lastAnswer: input.userAnswer?.slice(0, 300),
            resolvedAt: undefined,
          },
        },
      };
    } else if (m && !m.resolvedAt && result.correct) {
      const streak = m.correctStreak + 1;
      s = {
        ...s,
        mistakes: { ...s.mistakes, [item.id]: { ...m, correctStreak: streak, resolvedAt: streak >= 2 ? at : undefined } },
      };
    }
  }

  // Exercices de vocabulaire : mise à jour de la carte de répétition espacée.
  const vm = /^v:(.+):(recognize|recall)$/.exec(item.id);
  if (vm && source !== 'assessment') {
    // La reconnaissance (QCM) est plus facile que le rappel : une réussite y vaut « difficile ».
    let grade = gradeFromOutcome(result.outcome);
    if (vm[2] === 'recognize' && grade > 1) grade = 1;
    s = applyVocabGrade(s, vm[1], grade, now);
  }

  // Statistiques du jour et XP (jamais pour les évaluations : on ne « gagne » pas un test).
  if (source !== 'assessment') {
    s = updateDaily(s, now, { itemsTotal: 1, itemsCorrect: result.correct ? 1 : 0 });
    let xp = 0;
    if (result.outcome === 'correct') xp = firstTry ? XP.correctFirstTry : XP.correctRetry;
    else if (result.outcome === 'typo') xp = XP.typo;
    else if (result.outcome === 'partial') xp = XP.partial;
    xp = Math.round(xp * (1 + (item.difficulty - 1) * 0.25));
    s = addXp(s, now, xp);
  }
  return s;
}

function applyVocabGrade(state: LearnerState, wordId: string, grade: Grade, now: Date): LearnerState {
  const card = state.vocab[wordId] ?? newCard(wordId, now);
  return { ...state, vocab: { ...state.vocab, [wordId]: reviewCard(card, grade, now) } };
}

/** Révision d'une fiche de vocabulaire (cartes mémoire). */
export function reviewVocab(state: LearnerState, wordId: string, grade: Grade, now: Date): LearnerState {
  let s = applyVocabGrade(state, wordId, grade, now);
  s = updateDaily(s, now, { reviews: 1 });
  return addXp(s, now, grade >= 2 ? XP.vocabReview : 1);
}

/** Ajoute des mots à la file de révision (sans les marquer comme vus). */
export function introduceWords(state: LearnerState, wordIds: string[], now: Date): LearnerState {
  const vocab = { ...state.vocab };
  let changed = false;
  for (const id of wordIds)
    if (!vocab[id]) {
      vocab[id] = newCard(id, now);
      changed = true;
    }
  return changed ? { ...state, vocab } : state;
}

/** Termine une activité avec son score (0 → 1). */
export function completeActivity(state: LearnerState, activityId: string, score: number, seconds: number, now: Date): LearnerState {
  const prev = state.activities[activityId];
  const firstCompletion = prev?.status !== 'done';
  let s: LearnerState = {
    ...state,
    activities: {
      ...state.activities,
      [activityId]: {
        status: 'done',
        bestScore: Math.max(prev?.bestScore ?? 0, score),
        lastScore: score,
        attempts: (prev?.attempts ?? 0) + 1,
        completedAt: now.toISOString(),
        timeSpentSec: (prev?.timeSpentSec ?? 0) + seconds,
      },
    },
    program: { ...state.program, startedAt: state.program.startedAt ?? now.toISOString() },
  };
  s = updateDaily(s, now, { activitiesDone: 1 });
  // Bonus seulement à la première réussite (≥ 70 %) : on récompense la maîtrise, pas la répétition.
  if (firstCompletion && score >= 0.7) s = addXp(s, now, XP.activityBonus);
  return s;
}

export function markActivityStarted(state: LearnerState, activityId: string, now: Date): LearnerState {
  if (state.activities[activityId]) return state;
  return {
    ...state,
    activities: { ...state.activities, [activityId]: { status: 'started', bestScore: 0, lastScore: 0, attempts: 0, timeSpentSec: 0 } },
    program: { ...state.program, startedAt: state.program.startedAt ?? now.toISOString() },
  };
}

/** Temps d'étude actif (secondes). */
export function addStudyTime(state: LearnerState, seconds: number, now: Date): LearnerState {
  if (seconds <= 0) return state;
  return updateDaily(state, now, { seconds: Math.min(seconds, 3600) });
}

export function saveSession(state: LearnerState, session: SessionState | undefined): LearnerState {
  return { ...state, session };
}

export function saveAssessment(state: LearnerState, result: AssessmentResult): LearnerState {
  return { ...state, assessments: [...state.assessments, result] };
}

export function pushNotification(state: LearnerState, n: Omit<AppNotification, 'id' | 'read'>): LearnerState {
  const item: AppNotification = { ...n, id: randomId('n'), read: false };
  return { ...state, notifications: [item, ...state.notifications].slice(0, MAX_NOTIFICATIONS) };
}

export function markNotificationsRead(state: LearnerState, ids?: string[]): LearnerState {
  return {
    ...state,
    notifications: state.notifications.map((n) => (!ids || ids.includes(n.id) ? { ...n, read: true } : n)),
  };
}

export function updateProfile(state: LearnerState, patch: Partial<Profile>): LearnerState {
  return { ...state, profile: { ...state.profile, ...patch } };
}

export function updateSettings(state: LearnerState, patch: Partial<Settings>, now: Date): LearnerState {
  return { ...state, settings: { ...state.settings, ...patch, updatedAt: now.toISOString() } };
}

export function saveConversation(state: LearnerState, conv: ConversationLog): LearnerState {
  const others = state.conversations.filter((c) => c.id !== conv.id);
  return { ...state, conversations: [conv, ...others].slice(0, MAX_CONVERSATIONS) };
}

export function recordConversationTurn(state: LearnerState, now: Date, usedAi: boolean, wordCount: number): LearnerState {
  // Une réplique ne rapporte de l'XP que si elle contient une vraie phrase (≥ 4 mots).
  let s = updateDaily(state, now, { conversationTurns: 1, aiCalls: usedAi ? 1 : 0 });
  if (wordCount >= 4) s = addXp(s, now, XP.conversationTurn);
  return s;
}

/** Appel au professeur IA sans réplique de l'apprenant (ouverture de la conversation) : compte pour le quota du jour. */
export function recordAiCall(state: LearnerState, now: Date): LearnerState {
  return updateDaily(state, now, { aiCalls: 1 });
}

/** Signal de maîtrise d'une notion hors exercice (ex. erreur repérée en conversation). */
export function recordConceptSignal(state: LearnerState, concept: string, correct: boolean, now: Date): LearnerState {
  const at = now.toISOString();
  const prev = state.concepts[concept];
  const value = correct ? 1 : 0;
  return {
    ...state,
    concepts: {
      ...state.concepts,
      [concept]: {
        ewma: prev ? prev.ewma * (1 - EWMA_ALPHA) + value * EWMA_ALPHA : value,
        attempts: (prev?.attempts ?? 0) + 1,
        correct: (prev?.correct ?? 0) + (correct ? 1 : 0),
        lastAt: at,
        lastWrongAt: correct ? prev?.lastWrongAt : at,
      },
    },
  };
}
