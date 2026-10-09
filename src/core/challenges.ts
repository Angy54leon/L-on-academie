// Défis personnels (mode local) : objectifs mesurés sur les statistiques réelles.
import { addDays, dateKey, randomId, type LearnerState, type PersonalChallenge } from './state';

export const METRIC_LABELS: Record<PersonalChallenge['metric'], string> = {
  xp: 'points d’expérience',
  reviews: 'révisions de vocabulaire',
  activities: 'activités terminées',
  minutes: 'minutes d’étude',
  correct: 'bonnes réponses',
};

export const CHALLENGE_TEMPLATES: Omit<PersonalChallenge, 'id' | 'startsAt' | 'endsAt'>[] = [
  { title: '7 jours : 300 bonnes réponses', metric: 'correct', target: 300 },
  { title: '7 jours : 200 révisions de vocabulaire', metric: 'reviews', target: 200 },
  { title: '7 jours : 7 heures d’étude', metric: 'minutes', target: 420 },
  { title: '7 jours : 15 activités terminées', metric: 'activities', target: 15 },
  { title: '7 jours : 1 500 XP', metric: 'xp', target: 1500 },
];

export function createChallenge(template: (typeof CHALLENGE_TEMPLATES)[number], now: Date, days = 7): PersonalChallenge {
  return { ...template, id: randomId('ch'), startsAt: now.toISOString(), endsAt: addDays(now, days).toISOString() };
}

/** Progression réelle d'un défi, calculée à partir des statistiques journalières. */
export function challengeProgress(state: LearnerState, c: PersonalChallenge): number {
  const start = new Date(c.startsAt);
  const end = new Date(c.endsAt);
  let total = 0;
  for (let d = new Date(start); d <= end; d = addDays(d, 1)) {
    const day = state.daily[dateKey(d)];
    if (!day) continue;
    switch (c.metric) {
      case 'xp':
        total += day.xp;
        break;
      case 'reviews':
        total += day.reviews;
        break;
      case 'activities':
        total += day.activitiesDone;
        break;
      case 'minutes':
        total += day.seconds / 60;
        break;
      case 'correct':
        total += day.itemsCorrect;
        break;
    }
  }
  return Math.floor(total);
}
