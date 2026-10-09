// Notifications internes générées une fois par jour à l'ouverture de l'application.
import { getDay } from '../content';
import { pushNotification } from './learner';
import { assessmentDone, currentDay, currentStreak, dueCards, isActiveDay, isDayUnlocked, openMistakes } from './progress';
import { addDays, dateKey, type LearnerState } from './state';

export function dailyNotifications(state: LearnerState, now: Date): LearnerState {
  const key = dateKey(now);
  if (state.meta.lastOpenedDate === key) return state;
  let s: LearnerState = { ...state, meta: { ...state.meta, lastOpenedDate: key } };
  if (!s.profile.onboarded) return s;
  const at = now.toISOString();

  const due = dueCards(s, now).length;
  if (due > 0) s = pushNotification(s, { at, kind: 'review', title: `${due} mot(s) à réviser`, body: 'Une révision rapide aujourd’hui évite de les oublier.', link: '/revision' });

  const mistakes = openMistakes(s).length;
  if (mistakes >= 5) s = pushNotification(s, { at, kind: 'review', title: `${mistakes} erreurs à corriger`, body: 'Reprenez-les : chacune est résolue après deux bonnes réponses de suite.', link: '/revision?onglet=erreurs' });

  const yesterday = s.daily[dateKey(addDays(now, -1))];
  const streak = currentStreak(s, now);
  if (streak >= 2 && isActiveDay(yesterday)) s = pushNotification(s, { at, kind: 'streak', title: `Série de ${streak} jours 🔥`, body: 'Faites au moins une activité aujourd’hui pour la prolonger.', link: '/dashboard' });

  if (!assessmentDone(s, 'placement')) {
    s = pushNotification(s, { at, kind: 'program', title: 'Test de positionnement', body: 'Il permet d’adapter le parcours à votre niveau.', link: '/evaluation/placement' });
  } else {
    const day = currentDay(s);
    const d = getDay(day);
    if (d && isDayUnlocked(s, day)) s = pushNotification(s, { at, kind: 'program', title: `Jour ${day} : ${d.title}`, body: d.objectives[0], link: `/parcours/jour/${day}` });
  }
  return s;
}

export function unreadCount(state: LearnerState): number {
  return state.notifications.filter((n) => !n.read).length;
}
