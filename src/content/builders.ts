// Petites fonctions pour écrire le contenu pédagogique de façon compacte et lisible.
// Les identifiants des exercices sont attribués automatiquement par `activity()` :
// AJOUTEZ les nouveaux exercices À LA FIN d'une activité pour ne pas décaler la progression enregistrée.
import type { Activity, ActivityKind, Item, LessonSection, Skill, Trap, VocabEntry } from './schema';

type D = 1 | 2 | 3;
type Draft<T> = T extends Item ? Omit<T, 'id'> : never;
export type ItemDraft = Draft<Item>;

interface Extra {
  hint?: string;
  example?: string;
  traps?: Trap[];
  skill?: Skill;
}

const pick = (e?: Extra) => ({
  ...(e?.hint ? { hint: e.hint } : {}),
  ...(e?.example ? { example: e.example } : {}),
});

export function mcq(
  concept: string,
  d: D,
  prompt: string,
  options: string[],
  answer: number,
  explanation: string,
  e?: Extra & { promptFr?: string; passage?: boolean },
): ItemDraft {
  return {
    type: 'mcq',
    concept,
    skill: e?.skill ?? 'grammar',
    difficulty: d,
    prompt,
    options,
    answer,
    explanation,
    ...(e?.promptFr ? { promptFr: e.promptFr } : {}),
    ...(e?.passage ? { passage: true } : {}),
    ...pick(e),
  };
}

export function gap(
  concept: string,
  d: D,
  sentence: string,
  answers: string[],
  explanation: string,
  e?: Extra & { translation?: string },
): ItemDraft {
  return {
    type: 'gap',
    concept,
    skill: e?.skill ?? 'grammar',
    difficulty: d,
    sentence,
    answers,
    explanation,
    ...(e?.translation ? { translation: e.translation } : {}),
    ...(e?.traps ? { traps: e.traps } : {}),
    ...pick(e),
  };
}

/** Traduction français → anglais (ou l'inverse avec direction). */
export function tr(
  concept: string,
  d: D,
  source: string,
  answers: string[],
  explanation: string,
  e?: Extra & { direction?: 'fr-en' | 'en-fr' },
): ItemDraft {
  return {
    type: 'translate',
    concept,
    skill: e?.skill ?? 'construction',
    difficulty: d,
    direction: e?.direction ?? 'fr-en',
    source,
    answers,
    explanation,
    ...(e?.traps ? { traps: e.traps } : {}),
    ...pick(e),
  };
}

/** Remise en ordre : la phrase est découpée sur les espaces (utilisez _ pour garder deux mots ensemble). */
export function order(
  concept: string,
  d: D,
  sentence: string,
  translation: string,
  explanation: string,
  e?: Extra & { alternatives?: string[] },
): ItemDraft {
  return {
    type: 'order',
    concept,
    skill: e?.skill ?? 'construction',
    difficulty: d,
    words: sentence.replace(/[.?!]+$/, '').split(' ').map((w) => w.replace(/_/g, ' ')),
    translation,
    explanation,
    ...(e?.alternatives ? { alternatives: e.alternatives } : {}),
    ...pick(e),
  };
}

export function conj(
  concept: string,
  d: D,
  verb: string,
  tense: string,
  sentence: string,
  answers: string[],
  explanation: string,
  e?: Extra,
): ItemDraft {
  return {
    type: 'conjugate',
    concept,
    skill: 'grammar',
    difficulty: d,
    verb,
    tense,
    sentence,
    answers,
    explanation,
    ...(e?.traps ? { traps: e.traps } : {}),
    ...pick(e),
  };
}

export function listen(
  concept: string,
  d: D,
  audio: string,
  question: string,
  options: string[],
  answer: number,
  explanation: string,
  e?: Extra,
): ItemDraft {
  return { type: 'listen', concept, skill: 'listening', difficulty: d, audio, question, options, answer, explanation, ...pick(e) };
}

export function dict(concept: string, d: D, audio: string, explanation: string, answers?: string[], e?: Extra): ItemDraft {
  return {
    type: 'dictation',
    concept,
    skill: 'listening',
    difficulty: d,
    audio,
    explanation,
    ...(answers ? { answers } : {}),
    ...pick(e),
  };
}

/** Phrase à répéter à voix haute. */
export function speak(concept: string, d: D, text: string, translation: string, tip: string, e?: Extra): ItemDraft {
  return {
    type: 'speak',
    concept,
    skill: 'speaking',
    difficulty: d,
    text,
    translation,
    tip,
    explanation: tip,
    ...pick(e),
  };
}

/** Question à laquelle répondre oralement (réponse libre). */
export function ask(
  concept: string,
  d: D,
  question: string,
  model: string,
  translation: string,
  keywords: string[],
  tip: string,
  e?: Extra,
): ItemDraft {
  return {
    type: 'speak',
    concept,
    skill: 'speaking',
    difficulty: d,
    question,
    text: model,
    translation,
    keywords,
    tip,
    explanation: tip,
    ...pick(e),
  };
}

export function free(
  concept: string,
  d: D,
  o: {
    prompt: string;
    promptFr: string;
    minWords: number;
    modelAnswer: string;
    checklist: string[];
    targetWords?: string[];
    keywords?: string[];
    explanation?: string;
  },
): ItemDraft {
  return {
    type: 'free',
    concept,
    skill: 'writing',
    difficulty: d,
    explanation: o.explanation ?? 'Comparez votre texte avec l’exemple et vérifiez chaque point de la liste.',
    prompt: o.prompt,
    promptFr: o.promptFr,
    minWords: o.minWords,
    modelAnswer: o.modelAnswer,
    checklist: o.checklist,
    ...(o.targetWords ? { targetWords: o.targetWords } : {}),
    ...(o.keywords ? { keywords: o.keywords } : {}),
  };
}

/** Raccourci pour définir un piège (erreur fréquente). */
export const trap = (match: string, kind: Trap['kind'], feedback: string): Trap => ({ match, kind, feedback });

export interface ActivityInput {
  kind: ActivityKind;
  title: string;
  summary: string;
  minutes: number;
  skills: Skill[];
  lesson?: LessonSection[];
  dialogue?: Activity['dialogue'];
  passage?: Activity['passage'];
  words?: string[];
  timed?: number;
  items: ItemDraft[];
}

export function activity(id: string, input: ActivityInput): Activity {
  return {
    id,
    ...input,
    items: input.items.map((it, i) => ({ ...it, id: `${id}-${i + 1}` }) as Item),
  };
}

const slug = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/**
 * Fiche de vocabulaire.
 * v(day, niveau, anglais, français, exemple, traduction de l'exemple, contexte, prononciation, thèmes)
 */
export function v(
  day: number,
  level: D,
  en: string,
  fr: string,
  example: string,
  exampleFr: string,
  context: string,
  pron: string,
  tags: string[] = [],
): VocabEntry {
  return { id: `w-${slug(en)}`, en, fr, example, exampleFr, context, pron, level, day, tags };
}
