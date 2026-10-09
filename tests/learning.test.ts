import { describe, expect, it } from 'vitest';
import { getActivity, getItem, VOCAB } from '../src/content';
import { checkAnswer } from '../src/core/answerCheck';
import { buildDynamicActivity, buildSessionItems, immersionLevel, learnerLevel } from '../src/core/adaptive';
import { adviseExtension, levelFor, scoreAssessment } from '../src/core/assessment';
import { ASSESSMENT_FORMS } from '../src/content/assessments';
import { completeActivity, recordAttempt, reviewVocab, saveAssessment } from '../src/core/learner';
import { currentDay, currentStreak, isDayUnlocked, needsRemediation, nextRecommendation, openMistakes, vocabCounts, weakConcepts } from '../src/core/progress';
import { awardBadges } from '../src/core/rewards';
import { cardStatus, newCard, reviewCard } from '../src/core/srs';
import { addDays, createInitialState, parseState, type LearnerState } from '../src/core/state';
import { challengeProgress, createChallenge, CHALLENGE_TEMPLATES } from '../src/core/challenges';
import { dailyNotifications } from '../src/core/notifications';

const T0 = new Date('2026-10-01T10:00:00');

function answer(s: LearnerState, itemId: string, correct: boolean, now = T0, source: 'activity' | 'review' = 'activity') {
  const item = getItem(itemId)!;
  const result = correct
    ? { outcome: 'correct' as const, correct: true, score: 1, expected: '', feedback: [] }
    : { outcome: 'incorrect' as const, correct: false, score: 0, expected: '', feedback: [] };
  return recordAttempt(s, { item, result, activityId: itemId.replace(/-\d+$/, ''), source, firstTry: true }, now);
}

describe('répétition espacée', () => {
  it('fait revenir vite un mot oublié et espace un mot connu', () => {
    let c = newCard('w', T0);
    c = reviewCard(c, 0, T0);
    expect(new Date(c.due).getTime() - T0.getTime()).toBe(10 * 60_000);
    c = reviewCard(c, 2, T0);
    expect(c.interval).toBe(1);
    c = reviewCard(c, 2, T0);
    expect(c.interval).toBe(3);
    c = reviewCard(c, 2, T0);
    expect(c.interval).toBeGreaterThan(6);
  });

  it('ne déclare jamais un mot maîtrisé après une seule bonne réponse', () => {
    let c = reviewCard(newCard('w', T0), 3, T0);
    expect(cardStatus(c)).not.toBe('mastered');
    c = reviewCard(c, 3, T0);
    c = reviewCard(c, 3, T0);
    expect(cardStatus(c)).toBe('mastered');
  });

  it('marque comme fragile un mot oublié après avoir été appris', () => {
    let c = newCard('w', T0);
    for (let i = 0; i < 3; i++) c = reviewCard(c, 2, T0);
    c = reviewCard(c, 0, T0);
    expect(cardStatus(c)).toBe('fragile');
  });
});

describe('enregistrement des réponses', () => {
  it('met à jour notions, erreurs, statistiques du jour et XP', () => {
    let s = createInitialState(T0);
    s = answer(s, 'd01-grammar-1', false);
    expect(s.attempts).toHaveLength(1);
    expect(s.concepts['be-present'].attempts).toBe(1);
    expect(openMistakes(s).map((m) => m.itemId)).toContain('d01-grammar-1');
    expect(s.xp).toBe(0);
    s = answer(s, 'd01-grammar-1', true);
    s = answer(s, 'd01-grammar-1', true);
    expect(s.mistakes['d01-grammar-1'].resolvedAt).toBeDefined();
    expect(s.xp).toBeGreaterThan(0);
    expect(Object.values(s.daily)[0].itemsTotal).toBe(3);
  });

  it('ne donne pas d’XP pour les évaluations', () => {
    const s = recordAttempt(createInitialState(T0), { item: ASSESSMENT_FORMS.A.items[0], result: { outcome: 'correct', correct: true, score: 1, expected: '', feedback: [] }, source: 'assessment', firstTry: true }, T0);
    expect(s.xp).toBe(0);
    expect(Object.keys(s.mistakes)).toHaveLength(0);
  });

  it('les exercices de vocabulaire alimentent la répétition espacée', () => {
    const w = VOCAB[0];
    let s = answer(createInitialState(T0), `v:${w.id}:recall`, true);
    expect(s.vocab[w.id].reps).toBe(1);
    s = reviewVocab(s, w.id, 2, T0);
    expect(s.vocab[w.id].reps).toBe(2);
    expect(vocabCounts(s).learning + vocabCounts(s).new).toBeGreaterThan(0);
  });
});

describe('progression et déblocage', () => {
  it('débloque le jour suivant après le test, et conseille une remédiation sous 70 %', () => {
    let s = createInitialState(T0);
    expect(isDayUnlocked(s, 2)).toBe(false);
    s = completeActivity(s, 'd01-test', 0.5, 300, T0);
    expect(isDayUnlocked(s, 2)).toBe(true);
    expect(currentDay(s)).toBe(2);
    expect(needsRemediation(s, 1)).toBe(true);
    s = completeActivity(s, 'd01-test', 0.9, 300, T0);
    expect(needsRemediation(s, 1)).toBe(false);
  });

  it('ne débloque pas l’extension sans accord', () => {
    let s = createInitialState(T0);
    for (let d = 1; d <= 13; d++) s = completeActivity(s, `d${String(d).padStart(2, '0')}-test`, 1, 60, T0);
    s = saveAssessment(s, { id: 'f', kind: 'final', form: 'B', at: T0.toISOString(), skillScores: {}, overall: 50, level: 'B1', answered: 20, total: 23 });
    expect(isDayUnlocked(s, 15)).toBe(false);
    s = { ...s, program: { ...s.program, extensionEnabled: true } };
    expect(isDayUnlocked(s, 15)).toBe(true);
  });

  it('compte la série uniquement avec un apprentissage réel', () => {
    let s = createInitialState(T0);
    s = { ...s, daily: { '2026-09-29': { seconds: 3000, xp: 0, itemsCorrect: 0, itemsTotal: 0, reviews: 0, activitiesDone: 0, conversationTurns: 0, aiCalls: 0 } } };
    expect(currentStreak(s, T0)).toBe(0);
    s = completeActivity(s, 'd01-lesson', 1, 60, addDays(T0, -1));
    s = completeActivity(s, 'd01-vocab', 1, 60, T0);
    expect(currentStreak(s, T0)).toBe(2);
  });

  it('recommande d’abord le test de positionnement, puis reprend une session interrompue', () => {
    let s = createInitialState(T0);
    expect(nextRecommendation(s, T0).kind).toBe('placement');
    s = saveAssessment(s, { id: 'p', kind: 'placement', form: 'A', at: T0.toISOString(), skillScores: {}, overall: 40, level: 'B1', answered: 20, total: 23 });
    expect(nextRecommendation(s, T0).kind).toBe('activity');
    s = { ...s, session: { activityId: 'd01-grammar', itemIds: ['d01-grammar-1', 'd01-grammar-2'], index: 1, results: [], startedAt: T0.toISOString(), updatedAt: T0.toISOString(), seconds: 0, dynamic: false } };
    const rec = nextRecommendation(s, T0);
    expect(rec.kind).toBe('resume');
    expect(rec.link).toContain('d01-grammar');
  });
});

describe('adaptation', () => {
  it('se fonde sur le positionnement puis sur les résultats récents', () => {
    let s = createInitialState(T0);
    s = saveAssessment(s, { id: 'p', kind: 'placement', form: 'A', at: T0.toISOString(), skillScores: {}, overall: 20, level: 'A2', answered: 20, total: 23 });
    expect(learnerLevel(s)).toBe(1);
    const ids = getActivity('d02-grammar')!.items.map((i) => i.id);
    for (let k = 0; k < 2; k++) for (const id of ids) s = answer(s, id, true);
    expect(learnerLevel(s)).toBe(3);
    for (let k = 0; k < 3; k++) for (const id of ids) s = answer(s, id, false);
    expect(learnerLevel(s)).toBe(1);
    expect(weakConcepts(s).length).toBeGreaterThan(0);
  });

  it('ne modifie jamais un test, adapte les autres activités de façon reproductible', () => {
    const s = createInitialState(T0);
    const test = getActivity('d03-test')!;
    expect(buildSessionItems(test, s, 1)).toEqual(test.items.map((i) => i.id));
    const g = getActivity('d03-grammar')!;
    expect(buildSessionItems(g, s, 42)).toEqual(buildSessionItems(g, s, 42));
  });

  it('augmente l’immersion avec le parcours', () => {
    const s = createInitialState(T0);
    expect(immersionLevel(s, 1)).toBeLessThan(immersionLevel(s, 12));
    expect(immersionLevel({ ...s, settings: { ...s.settings, immersion: 0 } }, 12)).toBe(0);
  });

  it('construit des révisions ciblées à partir des vraies erreurs', () => {
    let s = createInitialState(T0);
    s = completeActivity(s, 'd01-test', 0.4, 60, T0);
    s = answer(s, 'd01-test-2', false);
    s = answer(s, 'd01-grammar-4', false);
    const rem = buildDynamicActivity('remediation-1', s, T0)!;
    expect(rem.items.length).toBeGreaterThan(0);
    expect(rem.items.every((i) => i.difficulty <= 2 || openMistakes(s).some((m) => m.itemId === i.id))).toBe(true);
    const mistakes = buildDynamicActivity('mistakes', s, T0)!;
    expect(mistakes.items.map((i) => i.id).sort()).toEqual(['d01-grammar-4', 'd01-test-2']);
    expect(buildDynamicActivity('express', s, T0)!.items.length).toBeGreaterThan(0);
  });
});

describe('évaluations', () => {
  it('calcule un score par compétence pondéré, avec « non évalué » possible', () => {
    const form = ASSESSMENT_FORMS.A;
    const results = Object.fromEntries(form.items.map((i) => [i.id, i.skill === 'speaking' ? null : checkAnswer(i, i.type === 'mcq' || i.type === 'listen' ? { kind: 'choice', index: i.answer } : { kind: 'skip' })]));
    const sc = scoreAssessment(form, results);
    expect(sc.skillScores.speaking).toBeNull();
    expect(sc.skillScores.vocabulary).toBe(100);
    expect(sc.skillScores.writing).toBe(0);
    expect(levelFor(85).code).toBe('C1');
    expect(levelFor(10).code).toBe('A1');
  });

  it('propose l’extension uniquement si les résultats le justifient', () => {
    const s = createInitialState(T0);
    const strong = { id: 'f', kind: 'final' as const, form: 'B', at: T0.toISOString(), skillScores: { vocabulary: 90, grammar: 85, reading: 90, listening: 80, construction: 88, writing: 75, speaking: null }, overall: 85, level: 'C1', answered: 22, total: 23 };
    expect(adviseExtension(s, strong).recommended).toBe(false);
    const weak = { ...strong, skillScores: { ...strong.skillScores, listening: 40 }, overall: 60 };
    const adv = adviseExtension(s, weak);
    expect(adv.recommended).toBe(true);
    expect(adv.focusSkills).toContain('listening');
  });
});

describe('récompenses, défis, notifications et données', () => {
  it('attribue les badges sur des accomplissements réels', () => {
    let s = createInitialState(T0);
    expect(awardBadges(s, T0).earned).toHaveLength(0);
    s = completeActivity(s, 'd01-test', 1, 60, T0);
    const { earned, state } = awardBadges(s, T0);
    expect(earned.map((b) => b.id)).toEqual(expect.arrayContaining(['day-1', 'perfect-test']));
    expect(state.notifications.length).toBeGreaterThan(0);
    expect(awardBadges(state, T0).earned).toHaveLength(0);
  });

  it('mesure les défis personnels sur les statistiques réelles', () => {
    let s = createInitialState(T0);
    const ch = createChallenge(CHALLENGE_TEMPLATES[0], T0);
    s = answer(s, 'd01-grammar-1', true);
    s = answer(s, 'd01-grammar-2', true);
    expect(challengeProgress(s, ch)).toBe(2);
  });

  it('génère les notifications une seule fois par jour', () => {
    let s = { ...createInitialState(T0), profile: { ...createInitialState(T0).profile, onboarded: true } };
    s = dailyNotifications(s, T0);
    const n = s.notifications.length;
    expect(n).toBeGreaterThan(0);
    expect(dailyNotifications(s, T0).notifications.length).toBe(n);
  });

  it('valide les données chargées et refuse les données corrompues', () => {
    const s = createInitialState(T0);
    const round = parseState(JSON.parse(JSON.stringify(s)));
    expect(round.ok).toBe(true);
    expect(parseState({ version: 1, id: 3 }).ok).toBe(false);
    expect(parseState('nimporte quoi').ok).toBe(false);
  });
});
