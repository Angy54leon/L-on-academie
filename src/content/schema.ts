// Schémas du contenu pédagogique.
// Tout le programme est décrit par des DONNÉES validées par ces schémas
// (aucun contenu n'est écrit directement dans les composants d'interface).
import { z } from 'zod';

export const SKILLS = ['vocabulary', 'grammar', 'reading', 'listening', 'writing', 'speaking', 'construction'] as const;
export const skillSchema = z.enum(SKILLS);
export type Skill = z.infer<typeof skillSchema>;

export const SKILL_LABELS: Record<Skill, string> = {
  vocabulary: 'Vocabulaire',
  grammar: 'Grammaire',
  reading: 'Compréhension écrite',
  listening: 'Compréhension orale',
  writing: 'Expression écrite',
  speaking: 'Expression orale',
  construction: 'Construction de phrases',
};

const difficulty = z.union([z.literal(1), z.literal(2), z.literal(3)]);

/** Erreur prévisible : réponse fausse fréquente avec un retour ciblé. */
export const trapSchema = z.object({
  /** Réponse(s) fautive(s), même syntaxe que les réponses acceptées. */
  match: z.string().min(1),
  kind: z.enum(['grammar', 'vocabulary', 'unnatural', 'comprehension']),
  feedback: z.string().min(1),
});
export type Trap = z.infer<typeof trapSchema>;

const base = {
  id: z.string().min(1),
  concept: z.string().min(1),
  skill: skillSchema,
  difficulty,
  /** Indice affiché en mode « soutien ». */
  hint: z.string().optional(),
  /** Explication en français affichée après la réponse. */
  explanation: z.string().min(1),
  /** Exemple supplémentaire affiché en cas d'erreur. */
  example: z.string().optional(),
};

export const mcqSchema = z.object({
  ...base,
  type: z.literal('mcq'),
  prompt: z.string().min(1),
  promptFr: z.string().optional(),
  options: z.array(z.string().min(1)).min(2).max(5),
  answer: z.number().int().min(0),
  /** Identifiant d'un texte de lecture de l'activité. */
  passage: z.boolean().optional(),
});

export const gapSchema = z.object({
  ...base,
  type: z.literal('gap'),
  /** Phrase avec ___ à l'endroit du trou. */
  sentence: z.string().includes('___'),
  translation: z.string().optional(),
  /** Réponses acceptées. Syntaxe : {a|b} = alternative, [mot] = facultatif. */
  answers: z.array(z.string().min(1)).min(1),
  traps: z.array(trapSchema).optional(),
});

export const translateSchema = z.object({
  ...base,
  type: z.literal('translate'),
  direction: z.enum(['fr-en', 'en-fr']),
  source: z.string().min(1),
  answers: z.array(z.string().min(1)).min(1),
  traps: z.array(trapSchema).optional(),
});

export const orderSchema = z.object({
  ...base,
  type: z.literal('order'),
  /** Mots dans l'ordre correct (ils seront mélangés à l'affichage). */
  words: z.array(z.string().min(1)).min(2),
  /** Autres ordres corrects acceptés (phrases complètes). */
  alternatives: z.array(z.string()).optional(),
  translation: z.string().min(1),
});

export const conjugateSchema = z.object({
  ...base,
  type: z.literal('conjugate'),
  verb: z.string().min(1),
  tense: z.string().min(1),
  /** Phrase de contexte avec ___. */
  sentence: z.string().includes('___'),
  answers: z.array(z.string().min(1)).min(1),
  traps: z.array(trapSchema).optional(),
});

export const listenSchema = z.object({
  ...base,
  type: z.literal('listen'),
  /** Texte lu par la synthèse vocale (affiché après la réponse). */
  audio: z.string().min(1),
  question: z.string().min(1),
  options: z.array(z.string().min(1)).min(2).max(5),
  answer: z.number().int().min(0),
});

export const dictationSchema = z.object({
  ...base,
  type: z.literal('dictation'),
  audio: z.string().min(1),
  /** Variantes acceptées en plus du texte lui-même. */
  answers: z.array(z.string()).optional(),
});

export const speakSchema = z.object({
  ...base,
  type: z.literal('speak'),
  /** Phrase à répéter, ou réponse modèle si `question` est présent. */
  text: z.string().min(1),
  translation: z.string().min(1),
  /** Si présent : question à laquelle répondre oralement (réponse libre). */
  question: z.string().optional(),
  /** Mots-clés attendus pour une réponse libre. */
  keywords: z.array(z.string()).optional(),
  tip: z.string().optional(),
});

export const freeSchema = z.object({
  ...base,
  type: z.literal('free'),
  prompt: z.string().min(1),
  promptFr: z.string().min(1),
  minWords: z.number().int().min(1),
  targetWords: z.array(z.string()).optional(),
  /** Mots-clés indispensables pour considérer que la question est traitée. */
  keywords: z.array(z.string()).optional(),
  modelAnswer: z.string().min(1),
  checklist: z.array(z.string()).min(1),
});

export const itemSchema = z.discriminatedUnion('type', [
  mcqSchema,
  gapSchema,
  translateSchema,
  orderSchema,
  conjugateSchema,
  listenSchema,
  dictationSchema,
  speakSchema,
  freeSchema,
]);
export type Item = z.infer<typeof itemSchema>;
export type ItemType = Item['type'];

export const ACTIVITY_KINDS = [
  'lesson',
  'vocabulary',
  'grammar',
  'dialogue',
  'listening',
  'reading',
  'translation',
  'writing',
  'speaking',
  'review',
  'test',
] as const;
export type ActivityKind = (typeof ACTIVITY_KINDS)[number];

export const ACTIVITY_LABELS: Record<ActivityKind, string> = {
  lesson: 'Leçon',
  vocabulary: 'Vocabulaire',
  grammar: 'Grammaire',
  dialogue: 'Dialogue',
  listening: 'Écoute',
  reading: 'Lecture',
  translation: 'Traduction',
  writing: 'Écriture',
  speaking: 'Oral',
  review: 'Révision',
  test: 'Test de validation',
};

export const lessonSectionSchema = z.object({
  heading: z.string().min(1),
  body: z.string().min(1),
  examples: z.array(z.object({ en: z.string(), fr: z.string(), note: z.string().optional() })).optional(),
  tip: z.string().optional(),
});
export type LessonSection = z.infer<typeof lessonSectionSchema>;

export const dialogueSchema = z.object({
  title: z.string(),
  setting: z.string(),
  lines: z.array(z.object({ speaker: z.string(), text: z.string(), fr: z.string() })).min(2),
});
export type Dialogue = z.infer<typeof dialogueSchema>;

export const passageSchema = z.object({ title: z.string(), text: z.string(), fr: z.string().optional() });

export const activitySchema = z.object({
  id: z.string().min(1),
  kind: z.enum(ACTIVITY_KINDS),
  title: z.string().min(1),
  summary: z.string().min(1),
  minutes: z.number().int().min(1),
  skills: z.array(skillSchema).min(1),
  lesson: z.array(lessonSectionSchema).optional(),
  dialogue: dialogueSchema.optional(),
  passage: passageSchema.optional(),
  /** Identifiants des mots de vocabulaire introduits. */
  words: z.array(z.string()).optional(),
  /** Entraînement à la rapidité : secondes conseillées par question. */
  timed: z.number().int().min(3).max(60).optional(),
  items: z.array(itemSchema),
});
export type Activity = z.infer<typeof activitySchema>;

export const daySchema = z.object({
  day: z.number().int().min(1),
  title: z.string().min(1),
  titleEn: z.string().min(1),
  theme: z.string().min(1),
  objectives: z.array(z.string()).min(1),
  concepts: z.array(z.string()).min(1),
  activities: z.array(activitySchema).min(3),
});
export type Day = z.infer<typeof daySchema>;

export const vocabSchema = z.object({
  id: z.string().min(1),
  en: z.string().min(1),
  fr: z.string().min(1),
  example: z.string().min(1),
  exampleFr: z.string().min(1),
  /** Contexte d'utilisation (français). */
  context: z.string().min(1),
  /** Prononciation (API simplifiée). */
  pron: z.string().min(1),
  level: difficulty,
  day: z.number().int().min(1),
  tags: z.array(z.string()),
});
export type VocabEntry = z.infer<typeof vocabSchema>;

export const conceptSchema = z.object({ id: z.string(), label: z.string(), summary: z.string() });
export type Concept = z.infer<typeof conceptSchema>;
