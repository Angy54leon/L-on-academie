// Badges : ils récompensent un apprentissage réel (réussites, régularité, maîtrise),
// jamais le simple temps passé dans l'application.
import { PROGRAM_LENGTH } from '../content';
import { pushNotification } from './learner';
import { assessmentDone, bestStreak, isDayDone, openMistakes, vocabCounts } from './progress';
import type { LearnerState } from './state';

export interface BadgeDef {
  id: string;
  title: string;
  description: string;
  icon: string;
  earned: (s: LearnerState) => boolean;
}

const resolvedMistakes = (s: LearnerState) => Object.values(s.mistakes).filter((m) => m.resolvedAt).length;
const perfectTests = (s: LearnerState) =>
  Object.entries(s.activities).filter(([id, p]) => /-test$/.test(id) && p.status === 'done' && p.bestScore >= 1).length;
const totalTurns = (s: LearnerState) => Object.values(s.daily).reduce((a, d) => a + d.conversationTurns, 0);
const correctAnswers = (s: LearnerState) => s.attempts.filter((a) => a.correct && a.source !== 'assessment').length;

export const BADGES: BadgeDef[] = [
  { id: 'first-steps', title: 'Premiers pas', description: 'Terminer le test de positionnement.', icon: '🧭', earned: (s) => assessmentDone(s, 'placement') },
  { id: 'day-1', title: 'Jour 1 validé', description: 'Réussir le test du jour 1.', icon: '🌱', earned: (s) => isDayDone(s, 1) },
  { id: 'streak-3', title: 'Régularité', description: '3 jours d’apprentissage consécutifs.', icon: '🔥', earned: (s) => bestStreak(s) >= 3 },
  { id: 'streak-7', title: 'Semaine complète', description: '7 jours d’apprentissage consécutifs.', icon: '⚡', earned: (s) => bestStreak(s) >= 7 },
  { id: 'streak-14', title: 'Inarrêtable', description: '14 jours d’apprentissage consécutifs.', icon: '🚀', earned: (s) => bestStreak(s) >= 14 },
  { id: 'answers-100', title: '100 bonnes réponses', description: '100 exercices réussis.', icon: '🎯', earned: (s) => correctAnswers(s) >= 100 },
  { id: 'answers-500', title: '500 bonnes réponses', description: '500 exercices réussis.', icon: '🏹', earned: (s) => correctAnswers(s) >= 500 },
  { id: 'perfect-test', title: 'Sans faute', description: 'Obtenir 100 % à un test de validation.', icon: '💎', earned: (s) => perfectTests(s) >= 1 },
  { id: 'words-25', title: '25 mots maîtrisés', description: '25 mots maîtrisés selon la répétition espacée.', icon: '📚', earned: (s) => vocabCounts(s).mastered >= 25 },
  { id: 'words-100', title: '100 mots maîtrisés', description: '100 mots maîtrisés selon la répétition espacée.', icon: '🧠', earned: (s) => vocabCounts(s).mastered >= 100 },
  { id: 'fixer-10', title: 'Correcteur', description: 'Résoudre 10 erreurs (2 bonnes réponses de suite chacune).', icon: '🛠️', earned: (s) => resolvedMistakes(s) >= 10 },
  { id: 'talker-20', title: 'Bavard', description: '20 répliques en conversation.', icon: '💬', earned: (s) => totalTurns(s) >= 20 },
  { id: 'midpoint', title: 'Mi-parcours', description: 'Valider le bilan intermédiaire (jour 7).', icon: '🏁', earned: (s) => isDayDone(s, 7) },
  { id: 'graduate', title: 'Diplômé Léon', description: 'Terminer le parcours de 14 jours.', icon: '🎓', earned: (s) => isDayDone(s, PROGRAM_LENGTH) },
  { id: 'extension', title: 'Marathonien', description: 'Terminer l’extension de 24 jours.', icon: '🏆', earned: (s) => isDayDone(s, 24) },
  { id: 'clean-slate', title: 'Ardoise propre', description: 'Aucune erreur en attente après au moins 10 erreurs résolues.', icon: '✨', earned: (s) => resolvedMistakes(s) >= 10 && openMistakes(s).length === 0 },
];

/** Attribue les nouveaux badges et crée les notifications correspondantes. */
export function awardBadges(state: LearnerState, now: Date): { state: LearnerState; earned: BadgeDef[] } {
  const earned: BadgeDef[] = [];
  let s = state;
  for (const b of BADGES) {
    if (s.badges[b.id]) continue;
    if (b.earned(s)) {
      earned.push(b);
      s = { ...s, badges: { ...s.badges, [b.id]: now.toISOString() } };
      s = pushNotification(s, { at: now.toISOString(), kind: 'reward', title: `Badge obtenu : ${b.title} ${b.icon}`, body: b.description, link: '/stats' });
    }
  }
  return { state: s, earned };
}
