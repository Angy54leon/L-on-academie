import { describe, expect, it } from 'vitest';
import {
  ALL_DAYS,
  ASSESSMENT_FORMS,
  CONCEPTS,
  getActivity,
  getDay,
  getItem,
  PROGRAM_DAYS,
  programItems,
  SCENARIOS,
  VOCAB,
  daySchema,
  itemSchema,
  vocabSchema,
  type Item,
} from '../src/content';
import { acceptedAnswers, checkAnswer, displayAnswer, type Response } from '../src/core/answerCheck';
import { expandPattern, normalizeAnswer } from '../src/core/normalize';

const conceptIds = new Set(CONCEPTS.map((c) => c.id));

function correctResponse(item: Item): Response {
  switch (item.type) {
    case 'mcq':
    case 'listen':
      return { kind: 'choice', index: item.answer };
    case 'order':
      return { kind: 'tokens', value: item.words };
    case 'speak':
      return { kind: 'speech', transcript: item.text };
    case 'free':
      return { kind: 'text', value: item.modelAnswer };
    default:
      return { kind: 'text', value: acceptedAnswers(item)[0] };
  }
}

const allActivities = () => [...ALL_DAYS.flatMap((d) => getDay(d.day)!.activities), ...Object.values(ASSESSMENT_FORMS)];

describe('contenu pédagogique', () => {
  it('le parcours contient 14 jours et l’extension 10 jours', () => {
    expect(PROGRAM_DAYS).toHaveLength(14);
    expect(ALL_DAYS).toHaveLength(24);
    ALL_DAYS.forEach((d, i) => expect(d.day).toBe(i + 1));
  });

  it('chaque jour respecte le schéma', () => {
    for (const d of ALL_DAYS) {
      const res = daySchema.safeParse(d);
      if (!res.success) throw new Error(`Jour ${d.day} : ${res.error.message}`);
    }
  });

  it('les jours 1 à 13 ont une leçon, du vocabulaire et un test de validation substantiel', () => {
    for (const d of PROGRAM_DAYS.slice(0, 13)) {
      const kinds = d.activities.map((a) => a.kind);
      expect(kinds, `jour ${d.day}`).toContain('lesson');
      expect(kinds, `jour ${d.day}`).toContain('vocabulary');
      const test = d.activities.find((a) => a.kind === 'test');
      expect(test, `jour ${d.day}`).toBeDefined();
      expect(test!.items.length, `test jour ${d.day}`).toBeGreaterThanOrEqual(7);
    }
  });

  it('contient suffisamment d’exercices originaux', () => {
    const items = programItems();
    expect(items.length).toBeGreaterThan(900);
    expect(VOCAB.length).toBeGreaterThanOrEqual(250);
  });

  it('les identifiants sont uniques', () => {
    const ids = new Set<string>();
    for (const a of allActivities()) {
      expect(ids.has(a.id), `activité ${a.id}`).toBe(false);
      ids.add(a.id);
    }
    const itemIds = new Set<string>();
    for (const a of allActivities())
      for (const it of a.items) {
        expect(itemIds.has(it.id), `exercice ${it.id}`).toBe(false);
        itemIds.add(it.id);
      }
    const wordIds = new Set<string>();
    for (const w of VOCAB) {
      expect(wordIds.has(w.id), `mot ${w.id}`).toBe(false);
      wordIds.add(w.id);
    }
  });

  it('chaque fiche de vocabulaire est complète', () => {
    for (const w of VOCAB) expect(vocabSchema.safeParse(w).success, w.id).toBe(true);
  });

  it('chaque exercice est valide et rattaché à une notion connue', () => {
    for (const a of allActivities())
      for (const it of a.items) {
        expect(itemSchema.safeParse(it).success, it.id).toBe(true);
        expect(conceptIds.has(it.concept), `${it.id} → notion « ${it.concept} »`).toBe(true);
        if (it.type === 'mcq' || it.type === 'listen') {
          expect(it.answer, it.id).toBeLessThan(it.options.length);
          expect(new Set(it.options).size, `${it.id} options en double`).toBe(it.options.length);
        }
        if (it.type === 'gap' || it.type === 'translate' || it.type === 'conjugate')
          for (const ans of it.answers) for (const v of expandPattern(ans)) expect(v.trim().length, `${it.id} réponse vide`).toBeGreaterThan(0);
      }
  });

  it('la réponse attendue de chaque exercice est acceptée par le correcteur', () => {
    for (const a of allActivities())
      for (const it of a.items) {
        if (it.type === 'free') continue;
        const res = checkAnswer(it, correctResponse(it));
        expect(res.correct, `${it.id} : « ${displayAnswer(it)} » refusée (${res.feedback.join(' | ')})`).toBe(true);
      }
  });

  it('aucun piège ne correspond à une réponse acceptée', () => {
    for (const a of allActivities())
      for (const it of a.items) {
        if (!('traps' in it) || !it.traps) continue;
        const accepted = new Set(acceptedAnswers(it).map(normalizeAnswer));
        for (const t of it.traps) for (const p of expandPattern(t.match)) expect(accepted.has(normalizeAnswer(p)), `${it.id} piège « ${p} »`).toBe(false);
      }
  });

  it('les exercices de vocabulaire générés sont retrouvables et corrects', () => {
    for (const w of VOCAB) {
      const rec = getItem(`v:${w.id}:recognize`);
      const recall = getItem(`v:${w.id}:recall`);
      expect(rec, w.id).toBeDefined();
      expect(recall, w.id).toBeDefined();
      expect(checkAnswer(recall!, correctResponse(recall!)).correct, `rappel ${w.id}`).toBe(true);
      expect(checkAnswer(rec!, correctResponse(rec!)).correct, `reconnaissance ${w.id}`).toBe(true);
    }
  });

  it('les activités de vocabulaire référencent des mots existants', () => {
    for (const d of ALL_DAYS)
      for (const a of getDay(d.day)!.activities)
        if (a.kind === 'vocabulary') {
          expect(a.words?.length, a.id).toBeGreaterThan(0);
          expect(a.items.length, a.id).toBe(a.words!.length * 2);
        }
  });

  it('les trois formes d’évaluation couvrent toutes les compétences de façon équivalente', () => {
    const profile = (id: 'A' | 'B' | 'C') => {
      const counts: Record<string, number> = {};
      for (const it of ASSESSMENT_FORMS[id].items) counts[it.skill] = (counts[it.skill] ?? 0) + 1;
      return counts;
    };
    const a = profile('A');
    expect(Object.keys(a).sort()).toEqual(['construction', 'grammar', 'listening', 'reading', 'speaking', 'vocabulary', 'writing']);
    expect(profile('B')).toEqual(a);
    expect(profile('C')).toEqual(a);
  });

  it('les évaluations finales et complémentaires existent dans le parcours', () => {
    expect(getActivity('d14-final')).toBeDefined();
    expect(getActivity('d24-final')).toBeDefined();
  });

  it('les scénarios locaux sont complets', () => {
    expect(SCENARIOS.length).toBeGreaterThanOrEqual(10);
    for (const s of SCENARIOS) {
      expect(s.steps.length, s.id).toBeGreaterThanOrEqual(4);
      for (const step of s.steps) expect(step.sample.length).toBeGreaterThan(0);
    }
  });
});
