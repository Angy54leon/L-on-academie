import { activity, ask, conj, free, gap, listen, mcq, speak, tr, v } from '../builders';
import type { Day } from '../schema';

export const words = [
  v(14, 1, 'milestone', 'étape importante', 'Finishing this programme is a real milestone.', 'Terminer ce programme est une vraie étape.', 'Un jalon dans un parcours.', '/ˈmaɪlstəʊn/', ['learning']),
  v(14, 1, 'to keep going', 'continuer', 'You’re doing great, keep going!', 'Tu t’en sors très bien, continue !', 'Encouragement.', '/kiːp ˈɡəʊɪŋ/', ['learning']),
  v(14, 1, 'achievement', 'réussite, accomplissement', 'Speaking for ten minutes in English is a big achievement.', 'Parler dix minutes en anglais est une belle réussite.', 'achieve = accomplir.', '/əˈtʃiːvmənt/', ['learning']),
  v(14, 2, 'next step', 'prochaine étape', 'What’s the next step for you?', 'Quelle est la prochaine étape pour toi ?', 'Planification.', '/nekst ˈstep/', ['learning']),
  v(14, 2, 'to set a goal', 'se fixer un objectif', 'I’ve set a goal to read one book a month in English.', 'Je me suis fixé l’objectif de lire un livre par mois en anglais.', 'set / reach / achieve a goal.', '/set ə ˈɡəʊl/', ['learning']),
  v(14, 2, 'to stick to', 's’en tenir à, persévérer', 'The hardest part is to stick to your routine.', 'Le plus dur, c’est de s’en tenir à sa routine.', 'stick to a plan / a habit.', '/ˈstɪk tuː/', ['phrasal']),
  v(14, 2, 'proud of', 'fier de', 'I’m proud of what I’ve achieved.', 'Je suis fier de ce que j’ai accompli.', 'proud OF.', '/ˈpraʊd əv/', ['feelings']),
  v(14, 2, 'weakness', 'point faible', 'My main weakness is listening.', 'Mon principal point faible est la compréhension orale.', 'Contraire : strength.', '/ˈwiːknəs/', ['learning']),
];

export const day: Day = {
  day: 14,
  title: 'Évaluation finale et plan de progression',
  titleEn: 'Final assessment',
  theme: 'Mesurer ses progrès et préparer la suite',
  objectives: [
    'Réaliser l’évaluation finale (comparable au test initial)',
    'Faire un bilan honnête : progrès, points forts, difficultés',
    'Mener une conversation libre en réutilisant tout le parcours',
    'Construire son plan de progression',
  ],
  concepts: ['present-perfect', 'opinions', 'future', 'connectors'],
  activities: [
    activity('d14-lesson', {
      kind: 'lesson',
      title: 'Avant l’évaluation finale',
      summary: 'Comment fonctionne l’évaluation et comment lire votre rapport.',
      minutes: 8,
      skills: ['grammar'],
      lesson: [
        {
          heading: '1. Une évaluation comparable au diagnostic',
          body: 'L’évaluation finale mesure les mêmes compétences que le test de positionnement (vocabulaire, grammaire, compréhension écrite et orale, construction de phrases, expression écrite, expression orale si votre navigateur le permet), avec des exercices ÉQUIVALENTS mais différents.\nVotre rapport compare les deux résultats, compétence par compétence.',
        },
        {
          heading: '2. Ce que le rapport ne dit pas',
          body: 'Il s’agit d’une estimation pédagogique, pas d’une certification officielle (CECRL, TOEIC…). La prononciation n’est pas évaluée finement : seule la transcription par la reconnaissance vocale est analysée.\nSi certaines compétences restent fragiles, l’application vous proposera une extension personnalisée de 10 jours.',
          tip: 'Faites l’évaluation au calme, sans dictionnaire, en une seule fois (environ 25 minutes).',
        },
      ],
      items: [
        mcq('present-perfect', 1, 'I ___ a lot in two weeks.', ['learned / have learned', 'am learn', 'learning', 'have learn'], 0, 'I’ve learned a lot (résultat jusqu’à maintenant).'),
      ],
    }),
    activity('d14-vocab', {
      kind: 'vocabulary',
      title: 'Vocabulaire : bilan et objectifs',
      summary: 'Pour parler de vos accomplissements et de la suite.',
      minutes: 8,
      skills: ['vocabulary'],
      words: words.map((w) => w.id),
      items: [],
    }),
    activity('d14-review', {
      kind: 'review',
      title: 'Échauffement : révision express',
      summary: 'Un échauffement sur les points clés du parcours.',
      minutes: 12,
      skills: ['grammar', 'vocabulary', 'listening'],
      items: [
        gap('for-since', 2, 'I’ve been learning English intensively ___ two weeks.', ['for'], 'for + durée.'),
        conj('present-perfect', 2, 'improve', 'present perfect', 'My listening ___ a lot.', ['has improved', "'s improved"], 'Résultat présent.'),
        gap('opinions', 1, 'I ___ with you, it was a great experience.', ['agree'], 'I agree.'),
        conj('future', 2, 'keep', 'futur (intention)', 'I ___ practising every day.', ["'m going to keep", 'am going to keep', "'ll keep", 'will keep'], 'going to / will.'),
        tr('used-to', 3, 'Avant, je n’osais pas parler.', ["I {didn't|did not} use to dare to speak", 'I used to be afraid to speak', 'I used to be afraid of speaking', "Before, I {didn't|did not} dare to speak", "I {didn't|did not} dare to speak before"], 'used to / didn’t dare.'),
        listen('comprehension', 2, 'Overall, I’m proud of my progress, but I still need to work on my listening skills.', 'What does the speaker still need to improve?', ['Speaking', 'Listening', 'Writing', 'Vocabulary'], 1, 'listening skills.'),
      ],
    }),
    activity('d14-final', {
      kind: 'test',
      title: 'Évaluation finale complète',
      summary: 'L’évaluation comparable au test initial. Rapport détaillé à la fin.',
      minutes: 25,
      skills: ['vocabulary', 'grammar', 'reading', 'listening', 'construction', 'writing', 'speaking'],
      items: [],
    }),
    activity('d14-speaking', {
      kind: 'speaking',
      title: 'Conversation libre finale',
      summary: 'Parlez de votre parcours et de vos projets.',
      minutes: 15,
      skills: ['speaking'],
      items: [
        ask('present-perfect', 2, 'What have you learned in the last two weeks?', 'I’ve learned a lot of useful expressions, and I’ve become more confident when I speak.', 'Qu’as-tu appris ces deux dernières semaines ?', ["i've", 'have', 'learned', 'learnt', 'improved', 'become'], 'Present perfect.'),
        ask('opinions', 2, 'What was the most difficult part for you?', 'The most difficult part was understanding fast speakers, especially with phrasal verbs.', 'Qu’est-ce qui a été le plus difficile ?', ['difficult', 'hard', 'most', 'was', 'struggle'], 'Superlatif : the most difficult…'),
        ask('future', 2, 'What are you going to do to keep improving?', 'I’m going to watch series in English and speak with a language partner every week.', 'Que vas-tu faire pour continuer à progresser ?', ['going to', 'will', 'plan', 'keep'], 'going to + verbe.'),
        ask('expressions', 3, 'What achievement are you most proud of?', 'I’m proud of the fact that I can now have a real conversation without translating everything.', 'De quelle réussite es-tu le plus fier ?', ['proud', 'achievement', 'can', 'now'], 'proud of…'),
        speak('pronunciation', 2, 'I’m proud of what I’ve achieved, and I’m going to keep going.', 'Je suis fier de ce que j’ai accompli, et je vais continuer.', 'Liez « proud of » : « praou-dov ».'),
      ],
    }),
    activity('d14-writing', {
      kind: 'writing',
      title: 'Écriture : mon plan de progression',
      summary: 'Rédigez votre bilan et votre plan pour les semaines à venir.',
      minutes: 15,
      skills: ['writing'],
      items: [
        free('writing', 3, {
          prompt: 'Write your learning review and plan: what has improved, your strengths and weaknesses, and three concrete goals for the next month.',
          promptFr: 'Rédigez votre bilan et votre plan : progrès, forces et faiblesses, trois objectifs concrets pour le mois prochain.',
          minWords: 120,
          targetWords: ['have improved', 'strength', 'weakness', 'goal', 'going to', 'proud of'],
          keywords: ['I'],
          modelAnswer:
            'Two weeks ago, I could understand some English, but I was too nervous to speak. Since then, my confidence has improved a lot. My main strength is now vocabulary: I know many everyday expressions and phrasal verbs. My main weakness is still listening when people speak fast. I’m proud of the fact that I can talk about my opinions for a few minutes. For the next month, I’ve set three goals: I’m going to watch one episode of a series in English every day, review my vocabulary cards every morning, and have a conversation with a language partner twice a week.',
          checklist: ['Present perfect pour les progrès', 'Une force et une faiblesse précises', 'Trois objectifs concrets et mesurables', 'going to pour les projets'],
        }),
      ],
    }),
  ],
};
