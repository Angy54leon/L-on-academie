// Extension facultative de 10 jours (jours 15 à 24).
// Chaque jour contient du contenu nouveau + une activité « révision ciblée » vide (items: [])
// qui est remplie dynamiquement à partir des difficultés réellement observées chez l'apprenant.
import { activity, ask, conj, dict, free, gap, listen, mcq, speak, tr, trap, v } from '../builders';
import type { Day, VocabEntry } from '../schema';

const targeted = (day: number) =>
  activity(`d${day}-targeted`, {
    kind: 'review',
    title: 'Révision ciblée sur vos erreurs',
    summary: 'Exercices choisis automatiquement d’après vos notions fragiles et vos erreurs récurrentes.',
    minutes: 15,
    skills: ['grammar', 'vocabulary', 'construction'],
    items: [],
  });

const vocabActivity = (day: number, words: VocabEntry[], title: string) =>
  activity(`d${day}-vocab`, {
    kind: 'vocabulary',
    title,
    summary: 'Nouveaux mots et expressions en contexte.',
    minutes: 12,
    skills: ['vocabulary'],
    words: words.map((w) => w.id),
    items: [],
  });

// ---------------------------------------------------------------- Jour 15
const w15 = [
  v(15, 2, 'small talk', 'conversation légère', 'British people love small talk about the weather.', 'Les Britanniques adorent parler de la pluie et du beau temps.', 'Conversation sociale sans enjeu.', '/ˈsmɔːl tɔːk/', ['social']),
  v(15, 2, 'to get to know', 'apprendre à connaître', 'I’d like to get to know my neighbours.', 'J’aimerais apprendre à connaître mes voisins.', 'Relation qui se construit.', '/ɡet tə ˈnəʊ/', ['social']),
  v(15, 2, 'anyway', 'bref, de toute façon', 'Anyway, I should get going.', 'Bref, je devrais y aller.', 'Changer de sujet ou conclure.', '/ˈeniweɪ/', ['fillers']),
  v(15, 2, 'it was lovely to…', 'ça m’a fait plaisir de…', 'It was lovely to see you!', 'Ça m’a fait plaisir de te voir !', 'Pour prendre congé chaleureusement.', '/ɪt wəz ˈlʌvli tuː/', ['social']),
  v(15, 2, 'to bump into', 'tomber sur (quelqu’un)', 'I bumped into Sarah at the supermarket.', 'Je suis tombé sur Sarah au supermarché.', 'Rencontre fortuite.', '/bʌmp ˈɪntuː/', ['phrasal']),
  v(15, 2, 'how come?', 'comment ça se fait ?', 'You’re not working today? How come?', 'Tu ne travailles pas aujourd’hui ? Comment ça se fait ?', 'Familier = why, sans inversion : How come you’re here?', '/haʊ ˈkʌm/', ['questions']),
  v(15, 2, 'I’d better', 'je ferais mieux de', 'I’d better go, it’s late.', 'Je ferais mieux d’y aller, il est tard.', '+ verbe de base.', '/aɪd ˈbetə/', ['modals']),
  v(15, 2, 'catch you later', 'à plus tard', 'Gotta go, catch you later!', 'Je dois filer, à plus !', 'Familier.', '/kætʃ juː ˈleɪtə/', ['social']),
];

const day15: Day = {
  day: 15,
  title: 'Révisions ciblées et small talk avancé',
  titleEn: 'Small talk',
  theme: 'Engager, relancer et terminer une conversation',
  objectives: ['Relancer une conversation avec des questions ouvertes', 'Terminer une conversation poliment', 'Retravailler vos notions fragiles'],
  concepts: ['questions', 'short-answers', 'expressions'],
  activities: [
    activity('d15-lesson', {
      kind: 'lesson',
      title: 'L’art du small talk',
      summary: 'Commencer, entretenir et finir une conversation légère.',
      minutes: 10,
      skills: ['speaking'],
      lesson: [
        {
          heading: 'Commencer et relancer',
          body: 'Sujets sûrs : la météo, le week-end, le lieu, un événement commun. Relancez avec des questions ouvertes (How…? What…? What was it like?) et des réactions (Oh really? That sounds great!).',
          examples: [
            { en: 'Lovely weather today, isn’t it?', fr: 'Il fait beau aujourd’hui, n’est-ce pas ?' },
            { en: 'How was your weekend? – Did you do anything nice?', fr: 'C’était bien ton week-end ? Tu as fait quelque chose de sympa ?' },
          ],
        },
        {
          heading: 'Terminer poliment',
          body: 'Anyway, I’d better get going. · It was lovely to chat! · Let’s catch up soon. · See you around!',
        },
      ],
      items: [mcq('questions', 2, 'Best follow-up to “I went to Rome last weekend.”', ['Yes.', 'Oh nice! What was it like?', 'I know.', 'Why?'], 1, 'Question ouverte + réaction.')],
    }),
    vocabActivity(15, w15, 'Vocabulaire : small talk'),
    activity('d15-dialogue', {
      kind: 'dialogue',
      title: 'Dialogue : rencontre fortuite',
      summary: 'Deux connaissances se croisent dans la rue.',
      minutes: 10,
      skills: ['listening', 'reading'],
      dialogue: {
        title: 'Bumping into someone',
        setting: 'Clara tombe sur Ian, un ancien collègue, dans la rue.',
        lines: [
          { speaker: 'Ian', text: 'Clara! Fancy bumping into you here! How are things?', fr: 'Clara ! Quelle surprise de te croiser ici ! Comment ça va ?' },
          { speaker: 'Clara', text: 'Ian! Good, thanks. Busy, but good. How come you’re in this part of town?', fr: 'Ian ! Bien, merci. Occupée, mais bien. Comment ça se fait que tu sois dans ce quartier ?' },
          { speaker: 'Ian', text: 'I’ve just moved here, actually. I’m still getting to know the area.', fr: 'Je viens d’emménager ici, en fait. Je découvre encore le coin.' },
          { speaker: 'Clara', text: 'Oh, you’ll love it. There’s a great Thai place round the corner.', fr: 'Oh, tu vas adorer. Il y a un super restaurant thaï au coin de la rue.' },
          { speaker: 'Ian', text: 'Brilliant, I’ll check it out. Anyway, I’d better get going — I’m meeting the landlord.', fr: 'Génial, j’irai voir. Bref, je ferais mieux d’y aller — j’ai rendez-vous avec le propriétaire.' },
          { speaker: 'Clara', text: 'No worries. It was lovely to see you! Let’s grab a coffee soon.', fr: 'Pas de souci. Ça m’a fait plaisir de te voir ! Prenons un café bientôt.' },
          { speaker: 'Ian', text: 'Definitely. Catch you later!', fr: 'Carrément. À plus !' },
        ],
      },
      items: [
        mcq('comprehension', 1, 'Why is Ian in this area?', ['He works there.', 'He has just moved there.', 'He is visiting Clara.', 'He is lost.'], 1, '« I’ve just moved here ».', { skill: 'reading', passage: true }),
        mcq('comprehension', 2, 'Why does Ian have to leave?', ['He’s late for work.', 'He’s meeting his landlord.', 'He’s going to the Thai restaurant.', 'He’s tired.'], 1, '« I’m meeting the landlord ».', { skill: 'reading', passage: true }),
        mcq('expressions', 2, '« How come you’re here? » =', ['Comment es-tu venu ?', 'Comment ça se fait que tu sois là ?', 'Quand es-tu venu ?', 'Tu viens ?'], 1, 'How come = pourquoi (familier).', { skill: 'vocabulary', passage: true }),
      ],
    }),
    activity('d15-speaking', {
      kind: 'speaking',
      title: 'Oral : relancer la conversation',
      summary: 'Répondez puis posez une question en retour.',
      minutes: 12,
      skills: ['speaking'],
      items: [
        ask('questions', 2, 'How was your weekend?', 'It was great, thanks! I went hiking with friends. How about yours?', 'Comment s’est passé ton week-end ?', ['was', 'went', 'how about', 'what about', 'you'], 'Répondez ET retournez la question (How about you?).'),
        ask('expressions', 2, 'Lovely weather today, isn’t it?', 'Yes, it’s beautiful! Much better than last week. Have you got any plans for this afternoon?', 'Il fait beau aujourd’hui, hein ?', ['yes', 'beautiful', 'lovely', 'better', 'you'], 'Réagissez puis relancez.'),
        ask('expressions', 3, 'End the conversation politely: you have to go.', 'Anyway, I’d better get going. It was lovely to chat! See you soon.', 'Mettez fin poliment à la conversation.', ['anyway', 'better', 'lovely', 'see you', 'catch you', 'go'], 'Anyway, I’d better…'),
        speak('pronunciation', 2, 'Fancy bumping into you here!', 'Quelle surprise de te croiser ici !', 'Accent sur « FAN-cy » et « BUMP-ing ».'),
      ],
    }),
    targeted(15),
    activity('d15-writing', {
      kind: 'writing',
      title: 'Écriture : dialogue de small talk',
      summary: 'Écrivez un court dialogue naturel.',
      minutes: 10,
      skills: ['writing'],
      items: [
        free('expressions', 2, {
          prompt: 'Write a short small-talk dialogue (8–10 lines) between you and a neighbour you meet in the lift.',
          promptFr: 'Écrivez un court dialogue (8 à 10 répliques) avec un voisin croisé dans l’ascenseur.',
          minWords: 60,
          targetWords: ['anyway', "I'd better", 'how come', 'lovely'],
          keywords: ['?'],
          modelAnswer:
            'Me: Morning! Lovely day, isn’t it?\nNeighbour: It is! Finally some sun. Are you off to work?\nMe: Not today, actually. I’ve got a day off.\nNeighbour: Lucky you! How come?\nMe: I worked last Saturday. Anyway, any plans for the weekend?\nNeighbour: My parents are visiting. What about you?\nMe: Just relaxing. Oh, this is my floor. I’d better go. Have a lovely day!',
          checklist: ['Questions ouvertes', 'Réactions naturelles', 'Fin de conversation polie'],
        }),
      ],
    }),
  ],
};

// ---------------------------------------------------------------- Jour 16
const w16 = [
  v(16, 2, 'agenda', 'ordre du jour', 'What’s on the agenda today?', 'Qu’y a-t-il à l’ordre du jour ?', 'FAUX AMI : agenda (carnet) = diary / planner.', '/əˈdʒendə/', ['work', 'false-friends']),
  v(16, 2, 'to follow up', 'faire le suivi, relancer', 'I’ll follow up with an email.', 'Je ferai le suivi par e-mail.', 'Aussi nom : a follow-up.', '/ˈfɒləʊ ˈʌp/', ['work']),
  v(16, 2, 'to schedule', 'planifier', 'Let’s schedule a call for Monday.', 'Planifions un appel lundi.', 'UK : « SHED-yool », US : « SKED-jool ».', '/ˈʃedjuːl/', ['work']),
  v(16, 2, 'to postpone', 'reporter', 'The meeting has been postponed.', 'La réunion a été reportée.', 'Synonyme : put off.', '/pəˈspəʊn/', ['work']),
  v(16, 2, 'attached', 'ci-joint', 'Please find attached the report.', 'Veuillez trouver ci-joint le rapport.', 'Formule d’e-mail.', '/əˈtætʃt/', ['work']),
  v(16, 2, 'to look forward to hearing from you', 'dans l’attente de votre réponse', 'I look forward to hearing from you.', 'Dans l’attente de votre réponse.', 'Formule de fin d’e-mail (+ -ing).', '/lʊk ˈfɔːwəd tə ˈhɪərɪŋ/', ['work']),
  v(16, 2, 'to run late (meeting)', 'déborder (horaire)', 'The meeting ran late.', 'La réunion a débordé.', 'Dépasser l’horaire prévu.', '/rʌn ˈleɪt/', ['work']),
  v(16, 2, 'to wrap up', 'conclure, terminer', 'Let’s wrap up the meeting.', 'Concluons la réunion.', 'Terminer.', '/ræp ˈʌp/', ['work', 'phrasal']),
];

const day16: Day = {
  day: 16,
  title: 'L’anglais au travail : réunions et e-mails',
  titleEn: 'English at work',
  theme: 'Participer à une réunion, écrire un e-mail professionnel',
  objectives: ['Intervenir en réunion (prendre la parole, résumer)', 'Écrire un e-mail professionnel clair', 'Retravailler vos notions fragiles'],
  concepts: ['polite-requests', 'phrasal-verbs', 'opinions'],
  activities: [
    activity('d16-lesson', {
      kind: 'lesson',
      title: 'Réunions et e-mails',
      summary: 'Les formules indispensables.',
      minutes: 10,
      skills: ['speaking', 'writing'],
      lesson: [
        {
          heading: 'En réunion',
          body: 'Prendre la parole : Can I just add something? · Sorry to interrupt, but…\nDemander une précision : Could you clarify what you mean by…?\nRésumer : So, to sum up, we’ve agreed that…\nConclure : Let’s wrap up. I’ll follow up by email.',
        },
        {
          heading: 'Dans un e-mail',
          body: 'Ouverture : Hi Tom, / Dear Ms Smith,\nObjet : I’m writing to… / Just a quick note to…\nPièce jointe : Please find attached… / I’ve attached…\nFin : Let me know if you have any questions. · I look forward to hearing from you. · Best regards,',
        },
      ],
      items: [mcq('polite-requests', 2, 'Polite way to interrupt in a meeting:', ['Stop!', 'Sorry to interrupt, but…', 'Listen to me.', 'I speak now.'], 1, 'Sorry to interrupt, but…')],
    }),
    vocabActivity(16, w16, 'Vocabulaire : le monde professionnel'),
    activity('d16-listening', {
      kind: 'listening',
      title: 'Écoute : extraits de réunion',
      summary: 'Comprenez qui fait quoi.',
      minutes: 10,
      skills: ['listening'],
      items: [
        listen('comprehension', 2, 'Let’s postpone the budget review until next Tuesday, as Mark is away.', 'Why is the review postponed?', ['The budget is too low.', 'Mark is away.', 'It’s Tuesday.', 'Nobody is ready.'], 1, 'as Mark is away = car Mark est absent.'),
        listen('comprehension', 2, 'So, to sum up: Julie will contact the supplier, and I’ll follow up with the client.', 'Who will contact the supplier?', ['The speaker', 'Julie', 'The client', 'Nobody'], 1, 'Julie will contact the supplier.'),
        listen('polite-requests', 3, 'Could you clarify what you mean by "a flexible deadline"?', 'What does the speaker want?', ['A new deadline', 'An explanation', 'To finish early', 'To leave'], 1, 'clarify = clarifier.'),
        listen('phrasal-verbs', 2, 'We’re running out of time, so let’s wrap up.', 'What will happen now?', ['They will start a new topic.', 'They will end the meeting.', 'They will run.', 'They will take a break.'], 1, 'wrap up = conclure.'),
        dict('polite-requests', 2, 'Please find attached the report.', 'Formule d’e-mail.'),
      ],
    }),
    activity('d16-practice', {
      kind: 'grammar',
      title: 'Pratique : formules professionnelles',
      summary: 'Complétez les phrases d’e-mail et de réunion.',
      minutes: 10,
      skills: ['construction'],
      items: [
        gap('polite-requests', 2, 'I look forward to ___ from you.', ['hearing'], 'look forward to + -ing.', { traps: [trap('hear', 'grammar', 'Après « look forward to », on met -ing : hearing.')] }),
        gap('polite-requests', 2, 'Sorry to ___, but I have a question.', ['interrupt'], 'Sorry to interrupt.'),
        gap('phrasal-verbs', 2, 'I’ll follow ___ with an email this afternoon.', ['up'], 'follow up.'),
        tr('polite-requests', 2, 'La réunion a été reportée.', ['The meeting has been {postponed|put off}', 'The meeting was {postponed|put off}'], 'postpone.'),
        tr('polite-requests', 2, 'Qu’y a-t-il à l’ordre du jour ?', ["What{'s| is} on the agenda"], 'What’s on the agenda?'),
      ],
    }),
    targeted(16),
    activity('d16-speaking', {
      kind: 'speaking',
      title: 'Oral : intervenir en réunion',
      summary: 'Simulez vos interventions.',
      minutes: 10,
      skills: ['speaking'],
      items: [
        ask('opinions', 2, 'What do you think about moving the deadline to next month?', 'I think it’s a good idea, but we need to inform the client first.', 'Que pensez-vous de repousser l’échéance au mois prochain ?', ['think', 'idea', 'but', 'agree', 'need'], 'Donnez votre avis + une condition.'),
        ask('polite-requests', 3, 'Summarise the meeting in one or two sentences.', 'So, to sum up, we’ve agreed to postpone the launch, and I’ll follow up with the team by email.', 'Résumez la réunion.', ['sum up', 'agreed', 'follow up', 'so'], 'So, to sum up…'),
        speak('pronunciation', 2, 'Could you clarify what you mean?', 'Pourriez-vous préciser ce que vous voulez dire ?', '« clarify » : KLA-ri-faï.'),
      ],
    }),
    activity('d16-writing', {
      kind: 'writing',
      title: 'Écriture : e-mail de suivi',
      summary: 'Écrivez un e-mail après une réunion.',
      minutes: 12,
      skills: ['writing'],
      items: [
        free('polite-requests', 3, {
          prompt: 'Write a follow-up email after a meeting: summarise decisions, attach a document, and ask for feedback by Friday.',
          promptFr: 'Écrivez un e-mail de suivi : décisions, pièce jointe, retour demandé avant vendredi.',
          minWords: 80,
          targetWords: ['attached', 'follow up', 'agenda', 'look forward to'],
          keywords: ['meeting'],
          modelAnswer:
            'Hi all,\nThanks for today’s meeting. Just a quick follow-up to sum up what we agreed: the launch is postponed to 15 May, and Sophie will update the budget. Please find attached the new schedule. Could you send me your feedback by Friday? Let me know if you have any questions.\nI look forward to hearing from you.\nBest regards,\nThomas',
          checklist: ['Formule d’ouverture et de clôture', 'Résumé des décisions', 'Demande polie avec une date'],
        }),
      ],
    }),
  ],
};

// ---------------------------------------------------------------- Jour 17
const w17 = [
  v(17, 2, 'symptom', 'symptôme', 'What are your symptoms?', 'Quels sont vos symptômes ?', 'Chez le médecin.', '/ˈsɪmptəm/', ['health']),
  v(17, 2, 'to feel sick', 'avoir la nausée / être malade', 'I feel sick after the boat trip.', 'J’ai la nausée après le bateau.', 'UK : nausée ; US : être malade.', '/fiːl ˈsɪk/', ['health']),
  v(17, 2, 'a sore throat', 'un mal de gorge', 'I’ve got a sore throat.', 'J’ai mal à la gorge.', 'sore = douloureux.', '/ə sɔː ˈθrəʊt/', ['health']),
  v(17, 2, 'prescription', 'ordonnance', 'You need a prescription for this.', 'Il vous faut une ordonnance pour ça.', 'Chez le médecin / pharmacien.', '/prɪˈskrɪpʃn/', ['health']),
  v(17, 2, 'to hurt', 'faire mal', 'My back hurts.', 'J’ai mal au dos.', 'X hurts = j’ai mal à X.', '/hɜːt/', ['health']),
  v(17, 2, 'bank account', 'compte bancaire', 'I’d like to open a bank account.', 'Je voudrais ouvrir un compte bancaire.', 'À la banque.', '/ˈbæŋk əkaʊnt/', ['services']),
  v(17, 2, 'to withdraw (money)', 'retirer (de l’argent)', 'I need to withdraw some cash.', 'Je dois retirer du liquide.', 'withdraw – withdrew – withdrawn.', '/wɪðˈdrɔː/', ['services']),
  v(17, 2, 'fee', 'frais', 'Is there a fee for this service?', 'Y a-t-il des frais pour ce service ?', 'Frais bancaires, de dossier.', '/fiː/', ['services']),
];

const day17: Day = {
  day: 17,
  title: 'Santé et services',
  titleEn: 'Health and services',
  theme: 'Médecin, pharmacie, banque',
  objectives: ['Décrire des symptômes', 'Comprendre des instructions', 'Gérer une démarche (banque, administration)'],
  concepts: ['polite-requests', 'present-perfect', 'for-since'],
  activities: [
    activity('d17-lesson', {
      kind: 'lesson',
      title: 'Expliquer un problème',
      summary: 'Décrire ce qui ne va pas, depuis quand, et demander de l’aide.',
      minutes: 10,
      skills: ['speaking'],
      lesson: [
        {
          heading: 'Chez le médecin',
          body: 'I’ve got a headache / a sore throat / a temperature. · My back hurts. · I’ve been feeling tired for a week. (present perfect continu + for)\nLe médecin : How long have you had these symptoms? · Take two tablets three times a day.',
          examples: [{ en: 'I’ve had a cough since Monday.', fr: 'Je tousse depuis lundi.' }],
        },
        {
          heading: 'À la banque / aux services',
          body: 'I’d like to open an account. · Is there a fee? · My card has been blocked. · Could you explain how it works?',
        },
      ],
      items: [mcq('for-since', 2, '« J’ai mal à la tête depuis hier. »', ['I have a headache since yesterday.', 'I’ve had a headache since yesterday.', 'I had a headache since yesterday.', 'I have headache from yesterday.'], 1, 'present perfect + since.')],
    }),
    vocabActivity(17, w17, 'Vocabulaire : santé et services'),
    activity('d17-dialogue', {
      kind: 'dialogue',
      title: 'Dialogue : chez le médecin',
      summary: 'Une consultation à Londres.',
      minutes: 10,
      skills: ['listening', 'reading'],
      dialogue: {
        title: 'At the GP',
        setting: 'Antoine consulte un médecin généraliste (GP) à Londres.',
        lines: [
          { speaker: 'Doctor', text: 'Good morning. What seems to be the problem?', fr: 'Bonjour. Qu’est-ce qui ne va pas ?' },
          { speaker: 'Antoine', text: 'I’ve had a sore throat and a temperature since Tuesday.', fr: 'J’ai mal à la gorge et de la fièvre depuis mardi.' },
          { speaker: 'Doctor', text: 'I see. Any other symptoms? A cough, a headache?', fr: 'Je vois. D’autres symptômes ? Toux, mal de tête ?' },
          { speaker: 'Antoine', text: 'A bit of a headache, and I feel really tired.', fr: 'Un peu mal à la tête, et je me sens très fatigué.' },
          { speaker: 'Doctor', text: 'It looks like a throat infection. I’ll give you a prescription for antibiotics. Take one tablet twice a day for seven days.', fr: 'On dirait une angine. Je vais vous faire une ordonnance d’antibiotiques. Un comprimé deux fois par jour pendant sept jours.' },
          { speaker: 'Antoine', text: 'Should I stay at home?', fr: 'Je dois rester à la maison ?' },
          { speaker: 'Doctor', text: 'Yes, rest for a couple of days and drink plenty of water. Come back if you don’t feel better by Friday.', fr: 'Oui, reposez-vous quelques jours et buvez beaucoup d’eau. Revenez si ça ne va pas mieux d’ici vendredi.' },
        ],
      },
      items: [
        mcq('comprehension', 1, 'Since when has Antoine been ill?', ['Monday', 'Tuesday', 'Friday', 'Last week'], 1, 'since Tuesday.', { skill: 'reading', passage: true }),
        mcq('comprehension', 2, 'How often should he take the tablets?', ['Once a day', 'Twice a day', 'Three times a day', 'When he wants'], 1, 'twice a day.', { skill: 'reading', passage: true }),
        mcq('comprehension', 2, 'When should he come back?', ['Tomorrow', 'If he isn’t better by Friday', 'In seven days', 'Never'], 1, 'Come back if you don’t feel better by Friday.', { skill: 'reading', passage: true }),
      ],
    }),
    activity('d17-practice', {
      kind: 'translation',
      title: 'Pratique : se faire comprendre',
      summary: 'Expliquez vos problèmes clairement.',
      minutes: 10,
      skills: ['construction'],
      items: [
        tr('present-perfect', 2, 'J’ai mal au dos.', ['My back hurts', "I{'ve| have} got {a backache|back pain}", 'I have {a backache|back pain}'], 'My back hurts.'),
        tr('for-since', 3, 'Je tousse depuis trois jours.', ["I{'ve| have} had a cough for {three|3} days", "I{'ve| have} been coughing for {three|3} days"], 'present perfect + for.', { traps: [trap('I cough since {three|3} days', 'grammar', 'present perfect + for : I’ve had a cough for three days.')] }),
        tr('polite-requests', 2, 'Je voudrais retirer de l’argent.', ["I{'d| would} like to withdraw {some |}money", "I{'d| would} like to withdraw {some |}cash"], 'withdraw money.'),
        tr('polite-requests', 2, 'Y a-t-il des frais ?', ['Is there a fee', 'Are there any fees', 'Is there any fee'], 'Is there a fee?'),
        gap('present-perfect', 2, 'My card ___ been blocked.', ['has'], 'has been + participe (passif).'),
      ],
    }),
    targeted(17),
    activity('d17-speaking', {
      kind: 'speaking',
      title: 'Oral : décrire un problème',
      summary: 'Expliquez clairement ce qui ne va pas.',
      minutes: 10,
      skills: ['speaking'],
      items: [
        ask('for-since', 2, 'What seems to be the problem?', 'I’ve had a terrible headache since yesterday and I feel a bit sick.', 'Qu’est-ce qui ne va pas ?', ['since', 'for', "i've", 'have', 'hurts', 'headache', 'sore'], 'Symptôme + depuis quand.'),
        ask('polite-requests', 3, 'You lost your bank card. Explain the situation.', 'Hello, I think I’ve lost my bank card. Could you block it, please?', 'Vous avez perdu votre carte bancaire. Expliquez.', ['lost', 'card', 'could', 'block', 'please'], 'Situation + demande polie.'),
        speak('pronunciation', 2, 'I’ve got a sore throat.', 'J’ai mal à la gorge.', '« throat » : langue entre les dents.'),
      ],
    }),
    activity('d17-writing', {
      kind: 'writing',
      title: 'Écriture : message d’absence',
      summary: 'Prévenez votre responsable que vous êtes malade.',
      minutes: 10,
      skills: ['writing'],
      items: [
        free('present-perfect', 2, {
          prompt: 'Write a message to your manager: you are ill, describe briefly, say how long you will be away, and who can cover for you.',
          promptFr: 'Écrivez à votre responsable : vous êtes malade, symptômes, durée d’absence, qui vous remplace.',
          minWords: 60,
          targetWords: ['since', 'feel', 'doctor', 'prescription'],
          keywords: ['ill', 'sick', 'unwell', 'doctor'],
          modelAnswer:
            'Hi Sarah,\nI’m afraid I won’t be able to come to work today. I’ve had a high temperature since last night and I feel very weak. I saw the doctor this morning and he gave me a prescription and told me to rest for two days. Marc has kindly agreed to cover my meetings. I’ll keep you updated.\nBest,\nLéa',
          checklist: ['present perfect + since/for', 'Ton professionnel', 'Information pratique (durée, remplaçant)'],
        }),
      ],
    }),
  ],
};

// ---------------------------------------------------------------- Jour 18
const w18 = [
  v(18, 2, 'to binge-watch', 'regarder en rafale', 'We binge-watched the whole season.', 'On a regardé toute la saison d’affilée.', 'Séries.', '/ˈbɪndʒ wɒtʃ/', ['media']),
  v(18, 2, 'plot', 'intrigue', 'The plot is really gripping.', 'L’intrigue est vraiment captivante.', 'L’histoire d’un film / livre.', '/plɒt/', ['media']),
  v(18, 2, 'spoiler', 'divulgâchage', 'No spoilers, please!', 'Pas de spoilers, s’il te plaît !', 'Révéler la fin.', '/ˈspɔɪlə/', ['media']),
  v(18, 2, 'subtitles', 'sous-titres', 'I watch films with English subtitles.', 'Je regarde les films avec sous-titres anglais.', 'Astuce : sous-titres en anglais plutôt qu’en français.', '/ˈsʌbtaɪtlz/', ['media']),
  v(18, 2, 'accent', 'accent', 'I find the Scottish accent hard to understand.', 'Je trouve l’accent écossais difficile à comprendre.', 'Accents UK / US / AUS…', '/ˈæksent/', ['media']),
  v(18, 2, 'gripping', 'captivant', 'It’s a gripping thriller.', 'C’est un thriller captivant.', 'Qui tient en haleine.', '/ˈɡrɪpɪŋ/', ['media']),
  v(18, 3, 'to mumble', 'marmonner', 'He mumbles, so I can’t understand him.', 'Il marmonne, donc je ne le comprends pas.', 'Parler indistinctement.', '/ˈmʌmbl/', ['media']),
  v(18, 2, 'to be hooked on', 'être accro à', 'I’m hooked on this podcast.', 'Je suis accro à ce podcast.', 'Familier.', '/biː ˈhʊkt ɒn/', ['media']),
];

const day18: Day = {
  day: 18,
  title: 'Séries, médias et anglais naturel',
  titleEn: 'Media English',
  theme: 'Comprendre l’anglais authentique et rapide',
  objectives: ['Comprendre des répliques rapides et des accents', 'Parler d’une série ou d’un film', 'Retravailler vos notions fragiles'],
  concepts: ['natural-speech', 'opinions', 'inference'],
  activities: [
    activity('d18-lesson', {
      kind: 'lesson',
      title: 'Apprendre avec les séries',
      summary: 'Une méthode efficace pour progresser avec des contenus authentiques.',
      minutes: 10,
      skills: ['listening'],
      lesson: [
        {
          heading: 'La méthode en 4 étapes',
          body: '1) Regardez une scène de 2 minutes avec sous-titres ANGLAIS. 2) Notez 3 expressions. 3) Réécoutez sans sous-titres. 4) Répétez les répliques à voix haute (shadowing).\nÉvitez les sous-titres français : votre cerveau lit au lieu d’écouter.',
        },
        {
          heading: 'Les difficultés de l’oral authentique',
          body: 'Mots « avalés » (gonna, d’you know), liaisons (« an apple » → « a-napple »), accents (UK, US, écossais, australien), argot. Ne visez pas 100 % : 70 % de compréhension, c’est déjà très bien.',
        },
      ],
      items: [mcq('natural-speech', 2, 'Best subtitles to improve your English:', ['French subtitles', 'English subtitles', 'No subtitles from day 1', 'Spanish subtitles'], 1, 'Sous-titres anglais.', { skill: 'listening' })],
    }),
    vocabActivity(18, w18, 'Vocabulaire : séries et médias'),
    activity('d18-listening', {
      kind: 'listening',
      title: 'Écoute : répliques rapides',
      summary: 'Comprenez des phrases au rythme naturel. Écoutez d’abord à vitesse normale.',
      minutes: 12,
      skills: ['listening'],
      items: [
        listen('natural-speech', 2, 'D’you wanna watch the next episode or are you gonna go to bed?', 'What is the speaker asking?', ['If you want another episode or to sleep', 'If you watched the episode', 'If you are tired of the series', 'If you want to go out'], 0, 'D’you wanna = Do you want to ; gonna = going to.'),
        listen('inference', 2, 'Don’t tell me what happens! I haven’t seen the finale yet.', 'What does the speaker want?', ['A summary', 'No spoilers', 'To watch the finale now', 'A new series'], 1, 'Pas de spoiler.'),
        listen('opinions', 3, 'The first season was gripping, but honestly, it kind of went downhill after that.', 'What does the speaker think of the series?', ['It got better.', 'It got worse after season one.', 'It was always bad.', 'They never watched it.'], 1, 'went downhill = s’est dégradé.'),
        listen('natural-speech', 3, 'I’m totally hooked on this podcast — I listen to it on my commute every day.', 'When does the speaker listen to the podcast?', ['At night', 'While travelling to work', 'At the weekend', 'Never'], 1, 'on my commute.'),
        dict('natural-speech', 2, 'I’m hooked on this series.', 'be hooked on.'),
      ],
    }),
    targeted(18),
    activity('d18-speaking', {
      kind: 'speaking',
      title: 'Oral : recommander une série',
      summary: 'Présentez une série ou un film sans spoiler.',
      minutes: 12,
      skills: ['speaking'],
      items: [
        ask('opinions', 2, 'What series or film would you recommend? Why?', 'I’d recommend “The Crown”. The plot is gripping and the acting is brilliant.', 'Quelle série ou quel film recommanderais-tu ? Pourquoi ?', ['recommend', 'plot', 'because', 'gripping', 'acting', 'story'], 'Titre + intrigue (sans spoiler) + avis.'),
        ask('natural-speech', 2, 'How do you use films and series to learn English?', 'I watch series with English subtitles and I write down useful expressions.', 'Comment utilises-tu films et séries pour apprendre ?', ['subtitles', 'watch', 'listen', 'write', 'repeat'], 'Décrivez votre méthode.'),
        speak('natural-speech', 3, 'D’you wanna watch another episode?', 'Tu veux regarder un autre épisode ?', 'Imitez la forme orale réduite (« djou-wanna »).'),
      ],
    }),
    activity('d18-writing', {
      kind: 'writing',
      title: 'Écriture : critique de série',
      summary: 'Écrivez une critique courte.',
      minutes: 12,
      skills: ['writing'],
      items: [
        free('opinions', 2, {
          prompt: 'Write a short review (no spoilers!) of a series or film you like: plot, characters, what you liked, what could be better, and your rating.',
          promptFr: 'Écrivez une courte critique (sans spoiler) : intrigue, personnages, points forts et faibles, note.',
          minWords: 80,
          targetWords: ['plot', 'gripping', 'however', 'recommend'],
          keywords: ['film', 'series', 'show', 'episode', 'movie'],
          modelAnswer:
            'I recently binge-watched “Slow Horses”, a British spy series. The plot follows a group of failed agents who are sent to a terrible office. The story is gripping and often very funny, and Gary Oldman is brilliant as their boss. However, some episodes are a bit slow and the accents can be hard to understand without subtitles. Overall, I’d definitely recommend it. I’d give it 8 out of 10.',
          checklist: ['Pas de spoiler', 'Avis nuancé (however)', 'Vocabulaire du jour'],
        }),
      ],
    }),
  ],
};

// ---------------------------------------------------------------- Jour 19
const w19 = [
  v(19, 2, 'while', 'pendant que', 'While I was cooking, the phone rang.', 'Pendant que je cuisinais, le téléphone a sonné.', 'Souvent avec le past continuous.', '/waɪl/', ['connectors']),
  v(19, 2, 'all of a sudden', 'tout à coup', 'All of a sudden, the lights went out.', 'Tout à coup, la lumière s’est éteinte.', 'Synonyme de suddenly.', '/ɔːl əv ə ˈsʌdn/', ['connectors']),
  v(19, 2, 'it turned out that', 'il s’est avéré que', 'It turned out that he was right.', 'Il s’est avéré qu’il avait raison.', 'Révélation dans un récit.', '/ɪt tɜːnd ˈaʊt ðæt/', ['connectors']),
  v(19, 2, 'by the time', 'le temps que, au moment où', 'By the time we arrived, the film had started.', 'Le temps qu’on arrive, le film avait commencé.', 'Souvent avec le past perfect.', '/baɪ ðə ˈtaɪm/', ['connectors']),
  v(19, 2, 'to realise', 'se rendre compte', 'I suddenly realised I had forgotten my keys.', 'Je me suis soudain rendu compte que j’avais oublié mes clés.', 'FAUX AMI : réaliser (un projet) = carry out / achieve.', '/ˈrɪəlaɪz/', ['false-friends']),
  v(19, 2, 'luckily', 'heureusement', 'Luckily, nobody was hurt.', 'Heureusement, personne n’a été blessé.', 'Contraire : unfortunately.', '/ˈlʌkɪli/', ['connectors']),
  v(19, 2, 'in the end', 'au final, finalement', 'In the end, we had a great time.', 'Au final, on s’est bien amusés.', 'Conclusion d’un récit.', '/ɪn ði ˈend/', ['connectors']),
  v(19, 3, 'to make up (a story)', 'inventer (une histoire)', 'He made up an excuse.', 'Il a inventé une excuse.', 'make up = inventer.', '/meɪk ˈʌp/', ['phrasal']),
];

const day19: Day = {
  day: 19,
  title: 'Raconter une histoire',
  titleEn: 'Storytelling',
  theme: 'Narration avancée : past continuous et past perfect',
  objectives: ['Planter le décor avec le past continuous', 'Exprimer l’antériorité avec le past perfect', 'Captiver avec des connecteurs de récit'],
  concepts: ['past-simple', 'connectors', 'past-be'],
  activities: [
    activity('d19-lesson', {
      kind: 'lesson',
      title: 'Les temps du récit',
      summary: 'Décor, action, antériorité.',
      minutes: 12,
      skills: ['grammar'],
      lesson: [
        {
          heading: 'Past continuous : le décor',
          body: 'was/were + -ing : une action en cours dans le passé, souvent interrompue par une action au prétérit.\n« I was walking home when it started to rain. »',
          examples: [{ en: 'While we were having dinner, someone knocked on the door.', fr: 'Pendant qu’on dînait, quelqu’un a frappé à la porte.' }],
        },
        {
          heading: 'Past perfect : l’antériorité',
          body: 'had + participe passé : une action ANTÉRIEURE à une autre action passée (= plus-que-parfait).\n« When I arrived, the train had left. » (le train était déjà parti)',
          examples: [{ en: 'I realised I had left my phone at home.', fr: 'Je me suis rendu compte que j’avais laissé mon téléphone à la maison.' }],
        },
      ],
      items: [
        mcq('past-simple', 2, 'I ___ TV when you called.', ['watched', 'was watching', 'had watched', 'am watching'], 1, 'Action en cours interrompue → past continuous.'),
        mcq('past-simple', 3, 'When we got to the cinema, the film ___.', ['already started', 'had already started', 'has already started', 'was already start'], 1, 'Antériorité → past perfect.'),
      ],
    }),
    vocabActivity(19, w19, 'Vocabulaire : le récit'),
    activity('d19-practice', {
      kind: 'grammar',
      title: 'Pratique : temps du passé',
      summary: 'Prétérit, past continuous ou past perfect ?',
      minutes: 15,
      skills: ['grammar'],
      items: [
        conj('past-simple', 2, 'walk', 'past continuous', 'I ___ to work when I saw the accident.', ['was walking'], 'Action en cours.'),
        conj('past-simple', 2, 'ring', 'prétérit', 'While I was cooking, the phone ___.', ['rang'], 'Action ponctuelle : rang.'),
        conj('past-simple', 3, 'leave', 'past perfect', 'When I got to the station, the train ___.', ['had left', 'had already left'], 'Antériorité : had left.'),
        conj('past-simple', 3, 'never / see', 'past perfect', 'I ___ snow before I moved to Canada.', ['had never seen'], 'had never seen.'),
        gap('connectors', 2, 'It turned ___ that the shop was closed.', ['out'], 'it turned out that.'),
        tr('past-simple', 3, 'Je dormais quand tu as appelé.', ['I was sleeping when you called', 'I was asleep when you called'], 'past continuous + prétérit.'),
        tr('past-simple', 3, 'Je me suis rendu compte que j’avais oublié mes clés.', ['I realized I had forgotten my keys', 'I realized that I had forgotten my keys'], 'realise + past perfect.'),
      ],
    }),
    targeted(19),
    activity('d19-listening', {
      kind: 'listening',
      title: 'Écoute : une anecdote',
      summary: 'Suivez le fil d’une histoire.',
      minutes: 10,
      skills: ['listening'],
      items: [
        listen('past-simple', 2, 'I was waiting for the bus when a man asked me for directions in French. It turned out he was from Lyon, like me!', 'What was surprising?', ['The bus was late.', 'The man was from the same city.', 'The man was lost forever.', 'The speaker took a taxi.'], 1, 'It turned out = il s’est avéré.'),
        listen('past-simple', 3, 'By the time we found a parking space, the concert had already started.', 'What happened?', ['They arrived early.', 'They arrived after the start.', 'They didn’t find parking.', 'The concert was cancelled.'], 1, 'had already started.'),
        listen('connectors', 2, 'We got completely lost, but in the end, we found a lovely little restaurant.', 'How did the story end?', ['Badly', 'Well', 'They went home', 'They never ate'], 1, 'in the end = au final (positif).'),
        dict('past-simple', 3, 'While I was sleeping, someone knocked on the door.', 'past continuous + prétérit.'),
      ],
    }),
    activity('d19-speaking', {
      kind: 'speaking',
      title: 'Oral : racontez une anecdote',
      summary: 'Une histoire de 1 à 2 minutes.',
      minutes: 12,
      skills: ['speaking'],
      items: [
        ask('past-simple', 3, 'Tell me about a time something unexpected happened to you.', 'Last year, I was walking in Paris when I bumped into my old teacher. It turned out she lived in my street!', 'Raconte un moment inattendu.', ['was', 'when', 'turned out', 'suddenly', 'ing', 'had'], 'Décor (was -ing) + événement (prétérit) + chute.'),
        ask('connectors', 3, 'Tell me about a trip where something went wrong.', 'We were driving to Spain when the car broke down. Luckily, a farmer helped us, and in the end, it was a great adventure.', 'Raconte un voyage où quelque chose s’est mal passé.', ['luckily', 'in the end', 'when', 'was', 'were'], 'Utilisez luckily / in the end.'),
      ],
    }),
    activity('d19-writing', {
      kind: 'writing',
      title: 'Écriture : une histoire courte',
      summary: 'Écrivez une histoire avec les trois temps du passé.',
      minutes: 15,
      skills: ['writing'],
      items: [
        free('past-simple', 3, {
          prompt: 'Write a short story (true or made up) starting with: “It was a cold evening in November…”. Use the past continuous, the simple past and the past perfect.',
          promptFr: 'Écrivez une histoire courte commençant par « It was a cold evening in November… », avec les trois temps du passé.',
          minWords: 120,
          targetWords: ['while', 'all of a sudden', 'had', 'it turned out', 'in the end'],
          keywords: ['was', 'were'],
          modelAnswer:
            'It was a cold evening in November. I was walking home from work and it was raining heavily. While I was crossing the park, I noticed a small dog under a bench. It was shaking. All of a sudden, I realised that I had seen it before: it was my neighbour’s dog! It turned out that it had escaped that morning. I carried it home and knocked on my neighbour’s door. She burst into tears. In the end, she invited me for dinner, and now we are good friends.',
          checklist: ['past continuous pour le décor', 'past perfect pour l’antériorité', 'Connecteurs de récit', 'Une fin claire'],
        }),
      ],
    }),
  ],
};

// ---------------------------------------------------------------- Jour 20
const w20 = [
  v(20, 2, 'to negotiate', 'négocier', 'We managed to negotiate a better price.', 'Nous avons réussi à négocier un meilleur prix.', 'Affaires, achats.', '/nɪˈɡəʊʃieɪt/', ['work']),
  v(20, 2, 'compromise', 'compromis', 'Let’s find a compromise.', 'Trouvons un compromis.', 'Prononciation : KOM-pro-maïz.', '/ˈkɒmprəmaɪz/', ['opinions']),
  v(20, 2, 'to be willing to', 'être prêt à', 'Are you willing to lower the price?', 'Êtes-vous prêt à baisser le prix ?', 'Disposition à faire quelque chose.', '/biː ˈwɪlɪŋ tuː/', ['opinions']),
  v(20, 2, 'deal', 'accord, affaire', 'It’s a deal!', 'Marché conclu !', 'a good deal = une bonne affaire.', '/diːl/', ['work']),
  v(20, 3, 'to have a point', 'avoir raison sur un point', 'You have a point there.', 'Tu marques un point.', 'Reconnaître un argument.', '/hæv ə ˈpɔɪnt/', ['opinions']),
  v(20, 2, 'to argue', 'se disputer, soutenir (un argument)', 'Some people argue that it’s too expensive.', 'Certains soutiennent que c’est trop cher.', 'argue that = soutenir que.', '/ˈɑːɡjuː/', ['opinions']),
  v(20, 3, 'to be fair', 'pour être juste', 'To be fair, he did apologise.', 'Pour être juste, il s’est excusé.', 'Nuancer.', '/tə biː ˈfeə/', ['opinions']),
  v(20, 2, 'whatever', 'peu importe, quoi que', 'Whatever you decide, I’ll support you.', 'Quoi que tu décides, je te soutiendrai.', 'Attention au ton : « Whatever. » seul peut être impoli.', '/wɒtˈevə/', ['expressions']),
];

const day20: Day = {
  day: 20,
  title: 'Débattre et négocier',
  titleEn: 'Debating and negotiating',
  theme: 'Défendre une position, trouver un compromis',
  objectives: ['Argumenter avec nuance', 'Négocier poliment', 'Utiliser le conditionnel pour proposer'],
  concepts: ['opinions', 'conditionals', 'connectors'],
  activities: [
    activity('d20-lesson', {
      kind: 'lesson',
      title: 'Négocier en anglais',
      summary: 'Proposer, concéder, conclure.',
      minutes: 10,
      skills: ['speaking'],
      lesson: [
        {
          heading: 'Proposer et concéder',
          body: 'Proposer : What if we…? · How about…? · Would you be willing to…? · If you…, we could…\nConcéder : You have a point. · To be fair… · I can see why you say that.\nConclure : It’s a deal. · Let’s meet halfway.',
          examples: [{ en: 'If you order 100 units, we could offer a 10% discount.', fr: 'Si vous commandez 100 unités, nous pourrions offrir 10 % de remise.' }],
        },
      ],
      items: [mcq('conditionals', 2, 'If you ___ today, we could deliver tomorrow.', ['will order', 'order', 'ordered would', 'ordering'], 1, 'If + présent, could + base.')],
    }),
    vocabActivity(20, w20, 'Vocabulaire : débat et négociation'),
    activity('d20-dialogue', {
      kind: 'dialogue',
      title: 'Dialogue : négocier un prix',
      summary: 'Une négociation entre une cliente et un fournisseur.',
      minutes: 10,
      skills: ['listening', 'reading'],
      dialogue: {
        title: 'Negotiating a price',
        setting: 'Sophie négocie avec Mr Hall, un fournisseur de mobilier de bureau.',
        lines: [
          { speaker: 'Mr Hall', text: 'So, for fifty desks, the price is twelve thousand pounds.', fr: 'Alors, pour cinquante bureaux, le prix est de douze mille livres.' },
          { speaker: 'Sophie', text: 'That’s a bit above our budget. Would you be willing to offer a discount?', fr: 'C’est un peu au-dessus de notre budget. Seriez-vous prêt à faire une remise ?' },
          { speaker: 'Mr Hall', text: 'I could do five percent.', fr: 'Je pourrais faire cinq pour cent.' },
          { speaker: 'Sophie', text: 'What if we ordered the chairs from you as well? Could you go up to ten percent?', fr: 'Et si on vous commandait aussi les chaises ? Pourriez-vous aller jusqu’à dix pour cent ?' },
          { speaker: 'Mr Hall', text: 'You have a point — that’s a bigger order. Let’s meet halfway: eight percent, and free delivery.', fr: 'Vous marquez un point — c’est une plus grosse commande. Coupons la poire en deux : huit pour cent, et livraison gratuite.' },
          { speaker: 'Sophie', text: 'It’s a deal!', fr: 'Marché conclu !' },
        ],
      },
      items: [
        mcq('comprehension', 2, 'What discount did they agree on?', ['5%', '8%', '10%', '12%'], 1, 'eight percent.', { skill: 'reading', passage: true }),
        mcq('comprehension', 2, 'What did Sophie offer to get a better price?', ['To pay in cash', 'To order chairs too', 'To wait longer', 'To collect the desks'], 1, 'ordered the chairs as well.', { skill: 'reading', passage: true }),
        mcq('expressions', 2, '« Let’s meet halfway » means…', ['Rencontrons-nous à mi-chemin', 'Coupons la poire en deux', 'Partons maintenant', 'Faisons une pause'], 1, 'Trouver un compromis.', { skill: 'vocabulary', passage: true }),
      ],
    }),
    targeted(20),
    activity('d20-speaking', {
      kind: 'speaking',
      title: 'Oral : débat express',
      summary: 'Défendez une position puis concédez un point.',
      minutes: 12,
      skills: ['speaking'],
      items: [
        ask('opinions', 3, 'Should cars be banned from city centres?', 'I think they should be banned, because pollution is a real problem. To be fair, it would be difficult for some workers.', 'Faut-il interdire les voitures dans les centres-villes ?', ['think', 'because', 'to be fair', 'however', 'although', 'should'], 'Position + argument + concession.'),
        ask('conditionals', 3, 'You want a lower rent. Negotiate with your landlord.', 'Would you be willing to lower the rent if I signed a two-year contract?', 'Négociez votre loyer.', ['would', 'willing', 'if', 'could'], 'Would you be willing to… if…?'),
        speak('pronunciation', 2, 'Let’s find a compromise.', 'Trouvons un compromis.', 'compromise : KOM-pro-maïz.'),
      ],
    }),
    activity('d20-writing', {
      kind: 'writing',
      title: 'Écriture : pour et contre',
      summary: 'Un texte argumenté équilibré.',
      minutes: 15,
      skills: ['writing'],
      items: [
        free('opinions', 3, {
          prompt: 'Is a four-day working week a good idea? Present arguments for and against, then give your opinion.',
          promptFr: 'La semaine de quatre jours est-elle une bonne idée ? Arguments pour et contre, puis votre avis.',
          minWords: 120,
          targetWords: ['some people argue', 'to be fair', 'on the other hand', 'compromise', 'whereas'],
          keywords: ['work', 'week', 'day'],
          modelAnswer:
            'Some people argue that a four-day week would make employees happier and more productive. They would have more time for their families and hobbies, and companies could save on energy. On the other hand, some jobs, like healthcare, need people every day, whereas offices can adapt more easily. To be fair, longer working days could also be exhausting. In my opinion, a good compromise would be to let each company test it for six months and measure the results.',
          checklist: ['Arguments pour ET contre', 'Concession (to be fair)', 'Avis personnel', 'Conditionnel (would)'],
        }),
      ],
    }),
  ],
};

// ---------------------------------------------------------------- Jour 21
const w21 = [
  v(21, 2, 'to hang up', 'raccrocher', 'Don’t hang up, I’ll transfer you.', 'Ne raccrochez pas, je vous transfère.', 'Téléphone.', '/hæŋ ˈʌp/', ['phone']),
  v(21, 2, 'to hold on', 'patienter', 'Hold on a second, please.', 'Patientez une seconde, s’il vous plaît.', 'Aussi « hold the line ».', '/həʊld ˈɒn/', ['phone']),
  v(21, 2, 'to put someone through', 'passer quelqu’un (au téléphone)', 'I’ll put you through to the manager.', 'Je vous passe le responsable.', 'Transférer un appel.', '/pʊt ˈθruː/', ['phone']),
  v(21, 2, 'you’re breaking up', 'ça coupe', 'Sorry, you’re breaking up.', 'Désolé, ça coupe.', 'Mauvaise connexion.', '/jɔː ˈbreɪkɪŋ ʌp/', ['phone']),
  v(21, 2, 'to be on mute', 'être en sourdine', 'I think you’re on mute.', 'Je crois que tu es en sourdine.', 'Visio.', '/biː ɒn ˈmjuːt/', ['phone']),
  v(21, 2, 'to spell', 'épeler', 'Could you spell your surname, please?', 'Pourriez-vous épeler votre nom ?', 'Révisez l’alphabet anglais !', '/spel/', ['phone']),
  v(21, 2, 'to call back', 'rappeler', 'Can I call you back in five minutes?', 'Je peux te rappeler dans cinq minutes ?', 'Rappeler quelqu’un.', '/kɔːl ˈbæk/', ['phone']),
  v(21, 2, 'to leave a message', 'laisser un message', 'Would you like to leave a message?', 'Voulez-vous laisser un message ?', 'Messagerie.', '/liːv ə ˈmesɪdʒ/', ['phone']),
];

const day21: Day = {
  day: 21,
  title: 'Téléphone et visioconférence',
  titleEn: 'Phone and video calls',
  theme: 'Comprendre sans voir son interlocuteur',
  objectives: ['Gérer un appel (transfert, message, rappel)', 'Épeler et comprendre des chiffres', 'Gérer les problèmes techniques en visio'],
  concepts: ['polite-requests', 'comprehension', 'phrasal-verbs'],
  activities: [
    activity('d21-lesson', {
      kind: 'lesson',
      title: 'Au téléphone',
      summary: 'Formules et stratégies quand on ne voit pas l’autre.',
      minutes: 10,
      skills: ['listening'],
      lesson: [
        {
          heading: 'Formules clés',
          body: 'Décrocher : Hello, this is Marie (speaking). · Demander : Could I speak to…? · Patienter : Hold on, please. · Transférer : I’ll put you through. · Problème : Sorry, you’re breaking up. / Could you speak up a bit?',
          tip: 'Au téléphone, n’hésitez pas à reformuler : « So, if I understand correctly, … ». C’est professionnel, pas un aveu de faiblesse.',
        },
        {
          heading: 'Épeler et les chiffres',
          body: 'Lettres pièges : A (« éï »), E (« ii »), I (« aï »), G (« dji »), J (« djéï »), R (« ar »), W (« double-you »), Y (« waï »).\nNuméros de téléphone : on énonce chiffre par chiffre, 0 = « oh » ou « zero », 44 = « double four ».',
        },
      ],
      items: [mcq('polite-requests', 2, 'The connection is bad. You say:', ['You’re breaking up.', 'You’re breaking down.', 'You’re hanging up.', 'You’re on hold.'], 0, 'You’re breaking up = ça coupe.')],
    }),
    vocabActivity(21, w21, 'Vocabulaire : téléphone et visio'),
    activity('d21-listening', {
      kind: 'listening',
      title: 'Écoute : messages téléphoniques',
      summary: 'Notez les informations précises.',
      minutes: 12,
      skills: ['listening'],
      items: [
        listen('comprehension', 2, 'Hi, this is Dan from Greenway. Could you call me back on oh-seven-seven, double-four, nine-two-one?', 'What is Dan’s number?', ['077 449 21', '077 44 921', '077 49 921', '077 449 921'], 3, 'oh-seven-seven (077), double-four (44), nine-two-one (921).'),
        listen('comprehension', 2, 'My surname is Wright: W-R-I-G-H-T.', 'How is the surname spelled?', ['Right', 'Write', 'Wright', 'Rite'], 2, 'W-R-I-G-H-T.'),
        listen('polite-requests', 2, 'I’m afraid she’s in a meeting. Would you like to leave a message?', 'Where is the person?', ['On holiday', 'In a meeting', 'On another call', 'At lunch'], 1, 'in a meeting.'),
        listen('natural-speech', 2, 'Can you hear me? I think you’re on mute.', 'What is the problem?', ['The speaker can’t hear because the other person’s microphone is off.', 'The speaker is on holiday.', 'The video is frozen.', 'The call is too long.'], 0, 'on mute = micro coupé.'),
        dict('polite-requests', 2, 'Could you spell your surname, please?', 'spell = épeler.'),
      ],
    }),
    activity('d21-practice', {
      kind: 'translation',
      title: 'Pratique : formules téléphoniques',
      summary: 'Traduisez les formules clés.',
      minutes: 10,
      skills: ['construction'],
      items: [
        tr('polite-requests', 2, 'Ne quittez pas, je vous le passe.', ["Hold on, I{'ll| will} put you through", "Hold the line, I{'ll| will} put you through"], 'Hold on / put through.'),
        tr('polite-requests', 2, 'Je peux vous rappeler plus tard ?', ['Can I call you back later', 'Could I call you back later'], 'call back.'),
        tr('polite-requests', 2, 'Vous pouvez parler plus fort ?', ['Could you speak up', 'Can you speak up', 'Could you speak louder', 'Can you speak louder', 'Could you speak up, please'], 'speak up.'),
        gap('phrasal-verbs', 2, 'Please don’t hang ___ — I’m transferring you.', ['up'], 'hang up = raccrocher.'),
      ],
    }),
    targeted(21),
    activity('d21-speaking', {
      kind: 'speaking',
      title: 'Oral : simulation d’appel',
      summary: 'Répondez comme au téléphone.',
      minutes: 12,
      skills: ['speaking'],
      items: [
        ask('polite-requests', 2, 'Good morning, Brightside Ltd. How can I help you?', 'Good morning, this is Paul Martin. Could I speak to Mrs Evans, please?', 'Bonjour, Brightside Ltd. Que puis-je pour vous ?', ['this is', 'could i', 'speak to', 'please'], 'Présentez-vous + demande.'),
        ask('polite-requests', 2, 'Could you spell your name, please?', 'Of course, it’s Martin: M-A-R-T-I-N.', 'Pouvez-vous épeler votre nom ?', ['of course', 'sure', "it's"], 'Épelez avec l’alphabet anglais.'),
        ask('natural-speech', 3, 'You can’t hear well during a video call. Say so politely.', 'Sorry, you’re breaking up a bit. Could you repeat the last part?', 'Vous entendez mal en visio. Dites-le poliment.', ['sorry', 'breaking up', 'repeat', 'could', "can't hear"], 'Signalez + demandez de répéter.'),
      ],
    }),
    activity('d21-writing', {
      kind: 'writing',
      title: 'Écriture : prendre un message',
      summary: 'Notez un message téléphonique pour un collègue.',
      minutes: 8,
      skills: ['writing'],
      items: [
        free('polite-requests', 2, {
          prompt: 'Write a phone message for a colleague: who called, why, their number, and what they want your colleague to do.',
          promptFr: 'Rédigez un message téléphonique pour un collègue : qui, pourquoi, numéro, action attendue.',
          minWords: 40,
          targetWords: ['call back', 'called', 'message'],
          keywords: ['called', 'call'],
          modelAnswer:
            'Hi Tom, Mrs Evans from Brightside called at 10:30. She wants to change the date of Thursday’s meeting. Could you call her back before 5 pm? Her number is 020 7946 0321. Thanks! – Julie',
          checklist: ['Qui, quand, pourquoi', 'Numéro complet', 'Action demandée'],
        }),
      ],
    }),
  ],
};

// ---------------------------------------------------------------- Jour 22
const w22 = [
  v(22, 2, 'flat / apartment', 'appartement (UK / US)', 'I live in a small flat in London.', 'J’habite un petit appartement à Londres.', 'UK : flat ; US : apartment.', '/flæt/ /əˈpɑːtmənt/', ['culture']),
  v(22, 2, 'queue / line', 'file d’attente (UK / US)', 'The queue was really long.', 'La file d’attente était très longue.', 'UK : queue ; US : line.', '/kjuː/ /laɪn/', ['culture']),
  v(22, 2, 'chips / fries', 'frites (UK / US)', 'Fish and chips, please.', 'Fish and chips, s’il vous plaît.', 'UK chips = US fries ; US chips = UK crisps.', '/tʃɪps/ /fraɪz/', ['culture']),
  v(22, 2, 'tip', 'pourboire', 'In the US, people usually tip 15 to 20%.', 'Aux États-Unis, on laisse en général 15 à 20 % de pourboire.', 'Coutume très différente selon les pays.', '/tɪp/', ['culture']),
  v(22, 2, 'cheers', 'merci / santé (UK)', 'Cheers, mate!', 'Merci, mon pote !', 'UK familier : merci, au revoir, ou santé.', '/tʃɪəz/', ['culture']),
  v(22, 2, 'to be polite', 'être poli', 'British people are very polite in queues.', 'Les Britanniques sont très polis dans les files.', 'polite / rude.', '/biː pəˈlaɪt/', ['culture']),
  v(22, 2, 'customs', 'coutumes / douane', 'It’s one of the local customs. You’ll go through customs at the airport.', 'C’est une coutume locale. Vous passerez la douane à l’aéroport.', 'Double sens selon le contexte.', '/ˈkʌstəmz/', ['culture']),
  v(22, 2, 'sightseeing', 'tourisme, visites', 'We went sightseeing in Edinburgh.', 'On a visité Édimbourg.', 'go sightseeing.', '/ˈsaɪtsiːɪŋ/', ['travel']),
];

const day22: Day = {
  day: 22,
  title: 'Culture et voyages : UK, US et ailleurs',
  titleEn: 'Culture and travel',
  theme: 'Différences culturelles et linguistiques',
  objectives: ['Connaître les différences UK / US courantes', 'Comprendre les codes culturels (pourboire, politesse)', 'Raconter un voyage culturel'],
  concepts: ['expressions', 'comprehension', 'polite-requests'],
  activities: [
    activity('d22-lesson', {
      kind: 'lesson',
      title: 'Anglais britannique ou américain ?',
      summary: 'Les différences qui comptent vraiment.',
      minutes: 10,
      skills: ['vocabulary'],
      lesson: [
        {
          heading: 'Vocabulaire',
          body: 'UK / US : flat / apartment · lift / elevator · holiday / vacation · queue / line · chips / fries · crisps / chips · underground (tube) / subway · mobile / cell phone · autumn / fall.',
        },
        {
          heading: 'Codes culturels',
          body: 'Royaume-Uni : on s’excuse beaucoup (Sorry!), on respecte la file d’attente, l’ironie est fréquente.\nÉtats-Unis : pourboire attendu au restaurant (15–20 %), enthousiasme verbal (Awesome!).\nDans les deux cas : « please » et « thank you » sont essentiels.',
        },
      ],
      items: [mcq('vocabulary', 2, 'In American English, a “flat” is…', ['a lift', 'an apartment', 'a holiday', 'a queue'], 1, 'flat (UK) = apartment (US).', { skill: 'vocabulary' })],
    }),
    vocabActivity(22, w22, 'Vocabulaire : culture et voyage'),
    activity('d22-reading', {
      kind: 'reading',
      title: 'Lecture : guide de survie à Londres',
      summary: 'Un article de blog sur les codes britanniques.',
      minutes: 12,
      skills: ['reading'],
      passage: {
        title: 'Five things nobody tells you about London',
        text: '1. Stand on the right. On the escalators in the Tube, people stand on the right and walk on the left. Blocking the left side is the fastest way to annoy a Londoner.\n2. Queue properly. Whether it’s for a bus or a coffee, people wait in line patiently. Jumping the queue is considered very rude.\n3. “Sorry” means many things. Londoners say sorry when they bump into you, when you bump into them, and sometimes just to start a sentence.\n4. Tipping is optional. In restaurants, a service charge of around 12.5% is often added to the bill. If it is, you don’t need to leave more.\n5. Pack an umbrella. The weather can change several times in one afternoon, even in summer.',
        fr: 'Cinq choses qu’on ne vous dit pas sur Londres : tenez la droite dans les escalators ; faites la queue correctement ; « sorry » veut dire beaucoup de choses ; le pourboire est facultatif (service souvent inclus, environ 12,5 %) ; prenez un parapluie.',
      },
      items: [
        mcq('comprehension', 1, 'On escalators in the Tube, you should…', ['stand on the left', 'stand on the right', 'always walk', 'sit down'], 1, 'Stand on the right.', { skill: 'reading', passage: true }),
        mcq('comprehension', 2, 'What is considered very rude?', ['Saying sorry', 'Jumping the queue', 'Tipping', 'Carrying an umbrella'], 1, 'Jumping the queue.', { skill: 'reading', passage: true }),
        mcq('comprehension', 2, 'If a service charge is on the bill…', ['you must add 20%', 'you don’t need to tip more', 'you should complain', 'it is illegal'], 1, 'you don’t need to leave more.', { skill: 'reading', passage: true }),
        mcq('inference', 3, 'The tone of the article is…', ['angry', 'humorous and practical', 'very formal', 'sad'], 1, 'Ton léger et pratique.', { skill: 'reading', passage: true }),
      ],
    }),
    targeted(22),
    activity('d22-speaking', {
      kind: 'speaking',
      title: 'Oral : comparer les cultures',
      summary: 'Comparez avec la France.',
      minutes: 12,
      skills: ['speaking'],
      items: [
        ask('comparatives', 2, 'What are the main differences between France and the UK or the US?', 'In France, people don’t tip as much as in the US, and meals are usually longer.', 'Quelles sont les principales différences entre la France et le Royaume-Uni ou les États-Unis ?', ['whereas', 'than', 'more', 'less', 'as', 'in france', 'different'], 'Utilisez des comparatifs et whereas.'),
        ask('past-simple', 2, 'Tell me about a cultural surprise you had abroad.', 'When I was in Japan, I was surprised that people didn’t talk on the phone in the train.', 'Raconte une surprise culturelle à l’étranger.', ['was', 'surprised', 'when', 'people'], 'Prétérit + was surprised that…'),
      ],
    }),
    activity('d22-writing', {
      kind: 'writing',
      title: 'Écriture : conseils aux visiteurs',
      summary: 'Écrivez 5 conseils pour un anglophone qui visite la France.',
      minutes: 12,
      skills: ['writing'],
      items: [
        free('expressions', 2, {
          prompt: 'Write five tips for an English-speaking tourist visiting France (greetings, meals, shops, transport, tipping).',
          promptFr: 'Écrivez cinq conseils pour un touriste anglophone qui visite la France.',
          minWords: 80,
          targetWords: ['polite', 'tip', 'whereas', 'should'],
          keywords: ['france', 'french'],
          modelAnswer:
            '1. Always say “bonjour” when you enter a shop; it’s considered rude not to. 2. Lunch is important: many small shops close between 12 and 2 pm. 3. You don’t need to tip much, because service is included, whereas in the US you should leave 15–20%. 4. Validate your train ticket before you get on regional trains. 5. Don’t expect dinner before 7:30 pm in restaurants!',
          checklist: ['Cinq conseils clairs', 'should / don’t need to', 'Une comparaison (whereas)'],
        }),
      ],
    }),
  ],
};

// ---------------------------------------------------------------- Jour 23
const w23 = [
  v(23, 3, 'off the top of my head', 'comme ça, de mémoire', 'Off the top of my head, I’d say about fifty.', 'Comme ça, de tête, je dirais une cinquantaine.', 'Réponse sans préparation.', '/ɒf ðə tɒp əv maɪ ˈhed/', ['fillers']),
  v(23, 2, 'that’s a good question', 'bonne question', 'That’s a good question. Let me think.', 'Bonne question. Laisse-moi réfléchir.', 'Gagner du temps poliment.', '/ðæts ə ɡʊd ˈkwestʃən/', ['fillers']),
  v(23, 3, 'I’ve never really thought about it', 'je n’y ai jamais vraiment réfléchi', 'Hmm, I’ve never really thought about it.', 'Hmm, je n’y ai jamais vraiment réfléchi.', 'Honnête et naturel.', '/aɪv ˈnevə ˈrɪəli ˈθɔːt əˈbaʊt ɪt/', ['fillers']),
  v(23, 2, 'what I mean is', 'ce que je veux dire, c’est', 'What I mean is, we need more time.', 'Ce que je veux dire, c’est qu’il nous faut plus de temps.', 'Reformuler.', '/wɒt aɪ ˈmiːn ɪz/', ['fillers']),
  v(23, 2, 'in other words', 'en d’autres termes', 'In other words, it’s not possible.', 'En d’autres termes, ce n’est pas possible.', 'Reformuler.', '/ɪn ˈʌðə wɜːdz/', ['connectors']),
  v(23, 2, 'for instance', 'par exemple', 'Some fruits, for instance mangoes, are expensive here.', 'Certains fruits, par exemple les mangues, sont chers ici.', 'Synonyme : for example.', '/fər ˈɪnstəns/', ['connectors']),
  v(23, 2, 'as far as I know', 'pour autant que je sache', 'As far as I know, the shop is open.', 'Pour autant que je sache, le magasin est ouvert.', 'Information incertaine.', '/əz ˈfɑːr əz aɪ ˈnəʊ/', ['fillers']),
  v(23, 2, 'to tell the truth', 'à vrai dire', 'To tell the truth, I forgot.', 'À vrai dire, j’ai oublié.', 'Aveu.', '/tə tel ðə ˈtruːθ/', ['fillers']),
];

const day23: Day = {
  day: 23,
  title: 'Expression spontanée intensive',
  titleEn: 'Spontaneous speaking',
  theme: 'Parler sans préparation, sous contrainte de temps',
  objectives: ['Répondre à des questions inattendues', 'Développer une réponse (exemple, reformulation)', 'Parler en continu une minute'],
  concepts: ['fillers', 'opinions', 'connectors'],
  activities: [
    activity('d23-lesson', {
      kind: 'lesson',
      title: 'La méthode PREP pour répondre sans préparation',
      summary: 'Point – Reason – Example – Point.',
      minutes: 8,
      skills: ['speaking'],
      lesson: [
        {
          heading: 'PREP',
          body: 'P (Point) : votre réponse en une phrase. R (Reason) : because… E (Example) : for instance… P (Point) : so, that’s why…\nCette structure simple suffit pour parler 30 à 60 secondes sur presque n’importe quel sujet.',
          examples: [{ en: 'I prefer mornings, because I have more energy. For instance, I always go running at 7. So, that’s why I’m a morning person.', fr: 'Je préfère le matin, parce que j’ai plus d’énergie. Par exemple, je cours toujours à 7 h. C’est pour ça que je suis du matin.' }],
        },
      ],
      items: [mcq('fillers', 2, 'In PREP, the E stands for…', ['End', 'Example', 'English', 'Easy'], 1, 'Example.', { skill: 'speaking' })],
    }),
    vocabActivity(23, w23, 'Vocabulaire : parler sans préparation'),
    activity('d23-speaking', {
      kind: 'speaking',
      title: 'Questions surprises (chronométré)',
      summary: 'Répondez avec la méthode PREP. 20 secondes pour commencer à parler.',
      minutes: 20,
      skills: ['speaking'],
      timed: 20,
      items: [
        ask('fillers', 2, 'If you could live anywhere in the world, where would you live?', 'That’s a good question. I’d live in Lisbon, because the weather is great and people are friendly. For instance, …', 'Si tu pouvais vivre n’importe où, où vivrais-tu ?', ["i'd", 'would', 'because', 'for instance', 'example'], 'PREP + conditionnel.'),
        ask('fillers', 3, 'What is the best advice you have ever received?', 'The best advice I’ve ever received is “don’t compare yourself to others”, because…', 'Quel est le meilleur conseil que tu aies reçu ?', ['best', 'advice', 'because', "i've", 'ever'], 'Le superlatif + present perfect.'),
        ask('opinions', 3, 'Is it better to be a morning person or a night owl?', 'I’d say it’s better to be a morning person, because you get more done. For instance, …', 'Mieux vaut être du matin ou du soir ?', ['better', 'because', "i'd say", 'think', 'for instance'], 'Donnez un avis argumenté.'),
        ask('fillers', 3, 'Describe your ideal weekend.', 'My ideal weekend would start with a long breakfast, then I’d go hiking…', 'Décris ton week-end idéal.', ['would', "i'd", 'then', 'first', 'and'], 'Enchaînez avec then / after that.'),
        ask('fillers', 3, 'What would you change about your city?', 'To tell the truth, I’d add more bike lanes, because traffic is terrible.', 'Que changerais-tu dans ta ville ?', ['would', "i'd", 'because', 'more', 'change'], 'Conditionnel + raison.'),
      ],
    }),
    targeted(23),
    activity('d23-listening', {
      kind: 'listening',
      title: 'Écoute : réponses spontanées de natifs',
      summary: 'Repérez les stratégies utilisées.',
      minutes: 8,
      skills: ['listening'],
      items: [
        listen('fillers', 2, 'Hmm, off the top of my head, I’d say about two hundred people came.', 'Is the speaker sure about the number?', ['Yes, completely', 'No, it’s an estimate', 'They counted everyone', 'They weren’t there'], 1, 'off the top of my head = de tête, approximatif.'),
        listen('fillers', 3, 'I’ve never really thought about it, but I guess I’d choose the mountains.', 'What does the speaker do?', ['Refuses to answer', 'Answers after admitting they hadn’t thought about it', 'Chooses the beach', 'Asks another question'], 1, 'Stratégie honnête puis réponse.'),
        listen('connectors', 2, 'It’s quite expensive. In other words, we can’t afford it right now.', 'What does the speaker mean?', ['They will buy it.', 'They don’t have enough money for it now.', 'It’s cheap.', 'They want more information.'], 1, 'In other words = reformulation.'),
      ],
    }),
    activity('d23-writing', {
      kind: 'writing',
      title: 'Écriture : réponse PREP',
      summary: 'Appliquez PREP à l’écrit.',
      minutes: 10,
      skills: ['writing'],
      items: [
        free('connectors', 2, {
          prompt: 'Answer with the PREP method: “What is the most useful skill everyone should learn?”',
          promptFr: 'Répondez avec la méthode PREP : « Quelle est la compétence la plus utile que tout le monde devrait apprendre ? »',
          minWords: 70,
          targetWords: ['because', 'for instance', "that's why", 'in other words'],
          keywords: ['skill', 'learn'],
          modelAnswer:
            'In my opinion, the most useful skill everyone should learn is cooking. Because when you can cook, you eat better and spend less money. For instance, I used to buy ready meals every day, but since I learned to cook simple dishes, I feel healthier and I save around 100 euros a month. In other words, it’s good for your body and your wallet. That’s why I think cooking should be taught at school.',
          checklist: ['Point – Raison – Exemple – Point', 'Connecteurs du jour', 'Exemple concret'],
        }),
      ],
    }),
  ],
};

// ---------------------------------------------------------------- Jour 24
const w24 = [
  v(24, 2, 'to look back on', 'repenser à, faire le bilan de', 'Looking back on these weeks, I’m proud.', 'En repensant à ces semaines, je suis fier.', 'Bilan.', '/lʊk ˈbæk ɒn/', ['phrasal']),
  v(24, 2, 'consistency', 'régularité', 'Consistency is more important than intensity.', 'La régularité compte plus que l’intensité.', 'Clé de l’apprentissage.', '/kənˈsɪstənsi/', ['learning']),
  v(24, 2, 'to build on', 's’appuyer sur, consolider', 'Now I can build on what I’ve learned.', 'Maintenant je peux m’appuyer sur ce que j’ai appris.', 'Progresser à partir d’une base.', '/ˈbɪld ɒn/', ['phrasal']),
  v(24, 2, 'long-term', 'à long terme', 'My long-term goal is to work abroad.', 'Mon objectif à long terme est de travailler à l’étranger.', 'Adjectif : a long-term goal.', '/ˌlɒŋ ˈtɜːm/', ['learning']),
];

const day24: Day = {
  day: 24,
  title: 'Évaluation finale complémentaire',
  titleEn: 'Extension assessment',
  theme: 'Mesurer le chemin parcouru depuis le jour 14',
  objectives: ['Réaliser l’évaluation complémentaire', 'Comparer avec le diagnostic et l’évaluation du jour 14', 'Définir votre routine d’entraînement autonome'],
  concepts: ['present-perfect', 'future', 'opinions'],
  activities: [
    vocabActivity(24, w24, 'Vocabulaire : bilan et continuité'),
    targeted(24),
    activity('d24-final', {
      kind: 'test',
      title: 'Évaluation complémentaire',
      summary: 'Troisième évaluation, comparable aux deux précédentes.',
      minutes: 25,
      skills: ['vocabulary', 'grammar', 'reading', 'listening', 'construction', 'writing', 'speaking'],
      items: [],
    }),
    activity('d24-writing', {
      kind: 'writing',
      title: 'Écriture : ma routine autonome',
      summary: 'Définissez la routine que vous allez garder.',
      minutes: 12,
      skills: ['writing'],
      items: [
        free('future', 2, {
          prompt: 'Looking back on the programme, what has changed? Describe the weekly routine you are going to keep to continue improving.',
          promptFr: 'En repensant au programme, qu’est-ce qui a changé ? Décrivez la routine hebdomadaire que vous allez garder.',
          minWords: 80,
          targetWords: ['looking back', 'consistency', 'build on', 'going to', 'long-term'],
          keywords: ['I'],
          modelAnswer:
            'Looking back on these 24 days, I can see real progress: I speak more spontaneously and I understand series with English subtitles. Now I want to build on that. I’ve realised that consistency matters more than long sessions, so I’m going to practise 30 minutes a day: vocabulary review every morning, one podcast episode on my commute, and a conversation with my language partner on Wednesdays. My long-term goal is to give a presentation in English at work next year.',
          checklist: ['Bilan honnête', 'Routine concrète et réaliste', 'Objectif à long terme'],
        }),
      ],
    }),
  ],
};

export const extensionDays: Day[] = [day15, day16, day17, day18, day19, day20, day21, day22, day23, day24];
export const extensionWords: VocabEntry[] = [...w15, ...w16, ...w17, ...w18, ...w19, ...w20, ...w21, ...w22, ...w23, ...w24];
