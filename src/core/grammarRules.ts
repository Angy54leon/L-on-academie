// Détecteur local d'erreurs fréquentes chez les francophones.
// Il fonctionne sans Internet et sans IA, à partir de règles écrites à la main.
// LIMITE : il ne repère que les erreurs prévues ci-dessous, pas toutes les erreurs.

export type IssueKind = 'error' | 'style';

export interface GrammarIssue {
  ruleId: string;
  kind: IssueKind;
  /** Extrait fautif trouvé dans le texte. */
  match: string;
  /** Proposition de correction. */
  suggestion: string;
  /** Explication en français. */
  explanation: string;
  /** Notion pédagogique associée (pour la mémorisation des difficultés). */
  concept: string;
}

interface Rule {
  id: string;
  kind: IssueKind;
  concept: string;
  re: RegExp;
  fix: (m: RegExpExecArray) => string;
  explanation: string;
}

const NUM_WORDS = 'one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fifteen|twenty|thirty|a few|several|many|\\d+';
const IRREGULAR_PAST: Record<string, string> = {
  went: 'go', saw: 'see', had: 'have', did: 'do', made: 'make', took: 'take', came: 'come', got: 'get', ate: 'eat',
  bought: 'buy', said: 'say', told: 'tell', thought: 'think', found: 'find', gave: 'give', knew: 'know', left: 'leave',
  met: 'meet', paid: 'pay', ran: 'run', sent: 'send', slept: 'sleep', spoke: 'speak', spent: 'spend', wrote: 'write',
  felt: 'feel', drove: 'drive', drank: 'drink', flew: 'fly', forgot: 'forget', understood: 'understand', began: 'begin',
  brought: 'bring', chose: 'choose', lost: 'lose', won: 'win', taught: 'teach', caught: 'catch', heard: 'hear',
};
const PAST_RE = Object.keys(IRREGULAR_PAST).join('|');
const COMMON_VERBS = 'like|love|want|need|work|live|play|go|do|know|think|speak|eat|watch|read|cook|travel|study|drink|feel|look|seem|say|make|take|come|get|see|hope|prefer|enjoy|hate|use|try|help|teach|learn';

const RULES: Rule[] = [
  {
    id: 'am-agree',
    kind: 'error',
    concept: 'opinions',
    re: /\b(i|we|they|you|he|she)\s*(?:am|'m|are|'re|is|'s)\s+(not\s+)?agree\b/gi,
    fix: (m) => {
      const third = /^(he|she)$/i.test(m[1]);
      if (m[2]) return `${m[1]} ${third ? "doesn't" : "don't"} agree`;
      return `${m[1]} ${third ? 'agrees' : 'agree'}`;
    },
    explanation: '« agree » est un verbe, pas un adjectif : on dit « I agree » (pas « I am agree »).',
  },
  {
    id: 'have-years',
    kind: 'error',
    concept: 'be-present',
    re: /\b(i|you|we|they|he|she)\s+(have|has)\s+(\d+|twenty|thirty|forty|fifty|sixty)\s+years?(\s+old)?\b/gi,
    fix: (m) => `${m[1]} ${/^i$/i.test(m[1]) ? 'am' : /^(he|she)$/i.test(m[1]) ? 'is' : 'are'} ${m[3]}${m[4] ? ' years old' : ''}`,
    explanation: 'Pour l’âge, on utilise « be » : « I am 30 (years old) », pas « I have 30 years ».',
  },
  {
    id: 'since-duration',
    kind: 'error',
    concept: 'for-since',
    re: new RegExp(`\\bsince\\s+((?:${NUM_WORDS})\\s+(?:years?|months?|weeks?|days?|hours?|minutes?))\\b`, 'gi'),
    fix: (m) => `for ${m[1]}`,
    explanation: 'Avec une DURÉE, « depuis » se traduit par « for » (for two years). « since » s’utilise avec un point de départ (since 2020).',
  },
  {
    id: 'during-duration',
    kind: 'error',
    concept: 'for-since',
    re: new RegExp(`\\bduring\\s+((?:${NUM_WORDS})\\s+(?:years?|months?|weeks?|days?|hours?))\\b`, 'gi'),
    fix: (m) => `for ${m[1]}`,
    explanation: 'Pour une durée chiffrée, on utilise « for » (for three years). « during » s’emploie avec un nom : during the holidays.',
  },
  {
    id: 'present-since',
    kind: 'error',
    concept: 'for-since',
    re: new RegExp(`\\b(i|we|they|you)\\s+(live|work|study|know|am|are)\\s+(here\\s+|there\\s+|in\\s+\\w+\\s+)?(since|for(?=\\s+(?:${NUM_WORDS}|a long time|ages|years|months)\\b))\\b`, 'gi'),
    fix: (m) => `${m[1]} have ${({ live: 'lived', work: 'worked', study: 'studied', know: 'known', am: 'been', are: 'been' } as Record<string, string>)[m[2].toLowerCase()]} ${m[3] ?? ''}${m[4]}`,
    explanation: 'Une action qui dure jusqu’à maintenant se met au present perfect : « I have lived here for 3 years » (pas « I live here since/for… »).',
  },
  {
    id: 'third-person-have',
    kind: 'error',
    concept: 'present-simple',
    re: /\b(he|she|it|my (?:mother|father|brother|sister|friend|boss|wife|husband))\s+have\b(?!\s+(?:to\s+)?been)/gi,
    fix: (m) => `${m[1]} has`,
    explanation: 'À la 3e personne du singulier, « have » devient « has » : « she has », « my brother has ».',
  },
  {
    id: 'third-person-dont',
    kind: 'error',
    concept: 'negation',
    re: /\b(he|she|it)\s+(don't|do not)\b/gi,
    fix: (m) => `${m[1]} ${m[2].toLowerCase() === 'do not' ? 'does not' : "doesn't"}`,
    explanation: 'À la 3e personne du singulier : « he doesn’t », « she does not ».',
  },
  {
    id: 'third-person-s',
    kind: 'error',
    concept: 'present-simple',
    re: new RegExp(`\\b(he|she|it)\\s+(always\\s+|usually\\s+|often\\s+|never\\s+|sometimes\\s+)?(${COMMON_VERBS})\\b`, 'gi'),
    fix: (m) => `${m[1]} ${m[2] ?? ''}${thirdPerson(m[3])}`,
    explanation: 'Au présent simple, on ajoute -s à la 3e personne du singulier : « she works », « he goes ».',
  },
  {
    id: 'doesnt-s',
    kind: 'error',
    concept: 'negation',
    re: /\b(doesn't|does not|didn't|did not|don't|do not)\s+(?!(?:always|sometimes|perhaps|as|is|was|us|this|thus|yes|plus|less|unless|across|its|his|hers|ours|yours|theirs|series|news|bus|gas|focus|bonus|virus|status|campus)\b)(\w*[^\Ws]s)\b/gi, // (sans « lookbehind », non pris en charge avant Safari 16.4)
    fix: (m) => `${m[1]} ${baseFromS(m[2])}`,
    explanation: 'Après do/does/did (et leur négation), le verbe reste à la forme de base, sans -s : « he doesn’t work ».',
  },
  {
    id: 'did-past',
    kind: 'error',
    concept: 'past-simple',
    re: new RegExp(`\\b(did|didn't|did not)\\s+(?:(you|he|she|we|they|i|it)\\s+)?(${PAST_RE})\\b`, 'gi'),
    fix: (m) => `${m[1]} ${m[2] ? m[2] + ' ' : ''}${IRREGULAR_PAST[m[3].toLowerCase()]}`,
    explanation: 'Après « did / didn’t », le verbe reste à la forme de base : « Did you go? », « I didn’t see ».',
  },
  {
    id: 'modal-to',
    kind: 'error',
    concept: 'modals',
    re: /\b(can|must|should|could|will|would|might)\s+to\s+(\w+)/gi,
    fix: (m) => `${m[1]} ${m[2]}`,
    explanation: 'Après un modal (can, must, should…), pas de « to » : « I can swim », « you should go ».',
  },
  {
    id: 'modal-s',
    kind: 'error',
    concept: 'modals',
    re: /\b(he|she|it)\s+(cans|musts|shoulds|wills)\b/gi,
    fix: (m) => `${m[1]} ${m[2].slice(0, -1)}`,
    explanation: 'Les modaux ne prennent jamais de -s : « she can ».',
  },
  {
    id: 'people-is',
    kind: 'error',
    concept: 'present-simple',
    re: /\bpeople\s+(is|was|has)\b/gi,
    fix: (m) => `people ${({ is: 'are', was: 'were', has: 'have' } as Record<string, string>)[m[1].toLowerCase()]}`,
    explanation: '« people » est pluriel en anglais : « people are », « people have ».',
  },
  {
    id: 'uncountable-s',
    kind: 'error',
    concept: 'vocabulary',
    re: /\b(informations|advices|furnitures|luggages|homeworks|knowledges|equipments|feedbacks|softwares|evidences)\b/gi,
    fix: (m) => m[1].slice(0, -1),
    explanation: 'Ce nom est indénombrable en anglais : pas de -s (information, advice, luggage, homework…). Pour compter : « a piece of advice ».',
  },
  {
    id: 'explain-me',
    kind: 'error',
    concept: 'pronouns',
    re: /\bexplain\s+(me|him|her|us|them)\b/gi,
    fix: (m) => `explain to ${m[1]}`,
    explanation: 'On dit « explain something to someone » : « Can you explain it to me? » (pas « explain me »).',
  },
  {
    id: 'said-me',
    kind: 'error',
    concept: 'pronouns',
    re: /\b(said|say|says)\s+(me|him|her|us|them)\b/gi,
    fix: (m) => `${({ said: 'told', say: 'tell', says: 'tells' } as Record<string, string>)[m[1].toLowerCase()]} ${m[2]}`,
    explanation: '« say » ne prend pas de personne directement : « he told me » ou « he said to me ».',
  },
  {
    id: 'depend-of',
    kind: 'error',
    concept: 'prepositions',
    re: /\b(depends?|depending|depended)\s+of\b/gi,
    fix: (m) => `${m[1]} on`,
    explanation: 'On dit « depend ON » : « it depends on the weather ».',
  },
  {
    id: 'its-depend',
    kind: 'error',
    concept: 'present-simple',
    re: /\b(it's|it is)\s+depends?\b/gi,
    fix: () => 'it depends',
    explanation: '« Ça dépend » = « It depends » (pas « it’s depend »).',
  },
  {
    id: 'more-better',
    kind: 'error',
    concept: 'comparatives',
    re: /\bmore\s+(better|worse|bigger|smaller|easier|cheaper|faster|older|younger|happier|nicer)\b/gi,
    fix: (m) => m[1],
    explanation: 'Le comparatif est déjà formé : « better », « easier » (pas « more better »).',
  },
  {
    id: 'more-short-adj',
    kind: 'error',
    concept: 'comparatives',
    re: /\bmore\s+(easy|big|small|cheap|fast|old|young|happy|nice|tall|short|long|hot|cold|good|bad)\s+than\b/gi,
    fix: (m) => `${comparative(m[1])} than`,
    explanation: 'Avec un adjectif court, on ajoute -er : « cheaper than », « easier than » (good → better, bad → worse).',
  },
  {
    id: 'listen-music',
    kind: 'error',
    concept: 'prepositions',
    re: /\b(listen|listens|listening|listened)\s+(?!to\b)(music|the radio|podcasts?|me|him|her|songs?|this)\b/gi,
    fix: (m) => `${m[1]} to ${m[2]}`,
    explanation: 'On dit « listen TO something » : « I listen to music ».',
  },
  {
    id: 'go-to-home',
    kind: 'error',
    concept: 'prepositions',
    re: /\b(go|went|come|came|get|got|going|coming)\s+to\s+(?:the\s+)?home\b/gi,
    fix: (m) => `${m[1]} home`,
    explanation: 'Avec « home », pas de « to » : « I go home », « she came home late ».',
  },
  {
    id: 'discuss-about',
    kind: 'error',
    concept: 'prepositions',
    re: /\b(discuss|discussed|discussing)\s+about\b/gi,
    fix: (m) => m[1],
    explanation: '« discuss » se construit sans « about » : « we discussed the project ». (Mais « talk about » ✔.)',
  },
  {
    id: 'make-photo',
    kind: 'error',
    concept: 'collocations',
    re: /\b(make|made|making|makes)\s+(a|some)\s+(photos?|pictures?)\b/gi,
    fix: (m) => `${({ make: 'take', made: 'took', making: 'taking', makes: 'takes' } as Record<string, string>)[m[1].toLowerCase()]} ${m[2]} ${m[3]}`,
    explanation: 'On « prend » une photo en anglais : « take a photo ».',
  },
  {
    id: 'do-mistake',
    kind: 'error',
    concept: 'collocations',
    re: /\b(do|did|doing|does|done)\s+(a|many|some|lots of|a lot of)\s+(mistakes?|errors?)\b/gi,
    fix: (m) => `${({ do: 'make', did: 'made', doing: 'making', does: 'makes', done: 'made' } as Record<string, string>)[m[1].toLowerCase()]} ${m[2]} ${m[3]}`,
    explanation: 'On dit « make a mistake » (faire une erreur).',
  },
  {
    id: 'make-sport',
    kind: 'error',
    concept: 'collocations',
    re: /\b(make|makes|made|making)\s+(sport|sports|homework|the dishes|the shopping|exercise)\b/gi,
    fix: (m) => `${({ make: 'do', makes: 'does', made: 'did', making: 'doing' } as Record<string, string>)[m[1].toLowerCase()]} ${m[2]}`,
    explanation: 'Pour les activités et tâches, on utilise « do » : « do sport », « do my homework », « do the dishes ».',
  },
  {
    id: 'learn-me',
    kind: 'error',
    concept: 'vocabulary',
    re: /\b(learn|learns|learned|learnt)\s+(me|him|her|us|them)\b/gi,
    fix: (m) => `${({ learn: 'teach', learns: 'teaches', learned: 'taught', learnt: 'taught' } as Record<string, string>)[m[1].toLowerCase()]} ${m[2]}`,
    explanation: '« apprendre à quelqu’un » = « teach someone » ; « learn » = apprendre soi-même.',
  },
  {
    id: 'want-that',
    kind: 'error',
    concept: 'word-order',
    re: /\b(want|wants|wanted)\s+that\s+(you|he|she|they|we|him|her|them)\s+(\w+)/gi,
    fix: (m) => `${m[1]} ${objectPronoun(m[2])} to ${m[3]}`,
    explanation: '« Je veux que tu… » = « I want you to… » (pas « I want that you… »).',
  },
  {
    id: 'what-means',
    kind: 'error',
    concept: 'questions',
    re: /\bwhat\s+means\s+([\w'"]+)/gi,
    fix: (m) => `what does ${m[1]} mean`,
    explanation: 'Question avec un verbe ordinaire : « What does it mean? » (pas « What means it? »).',
  },
  {
    id: 'how-called',
    kind: 'error',
    concept: 'questions',
    re: /\bhow\s+(is|are)\s+(?:it|this|that|they)?\s*called\b/gi,
    fix: (m) => `what ${m[1]} it called`,
    explanation: '« Comment ça s’appelle ? » = « What is it called? » (pas « How is it called? »).',
  },
  {
    id: 'interested-ing',
    kind: 'error',
    concept: 'vocabulary',
    re: /\b(i|i'm|i am|we are|we're|they are|they're)\s+(very\s+)?(interesting|boring|exciting|tiring|confusing)\s+(in|by|about|with)\b/gi,
    fix: (m) => `${m[1]} ${m[2] ?? ''}${m[3].replace(/ing$/, 'ed')} ${m[4]}`,
    explanation: '-ed décrit ce qu’on ressent (I’m interested, bored), -ing décrit ce qui provoque le sentiment (it’s interesting, boring).',
  },
  {
    id: 'i-am-boring',
    kind: 'style',
    concept: 'vocabulary',
    re: /\b(i'm|i am)\s+(so\s+|very\s+|really\s+)?(boring|interesting|exciting|tiring)\b(?!\s+(?:in|by|about|with))/gi,
    fix: (m) => `${m[1]} ${m[2] ?? ''}${({ boring: 'bored', interesting: 'interested', exciting: 'excited', tiring: 'tired' } as Record<string, string>)[m[3].toLowerCase()]}`,
    explanation: 'Attention : « I’m boring » = je suis ennuyeux. Pour dire qu’on s’ennuie : « I’m bored ».',
  },
  {
    id: 'actually-false-friend',
    kind: 'style',
    concept: 'false-friends',
    re: /\bactually\s+(i'm|i am|i work|i live|we are|she is|he is)\b/gi,
    fix: (m) => `currently ${m[1]} (si vous voulez dire « actuellement »)`,
    explanation: '« actually » = « en fait ». Si vous voulez dire « actuellement », utilisez « currently » ou « at the moment ».',
  },
  {
    id: 'the-life',
    kind: 'style',
    concept: 'articles',
    re: /(?:^|[.!?]\s+)the\s+(life|nature|happiness|money|love|society)\s+is\b/gi,
    fix: (m) => `${m[1][0].toUpperCase()}${m[1].slice(1)} is`,
    explanation: 'Si vous parlez en général, pas d’article en anglais : « Life is beautiful », « Money is important ».',
  },
  {
    id: 'like-the-general',
    kind: 'style',
    concept: 'articles',
    re: /\b(like|love|hate|prefer|enjoy)\s+the\s+(music|sport|cinema|football|cooking|reading|nature|travel|chocolate|coffee|cats|dogs)\b/gi,
    fix: (m) => `${m[1]} ${m[2]}`,
    explanation: 'Pour un goût en général, pas d’article : « I like music », « I love cats ». « the » désigne une chose précise.',
  },
  {
    id: 'i-lowercase',
    kind: 'style',
    concept: 'writing',
    re: /(?:^|\s)i(?=\s|'m|'ve|'ll|'d)/g,
    fix: () => ' I',
    explanation: 'Le pronom « I » s’écrit toujours en majuscule.',
  },
  {
    id: 'dont-apostrophe',
    kind: 'error',
    concept: 'writing',
    re: /\b(dont|doesnt|didnt|cant|wont|isnt|arent|wasnt|havent|im)\b/gi,
    fix: (m) => ({ dont: "don't", doesnt: "doesn't", didnt: "didn't", cant: "can't", wont: "won't", isnt: "isn't", arent: "aren't", wasnt: "wasn't", havent: "haven't", im: "I'm" } as Record<string, string>)[m[1].toLowerCase()],
    explanation: 'Les contractions s’écrivent avec une apostrophe : don’t, can’t, I’m.',
  },
  {
    id: 'very-much-position',
    kind: 'error',
    concept: 'word-order',
    re: /\b(like|love|enjoy)\s+(very much|a lot)\s+(?!of\b)(\w+)/gi,
    fix: (m) => `${m[1]} ${m[3]} ${m[2]}`,
    explanation: 'On ne sépare pas le verbe de son complément : « I like music a lot » / « I really like music ».',
  },
  {
    id: 'yesterday-present-perfect',
    kind: 'error',
    concept: 'present-perfect',
    re: /\b(i|you|we|they|he|she)\s+(have|has|'ve|'s)\s+(\w+(?:ed|en|ne|ght|t))\s+(.{0,25}?)\b(yesterday|last\s+(?:week|year|month|night|monday|friday|weekend)|ago)\b/gi,
    fix: (m) => `${m[1]} ${participleToPast(m[3])} ${m[4]}${m[5]}`,
    explanation: 'Avec un moment passé précis (yesterday, last week, ago), on utilise le prétérit : « I saw him yesterday » (pas « I have seen him yesterday »).',
  },
  {
    id: 'borrow-lend',
    kind: 'error',
    concept: 'vocabulary',
    re: /\b(borrow|borrowed)\s+(me|him|her|us|them)\b/gi,
    fix: (m) => `${m[1].toLowerCase() === 'borrow' ? 'lend' : 'lent'} ${m[2]}`,
    explanation: '« prêter à quelqu’un » = « lend someone » ; « borrow » = emprunter.',
  },
  {
    id: 'in-internet',
    kind: 'error',
    concept: 'prepositions',
    re: /\bin\s+(the\s+)?internet\b/gi,
    fix: () => 'on the internet',
    explanation: 'On dit « on the internet » / « online ».',
  },
  {
    id: 'on-the-morning',
    kind: 'error',
    concept: 'prepositions',
    re: /\b(on|at)\s+the\s+(morning|afternoon|evening)\b/gi,
    fix: (m) => `in the ${m[2]}`,
    explanation: 'On dit « in the morning / afternoon / evening » (mais « at night »).',
  },
  {
    id: 'assist-attend',
    kind: 'style',
    concept: 'false-friends',
    re: /\bassist(ed|ing)?\s+(to|at)\s+(the\s+|a\s+)?(meeting|conference|class|course|concert|wedding|lesson)/gi,
    fix: (m) => `attend${m[1] ?? ''} ${m[3] ?? ''}${m[4]}`,
    explanation: '« assister à » une réunion = « attend a meeting ». « assist » = aider.',
  },
  {
    id: 'propose-to',
    kind: 'style',
    concept: 'false-friends',
    re: /\b(propose|proposed)\s+(to|that)\b/gi,
    fix: (m) => `${m[1].toLowerCase() === 'propose' ? 'suggest' : 'suggested'}${m[2].toLowerCase() === 'that' ? ' that' : ' (+ -ing)'}`,
    explanation: '« proposer de faire » se dit plutôt « suggest + -ing » (I suggested going out). « propose » est formel ou signifie « demander en mariage ».',
  },
  {
    id: 'a-same',
    kind: 'error',
    concept: 'articles',
    re: /\ba\s+same\b/gi,
    fix: () => 'the same',
    explanation: '« le même » = « the same ».',
  },
  {
    id: 'missing-article-job',
    kind: 'error',
    concept: 'articles',
    re: /\b(i'm|i am|he's|he is|she's|she is)\s+(teacher|doctor|nurse|engineer|student|developer|lawyer|waiter|waitress|accountant|manager|designer|journalist|salesman|cook|chef|farmer|consultant|architect)\b/gi,
    fix: (m) => `${m[1]} ${/^[aeiou]/i.test(m[2]) ? 'an' : 'a'} ${m[2]}`,
    explanation: 'Devant un métier, on met « a / an » : « I’m a teacher », « she’s an engineer ».',
  },
  {
    id: 'i-will-going',
    kind: 'error',
    concept: 'future',
    re: /\b(will|'ll)\s+going\s+to\b/gi,
    fix: () => 'am going to / will',
    explanation: 'Choisissez « will + verbe » OU « be going to + verbe », pas les deux.',
  },
];

const PARTICIPLES: Record<string, string> = {
  seen: 'saw', been: 'was', done: 'did', gone: 'went', eaten: 'ate', taken: 'took', written: 'wrote', spoken: 'spoke',
  given: 'gave', known: 'knew', forgotten: 'forgot', driven: 'drove', begun: 'began', chosen: 'chose', broken: 'broke',
};

function participleToPast(p: string): string {
  return PARTICIPLES[p.toLowerCase()] ?? p;
}

function thirdPerson(verb: string): string {
  const v = verb.toLowerCase();
  if (v === 'have') return 'has';
  if (v === 'go') return 'goes';
  if (v === 'do') return 'does';
  if (/(s|sh|ch|x|o)$/.test(v)) return `${v}es`;
  if (/[^aeiou]y$/.test(v)) return `${v.slice(0, -1)}ies`;
  return `${v}s`;
}

function baseFromS(verb: string): string {
  const v = verb.toLowerCase();
  if (v === 'has') return 'have';
  if (v === 'does') return 'do';
  if (v === 'goes') return 'go';
  if (/ies$/.test(v)) return `${v.slice(0, -3)}y`;
  if (/(sses|shes|ches|xes)$/.test(v)) return v.slice(0, -2);
  return v.slice(0, -1);
}

function comparative(adj: string): string {
  const a = adj.toLowerCase();
  const irregular: Record<string, string> = { good: 'better', bad: 'worse' };
  if (irregular[a]) return irregular[a];
  if (/[^aeiou]y$/.test(a)) return `${a.slice(0, -1)}ier`;
  if (/e$/.test(a)) return `${a}r`;
  if (/^(big|hot)$/.test(a)) return `${a}${a.slice(-1)}er`;
  return `${a}er`;
}

function objectPronoun(p: string): string {
  return ({ he: 'him', she: 'her', they: 'them', we: 'us' } as Record<string, string>)[p.toLowerCase()] ?? p;
}

/** Analyse un texte anglais et renvoie les problèmes détectés (sans doublons). */
export function detectIssues(rawText: string): GrammarIssue[] {
  // Les claviers de téléphone produisent des apostrophes typographiques (’) : on les uniformise.
  const text = rawText.replace(/[’‘`´]/g, "'");
  const issues: GrammarIssue[] = [];
  const seen = new Set<string>();
  for (const rule of RULES) {
    rule.re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = rule.re.exec(text)) !== null) {
      const match = m[0].trim();
      if (!match) {
        rule.re.lastIndex++;
        continue;
      }
      if (rule.id === 'third-person-s') {
        // Ignore « he can play », « she will go », questions « does he like… », « did she go » etc.
        const before = text.slice(Math.max(0, m.index - 12), m.index).toLowerCase();
        if (/\b(does|did|do|can|will|would|should|could|must|might|let|make|help|to|may)\s*$/.test(before)) continue;
      }
      const key = `${rule.id}:${m.index}`;
      if (seen.has(key)) continue;
      seen.add(key);
      issues.push({
        ruleId: rule.id,
        kind: rule.kind,
        match,
        suggestion: rule.fix(m).replace(/\s+/g, ' ').trim(),
        explanation: rule.explanation,
        concept: rule.concept,
      });
    }
  }
  // Une seule alerte « i minuscule » suffit.
  const firstLower = issues.findIndex((i) => i.ruleId === 'i-lowercase');
  return issues.filter((i, idx) => i.ruleId !== 'i-lowercase' || idx === firstLower);
}

export const RULE_COUNT = RULES.length;
