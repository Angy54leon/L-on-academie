// Scénarios préparés pour le « partenaire local » (mode gratuit, sans IA).
// Ce ne sont PAS des réponses d'intelligence artificielle : l'interface l'indique clairement.

export interface ScenarioStep {
  /** Réplique du partenaire (anglais). */
  ai: string;
  /** Traduction (affichée sur demande ou en faible immersion). */
  fr: string;
  /** Aide en français pour construire la réponse. */
  hint: string;
  /** Exemple de réponse. */
  sample: string;
  /** Mots-clés attendus (au moins un, alternatives {a|b} possibles). */
  keywords?: string[];
  /** Nombre minimal de mots conseillé. */
  minWords?: number;
  /** Mode guidé : début de phrase et mots utiles. */
  frame?: string;
  chips?: string[];
}

export interface Scenario {
  id: string;
  kind: 'topic' | 'situation';
  title: string;
  titleFr: string;
  level: 1 | 2 | 3;
  /** Rôle joué par le partenaire. */
  role: string;
  setting: string;
  steps: ScenarioStep[];
  closing: string;
  closingFr: string;
}

export const SCENARIOS: Scenario[] = [
  {
    id: 'topic-daily',
    kind: 'topic',
    title: 'Daily life',
    titleFr: 'Vie quotidienne',
    level: 1,
    role: 'Léon, your English partner',
    setting: 'Une conversation simple sur votre quotidien.',
    steps: [
      { ai: 'Hi! Nice to meet you. Can you tell me a bit about yourself?', fr: 'Salut ! Enchanté. Tu peux me parler un peu de toi ?', hint: 'Prénom, ville, métier : « I’m…, I live in…, I work as… ».', sample: 'Hi! I’m Julie. I live in Nantes and I work as a nurse.', keywords: ["{i'm|i am|my name}", 'live', 'work'], minWords: 6, frame: 'I’m … and I live in …', chips: ["I'm", 'I live in', 'I work as', 'a', 'and'] },
      { ai: 'Nice! What does a typical day look like for you?', fr: 'Sympa ! À quoi ressemble ta journée type ?', hint: 'Présent simple + then / after that.', sample: 'I usually get up at seven, I go to work by bus and I finish at six.', keywords: ['usually', 'get up', 'go', 'work', 'have', 'then'], minWords: 8, frame: 'I usually … then I …', chips: ['I usually', 'get up', 'at', 'then', 'go to work', 'by bus'] },
      { ai: 'And what do you enjoy doing after work?', fr: 'Et qu’aimes-tu faire après le travail ?', hint: 'enjoy / like / love + -ing.', sample: 'I enjoy cooking and I like going for a walk with my dog.', keywords: ['enjoy', 'like', 'love', 'ing'], minWords: 6, frame: 'I enjoy …ing', chips: ['I enjoy', 'I like', 'cooking', 'reading', 'running', 'watching series'] },
      { ai: 'That sounds nice. Is there anything you’d like to change in your routine?', fr: 'Ça a l’air bien. Y a-t-il quelque chose que tu aimerais changer dans ta routine ?', hint: 'I’d like to… / I want to… + because.', sample: 'I’d like to do more sport, because I spend too much time sitting.', keywords: ["{i'd like|i would like|i want}", 'more', 'less', 'because'], minWords: 7, frame: 'I’d like to … because …', chips: ["I'd like to", 'more', 'less', 'because', 'sport', 'sleep'] },
      { ai: 'Great idea! What could you start doing this week?', fr: 'Bonne idée ! Que pourrais-tu commencer à faire cette semaine ?', hint: 'Futur : I’m going to… / I’ll…', sample: 'I’m going to go running on Wednesday morning.', keywords: ['going to', "{i'll|i will}", 'start'], minWords: 6, frame: 'I’m going to …', chips: ["I'm going to", 'this week', 'on', 'every', 'morning'] },
    ],
    closing: 'Thanks for chatting! Your answers were clear. Keep it up!',
    closingFr: 'Merci pour cette discussion ! Tes réponses étaient claires. Continue comme ça !',
  },
  {
    id: 'topic-hobbies',
    kind: 'topic',
    title: 'Hobbies and free time',
    titleFr: 'Loisirs et temps libre',
    level: 1,
    role: 'Léon, your English partner',
    setting: 'Parler de vos passions.',
    steps: [
      { ai: 'What do you like doing in your free time?', fr: 'Qu’aimes-tu faire pendant ton temps libre ?', hint: 'like / love / enjoy + -ing.', sample: 'I love reading and playing the guitar.', keywords: ['like', 'love', 'enjoy', 'into', 'ing'], minWords: 5, frame: 'I love …ing', chips: ['I love', 'I enjoy', "I'm into", 'reading', 'playing'] },
      { ai: 'How did you get into that?', fr: 'Comment t’es-tu mis à ça ?', hint: 'Prétérit : I started… when I was…', sample: 'I started when I was a teenager. My uncle taught me.', keywords: ['started', 'when', 'was', 'ago', 'began'], minWords: 6, frame: 'I started … when I was …', chips: ['I started', 'when I was', 'years ago', 'my', 'taught me'] },
      { ai: 'How often do you do it?', fr: 'À quelle fréquence le fais-tu ?', hint: 'every day / twice a week / at the weekend…', sample: 'I play about three times a week, usually in the evening.', keywords: ['every', 'week', 'day', 'times', 'often', 'sometimes', 'weekend'], minWords: 5, frame: 'I … about … times a week.', chips: ['every day', 'twice a week', 'at the weekend', 'usually'] },
      { ai: 'What do you like most about it?', fr: 'Qu’est-ce que tu aimes le plus là-dedans ?', hint: 'What I like most is… / because…', sample: 'What I like most is that it helps me relax after work.', keywords: ['because', 'like', 'helps', 'relax', 'feel', 'fun'], minWords: 6, frame: 'What I like most is …', chips: ['What I like most is', 'it helps me', 'relax', 'because', 'I feel'] },
      { ai: 'Would you recommend it to a friend? Why?', fr: 'Le recommanderais-tu à un ami ? Pourquoi ?', hint: 'Yes, I would / No, I wouldn’t + because.', sample: 'Yes, I would, because it’s cheap and anyone can start.', keywords: ['would', "wouldn't", 'because', 'recommend'], minWords: 6, frame: 'Yes, I would, because …', chips: ['Yes, I would', "No, I wouldn't", 'because', "it's", 'easy'] },
    ],
    closing: 'It was great to learn about your hobby!',
    closingFr: 'C’était super d’en apprendre plus sur ta passion !',
  },
  {
    id: 'topic-projects',
    kind: 'topic',
    title: 'Plans and projects',
    titleFr: 'Projets et ambitions',
    level: 2,
    role: 'Léon, your English partner',
    setting: 'Parler de vos projets à court et long terme.',
    steps: [
      { ai: 'What are your plans for the next few months?', fr: 'Quels sont tes projets pour les prochains mois ?', hint: 'going to / I’m planning to / I’d like to.', sample: 'I’m planning to change jobs and I’m going to move to a bigger flat.', keywords: ['going to', 'planning', "{i'd like|i would like}", 'want', 'will'], minWords: 7 },
      { ai: 'Why is that important to you?', fr: 'Pourquoi est-ce important pour toi ?', hint: 'because / so that / the thing is…', sample: 'Because I need a new challenge, and I want more space for my family.', keywords: ['because', 'need', 'want', 'so'], minWords: 7 },
      { ai: 'What might make it difficult?', fr: 'Qu’est-ce qui pourrait rendre ça difficile ?', hint: 'It might be… / The problem is…', sample: 'The problem is that flats are very expensive in my city.', keywords: ['problem', 'might', 'difficult', 'expensive', 'time', 'money', 'hard'], minWords: 6 },
      { ai: 'If you had no limits at all, what would you do?', fr: 'Si tu n’avais aucune limite, que ferais-tu ?', hint: 'Conditionnel : I would… / I’d…', sample: 'If I had no limits, I would travel around the world for a year.', keywords: ['would', "i'd"], minWords: 7 },
      { ai: 'Where do you see yourself in five years?', fr: 'Où te vois-tu dans cinq ans ?', hint: 'In five years, I’d like to… / I hope I’ll…', sample: 'In five years, I hope I’ll be working abroad and speaking English fluently.', keywords: ['hope', "{i'll|i will}", "{i'd like|i would like}", 'years'], minWords: 7 },
    ],
    closing: 'Those are inspiring plans. Good luck!',
    closingFr: 'Ce sont des projets inspirants. Bonne chance !',
  },
  {
    id: 'topic-travel',
    kind: 'topic',
    title: 'Travel memories',
    titleFr: 'Souvenirs de voyage',
    level: 2,
    role: 'Léon, your English partner',
    setting: 'Raconter un voyage.',
    steps: [
      { ai: 'What’s the best trip you’ve ever been on?', fr: 'Quel est le meilleur voyage que tu aies fait ?', hint: 'The best trip I’ve ever been on was…', sample: 'The best trip I’ve ever been on was to Scotland two years ago.', keywords: ['was', 'went', 'trip', 'ago', 'best'], minWords: 7 },
      { ai: 'Who did you go with, and what did you do there?', fr: 'Avec qui es-tu parti, et qu’avez-vous fait ?', hint: 'Prétérit : I went with… We visited…', sample: 'I went with my best friend. We visited castles and hiked in the Highlands.', keywords: ['went', 'visited', 'saw', 'did', 'with', 'we'], minWords: 8 },
      { ai: 'Did anything unexpected happen?', fr: 'Quelque chose d’inattendu s’est-il passé ?', hint: 'Suddenly… / It turned out that… / At first… but then…', sample: 'Yes! Our car broke down, but a farmer helped us and invited us for tea.', keywords: ['yes', 'no', 'suddenly', 'broke', 'lost', 'happened', 'turned out', 'but'], minWords: 6 },
      { ai: 'What did you learn from that trip?', fr: 'Qu’as-tu appris de ce voyage ?', hint: 'I learned that… / I realised…', sample: 'I learned that people are often kinder than we think.', keywords: ['learned', 'learnt', 'realised', 'realized', 'that'], minWords: 6 },
      { ai: 'Where would you like to go next?', fr: 'Où aimerais-tu aller ensuite ?', hint: 'I’d love to go to… because…', sample: 'I’d love to go to Canada, because I want to see the Rocky Mountains.', keywords: ["{i'd|i would}", 'go', 'because', 'want'], minWords: 6 },
    ],
    closing: 'What a story! Thanks for sharing.',
    closingFr: 'Quelle histoire ! Merci de l’avoir partagée.',
  },
  {
    id: 'topic-work',
    kind: 'topic',
    title: 'Work and career',
    titleFr: 'Travail et carrière',
    level: 2,
    role: 'Léon, your English partner',
    setting: 'Parler de votre travail.',
    steps: [
      { ai: 'What do you do, and how long have you been doing it?', fr: 'Que fais-tu, et depuis combien de temps ?', hint: 'I work as… I’ve been doing it for/since…', sample: 'I work as a sales manager. I’ve been doing it for six years.', keywords: ['work', 'for', 'since', "{i've|i have}"], minWords: 8 },
      { ai: 'What do you like most about your job?', fr: 'Qu’aimes-tu le plus dans ton travail ?', hint: 'What I like most is… / I enjoy…', sample: 'What I like most is meeting new clients every week.', keywords: ['like', 'enjoy', 'love', 'most'], minWords: 6 },
      { ai: 'And what’s the most challenging part?', fr: 'Et quelle est la partie la plus difficile ?', hint: 'The most challenging part is… / I struggle with…', sample: 'The most challenging part is meeting deadlines when the team is small.', keywords: ['challenging', 'difficult', 'hard', 'struggle', 'stress'], minWords: 6 },
      { ai: 'How do you use English at work, or how would you like to use it?', fr: 'Comment utilises-tu l’anglais au travail, ou comment aimerais-tu l’utiliser ?', hint: 'I use it to… / I’d like to be able to…', sample: 'I use it for emails, but I’d like to be able to lead meetings in English.', keywords: ['use', 'emails', 'meetings', "{i'd like|i would like}", 'able'], minWords: 7 },
      { ai: 'If you could change one thing about your job, what would it be?', fr: 'Si tu pouvais changer une chose, ce serait quoi ?', hint: 'I would… / It would be…', sample: 'I would work from home two days a week.', keywords: ['would', "i'd"], minWords: 6 },
    ],
    closing: 'Thanks! You described your job really well.',
    closingFr: 'Merci ! Tu as très bien décrit ton travail.',
  },
  {
    id: 'topic-debate',
    kind: 'topic',
    title: 'Opinions: technology',
    titleFr: 'Débat : la technologie',
    level: 3,
    role: 'Léon, your English partner',
    setting: 'Un échange d’opinions plus complexe.',
    steps: [
      { ai: 'Do you think smartphones have made our lives better or worse?', fr: 'Penses-tu que les smartphones ont amélioré ou dégradé nos vies ?', hint: 'In my opinion… / I’d say… + because.', sample: 'In my opinion, they’ve made life easier, but we use them too much.', keywords: ['think', 'opinion', "i'd say", 'better', 'worse', 'because'], minWords: 8 },
      { ai: 'Interesting. Can you give me an example?', fr: 'Intéressant. Tu peux me donner un exemple ?', hint: 'For instance… / For example…', sample: 'For instance, I can video-call my family abroad, but at dinner everyone looks at their phone.', keywords: ['for instance', 'for example', 'like', 'such as'], minWords: 8 },
      { ai: 'Some people say children shouldn’t have a phone before 15. Do you agree?', fr: 'Certains disent que les enfants ne devraient pas avoir de téléphone avant 15 ans. D’accord ?', hint: 'I agree / I see your point, but… (jamais « I am agree »).', sample: 'I see their point, but I think 12 is more realistic, with strict rules.', keywords: ['agree', 'disagree', 'point', 'think', 'but'], minWords: 8 },
      { ai: 'What would be a good compromise?', fr: 'Quel serait un bon compromis ?', hint: 'A good compromise would be to…', sample: 'A good compromise would be to give them a basic phone without social media.', keywords: ['compromise', 'would', 'could', 'maybe'], minWords: 8 },
      { ai: 'To sum up, how would you describe your relationship with technology?', fr: 'Pour résumer, comment décrirais-tu ta relation à la technologie ?', hint: 'To sum up… / Overall…', sample: 'Overall, I’d say it’s positive, but I’m trying to use my phone less in the evening.', keywords: ['overall', 'sum up', "i'd say", 'positive', 'negative'], minWords: 8 },
    ],
    closing: 'You expressed nuanced opinions. Well done!',
    closingFr: 'Tu as exprimé des opinions nuancées. Bravo !',
  },
  {
    id: 'sit-cafe',
    kind: 'situation',
    title: 'At the café',
    titleFr: 'Au café',
    level: 1,
    role: 'a barista in London',
    setting: 'Vous commandez dans un café à Londres.',
    steps: [
      { ai: 'Hi there! What can I get you?', fr: 'Bonjour ! Qu’est-ce que je vous sers ?', hint: 'Could I have…, please?', sample: 'Hi! Could I have a large latte, please?', keywords: ['could', 'can', "{i'd like|i would like}", 'please'], minWords: 4, frame: 'Could I have …, please?', chips: ['Could I have', 'a', 'large', 'small', 'coffee', 'tea', 'please'] },
      { ai: 'Sure. For here or to go?', fr: 'Bien sûr. Sur place ou à emporter ?', hint: 'For here / To go, please.', sample: 'To go, please.', keywords: ['here', 'go', 'take away'], minWords: 2, chips: ['For here', 'To go', 'please'] },
      { ai: 'Anything else? We’ve got some lovely muffins today.', fr: 'Autre chose ? On a de super muffins aujourd’hui.', hint: 'Yes, I’ll have… / No, that’s it, thanks.', sample: 'Yes, I’ll have a blueberry muffin, please.', keywords: ['yes', 'no', "that's it", "{i'll have|i will have}", 'thanks'], minWords: 3, chips: ["I'll have", 'a muffin', "No, that's it", 'thanks'] },
      { ai: 'That’s six pounds fifty. How would you like to pay?', fr: 'Ça fait 6,50 £. Comment souhaitez-vous payer ?', hint: 'By card / In cash.', sample: 'By card, please.', keywords: ['card', 'cash'], minWords: 2, chips: ['By card', 'In cash', 'please'] },
      { ai: 'Here you go. Have a lovely day!', fr: 'Voilà. Bonne journée !', hint: 'Thanks, you too!', sample: 'Thanks, you too!', keywords: ['thanks', 'thank you', 'you too', 'bye'], minWords: 2, chips: ['Thanks', 'you too', 'bye'] },
    ],
    closing: '(Scène terminée.) Vous avez commandé poliment et efficacement !',
    closingFr: 'Scène terminée.',
  },
  {
    id: 'sit-hotel',
    kind: 'situation',
    title: 'Hotel check-in',
    titleFr: 'Arrivée à l’hôtel',
    level: 2,
    role: 'a hotel receptionist',
    setting: 'Vous arrivez à votre hôtel… et il y a un problème.',
    steps: [
      { ai: 'Good evening, welcome to the Riverside Hotel. How can I help you?', fr: 'Bonsoir, bienvenue au Riverside Hotel. Que puis-je faire pour vous ?', hint: 'I have a reservation under the name…', sample: 'Good evening. I have a reservation under the name Dupont.', keywords: ['reservation', 'booked', 'name', 'booking'], minWords: 5 },
      { ai: 'Let me check… Yes, a single room for two nights. Could I see your passport, please?', fr: 'Je vérifie… Oui, une chambre simple pour deux nuits. Puis-je voir votre passeport ?', hint: 'Signalez l’erreur : I’m afraid I booked a double room.', sample: 'Here you are. I’m afraid there’s a mistake: I booked a double room.', keywords: ['double', 'mistake', 'afraid', 'booked', 'here'], minWords: 6 },
      { ai: 'Oh, I’m sorry about that. We only have a double room on the top floor, with no view. Is that OK?', fr: 'Oh, désolé. Nous n’avons qu’une chambre double au dernier étage, sans vue. Ça vous va ?', hint: 'Acceptez ou demandez une compensation poliment : Would it be possible to…?', sample: 'That’s fine. Would it be possible to have breakfast included?', keywords: ['fine', 'ok', 'possible', 'would', 'could'], minWords: 4 },
      { ai: 'Of course, breakfast is on us. Is there anything else I can do for you?', fr: 'Bien sûr, le petit-déjeuner est offert. Puis-je faire autre chose pour vous ?', hint: 'Demandez l’heure du petit-déjeuner ou le wifi.', sample: 'Yes, what time is breakfast, and what’s the wifi password?', keywords: ['what time', 'wifi', 'where', 'when', 'no', 'thanks'], minWords: 4 },
      { ai: 'Breakfast is from seven to ten, and the password is on your key card. Enjoy your stay!', fr: 'Petit-déjeuner de 7 h à 10 h, mot de passe sur votre carte. Bon séjour !', hint: 'Remerciez.', sample: 'Thank you very much. Have a good evening!', keywords: ['thank', 'thanks'], minWords: 2 },
    ],
    closing: '(Scène terminée.) Vous avez réglé le problème avec diplomatie.',
    closingFr: 'Scène terminée.',
  },
  {
    id: 'sit-airport',
    kind: 'situation',
    title: 'Cancelled flight',
    titleFr: 'Vol annulé',
    level: 2,
    role: 'an airline agent',
    setting: 'Votre vol vient d’être annulé. Vous allez au comptoir.',
    steps: [
      { ai: 'Next, please! How can I help?', fr: 'Au suivant ! Que puis-je faire ?', hint: 'Expliquez : My flight to… has been cancelled.', sample: 'Hi. My flight to Paris has been cancelled. What can I do?', keywords: ['flight', 'cancelled', 'canceled'], minWords: 6 },
      { ai: 'I’m sorry about that. I can put you on the next flight tomorrow at 7 am, or on a flight tonight via Amsterdam.', fr: 'Je suis désolé. Je peux vous mettre sur le prochain vol demain à 7 h, ou sur un vol ce soir via Amsterdam.', hint: 'Choisissez : I’d rather… / I’ll take…', sample: 'I’d rather take the flight tonight via Amsterdam.', keywords: ["{i'd rather|i would rather}", "{i'll take|i will take}", 'tonight', 'tomorrow', 'prefer'], minWords: 5 },
      { ai: 'No problem. Do you have any checked luggage?', fr: 'Pas de problème. Avez-vous des bagages en soute ?', hint: 'Yes, one suitcase / No, only hand luggage.', sample: 'Yes, I have one suitcase.', keywords: ['yes', 'no', 'suitcase', 'bag', 'luggage'], minWords: 3 },
      { ai: 'It will be transferred automatically. Here’s your new boarding pass. Gate 22, boarding at 8:40.', fr: 'Il sera transféré automatiquement. Voici votre nouvelle carte d’embarquement. Porte 22, embarquement 20 h 40.', hint: 'Vérifiez une info : Sorry, which gate? / Will I get a meal voucher?', sample: 'Thank you. Will I get a meal voucher for the delay?', keywords: ['thank', 'which', 'what', 'will', 'could', 'voucher', 'gate'], minWords: 3 },
      { ai: 'Yes, here’s a ten-euro voucher for the restaurants. Have a safe trip!', fr: 'Oui, voici un bon de 10 € pour les restaurants. Bon voyage !', hint: 'Remerciez.', sample: 'That’s great, thanks for your help!', keywords: ['thank', 'thanks'], minWords: 2 },
    ],
    closing: '(Scène terminée.) Vous avez géré l’imprévu en anglais !',
    closingFr: 'Scène terminée.',
  },
  {
    id: 'sit-interview',
    kind: 'situation',
    title: 'Job interview',
    titleFr: 'Entretien d’embauche',
    level: 3,
    role: 'a recruiter',
    setting: 'Entretien pour un poste dans une entreprise internationale.',
    steps: [
      { ai: 'Thanks for coming. Could you start by telling me a bit about yourself?', fr: 'Merci d’être venu. Pouvez-vous commencer par vous présenter ?', hint: 'Métier + expérience (for/since) + spécialité.', sample: 'Of course. I’m a marketing assistant and I’ve worked in the food industry for four years.', keywords: ["{i'm|i am}", 'work', 'for', 'since', 'experience'], minWords: 10 },
      { ai: 'Why are you interested in this position?', fr: 'Pourquoi ce poste vous intéresse-t-il ?', hint: 'I’d like to… / I’m interested in… because…', sample: 'I’m interested in this position because I’d like to work on international projects.', keywords: ['interested', "{i'd like|i would like}", 'because', 'want'], minWords: 8 },
      { ai: 'What would you say is your greatest strength?', fr: 'Quel est votre principal point fort ?', hint: 'I’d say… + exemple concret.', sample: 'I’d say I’m very organised. For instance, I managed three product launches last year.', keywords: ["i'd say", 'strength', 'organised', 'organized', 'for instance', 'example'], minWords: 8 },
      { ai: 'Tell me about a time you had to deal with a difficult situation at work.', fr: 'Parlez-moi d’une situation difficile au travail.', hint: 'Récit au prétérit : situation, action, résultat.', sample: 'Last year, a supplier was late before a big launch. I found another supplier quickly and we met the deadline.', keywords: ['was', 'had', 'did', 'last', 'when', 'ed'], minWords: 12 },
      { ai: 'Do you have any questions for us?', fr: 'Avez-vous des questions ?', hint: 'Posez une question pertinente : What would a typical day look like?', sample: 'Yes, what would a typical day look like in this role?', keywords: ['what', 'how', 'when', 'would', '?', 'yes'], minWords: 5 },
    ],
    closing: '(Scène terminée.) Entretien mené avec assurance. Bien joué !',
    closingFr: 'Scène terminée.',
  },
  {
    id: 'sit-doctor',
    kind: 'situation',
    title: 'At the doctor’s',
    titleFr: 'Chez le médecin',
    level: 2,
    role: 'a doctor',
    setting: 'Vous consultez un médecin à l’étranger.',
    steps: [
      { ai: 'Hello, please have a seat. What seems to be the problem?', fr: 'Bonjour, asseyez-vous. Qu’est-ce qui ne va pas ?', hint: 'I’ve got… / My … hurts.', sample: 'I’ve got a sore throat and a headache.', keywords: ['hurts', 'sore', 'headache', "{i've got|i have}", 'pain', 'sick'], minWords: 5 },
      { ai: 'How long have you had these symptoms?', fr: 'Depuis combien de temps avez-vous ces symptômes ?', hint: 'For three days / Since Monday.', sample: 'Since Monday, so for about three days.', keywords: ['since', 'for', 'days', 'week'], minWords: 2 },
      { ai: 'Do you have a temperature? Are you taking any medicine?', fr: 'Avez-vous de la fièvre ? Prenez-vous des médicaments ?', hint: 'Réponses courtes + détail.', sample: 'Yes, I have a slight temperature. I’m only taking paracetamol.', keywords: ['yes', 'no', 'temperature', 'taking', 'medicine', 'paracetamol'], minWords: 4 },
      { ai: 'It’s probably a virus. Rest, drink plenty of water, and come back if it gets worse. Any questions?', fr: 'C’est probablement un virus. Reposez-vous, buvez beaucoup et revenez si ça empire. Des questions ?', hint: 'Posez une question : Can I go to work? / How long will it last?', sample: 'Can I go to work tomorrow?', keywords: ['can', 'should', 'how long', 'when', 'no', 'thank'], minWords: 3 },
      { ai: 'I’d stay at home for a couple of days if I were you. Get well soon!', fr: 'À votre place, je resterais chez moi quelques jours. Bon rétablissement !', hint: 'Remerciez.', sample: 'Thank you, doctor.', keywords: ['thank', 'thanks'], minWords: 2 },
    ],
    closing: '(Scène terminée.) Vous avez su expliquer vos symptômes.',
    closingFr: 'Scène terminée.',
  },
  {
    id: 'sit-meeting',
    kind: 'situation',
    title: 'Meeting someone new',
    titleFr: 'Faire une rencontre',
    level: 1,
    role: 'Emma, a friend of a friend at a party',
    setting: 'Vous rencontrez quelqu’un lors d’une soirée.',
    steps: [
      { ai: 'Hi! I don’t think we’ve met. I’m Emma, a friend of Sarah’s.', fr: 'Salut ! Je crois qu’on ne s’est pas présentés. Je suis Emma, une amie de Sarah.', hint: 'Nice to meet you, I’m…', sample: 'Nice to meet you, Emma! I’m Lucas. I work with Sarah.', keywords: ['nice to meet', "{i'm|i am}", 'name'], minWords: 4, chips: ['Nice to meet you', "I'm", 'I work with', 'Sarah'] },
      { ai: 'Oh cool! So, what do you do?', fr: 'Oh cool ! Tu fais quoi dans la vie ?', hint: 'I’m a… / I work as a…', sample: 'I’m a graphic designer. What about you?', keywords: ["{i'm|i am}", 'work', 'what about you', 'and you'], minWords: 4, chips: ["I'm a", 'I work as', 'What about you?'] },
      { ai: 'I’m a teacher. I’ve just moved here from Manchester, actually.', fr: 'Je suis prof. Je viens d’emménager ici depuis Manchester, en fait.', hint: 'Réagissez et posez une question : Really? How do you like it here?', sample: 'Really? How do you like it here so far?', keywords: ['really', 'how', 'like', '?', 'welcome', 'why'], minWords: 4, chips: ['Really?', 'How do you like it here?', 'so far', 'Welcome!'] },
      { ai: 'I love it! But I don’t know many people yet. Any tips for good places to go?', fr: 'J’adore ! Mais je ne connais pas encore grand monde. Des conseils de bons endroits ?', hint: 'You should try… / There’s a great… near…', sample: 'You should try the Sunday market. There’s also a great jazz bar near the station.', keywords: ['should', 'try', "there's", 'there is', 'great', 'go'], minWords: 6, chips: ['You should try', "There's a great", 'near', 'market', 'bar'] },
      { ai: 'Thanks! Maybe we could go together sometime?', fr: 'Merci ! On pourrait peut-être y aller ensemble un de ces jours ?', hint: 'Acceptez : Sure, I’d love to! Let’s…', sample: 'Sure, I’d love to! Let’s swap numbers.', keywords: ['sure', 'love to', 'yes', "let's", 'why not'], minWords: 3, chips: ["Sure, I'd love to!", "Let's", 'swap numbers'] },
    ],
    closing: '(Scène terminée.) Une conversation naturelle et chaleureuse !',
    closingFr: 'Scène terminée.',
  },
];

export function getScenario(id: string): Scenario | undefined {
  return SCENARIOS.find((s) => s.id === id);
}
