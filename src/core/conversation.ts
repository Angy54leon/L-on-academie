// Logique pure du mode conversation (testable) : historique envoyé au professeur IA, sujets, niveau.
import type { TeacherMessage } from '../../supabase/functions/_shared/teacher-core.ts';
import type { ConversationMessage, LearnerState } from './state';

export const HISTORY_WINDOW = 14;
const MAX_CHARS = 1200;
const MEMORY_ITEMS = 8;
const MEMORY_CHARS = 160;

export interface TeacherHistory {
  messages: TeacherMessage[];
  /** Répliques plus anciennes de l'apprenant (hors fenêtre), résumées pour éviter de reposer les mêmes questions. */
  memory: string[];
}

/**
 * Prépare l'historique envoyé au modèle : les derniers échanges complets (fenêtre glissante) +
 * une mémoire courte des réponses plus anciennes de l'apprenant. Les messages « système » de l'interface
 * (aides, statuts) ne sont jamais envoyés.
 */
export function buildTeacherHistory(messages: ConversationMessage[], window = HISTORY_WINDOW): TeacherHistory {
  const dialogue = messages.filter((m) => (m.role === 'learner' || m.role === 'teacher') && m.text.trim());
  const recent = dialogue.slice(-window);
  const older = dialogue.slice(0, Math.max(0, dialogue.length - window));
  return {
    messages: recent.map((m) => ({ role: m.role === 'learner' ? 'user' : 'assistant', content: m.text.trim().slice(0, MAX_CHARS) })),
    memory: older
      .filter((m) => m.role === 'learner')
      .map((m) => m.text.replace(/\s+/g, ' ').trim().slice(0, MEMORY_CHARS))
      .slice(-MEMORY_ITEMS),
  };
}

/** La conversation attend-elle une réponse du professeur (dernière réplique = apprenant, ou aucune réplique) ? */
export function awaitingTeacher(messages: ConversationMessage[]): 'opening' | 'reply' | null {
  const dialogue = messages.filter((m) => m.role === 'learner' || m.role === 'teacher');
  if (!dialogue.length) return 'opening';
  return dialogue[dialogue.length - 1].role === 'learner' ? 'reply' : null;
}

export interface Topic {
  en: string;
  fr: string;
}

export const SURPRISE = 'surprise';

export const CONVERSATION_TOPICS: Topic[] = [
  { en: 'Travel and cultures', fr: 'Voyages et cultures' },
  { en: 'Daily life', fr: 'Vie quotidienne' },
  { en: 'Hobbies and passions', fr: 'Loisirs et passions' },
  { en: 'Music and films', fr: 'Musique et cinéma' },
  { en: 'Video games', fr: 'Jeux vidéo' },
  { en: 'Food and cooking', fr: 'Nourriture et cuisine' },
  { en: 'Studies and learning', fr: 'Études et apprentissage' },
  { en: 'Work and projects', fr: 'Travail et projets' },
  { en: 'Science and discoveries', fr: 'Sciences et découvertes' },
  { en: 'The environment', fr: 'Environnement' },
  { en: 'Technology and society', fr: 'Technologie et société' },
  { en: 'Sport and health', fr: 'Sport et santé' },
  { en: 'Friends and family', fr: 'Amis et famille' },
  { en: 'Opinions and friendly debates', fr: 'Opinions et petits débats' },
  { en: 'Imaginary stories', fr: 'Histoires imaginaires' },
  { en: 'Practical situations (shopping, directions, appointments)', fr: 'Situations pratiques' },
];

export function pickTopic(choice: string, random: () => number = Math.random): Topic {
  if (choice === SURPRISE) return CONVERSATION_TOPICS[Math.floor(random() * CONVERSATION_TOPICS.length)];
  return CONVERSATION_TOPICS.find((t) => t.en === choice) ?? CONVERSATION_TOPICS[0];
}

/** Niveau de référence : la dernière évaluation passée (positionnement, finale ou extension). */
export function referenceLevel(state: LearnerState): string {
  const last = [...state.assessments].sort((a, b) => a.at.localeCompare(b.at)).pop();
  return last?.level ?? 'A2';
}

/** Dernière indication de niveau donnée par le professeur IA dans une conversation (indicative). */
export function latestObservation(messages: ConversationMessage[]): { levelHint?: string; focusFr?: string } | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role === 'teacher' && (m.levelHint || m.focusFr)) return { levelHint: m.levelHint, focusFr: m.focusFr };
  }
  return null;
}
