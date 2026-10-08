// Modèle des données de l'apprenant (sauvegardées localement, et à distance si un compte est configuré).
// Le schéma Zod valide les données au chargement : des données corrompues ne cassent pas l'application.
import { z } from 'zod';
import { SKILLS } from '../content/schema';

export const STATE_VERSION = 1;

const iso = z.string();
const skillEnum = z.enum(SKILLS);
const outcomeEnum = z.enum(['correct', 'typo', 'partial', 'incorrect', 'skipped']);

export const GOALS = {
  conversation: 'Parler avec aisance au quotidien',
  travel: 'Voyager sereinement',
  work: 'Utiliser l’anglais au travail',
  media: 'Comprendre films, séries et podcasts',
  exam: 'Préparer un examen ou un entretien',
  general: 'Progresser de façon générale',
} as const;
export type GoalId = keyof typeof GOALS;

export const DIFFICULTIES = {
  speaking: 'Je bloque quand je dois parler',
  listening: 'Je ne comprends pas les natifs à l’oral',
  grammar: 'Je fais beaucoup de fautes de grammaire',
  vocabulary: 'Je manque de vocabulaire',
  translation: 'Je traduis tout dans ma tête',
  confidence: 'Je manque de confiance',
  writing: 'J’ai du mal à écrire',
  pronunciation: 'Ma prononciation me gêne',
} as const;

export const PREFERENCES = {
  short: 'Sessions courtes et fréquentes',
  long: 'Longues sessions concentrées',
  oral: 'Beaucoup d’oral',
  written: 'Beaucoup d’écrit',
  games: 'Défis et récompenses',
  explanations: 'Explications détaillées',
} as const;

export const THEMES = {
  daily: 'Vie quotidienne',
  travel: 'Voyages',
  work: 'Travail',
  relationships: 'Rencontres et relations',
  culture: 'Films, musique, culture',
  tech: 'Technologie',
  food: 'Cuisine',
  sport: 'Sport et santé',
  news: 'Actualité et société',
} as const;

const profileSchema = z.object({
  displayName: z.string().max(40).default(''),
  goal: z.enum(Object.keys(GOALS) as [GoalId, ...GoalId[]]).default('conversation'),
  dailyMinutes: z.number().int().min(10).max(480).default(60),
  difficulties: z.array(z.string()).default([]),
  preferences: z.array(z.string()).default([]),
  themes: z.array(z.string()).default([]),
  onboarded: z.boolean().default(false),
});

const settingsSchema = z.object({
  theme: z.enum(['dark', 'light', 'system']).default('dark'),
  accent: z.enum(['en-US', 'en-GB']).default('en-US'),
  voiceURI: z.string().optional(),
  speechRate: z.number().min(0.5).max(1.5).default(0.9),
  /** 'auto' ou un niveau imposé 0..3. */
  immersion: z.union([z.literal('auto'), z.number().int().min(0).max(3)]).default('auto'),
  showHints: z.enum(['auto', 'always', 'never']).default('auto'),
  reducedMotion: z.boolean().default(false),
  sounds: z.boolean().default(false),
  aiDailyLimit: z.number().int().min(0).max(500).default(60),
  privacy: z
    .object({
      shareProgress: z.boolean().default(false),
      shareStreak: z.boolean().default(false),
      shareBadges: z.boolean().default(false),
    })
    .default({ shareProgress: false, shareStreak: false, shareBadges: false }),
  updatedAt: iso.default(() => new Date(0).toISOString()),
});

const activityProgressSchema = z.object({
  status: z.enum(['started', 'done']),
  bestScore: z.number().min(0).max(1),
  lastScore: z.number().min(0).max(1),
  attempts: z.number().int().min(0),
  completedAt: iso.optional(),
  timeSpentSec: z.number().min(0).default(0),
});
export type ActivityProgress = z.infer<typeof activityProgressSchema>;

const attemptSchema = z.object({
  id: z.string(),
  at: iso,
  itemId: z.string(),
  activityId: z.string().optional(),
  concept: z.string(),
  skill: skillEnum,
  outcome: outcomeEnum,
  correct: z.boolean(),
  score: z.number(),
  difficulty: z.number().int().min(1).max(3),
  source: z.enum(['activity', 'review', 'assessment', 'conversation']),
  firstTry: z.boolean().default(true),
});
export type AttemptRecord = z.infer<typeof attemptSchema>;

const conceptStatSchema = z.object({
  ewma: z.number(),
  attempts: z.number().int(),
  correct: z.number().int(),
  lastAt: iso,
  lastWrongAt: iso.optional(),
});
export type ConceptStat = z.infer<typeof conceptStatSchema>;

const cardSchema = z.object({
  id: z.string(),
  ease: z.number(),
  interval: z.number(),
  due: iso,
  reps: z.number().int(),
  lapses: z.number().int(),
  streak: z.number().int(),
  lastReviewedAt: iso.optional(),
  history: z.array(z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)])),
});

const mistakeSchema = z.object({
  itemId: z.string(),
  activityId: z.string().optional(),
  concept: z.string(),
  addedAt: iso,
  lastWrongAt: iso,
  wrongCount: z.number().int(),
  /** Réussites consécutives depuis la dernière erreur (2 = résolue). */
  correctStreak: z.number().int(),
  lastAnswer: z.string().max(300).optional(),
  resolvedAt: iso.optional(),
});
export type Mistake = z.infer<typeof mistakeSchema>;

const assessmentSchema = z.object({
  id: z.string(),
  kind: z.enum(['placement', 'final', 'extension']),
  form: z.string(),
  at: iso,
  skillScores: z.record(z.string(), z.number().nullable()),
  overall: z.number(),
  level: z.string(),
  answered: z.number().int(),
  total: z.number().int(),
});
export type AssessmentResult = z.infer<typeof assessmentSchema>;

const dailySchema = z.object({
  seconds: z.number().default(0),
  xp: z.number().default(0),
  itemsCorrect: z.number().default(0),
  itemsTotal: z.number().default(0),
  reviews: z.number().default(0),
  activitiesDone: z.number().default(0),
  conversationTurns: z.number().default(0),
  aiCalls: z.number().default(0),
});
export type DailyStats = z.infer<typeof dailySchema>;

const notificationSchema = z.object({
  id: z.string(),
  at: iso,
  kind: z.enum(['info', 'reward', 'review', 'streak', 'program', 'sync', 'warning']),
  title: z.string(),
  body: z.string(),
  link: z.string().optional(),
  read: z.boolean().default(false),
});
export type AppNotification = z.infer<typeof notificationSchema>;

const sessionSchema = z.object({
  activityId: z.string(),
  itemIds: z.array(z.string()),
  index: z.number().int(),
  results: z.array(z.object({ itemId: z.string(), outcome: outcomeEnum, score: z.number(), correct: z.boolean() })),
  startedAt: iso,
  updatedAt: iso,
  seconds: z.number().default(0),
  /** Données d'une activité dynamique (révision ciblée, session express…). */
  dynamic: z.boolean().default(false),
});
export type SessionState = z.infer<typeof sessionSchema>;

const convMessageSchema = z.object({
  role: z.enum(['teacher', 'learner', 'system']),
  text: z.string(),
  at: iso,
  fr: z.string().optional(),
  corrections: z
    .array(z.object({ original: z.string(), corrected: z.string(), kind: z.enum(['error', 'style']), explanationFr: z.string() }))
    .optional(),
  betterVersion: z.string().optional(),
  tipFr: z.string().optional(),
});
export type ConversationMessage = z.infer<typeof convMessageSchema>;

const conversationSchema = z.object({
  id: z.string(),
  mode: z.enum(['guided', 'conversation', 'immersion', 'correction', 'situation', 'review']),
  source: z.enum(['local', 'ai']),
  title: z.string(),
  startedAt: iso,
  updatedAt: iso,
  scenarioId: z.string().optional(),
  messages: z.array(convMessageSchema),
});
export type ConversationLog = z.infer<typeof conversationSchema>;

const challengeSchema = z.object({
  id: z.string(),
  title: z.string(),
  metric: z.enum(['xp', 'reviews', 'activities', 'minutes', 'correct']),
  target: z.number().int().min(1),
  startsAt: iso,
  endsAt: iso,
  completedAt: iso.optional(),
});
export type PersonalChallenge = z.infer<typeof challengeSchema>;

export const learnerStateSchema = z.object({
  version: z.literal(STATE_VERSION),
  id: z.string(),
  createdAt: iso,
  updatedAt: iso,
  /** Compteur incrémenté à chaque modification (utile pour la synchronisation). */
  revision: z.number().int().default(0),
  profile: profileSchema.default(profileSchema.parse({})),
  settings: settingsSchema.default(settingsSchema.parse({})),
  program: z
    .object({
      startedAt: iso.optional(),
      extensionEnabled: z.boolean().default(false),
      extensionFocus: z.array(z.string()).default([]),
      freePractice: z.boolean().default(false),
      /** Jours dont l'apprenant a choisi de poursuivre malgré un test < 70 %. */
      skippedRemediation: z.array(z.number()).default([]),
    })
    .default({ extensionEnabled: false, extensionFocus: [], freePractice: false, skippedRemediation: [] }),
  activities: z.record(z.string(), activityProgressSchema).default({}),
  attempts: z.array(attemptSchema).default([]),
  concepts: z.record(z.string(), conceptStatSchema).default({}),
  vocab: z.record(z.string(), cardSchema).default({}),
  mistakes: z.record(z.string(), mistakeSchema).default({}),
  assessments: z.array(assessmentSchema).default([]),
  daily: z.record(z.string(), dailySchema).default({}),
  xp: z.number().default(0),
  badges: z.record(z.string(), iso).default({}),
  notifications: z.array(notificationSchema).default([]),
  session: sessionSchema.optional(),
  conversations: z.array(conversationSchema).default([]),
  challenges: z.array(challengeSchema).default([]),
  meta: z
    .object({
      lastOpenedDate: z.string().optional(),
      deviceId: z.string().default(''),
      /** Révision distante au dernier envoi/réception réussi. */
      syncedRevision: z.number().int().optional(),
      lastSyncedAt: iso.optional(),
      /** Des modifications locales attendent d'être envoyées. */
      dirty: z.boolean().default(false),
    })
    .default({ deviceId: '', dirty: false }),
});

export type LearnerState = z.infer<typeof learnerStateSchema>;
export type Profile = LearnerState['profile'];
export type Settings = LearnerState['settings'];

export const MAX_ATTEMPTS = 4000;
export const MAX_NOTIFICATIONS = 60;
export const MAX_CONVERSATIONS = 40;

export function randomId(prefix = ''): string {
  const c = globalThis.crypto;
  const raw = c && 'randomUUID' in c ? c.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return prefix ? `${prefix}-${raw}` : raw;
}

export function createInitialState(now = new Date()): LearnerState {
  return learnerStateSchema.parse({
    version: STATE_VERSION,
    id: randomId('learner'),
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    revision: 0,
    meta: { deviceId: randomId('device'), dirty: false },
  });
}

/** Valide des données inconnues (stockage local, serveur, import). */
export function parseState(data: unknown): { ok: true; state: LearnerState } | { ok: false; error: string } {
  const res = learnerStateSchema.safeParse(migrate(data));
  if (res.success) return { ok: true, state: res.data };
  return { ok: false, error: res.error.issues.slice(0, 3).map((i) => `${i.path.join('.')}: ${i.message}`).join(' ; ') };
}

/** Migrations entre versions du format (aucune pour l'instant, prévu pour la suite). */
function migrate(data: unknown): unknown {
  if (!data || typeof data !== 'object') return data;
  const d = data as { version?: number };
  if (d.version === undefined) return { ...d, version: STATE_VERSION };
  return d;
}

/** Clé de date locale AAAA-MM-JJ. */
export function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}
