// Normalisation des réponses : permet d'accepter les variantes correctes
// (contractions, majuscules, ponctuation, orthographe britannique/américaine, chiffres).

const CONTRACTIONS: [RegExp, string][] = [
  [/\bcan't\b/g, 'cannot'],
  [/\bcan not\b/g, 'cannot'],
  [/\bwon't\b/g, 'will not'],
  [/\bshan't\b/g, 'shall not'],
  [/\bain't\b/g, 'is not'],
  [/\blet's\b/g, 'let us'],
  [/\b(\w+)n't\b/g, '$1 not'],
  [/\bi'm\b/g, 'i am'],
  [/\b(\w+)'re\b/g, '$1 are'],
  [/\b(\w+)'ve\b/g, '$1 have'],
  [/\b(\w+)'ll\b/g, '$1 will'],
  [/\b(\w+)'d (better|rather)\b/g, '$1 would $2'],
  [/\b(\w+)'d (been|had|done|gone|seen|got|finished|left|known)\b/g, '$1 had $2'],
  [/\b(\w+)'d\b/g, '$1 would'],
  // 's = has devant un participe passé fréquent, sinon is (pour les pronoms et mots interrogatifs).
  [/\b(he|she|it|that|there|what|who|where|how|here)'s (been|got|gone|done|had|seen|finished|left|lived|worked|known|never|just|already)\b/g, '$1 has $2'],
  [/\b(he|she|it|that|there|what|who|where|how|here)'s\b/g, '$1 is'],
];

const SPELLING: Record<string, string> = {
  colour: 'color',
  colours: 'colors',
  favourite: 'favorite',
  favourites: 'favorites',
  neighbour: 'neighbor',
  neighbours: 'neighbors',
  neighbourhood: 'neighborhood',
  centre: 'center',
  theatre: 'theater',
  travelling: 'traveling',
  travelled: 'traveled',
  traveller: 'traveler',
  cancelled: 'canceled',
  cancelling: 'canceling',
  organise: 'organize',
  organised: 'organized',
  realise: 'realize',
  realised: 'realized',
  apologise: 'apologize',
  recognise: 'recognize',
  practise: 'practice',
  practised: 'practiced',
  programme: 'program',
  humour: 'humor',
  behaviour: 'behavior',
  flavour: 'flavor',
  labour: 'labor',
  grey: 'gray',
  licence: 'license',
  defence: 'defense',
  analyse: 'analyze',
  enrol: 'enroll',
  okay: 'ok',
  'o.k.': 'ok',
  mum: 'mom',
};

const NUMBERS: Record<string, string> = {
  '0': 'zero',
  '1': 'one',
  '2': 'two',
  '3': 'three',
  '4': 'four',
  '5': 'five',
  '6': 'six',
  '7': 'seven',
  '8': 'eight',
  '9': 'nine',
  '10': 'ten',
  '11': 'eleven',
  '12': 'twelve',
  '15': 'fifteen',
  '20': 'twenty',
  '30': 'thirty',
};

/** Normalisation de base : minuscules, apostrophes droites, espaces. */
export function basicNormalize(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFC')
    .replace(/[’‘`´]/g, "'")
    .replace(/[“”«»]/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normalisation complète pour comparer deux réponses anglaises.
 * Le résultat n'est pas destiné à être affiché.
 */
export function normalizeAnswer(input: string): string {
  let s = basicNormalize(input);
  for (const [re, rep] of CONTRACTIONS) s = s.replace(re, rep);
  // Ponctuation (on garde les apostrophes internes des possessifs : john's).
  s = s.replace(/[.,!?;:"()[\]{}…\-–—/]/g, ' ');
  s = s.replace(/(^|\s)'|'(\s|$)/g, ' ');
  const tokens = s
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => SPELLING[t] ?? NUMBERS[t] ?? t);
  return tokens.join(' ');
}

/** Normalisation d'un texte français (traductions vers le français). */
export function normalizeFrench(input: string): string {
  return basicNormalize(input)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[.,!?;:"()[\]{}…\-–—/]/g, ' ')
    .replace(/'/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function tokenize(normalized: string): string[] {
  return normalized.split(' ').filter(Boolean);
}

/**
 * Développe la syntaxe des réponses acceptées :
 *  - {a|b|c} : alternatives (une option vide est permise : {the|})
 *  - [mot]   : partie facultative
 * Exemple : "I [really] {like|love} it" → 4 variantes.
 */
export function expandPattern(pattern: string, limit = 256): string[] {
  const results: string[] = [];
  const walk = (s: string) => {
    if (results.length >= limit) return;
    const opt = s.indexOf('[');
    const alt = s.indexOf('{');
    if (opt === -1 && alt === -1) {
      results.push(s.replace(/\s+/g, ' ').trim());
      return;
    }
    const useOpt = opt !== -1 && (alt === -1 || opt < alt);
    if (useOpt) {
      const end = s.indexOf(']', opt);
      if (end === -1) return walk(s.replace('[', ''));
      const inner = s.slice(opt + 1, end);
      walk(s.slice(0, opt) + inner + s.slice(end + 1));
      walk(s.slice(0, opt) + s.slice(end + 1));
    } else {
      const end = s.indexOf('}', alt);
      if (end === -1) return walk(s.replace('{', ''));
      const inner = s.slice(alt + 1, end);
      for (const choice of inner.split('|')) walk(s.slice(0, alt) + choice + s.slice(end + 1));
    }
  };
  walk(pattern);
  return Array.from(new Set(results));
}

/** Distance de Damerau-Levenshtein (transpositions adjacentes comprises). */
export function editDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (!m) return n;
  if (!n) return m;
  const d: number[][] = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));
  for (let i = 0; i <= m; i++) d[i][0] = i;
  for (let j = 0; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[m][n];
}

const GRAMMAR_SUFFIXES = ['s', 'es', 'ed', 'd', 'ing', 'er', 'est', 'ly', 'n'];
const FUNCTION_WORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'am', 'was', 'were', 'be', 'been', 'do', 'does', 'did', 'have', 'has', 'had',
  'will', 'would', 'can', 'could', 'in', 'on', 'at', 'to', 'for', 'of', 'he', 'she', 'it', 'we', 'they', 'his',
  'her', 'their', 'there', 'then', 'than', 'this', 'that', 'these', 'those', 'where', 'were', 'when', 'what',
  'which', 'who', 'how', 'some', 'any', 'much', 'many', 'since', 'from', 'with', 'your', 'you', 'our',
]);

/**
 * Deux mots diffèrent-ils seulement par une faute de frappe ?
 * On REFUSE de considérer comme faute de frappe une différence grammaticale
 * (ex. work/works, play/played) ou un mot grammatical (he/she, in/on).
 */
export function isLikelyTypo(given: string, expected: string): boolean {
  if (given === expected) return false;
  if (FUNCTION_WORDS.has(given) || FUNCTION_WORDS.has(expected)) return false;
  if (Math.min(given.length, expected.length) < 4) return false;
  for (const suf of GRAMMAR_SUFFIXES) {
    if (given + suf === expected || expected + suf === given) return false;
  }
  // make → making, woman → women : différences grammaticales aussi.
  if (given.replace(/e$/, '') + 'ing' === expected || expected.replace(/e$/, '') + 'ing' === given) return false;
  if (given.replace(/man$/, 'men') === expected || expected.replace(/man$/, 'men') === given) return false;
  // y → ies / ied (study → studies) : différence grammaticale.
  if (given.replace(/ie[sd]$/, 'y') === expected || expected.replace(/ie[sd]$/, 'y') === given) return false;
  const dist = editDistance(given, expected);
  return expected.length >= 8 ? dist <= 2 : dist <= 1;
}

export interface TokenDiff {
  /** Mots de la réponse attendue absents de la réponse donnée. */
  missing: string[];
  /** Mots en trop dans la réponse donnée. */
  extra: string[];
}

/** Différence mot à mot (plus longue sous-séquence commune). */
export function diffTokens(given: string[], expected: string[]): TokenDiff {
  const m = given.length;
  const n = expected.length;
  const L: number[][] = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--)
    for (let j = n - 1; j >= 0; j--) L[i][j] = given[i] === expected[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const missing: string[] = [];
  const extra: string[] = [];
  let i = 0;
  let j = 0;
  while (i < m && j < n) {
    if (given[i] === expected[j]) {
      i++;
      j++;
    } else if (L[i + 1][j] >= L[i][j + 1]) extra.push(given[i++]);
    else missing.push(expected[j++]);
  }
  while (i < m) extra.push(given[i++]);
  while (j < n) missing.push(expected[j++]);
  return { missing, extra };
}
