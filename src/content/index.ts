// Point d'entrée du contenu pédagogique : assemble les jours, le vocabulaire et les évaluations,
// et fournit des fonctions de recherche. Aucune logique d'interface ici.
import { ASSESSMENT_FORMS } from './assessments';
import { day as d1, words as w1 } from './days/day01';
import { day as d2, words as w2 } from './days/day02';
import { day as d3, words as w3 } from './days/day03';
import { day as d4, words as w4 } from './days/day04';
import { day as d5, words as w5 } from './days/day05';
import { day as d6, words as w6 } from './days/day06';
import { day as d7, words as w7 } from './days/day07';
import { day as d8, words as w8 } from './days/day08';
import { day as d9, words as w9 } from './days/day09';
import { day as d10, words as w10 } from './days/day10';
import { day as d11, words as w11 } from './days/day11';
import { day as d12, words as w12 } from './days/day12';
import { day as d13, words as w13 } from './days/day13';
import { day as d14, words as w14 } from './days/day14';
import { extensionDays, extensionWords } from './extension/days';
import type { Activity, Day, Item, VocabEntry } from './schema';

export const PROGRAM_LENGTH = 14;
export const EXTENSION_LENGTH = 10;

export const PROGRAM_DAYS: Day[] = [d1, d2, d3, d4, d5, d6, d7, d8, d9, d10, d11, d12, d13, d14];
export const EXTENSION_DAYS: Day[] = extensionDays;
export const ALL_DAYS: Day[] = [...PROGRAM_DAYS, ...EXTENSION_DAYS];

export const VOCAB: VocabEntry[] = [...w1, ...w2, ...w3, ...w4, ...w5, ...w6, ...w7, ...w8, ...w9, ...w10, ...w11, ...w12, ...w13, ...w14, ...extensionWords];

const vocabById = new Map(VOCAB.map((w) => [w.id, w]));

export function getWord(id: string): VocabEntry | undefined {
  return vocabById.get(id);
}

// ------------------------------------------------------------------ Exercices de vocabulaire générés

/** Forme recherchée dans l'exemple (on retire « to » initial et les précisions entre parenthèses). */
function searchForm(en: string): string {
  return en
    .replace(/\(.*?\)/g, '')
    .replace(/^to /i, '')
    .replace(/…|\?|!/g, '')
    .trim();
}

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Exercice de reconnaissance (anglais → français), distracteurs pris dans le même jour. */
export function recognitionItem(word: VocabEntry): Item {
  const sameDay = VOCAB.filter((w) => w.day === word.day && w.id !== word.id);
  const pool = sameDay.length >= 3 ? sameDay : VOCAB.filter((w) => w.id !== word.id);
  // Choix déterministe des distracteurs (stable d'une session à l'autre).
  const seed = [...word.id].reduce((a, c) => a + c.charCodeAt(0), 0);
  const distractors: string[] = [];
  for (let i = 0; distractors.length < 3 && i < pool.length; i++) {
    const cand = pool[(seed + i) % pool.length].fr;
    if (cand !== word.fr && !distractors.includes(cand)) distractors.push(cand);
  }
  const options = [...distractors];
  const pos = seed % (distractors.length + 1);
  options.splice(pos, 0, word.fr);
  return {
    id: `v:${word.id}:recognize`,
    type: 'mcq',
    concept: 'vocabulary',
    skill: 'vocabulary',
    difficulty: word.level,
    prompt: `Que signifie « ${word.en} » ?`,
    options,
    answer: pos,
    explanation: `${word.en} = ${word.fr}. ${word.context}`,
    example: `${word.example} (${word.exampleFr})`,
  };
}

/** Exercice de rappel actif (le mot est retiré de la phrase d'exemple). */
export function recallItem(word: VocabEntry): Item {
  const form = searchForm(word.en);
  const re = new RegExp(`\\b${escapeRe(form)}\\b`, 'i');
  const m = form.length > 1 && !word.en.includes('/') ? re.exec(word.example) : null;
  if (m) {
    return {
      id: `v:${word.id}:recall`,
      type: 'gap',
      concept: 'vocabulary',
      skill: 'vocabulary',
      difficulty: word.level,
      sentence: word.example.slice(0, m.index) + '___' + word.example.slice(m.index + m[0].length),
      translation: word.exampleFr,
      answers: [m[0]],
      hint: `Sens : ${word.fr}`,
      explanation: `${word.en} = ${word.fr}. ${word.context}`,
    };
  }
  return {
    id: `v:${word.id}:recall`,
    type: 'translate',
    concept: 'vocabulary',
    skill: 'vocabulary',
    difficulty: word.level,
    direction: 'fr-en',
    source: word.fr,
    answers: word.en.split(' / ').map((a) => a.replace(/\(.*?\)/g, '').replace(/[…?!]/g, '').trim()),
    hint: `Exemple : ${word.exampleFr}`,
    explanation: `${word.fr} = ${word.en}. ${word.context}`,
  };
}

function withVocabItems(activity: Activity): Activity {
  if (activity.kind !== 'vocabulary' || !activity.words?.length || activity.items.length) return activity;
  const words = activity.words.map((id) => vocabById.get(id)).filter((w): w is VocabEntry => !!w);
  return { ...activity, items: [...words.map(recognitionItem), ...words.map(recallItem)] };
}

// ------------------------------------------------------------------ Index

const days = ALL_DAYS.map((d) => ({ ...d, activities: d.activities.map(withVocabItems) }));
const dayByNumber = new Map(days.map((d) => [d.day, d]));
const activityById = new Map<string, { activity: Activity; day?: number }>();
for (const d of days) for (const a of d.activities) activityById.set(a.id, { activity: a, day: d.day });
for (const form of Object.values(ASSESSMENT_FORMS)) activityById.set(form.id, { activity: form });

const itemIndex = new Map<string, { item: Item; activityId: string; day?: number }>();
for (const { activity, day } of activityById.values()) for (const item of activity.items) itemIndex.set(item.id, { item, activityId: activity.id, day });

export function getDay(n: number): Day | undefined {
  return dayByNumber.get(n);
}

export function getActivity(id: string): Activity | undefined {
  return activityById.get(id)?.activity;
}

export function dayOfActivity(id: string): number | undefined {
  return activityById.get(id)?.day;
}

/** Retrouve un exercice par son identifiant (y compris les exercices de vocabulaire générés). */
export function getItem(id: string): Item | undefined {
  const found = itemIndex.get(id);
  if (found) return found.item;
  const m = /^v:(.+):(recognize|recall)$/.exec(id);
  if (m) {
    const w = vocabById.get(m[1]);
    if (w) return m[2] === 'recognize' ? recognitionItem(w) : recallItem(w);
  }
  return undefined;
}

export function itemLocation(id: string): { activityId: string; day?: number } | undefined {
  const found = itemIndex.get(id);
  return found ? { activityId: found.activityId, day: found.day } : undefined;
}

/** Tous les exercices des jours (hors évaluations), avec leur jour. */
export function programItems(): { item: Item; activityId: string; day: number }[] {
  const out: { item: Item; activityId: string; day: number }[] = [];
  for (const { item, activityId, day } of itemIndex.values()) if (day !== undefined) out.push({ item, activityId, day });
  return out;
}

/** Le test de validation d'un jour (dernière activité de type « test »). */
export function dayTest(day: number): Activity | undefined {
  return getDay(day)?.activities.find((a) => a.kind === 'test');
}

export function isAssessmentActivity(a: Activity): boolean {
  return a.kind === 'test' && a.items.length === 0;
}

export function isDynamicActivity(a: Activity): boolean {
  return a.kind === 'review' && a.items.length === 0;
}

export { ASSESSMENT_FORMS } from './assessments';
export { SCENARIOS, getScenario } from './scenarios';
export { CONCEPTS, getConcept, conceptLabel } from './concepts';
export * from './schema';
