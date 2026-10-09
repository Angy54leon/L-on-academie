import { describe, expect, it } from 'vitest';
import type { Item } from '../src/content';
import { checkAnswer, analyzeWriting, wordMatchRatio } from '../src/core/answerCheck';
import { expandPattern, isLikelyTypo, normalizeAnswer, diffTokens } from '../src/core/normalize';
import { detectIssues } from '../src/core/grammarRules';

const gap = (answers: string[], extra: Partial<Item> = {}): Item =>
  ({ id: 't-gap', type: 'gap', concept: 'present-simple', skill: 'grammar', difficulty: 1, sentence: 'She ___ in a bank.', answers, explanation: 'x', ...extra }) as Item;
const tr = (answers: string[], traps?: Item extends never ? never : { match: string; kind: 'grammar' | 'vocabulary' | 'unnatural' | 'comprehension'; feedback: string }[]): Item =>
  ({ id: 't-tr', type: 'translate', direction: 'fr-en', concept: 'be-present', skill: 'construction', difficulty: 2, source: 'J’ai 30 ans.', answers, traps, explanation: 'L’âge avec be.' }) as Item;

describe('normalisation', () => {
  it('développe contractions, ponctuation, majuscules et orthographe UK', () => {
    expect(normalizeAnswer("I'm  NOT sure, it's my favourite!")).toBe('i am not sure it is my favorite');
    expect(normalizeAnswer('I don’t know')).toBe('i do not know');
    expect(normalizeAnswer("She's been there")).toBe('she has been there');
    expect(normalizeAnswer('I have 2 cats')).toBe('i have two cats');
  });

  it('développe la syntaxe des réponses acceptées', () => {
    expect(expandPattern('I [really] {like|love} it').sort()).toEqual(['I like it', 'I love it', 'I really like it', 'I really love it']);
  });

  it('ne confond pas faute de frappe et erreur grammaticale', () => {
    expect(isLikelyTypo('restaurent', 'restaurant')).toBe(true);
    expect(isLikelyTypo('work', 'works')).toBe(false);
    expect(isLikelyTypo('play', 'played')).toBe(false);
    expect(isLikelyTypo('woman', 'women')).toBe(false);
    expect(isLikelyTypo('in', 'on')).toBe(false);
  });

  it('calcule la différence mot à mot', () => {
    expect(diffTokens(['i', 'live', 'here'], ['i', 'have', 'lived', 'here'])).toEqual({ missing: ['have', 'lived'], extra: ['live'] });
  });
});

describe('correction des exercices', () => {
  it('accepte la bonne réponse et les variantes équivalentes', () => {
    expect(checkAnswer(gap(['works']), { kind: 'text', value: 'works' }).correct).toBe(true);
    expect(checkAnswer(gap(['works']), { kind: 'text', value: '  Works ' }).correct).toBe(true);
    expect(checkAnswer(gap(['works']), { kind: 'text', value: 'She works in a bank.' }).correct).toBe(true);
    const t = tr(["I{'m| am} thirty[ years old]"]);
    for (const v of ["I'm thirty", 'I am thirty years old', 'i’m thirty.']) expect(checkAnswer(t, { kind: 'text', value: v }).correct, v).toBe(true);
  });

  it('refuse une erreur grammaticale et l’explique', () => {
    const r = checkAnswer(gap(['works']), { kind: 'text', value: 'work' });
    expect(r.correct).toBe(false);
    expect(r.outcome).toBe('incorrect');
    expect(r.feedback.join(' ')).toContain('x');
    expect(r.expected).toBe('She works in a bank.');
  });

  it('identifie les pièges prévus avec le bon type d’erreur', () => {
    const t = tr(["I{'m| am} thirty"], [{ match: 'I have thirty years', kind: 'grammar', feedback: 'On est un âge.' }]);
    const r = checkAnswer(t, { kind: 'text', value: 'I have thirty years' });
    expect(r.errorKind).toBe('grammar');
    expect(r.feedback[0]).toContain('On est un âge');
  });

  it('distingue « peu naturel » (partiellement correct) d’une erreur', () => {
    const t = tr(["I{'d| would} like to book a table"], [{ match: 'I want to book a table', kind: 'unnatural', feedback: 'Un peu brusque.' }]);
    const r = checkAnswer(t, { kind: 'text', value: 'I want to book a table' });
    expect(r.outcome).toBe('partial');
    expect(r.score).toBe(0.5);
  });

  it('tolère une faute de frappe sur un mot long', () => {
    const t = tr(['I went to the restaurant']);
    const r = checkAnswer(t, { kind: 'text', value: 'I went to the restaurent' });
    expect(r.outcome).toBe('typo');
    expect(r.correct).toBe(true);
  });

  it('corrige QCM et remise en ordre', () => {
    const mcq = { id: 'm', type: 'mcq', concept: 'articles', skill: 'grammar', difficulty: 1, prompt: '?', options: ['a', 'an'], answer: 1, explanation: 'e' } as Item;
    expect(checkAnswer(mcq, { kind: 'choice', index: 1 }).correct).toBe(true);
    expect(checkAnswer(mcq, { kind: 'choice', index: 0 }).correct).toBe(false);
    const ord = { id: 'o', type: 'order', concept: 'word-order', skill: 'construction', difficulty: 1, words: ['I', 'like', 'tea'], translation: 't', explanation: 'e' } as Item;
    expect(checkAnswer(ord, { kind: 'tokens', value: ['I', 'like', 'tea'] }).correct).toBe(true);
    expect(checkAnswer(ord, { kind: 'tokens', value: ['tea', 'I', 'like'] }).correct).toBe(false);
  });

  it('compare une transcription orale sans prétendre évaluer la prononciation', () => {
    const sp = { id: 's', type: 'speak', concept: 'pronunciation', skill: 'speaking', difficulty: 1, text: 'Nice to meet you', translation: 't', explanation: 'e' } as Item;
    const ok = checkAnswer(sp, { kind: 'speech', transcript: 'nice to meet you' });
    expect(ok.correct).toBe(true);
    expect(ok.feedback.join(' ')).toMatch(/ne garantit pas une prononciation parfaite/);
    expect(checkAnswer(sp, { kind: 'speech', transcript: 'nice to eat' }).correct).toBe(false);
    expect(wordMatchRatio('nice to meet', 'nice to meet you')).toBeCloseTo(0.75);
  });

  it('analyse un texte libre localement', () => {
    const free = { id: 'f', type: 'free', concept: 'writing', skill: 'writing', difficulty: 1, prompt: 'p', promptFr: 'p', minWords: 10, targetWords: ['actually'], modelAnswer: 'm', checklist: ['c'], explanation: 'e' } as Item & { type: 'free' };
    const a = analyzeWriting(free, 'Actually I live in Paris and I work as a nurse in a big hospital.');
    expect(a.words).toBeGreaterThanOrEqual(10);
    expect(a.targetUsed).toEqual(['actually']);
    expect(analyzeWriting(free, 'I am agree.').issues.some((i) => i.ruleId === 'am-agree')).toBe(true);
  });
});

describe('détecteur local d’erreurs fréquentes', () => {
  const ids = (t: string) => detectIssues(t).map((i) => i.ruleId);
  it('repère les calques classiques des francophones', () => {
    expect(ids('I am agree with you')).toContain('am-agree');
    expect(ids('I have 30 years')).toContain('have-years');
    expect(ids('I work here since 3 years')).toContain('since-duration');
    expect(ids('She don’t like it')).toContain('third-person-dont');
    expect(ids('He like football')).toContain('third-person-s');
    expect(ids('Did you went to Paris?')).toContain('did-past');
    expect(ids('I can to swim')).toContain('modal-to');
    expect(ids('It depends of the weather')).toContain('depend-of');
    expect(ids('Can you explain me?')).toContain('explain-me');
    expect(ids('I listen music')).toContain('listen-music');
    expect(ids('I made a mistake and took a photo')).toEqual([]);
  });

  it('évite les fausses alertes sur des phrases correctes', () => {
    for (const ok of ['Does she like coffee?', 'He can play the piano.', 'She likes it.', 'I agree with you.', 'I work for Google.', 'I am 30 years old.', 'I don’t miss it.', 'He doesn’t always eat.']) expect(ids(ok), ok).toEqual([]);
  });

  it('distingue erreurs certaines et suggestions de style', () => {
    const issues = detectIssues('I like the music. I am agree.');
    expect(issues.find((i) => i.ruleId === 'like-the-general')?.kind).toBe('style');
    expect(issues.find((i) => i.ruleId === 'am-agree')?.kind).toBe('error');
  });
});
