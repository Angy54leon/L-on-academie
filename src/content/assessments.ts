// Trois formes ÉQUIVALENTES d'évaluation (même structure, même difficulté, contenus différents) :
//  A = test de positionnement, B = évaluation finale (jour 14), C = évaluation complémentaire (jour 24).
// Résultats présentés comme une estimation pédagogique, jamais comme une certification.
import { activity, ask, free, gap, listen, mcq, order, tr } from './builders';
import type { Activity } from './schema';

export type AssessmentKind = 'placement' | 'final' | 'extension';
export const FORM_BY_KIND: Record<AssessmentKind, 'A' | 'B' | 'C'> = { placement: 'A', final: 'B', extension: 'C' };

const formA: Activity = activity('assess-A', {
  kind: 'test',
  title: 'Test de positionnement',
  summary: 'Une vingtaine d’exercices progressifs pour estimer votre niveau de départ.',
  minutes: 25,
  skills: ['vocabulary', 'grammar', 'reading', 'listening', 'construction', 'writing', 'speaking'],
  passage: {
    title: 'A new start',
    text: 'Last year, Marta left her job in a bank in Madrid and moved to Dublin. At first, she found it difficult: the weather was grey, and she couldn’t understand people when they spoke quickly. She took evening classes twice a week and started volunteering at a café on Saturdays. After six months, she felt much more confident. Now she works for a travel company, and she uses English every day. “The hardest part was the first month,” she says. “I almost went back home, but I’m so glad I stayed.”',
  },
  items: [
    // Vocabulaire
    mcq('vocabulary', 1, '« tired » means…', ['fatigué', 'tiré', 'triste', 'pressé'], 0, 'tired = fatigué.', { skill: 'vocabulary' }),
    mcq('vocabulary', 1, 'The opposite of “cheap” is…', ['easy', 'expensive', 'short', 'empty'], 1, 'cheap ≠ expensive.', { skill: 'vocabulary' }),
    mcq('vocabulary', 2, '« I’m looking forward to the holidays » means…', ['Je regarde les vacances', 'J’ai hâte d’être en vacances', 'Je prépare les vacances', 'Je reviens de vacances'], 1, 'look forward to = avoir hâte.', { skill: 'vocabulary' }),
    mcq('vocabulary', 3, '« Actually, I disagree » means…', ['Actuellement, je ne suis pas d’accord', 'En fait, je ne suis pas d’accord', 'Évidemment, je suis d’accord', 'Finalement, je suis d’accord'], 1, 'actually = en fait (faux ami).', { skill: 'vocabulary' }),
    // Grammaire
    gap('present-simple', 1, 'She ___ in a hospital.', ['works'], 'Présent simple, 3e personne : works.'),
    gap('questions', 1, 'Where ___ you live?', ['do'], 'Question avec do.'),
    gap('past-simple', 2, 'I ___ to Spain last summer.', ['went'], 'go → went.'),
    mcq('for-since', 2, '« J’habite ici depuis 5 ans. »', ['I live here since 5 years.', 'I’ve lived here for 5 years.', 'I’m living here since 5 years.', 'I lived here for 5 years.'], 1, 'present perfect + for.'),
    mcq('conditionals', 3, 'If I ___ more time, I would travel more.', ['have', 'had', 'will have', 'would have'], 1, 'If + prétérit.'),
    // Compréhension écrite
    mcq('comprehension', 1, 'Where did Marta use to work?', ['In a café', 'In a bank', 'In a travel company', 'In a school'], 1, '« her job in a bank ».', { skill: 'reading', passage: true }),
    mcq('comprehension', 2, 'What did Marta find difficult at first?', ['Finding a flat', 'Understanding fast speakers', 'Cooking', 'Her new job'], 1, '« she couldn’t understand people when they spoke quickly ».', { skill: 'reading', passage: true }),
    mcq('inference', 3, 'How does Marta feel about her decision today?', ['She regrets it.', 'She is happy she stayed.', 'She wants to go back to Madrid.', 'She doesn’t care.'], 1, '« I’m so glad I stayed ».', { skill: 'reading', passage: true }),
    // Compréhension orale
    listen('comprehension', 1, 'My name is Tom and I’m a teacher.', 'What is Tom’s job?', ['Doctor', 'Teacher', 'Student', 'Cook'], 1, '« I’m a teacher ».'),
    listen('comprehension', 1, 'The meeting starts at half past nine.', 'When does the meeting start?', ['9:00', '9:30', '9:15', '10:30'], 1, 'half past nine = 9 h 30.'),
    listen('comprehension', 2, 'I’d love to come, but I’m working late on Friday.', 'Is the speaker coming?', ['Yes', 'No', 'Maybe', 'Yes, late'], 1, 'Refus poli.'),
    listen('natural-speech', 3, 'We ran out of time, so we’re gonna finish the project next week.', 'When will they finish the project?', ['Today', 'Tomorrow', 'Next week', 'Never'], 2, 'gonna = going to ; next week.'),
    // Construction de phrases
    order('word-order', 1, 'I usually drink coffee in the morning', 'Je bois généralement du café le matin.', 'Adverbe de fréquence avant le verbe.'),
    order('questions', 2, 'What did you do last weekend?', 'Qu’as-tu fait le week-end dernier ?', 'What + did + sujet + verbe.'),
    tr('questions', 2, 'Que veut dire ce mot ?', ['What does this word mean'], 'What does X mean?'),
    tr('be-present', 1, 'J’ai 30 ans.', ["I{'m| am} thirty[ years old]", "I{'m| am} 30[ years old]"], 'L’âge avec be.'),
    // Expression écrite
    free('writing', 1, {
      prompt: 'Answer in one or two full sentences: Why do you want to improve your English?',
      promptFr: 'Répondez en une ou deux phrases : pourquoi voulez-vous améliorer votre anglais ?',
      minWords: 15,
      keywords: ['because', 'want', 'to', 'english', 'work', 'travel'],
      modelAnswer: 'I want to improve my English because I travel a lot for work and I want to feel confident in meetings.',
      checklist: ['Phrase complète', 'Une raison (because…)'],
    }),
    free('writing', 2, {
      prompt: 'Describe your typical day and say what you did last weekend (5–6 sentences).',
      promptFr: 'Décrivez votre journée type et ce que vous avez fait le week-end dernier (5–6 phrases).',
      minWords: 50,
      keywords: ['I'],
      modelAnswer:
        'I usually get up at seven and I take the bus to work. I work in an office until six. In the evening, I cook and watch a series. Last weekend, I visited my parents in the countryside. We went for a long walk and had a big lunch together.',
      checklist: ['Présent pour les habitudes', 'Prétérit pour le week-end'],
    }),
    // Expression orale (si disponible)
    ask('questions', 2, 'Tell me about where you live.', 'I live in a small flat in Lyon. It’s near the river and there are a lot of shops.', 'Parle-moi de l’endroit où tu vis.', ['live', 'it', 'there', 'my'], 'Une ou deux phrases complètes.'),
  ],
});

const formB: Activity = activity('assess-B', {
  kind: 'test',
  title: 'Évaluation finale',
  summary: 'Une évaluation équivalente au test de positionnement.',
  minutes: 25,
  skills: ['vocabulary', 'grammar', 'reading', 'listening', 'construction', 'writing', 'speaking'],
  passage: {
    title: 'The café on the corner',
    text: 'When Hassan opened his café in Bristol three years ago, his friends thought he was crazy. He had no experience in the restaurant business, and there were already four cafés in the street. At first, very few customers came in. Then he had an idea: every Thursday evening, he organised a language exchange where people could practise French, Spanish or Arabic. Within a few months, the café was full every week. “People don’t just come for the coffee,” Hassan explains. “They come to meet others. That’s what makes us different.”',
  },
  items: [
    mcq('vocabulary', 1, '« hungry » means…', ['heureux', 'affamé / avoir faim', 'pressé', 'en colère'], 1, 'hungry = avoir faim.', { skill: 'vocabulary' }),
    mcq('vocabulary', 1, 'The opposite of “early” is…', ['late', 'fast', 'soon', 'slow'], 0, 'early ≠ late.', { skill: 'vocabulary' }),
    mcq('vocabulary', 2, '« I can get by in Spanish » means…', ['Je parle couramment espagnol', 'Je me débrouille en espagnol', 'J’apprends l’espagnol', 'Je ne parle pas espagnol'], 1, 'get by = se débrouiller.', { skill: 'vocabulary' }),
    mcq('vocabulary', 3, '« Eventually, they agreed » means…', ['Éventuellement, ils ont accepté', 'Finalement, ils ont accepté', 'Ils ont peut-être accepté', 'Ils ont refusé'], 1, 'eventually = finalement (faux ami).', { skill: 'vocabulary' }),
    gap('present-simple', 1, 'My brother ___ football every Sunday.', ['plays'], 'Présent simple, 3e personne : plays.'),
    gap('questions', 1, 'What time ___ she start work?', ['does'], 'she → does.'),
    gap('past-simple', 2, 'We ___ a great film yesterday.', ['saw', 'watched'], 'see → saw.'),
    mcq('for-since', 2, '« Je la connais depuis 10 ans. »', ['I know her since 10 years.', 'I’ve known her for 10 years.', 'I know her for 10 years.', 'I knew her since 10 years.'], 1, 'present perfect + for.'),
    mcq('conditionals', 3, 'If she ___ the answer, she would tell us.', ['knows', 'knew', 'will know', 'would know'], 1, 'If + prétérit.'),
    mcq('comprehension', 1, 'Where is Hassan’s café?', ['In London', 'In Bristol', 'In Paris', 'In Dublin'], 1, 'in Bristol.', { skill: 'reading', passage: true }),
    mcq('comprehension', 2, 'Why did his friends think he was crazy?', ['He had no experience and there were many cafés.', 'The café was too expensive.', 'He didn’t like coffee.', 'He wanted to move abroad.'], 0, 'no experience + four cafés already.', { skill: 'reading', passage: true }),
    mcq('inference', 3, 'According to Hassan, what makes his café different?', ['The coffee is cheaper.', 'People come to meet others.', 'It’s open all night.', 'The food is French.'], 1, '« They come to meet others ».', { skill: 'reading', passage: true }),
    listen('comprehension', 1, 'Hi, I’m Lisa and I’m a nurse.', 'What is Lisa’s job?', ['Teacher', 'Nurse', 'Doctor', 'Waitress'], 1, '« I’m a nurse ».'),
    listen('comprehension', 1, 'The train leaves at a quarter past eight.', 'When does the train leave?', ['8:15', '8:45', '8:30', '7:45'], 0, 'a quarter past eight = 8 h 15.'),
    listen('comprehension', 2, 'Thanks for asking, but I’ve already got plans for Saturday.', 'Is the speaker free on Saturday?', ['Yes', 'No', 'Maybe in the evening', 'Yes, all day'], 1, 'Refus poli.'),
    listen('natural-speech', 3, 'I dunno, I’m kinda tired, so I’m gonna stay in tonight.', 'What will the speaker do tonight?', ['Go out', 'Stay at home', 'Go to work', 'Go to a party'], 1, 'stay in = rester à la maison.'),
    order('word-order', 1, 'She often goes to the gym after work', 'Elle va souvent à la salle après le travail.', 'often avant le verbe.'),
    order('questions', 2, 'Where did you go on holiday?', 'Où es-tu allé en vacances ?', 'Where + did + sujet + verbe.'),
    tr('questions', 2, 'Comment ça s’appelle ?', ["What{'s| is} it called", "What{'s| is} this called", "What{'s| is} that called"], 'What is it called?'),
    tr('be-present', 1, 'Il a 25 ans.', ["He{'s| is} twenty-five[ years old]", "He{'s| is} 25[ years old]", "He{'s| is} twenty five[ years old]"], 'L’âge avec be.'),
    free('writing', 1, {
      prompt: 'Answer in one or two full sentences: What is the most useful thing you have learned recently?',
      promptFr: 'Répondez en une ou deux phrases : quelle est la chose la plus utile que vous avez apprise récemment ?',
      minWords: 15,
      keywords: ['learned', 'learnt', 'useful', 'because', 'how to'],
      modelAnswer: 'The most useful thing I have learned recently is how to cook healthy meals quickly, because I have very little time.',
      checklist: ['Phrase complète', 'Une raison (because…)'],
    }),
    free('writing', 2, {
      prompt: 'Describe your typical week and say what you did on your last holiday (5–6 sentences).',
      promptFr: 'Décrivez votre semaine type et ce que vous avez fait pendant vos dernières vacances (5–6 phrases).',
      minWords: 50,
      keywords: ['I'],
      modelAnswer:
        'During the week, I work from Monday to Friday and I go swimming on Wednesdays. I usually see my friends on Saturday evening. On my last holiday, I went to Portugal with my sister. We stayed in a small hotel near the beach and we ate a lot of fish. It was very relaxing.',
      checklist: ['Présent pour les habitudes', 'Prétérit pour les vacances'],
    }),
    ask('questions', 2, 'Tell me about your job or your studies.', 'I work as an accountant in a small company. I like my colleagues, but the job is sometimes stressful.', 'Parle-moi de ton travail ou de tes études.', ['work', 'study', 'job', "i'm", 'i am'], 'Une ou deux phrases complètes.'),
  ],
});

const formC: Activity = activity('assess-C', {
  kind: 'test',
  title: 'Évaluation complémentaire',
  summary: 'Troisième évaluation équivalente, à la fin de l’extension.',
  minutes: 25,
  skills: ['vocabulary', 'grammar', 'reading', 'listening', 'construction', 'writing', 'speaking'],
  passage: {
    title: 'Learning to code at 50',
    text: 'Sylvie worked as a secretary for twenty-five years. When her company introduced new software, she realised she wanted to understand how it worked. At fifty, she signed up for an online coding course. It wasn’t easy: she often studied late at night after work, and she sometimes wanted to give up. But she joined an online group where learners helped each other, and that kept her motivated. Two years later, she got a job as a junior web developer. “Age is not the problem,” she says. “The problem is thinking it’s too late.”',
  },
  items: [
    mcq('vocabulary', 1, '« angry » means…', ['en colère', 'anxieux', 'affamé', 'âgé'], 0, 'angry = en colère.', { skill: 'vocabulary' }),
    mcq('vocabulary', 1, 'The opposite of “noisy” is…', ['busy', 'quiet', 'dirty', 'crowded'], 1, 'noisy ≠ quiet.', { skill: 'vocabulary' }),
    mcq('vocabulary', 2, '« Let’s call it a day » means…', ['Appelons-le aujourd’hui', 'Arrêtons-nous là pour aujourd’hui', 'Fixons une date', 'Bonne journée'], 1, 'call it a day.', { skill: 'vocabulary' }),
    mcq('vocabulary', 3, '« I attended the meeting » means…', ['J’ai attendu la réunion', 'J’ai assisté à la réunion', 'J’ai organisé la réunion', 'J’ai annulé la réunion'], 1, 'attend = assister à (faux ami).', { skill: 'vocabulary' }),
    gap('present-simple', 1, 'My mother ___ TV every evening.', ['watches'], 'watch → watches.'),
    gap('questions', 1, 'How often ___ you go to the cinema?', ['do'], 'you → do.'),
    gap('past-simple', 2, 'They ___ a new car last month.', ['bought'], 'buy → bought.'),
    mcq('for-since', 2, '« Il travaille ici depuis 2019. »', ['He works here since 2019.', 'He’s worked here since 2019.', 'He works here for 2019.', 'He worked here since 2019.'], 1, 'present perfect + since.'),
    mcq('conditionals', 3, 'If we ___ closer, we would see each other more often.', ['live', 'lived', 'will live', 'would live'], 1, 'If + prétérit.'),
    mcq('comprehension', 1, 'What was Sylvie’s job for 25 years?', ['Developer', 'Secretary', 'Teacher', 'Manager'], 1, 'a secretary.', { skill: 'reading', passage: true }),
    mcq('comprehension', 2, 'What kept her motivated?', ['Her boss', 'An online group of learners', 'Her salary', 'Her family'], 1, 'an online group.', { skill: 'reading', passage: true }),
    mcq('inference', 3, 'What is Sylvie’s main message?', ['Coding is easy.', 'It’s never too late to learn.', 'Young people learn faster.', 'Secretaries should learn to code.'], 1, '« The problem is thinking it’s too late ».', { skill: 'reading', passage: true }),
    listen('comprehension', 1, 'Hello, I’m Mark and I’m a chef.', 'What is Mark’s job?', ['Chef', 'Driver', 'Teacher', 'Pilot'], 0, '« I’m a chef ».'),
    listen('comprehension', 1, 'The shop closes at a quarter to six.', 'When does the shop close?', ['6:15', '5:45', '6:45', '5:15'], 1, 'a quarter to six = 17 h 45.'),
    listen('comprehension', 2, 'That sounds great, but I’m afraid I can’t make it tonight.', 'Is the speaker coming tonight?', ['Yes', 'No', 'Later', 'Maybe'], 1, 'can’t make it = ne pas pouvoir venir.'),
    listen('natural-speech', 3, 'I’ve gotta go, my train’s in ten minutes. Catch you later!', 'Why is the speaker leaving?', ['They are tired.', 'Their train leaves soon.', 'They are angry.', 'They have a meeting.'], 1, 'train in ten minutes.'),
    order('word-order', 1, 'We sometimes eat out on Fridays', 'Nous mangeons parfois au restaurant le vendredi.', 'sometimes avant le verbe.'),
    order('questions', 2, 'How long did it take you?', 'Combien de temps ça t’a pris ?', 'How long + did + it + take.'),
    tr('questions', 2, 'De quoi parle le livre ?', ["What{'s| is} the book about"], 'What is it about?'),
    tr('be-present', 1, 'Nous avons faim.', ["We{'re| are} hungry"], 'avoir faim = be hungry.'),
    free('writing', 1, {
      prompt: 'Answer in one or two full sentences: What has helped you the most to improve your English?',
      promptFr: 'Répondez en une ou deux phrases : qu’est-ce qui vous a le plus aidé à progresser ?',
      minWords: 15,
      keywords: ['helped', 'because', 'speaking', 'practice', 'listening', 'vocabulary'],
      modelAnswer: 'What has helped me the most is speaking every day, even for ten minutes, because I’m less afraid of making mistakes now.',
      checklist: ['Phrase complète', 'Une raison (because…)'],
    }),
    free('writing', 2, {
      prompt: 'Describe how your daily routine has changed in the last few years and what you are planning for next year (5–6 sentences).',
      promptFr: 'Décrivez comment votre quotidien a changé ces dernières années et vos projets pour l’an prochain.',
      minWords: 50,
      keywords: ['I'],
      modelAnswer:
        'A few years ago, I used to drive to work every day, but now I work from home three days a week. I have more time for sport, so I go running in the morning. I also cook more than before. Next year, I’m going to take a photography course and I’d like to travel to Canada.',
      checklist: ['used to / now', 'Futur (going to, would like)'],
    }),
    ask('opinions', 2, 'What do you like most about learning languages?', 'What I like most is being able to talk to people from other countries and understand their culture.', 'Qu’est-ce que tu aimes le plus dans l’apprentissage des langues ?', ['like', 'because', 'people', 'talk', 'understand'], 'Une ou deux phrases complètes.'),
  ],
});

export const ASSESSMENT_FORMS: Record<'A' | 'B' | 'C', Activity> = { A: formA, B: formB, C: formC };
