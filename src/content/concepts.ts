// Catalogue des notions travaillées. Chaque exercice est rattaché à une notion :
// c'est ce qui permet de suivre la maîtrise et d'adapter le parcours.
// `summary` sert de rappel simplifié quand l'apprenant rencontre des difficultés.
import type { Concept } from './schema';

interface ConceptDef extends Concept {
  simple: { en: string; fr: string }[];
}

export const CONCEPTS: ConceptDef[] = [
  {
    id: 'be-present',
    label: 'Le verbe « to be » au présent',
    summary: 'I am, you are, he/she/it is, we/they are. On l’utilise pour l’âge, l’état, l’origine, le métier : « I am 30 » (pas « I have 30 »).',
    simple: [
      { en: 'I am tired.', fr: 'Je suis fatigué.' },
      { en: 'She is a nurse.', fr: 'Elle est infirmière.' },
    ],
  },
  {
    id: 'articles',
    label: 'Les articles (a, an, the, aucun article)',
    summary: '« a/an » = un/une (an devant un son voyelle). « the » = le/la précis. Pour une généralité, pas d’article : « Life is short », « I love music ». Les métiers prennent « a » : « I’m a teacher ».',
    simple: [
      { en: 'I’m an engineer.', fr: 'Je suis ingénieur.' },
      { en: 'People love music.', fr: 'Les gens aiment la musique.' },
    ],
  },
  {
    id: 'pronouns',
    label: 'Pronoms et possessifs',
    summary: 'Sujet : I, you, he, she, it, we, they. Complément : me, you, him, her, it, us, them. Possessif : my, your, his (à lui), her (à elle), its, our, their. Le possessif s’accorde avec le possesseur : « his mother » = la mère de lui.',
    simple: [
      { en: 'Call me later.', fr: 'Appelle-moi plus tard.' },
      { en: 'She loves her brother.', fr: 'Elle aime son frère.' },
    ],
  },
  {
    id: 'word-order',
    label: 'Ordre des mots',
    summary: 'Sujet + verbe + complément, presque toujours. L’adjectif se place AVANT le nom (« a red car »). On ne sépare pas le verbe de son complément : « I like music a lot » (pas « I like a lot music »).',
    simple: [
      { en: 'I drink coffee every morning.', fr: 'Je bois du café chaque matin.' },
      { en: 'She has a big house.', fr: 'Elle a une grande maison.' },
    ],
  },
  {
    id: 'questions',
    label: 'Poser des questions',
    summary: 'Avec un verbe ordinaire : (mot interrogatif) + do/does/did + sujet + verbe de base. « Where do you live? ». Avec be/can/will : on inverse. « Are you ready? », « Can you help me? ».',
    simple: [
      { en: 'Do you like coffee?', fr: 'Tu aimes le café ?' },
      { en: 'Where does she work?', fr: 'Où travaille-t-elle ?' },
    ],
  },
  {
    id: 'negation',
    label: 'La négation',
    summary: 'don’t / doesn’t / didn’t + verbe de base. Avec be, can, will : on ajoute « not ». « He doesn’t work » (pas « he don’t works »).',
    simple: [
      { en: 'I don’t eat meat.', fr: 'Je ne mange pas de viande.' },
      { en: 'She isn’t here.', fr: 'Elle n’est pas là.' },
    ],
  },
  {
    id: 'auxiliaries',
    label: 'Les auxiliaires (do, be, have, will, can)',
    summary: 'Les auxiliaires servent à poser les questions, faire la négation et les réponses courtes : « Do you? – Yes, I do. », « Have you finished? – No, I haven’t. »',
    simple: [
      { en: 'Are you coming? – Yes, I am.', fr: 'Tu viens ? – Oui.' },
      { en: 'Did you call him? – No, I didn’t.', fr: 'Tu l’as appelé ? – Non.' },
    ],
  },
  {
    id: 'modals',
    label: 'Les modaux (can, could, should, must, have to)',
    summary: 'Modal + verbe de base, sans « to » et sans « s » : « She can swim », « You should rest ». « have to » = obligation extérieure ; « must » = obligation ressentie ou déduction.',
    simple: [
      { en: 'Can you help me?', fr: 'Tu peux m’aider ?' },
      { en: 'You should sleep more.', fr: 'Tu devrais dormir plus.' },
    ],
  },
  {
    id: 'present-simple',
    label: 'Le présent simple',
    summary: 'Habitudes et vérités générales. À la 3e personne du singulier (he/she/it), on ajoute -s : « She works », « He goes ». Questions et négations avec do/does.',
    simple: [
      { en: 'I work from home.', fr: 'Je travaille à la maison.' },
      { en: 'He watches TV every evening.', fr: 'Il regarde la télé chaque soir.' },
    ],
  },
  {
    id: 'present-continuous',
    label: 'Le présent continu (be + -ing)',
    summary: 'Action en cours ou temporaire : « I’m reading a book at the moment ». Aussi pour un projet planifié : « I’m meeting Tom tomorrow ». Pas avec les verbes d’état (know, like, want…).',
    simple: [
      { en: 'I’m cooking right now.', fr: 'Je suis en train de cuisiner.' },
      { en: 'She’s working from home this week.', fr: 'Elle travaille de chez elle cette semaine.' },
    ],
  },
  {
    id: 'frequency',
    label: 'Adverbes de fréquence',
    summary: 'always, usually, often, sometimes, rarely, never se placent AVANT le verbe ordinaire mais APRÈS « be » : « I often cook », « I’m often late ».',
    simple: [
      { en: 'I usually get up at 7.', fr: 'Je me lève généralement à 7 h.' },
      { en: 'She is never late.', fr: 'Elle n’est jamais en retard.' },
    ],
  },
  {
    id: 'likes',
    label: 'Exprimer ses goûts',
    summary: 'like / love / enjoy / hate / can’t stand + verbe en -ing : « I enjoy cooking ». « I’d like » = je voudrais (souhait ponctuel). Pas d’article pour une généralité : « I like music ».',
    simple: [
      { en: 'I love reading.', fr: 'J’adore lire.' },
      { en: 'I can’t stand waiting.', fr: 'Je déteste attendre.' },
    ],
  },
  {
    id: 'past-simple',
    label: 'Le prétérit (passé simple anglais)',
    summary: 'Action terminée à un moment précis du passé : verbe + -ed ou forme irrégulière (went, saw, had). Questions/négations : did + verbe de base (« Did you go? », « I didn’t see »).',
    simple: [
      { en: 'I watched a film yesterday.', fr: 'J’ai regardé un film hier.' },
      { en: 'We went to Spain last year.', fr: 'Nous sommes allés en Espagne l’an dernier.' },
    ],
  },
  {
    id: 'past-be',
    label: '« was / were »',
    summary: 'Passé de « be » : I/he/she/it was, you/we/they were. « I was tired », « Were you at home? ».',
    simple: [
      { en: 'It was great.', fr: 'C’était super.' },
      { en: 'Where were you?', fr: 'Où étais-tu ?' },
    ],
  },
  {
    id: 'future',
    label: 'Parler du futur',
    summary: '« will » : décision spontanée, promesse, prédiction. « be going to » : intention déjà décidée ou prédiction évidente. Présent continu : rendez-vous planifié.',
    simple: [
      { en: 'I’ll call you tonight.', fr: 'Je t’appellerai ce soir.' },
      { en: 'I’m going to learn Spanish.', fr: 'Je vais apprendre l’espagnol.' },
    ],
  },
  {
    id: 'present-perfect',
    label: 'Le present perfect (have + participe)',
    summary: 'Lien passé-présent : expérience (« Have you ever been to London? »), résultat actuel (« I’ve lost my keys »), durée jusqu’à maintenant. Jamais avec une date précise passée : « I saw him yesterday ».',
    simple: [
      { en: 'I’ve never tried sushi.', fr: 'Je n’ai jamais goûté de sushis.' },
      { en: 'She has just arrived.', fr: 'Elle vient d’arriver.' },
    ],
  },
  {
    id: 'for-since',
    label: '« for » et « since » (durée)',
    summary: '« depuis » se traduit par « for » + durée (for three years) ou « since » + point de départ (since 2020). Le verbe est au present perfect : « I’ve lived here for three years » (pas « I live here since »).',
    simple: [
      { en: 'I’ve known her for ten years.', fr: 'Je la connais depuis dix ans.' },
      { en: 'He’s been here since Monday.', fr: 'Il est là depuis lundi.' },
    ],
  },
  {
    id: 'prepositions',
    label: 'Prépositions de temps et de lieu',
    summary: 'at + heure / lieu précis (at 6, at work), on + jour / surface (on Monday, on the table), in + mois, année, ville, espace fermé (in May, in Paris, in the car).',
    simple: [
      { en: 'See you on Friday at 8.', fr: 'À vendredi à 20 h.' },
      { en: 'She lives in Lyon.', fr: 'Elle habite à Lyon.' },
    ],
  },
  {
    id: 'comparatives',
    label: 'Comparatifs et superlatifs',
    summary: 'Adjectif court : -er / the -est (cheaper, the cheapest). Adjectif long : more / the most (more expensive). Irréguliers : good → better → the best, bad → worse → the worst. Jamais « more better ».',
    simple: [
      { en: 'This one is cheaper.', fr: 'Celui-ci est moins cher.' },
      { en: 'It’s the best film of the year.', fr: 'C’est le meilleur film de l’année.' },
    ],
  },
  {
    id: 'phrasal-verbs',
    label: 'Verbes à particule (phrasal verbs)',
    summary: 'Verbe + particule dont le sens change : give up (abandonner), find out (découvrir), look after (s’occuper de). Très fréquents à l’oral : apprenez-les en phrase complète.',
    simple: [
      { en: 'Don’t give up!', fr: 'N’abandonne pas !' },
      { en: 'I found out the truth.', fr: 'J’ai découvert la vérité.' },
    ],
  },
  {
    id: 'false-friends',
    label: 'Faux amis',
    summary: 'actually = en fait (pas actuellement → currently) ; eventually = finalement ; library = bibliothèque ; sensible = raisonnable ; to attend = assister à ; to assist = aider.',
    simple: [
      { en: 'Actually, I’m from Lyon.', fr: 'En fait, je viens de Lyon.' },
      { en: 'I’m currently looking for a job.', fr: 'Je cherche actuellement un travail.' },
    ],
  },
  {
    id: 'collocations',
    label: 'Associations de mots (make, do, take…)',
    summary: 'make : ce qu’on crée (make a mistake, make a decision, make dinner). do : tâches et activités (do homework, do sport, do the dishes). take : take a photo, take a break, take an exam.',
    simple: [
      { en: 'I made a mistake.', fr: 'J’ai fait une erreur.' },
      { en: 'Let’s take a break.', fr: 'Faisons une pause.' },
    ],
  },
  {
    id: 'opinions',
    label: 'Donner son avis',
    summary: 'I think / I feel / In my opinion / I’d say… « I agree » est un verbe : jamais « I am agree ». Nuancer : « I see your point, but… », « It depends on… ».',
    simple: [
      { en: 'I agree with you.', fr: 'Je suis d’accord avec toi.' },
      { en: 'In my opinion, it’s too expensive.', fr: 'À mon avis, c’est trop cher.' },
    ],
  },
  {
    id: 'connectors',
    label: 'Connecteurs logiques',
    summary: 'and, but, so (donc), because (parce que), although (bien que), however (cependant, en début de phrase), whereas (alors que), then / after that (ensuite).',
    simple: [
      { en: 'I was tired, so I went to bed.', fr: 'J’étais fatigué, donc je suis allé me coucher.' },
      { en: 'Although it was raining, we went out.', fr: 'Bien qu’il pleuve, nous sommes sortis.' },
    ],
  },
  {
    id: 'polite-requests',
    label: 'Demandes polies',
    summary: 'Could I have…? / Could you…? / Would you mind + -ing? / I’d like… Plus poli que « I want ». Ajouter « please » et remercier : « Thanks a lot ».',
    simple: [
      { en: 'Could I have the bill, please?', fr: 'Pourrais-je avoir l’addition ?' },
      { en: 'Would you mind closing the window?', fr: 'Ça vous dérangerait de fermer la fenêtre ?' },
    ],
  },
  {
    id: 'conditionals',
    label: 'Le conditionnel (would, if)',
    summary: 'Hypothèse : If + prétérit, would + verbe : « If I had time, I would travel more ». « I would like » / « I’d rather » pour exprimer une préférence.',
    simple: [
      { en: 'If I were you, I’d ask her.', fr: 'Si j’étais toi, je lui demanderais.' },
      { en: 'I’d rather stay home.', fr: 'Je préférerais rester à la maison.' },
    ],
  },
  {
    id: 'used-to',
    label: '« used to » et « get used to »',
    summary: '« used to + verbe » = habitude passée terminée (I used to smoke). « be/get used to + -ing » = être/s’habituer à (I’m used to working late).',
    simple: [
      { en: 'I used to live in Paris.', fr: 'J’habitais à Paris (avant).' },
      { en: 'I’m getting used to it.', fr: 'Je m’y habitue.' },
    ],
  },
  {
    id: 'expressions',
    label: 'Expressions courantes',
    summary: 'Les expressions idiomatiques ne se traduisent pas mot à mot : « It’s a piece of cake » = c’est du gâteau. Apprenez-les avec leur contexte.',
    simple: [
      { en: 'No worries!', fr: 'Pas de souci !' },
      { en: 'Let’s call it a day.', fr: 'Arrêtons-nous là pour aujourd’hui.' },
    ],
  },
  {
    id: 'natural-speech',
    label: 'Anglais oral naturel',
    summary: 'À l’oral : contractions (I’m, don’t, we’ll), formes réduites (gonna = going to, wanna = want to), mots de remplissage (well, you know, kind of). Les reconnaître aide à comprendre les natifs.',
    simple: [
      { en: 'I’m gonna grab a coffee.', fr: 'Je vais prendre un café.' },
      { en: 'It’s kind of weird.', fr: 'C’est un peu bizarre.' },
    ],
  },
  {
    id: 'short-answers',
    label: 'Réponses courtes et réactions',
    summary: 'On répond avec l’auxiliaire : « Do you…? – Yes, I do. », « Can you…? – No, I can’t. ». Réactions naturelles : « Really? », « Me too. », « Neither do I. », « I guess so. »',
    simple: [
      { en: 'Have you eaten? – Yes, I have.', fr: 'Tu as mangé ? – Oui.' },
      { en: 'I don’t like it. – Neither do I.', fr: 'Je n’aime pas ça. – Moi non plus.' },
    ],
  },
  {
    id: 'fillers',
    label: 'Gagner du temps pour réfléchir',
    summary: 'Pour éviter le silence et la traduction mentale : « Well… », « Let me think… », « How can I put it… », « The thing is… ». Ils rendent votre discours plus naturel.',
    simple: [
      { en: 'Well, let me think…', fr: 'Eh bien, laisse-moi réfléchir…' },
      { en: 'The thing is, I’m busy.', fr: 'Le truc, c’est que je suis occupé.' },
    ],
  },
  {
    id: 'comprehension',
    label: 'Compréhension globale et détaillée',
    summary: 'Écoutez/lisez d’abord pour l’idée générale, puis pour les détails (qui, quoi, où, quand, pourquoi). Ne bloquez pas sur un mot inconnu : le contexte aide.',
    simple: [{ en: 'Who? What? Where? When? Why?', fr: 'Qui ? Quoi ? Où ? Quand ? Pourquoi ?' }],
  },
  {
    id: 'inference',
    label: 'Comprendre l’implicite',
    summary: 'Le sens réel peut être implicite : « I’d love to, but… » annonce un refus poli ; « Not bad » est souvent positif ; le ton compte.',
    simple: [{ en: 'I’d love to, but I’m busy.', fr: 'J’adorerais, mais je suis pris. (= non)' }],
  },
  {
    id: 'pronunciation',
    label: 'Prononciation',
    summary: 'Points clés pour francophones : le « h » se prononce (hello, house), le « th » (langue entre les dents), l’accent tonique sur une syllabe, les voyelles longues/courtes (ship / sheep), le « -ed » souvent non prononcé comme syllabe (worked = « workt »).',
    simple: [
      { en: 'I think this is the third one.', fr: 'Je pense que c’est le troisième.' },
      { en: 'Happy holidays!', fr: 'Bonnes vacances !' },
    ],
  },
  {
    id: 'vocabulary',
    label: 'Vocabulaire du parcours',
    summary: 'Revoyez les mots en contexte : lisez l’exemple à voix haute, puis faites votre propre phrase avec le mot.',
    simple: [{ en: 'Use it in a sentence about you.', fr: 'Utilisez-le dans une phrase sur vous.' }],
  },
  {
    id: 'writing',
    label: 'Expression écrite',
    summary: 'Des phrases complètes, des connecteurs (because, so, but), des détails concrets. Relisez : sujet + verbe, -s à la 3e personne, temps cohérents.',
    simple: [{ en: 'I like my job because I meet new people every day.', fr: 'J’aime mon travail parce que je rencontre de nouvelles personnes chaque jour.' }],
  },
];

const byId = new Map(CONCEPTS.map((c) => [c.id, c]));

export function getConcept(id: string): ConceptDef | undefined {
  return byId.get(id);
}

export function conceptLabel(id: string): string {
  return byId.get(id)?.label ?? id;
}
