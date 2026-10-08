// Correction des exercices. Fonctions pures : aucune dépendance à l'interface.
import type { Item, Trap } from '../content/schema';
import { detectIssues, type GrammarIssue } from './grammarRules';
import {
  diffTokens,
  editDistance,
  expandPattern,
  isLikelyTypo,
  normalizeAnswer,
  normalizeFrench,
  tokenize,
  type TokenDiff,
} from './normalize';

export type Outcome = 'correct' | 'typo' | 'partial' | 'incorrect' | 'skipped';
export type ErrorKind = 'grammar' | 'vocabulary' | 'unnatural' | 'comprehension' | 'spelling';

export type Response =
  | { kind: 'choice'; index: number }
  | { kind: 'text'; value: string }
  | { kind: 'tokens'; value: string[] }
  | { kind: 'speech'; transcript: string; confidence?: number }
  | { kind: 'self'; ok: boolean }
  | { kind: 'skip' };

export interface CheckResult {
  outcome: Outcome;
  /** Compte comme une réussite pour les statistiques. */
  correct: boolean;
  /** Score entre 0 et 1. */
  score: number;
  /** Réponse attendue à afficher. */
  expected: string;
  /** Messages en français, dans l'ordre d'affichage. */
  feedback: string[];
  errorKind?: ErrorKind;
  trap?: Trap;
  diff?: TokenDiff;
  issues?: GrammarIssue[];
}

/** Toutes les réponses acceptées d'un exercice textuel (déjà développées). */
export function acceptedAnswers(item: Item): string[] {
  switch (item.type) {
    case 'gap':
    case 'conjugate': {
      // On accepte le mot seul OU la phrase complète.
      const fillers = item.answers.flatMap((a) => expandPattern(a));
      return [...fillers, ...fillers.map((f) => item.sentence.replace('___', f))];
    }
    case 'translate':
      return item.answers.flatMap((a) => expandPattern(a));
    case 'order':
      return [item.words.join(' '), ...(item.alternatives ?? [])];
    case 'dictation':
      return [item.audio, ...(item.answers ?? [])].flatMap((a) => expandPattern(a));
    default:
      return [];
  }
}

/** Réponse attendue lisible (première réponse acceptée, syntaxe retirée). */
export function displayAnswer(item: Item): string {
  switch (item.type) {
    case 'mcq':
    case 'listen':
      return item.options[item.answer];
    case 'gap': {
      const first = expandPattern(item.answers[0])[0];
      return item.sentence.replace('___', first);
    }
    case 'conjugate':
      return item.sentence.replace('___', expandPattern(item.answers[0])[0]);
    case 'translate':
      return expandPattern(item.answers[0])[0];
    case 'order':
      return item.words.join(' ');
    case 'dictation':
      return item.audio;
    case 'speak':
    case 'free':
      return item.type === 'speak' ? item.text : item.modelAnswer;
  }
}

function matchTrap(given: string, traps: Trap[] | undefined, normalize: (s: string) => string): Trap | undefined {
  if (!traps) return undefined;
  for (const t of traps) {
    if (expandPattern(t.match).some((p) => normalize(p) === given)) return t;
  }
  return undefined;
}

interface TextEval {
  outcome: 'correct' | 'typo' | 'incorrect';
  closest: string;
  diff?: TokenDiff;
  typoWords?: string[];
}

/** Compare une réponse libre à la liste des réponses acceptées. */
export function evaluateText(given: string, accepted: string[], french = false): TextEval {
  const norm = french ? normalizeFrench : normalizeAnswer;
  const g = norm(given);
  const candidates = accepted.map((a) => ({ raw: a, n: norm(a) }));
  if (candidates.some((c) => c.n === g)) return { outcome: 'correct', closest: given };
  // Recherche de la réponse acceptée la plus proche.
  let best = candidates[0];
  let bestDist = Infinity;
  for (const c of candidates) {
    const d = editDistance(g, c.n);
    if (d < bestDist) {
      bestDist = d;
      best = c;
    }
  }
  if (!best) return { outcome: 'incorrect', closest: '' };
  const gt = tokenize(g);
  const et = tokenize(best.n);
  // Faute de frappe : même nombre de mots, et chaque différence est une faute de frappe plausible.
  if (gt.length === et.length) {
    const diffs = gt.map((t, i) => [t, et[i]] as const).filter(([a, b]) => a !== b);
    if (diffs.length > 0 && diffs.length <= 2) {
      const allTypos = french
        ? diffs.every(([a, b]) => Math.min(a.length, b.length) >= 4 && editDistance(a, b) <= 1)
        : diffs.every(([a, b]) => isLikelyTypo(a, b));
      if (allTypos) return { outcome: 'typo', closest: best.raw, typoWords: diffs.map(([, b]) => b) };
    }
  }
  return { outcome: 'incorrect', closest: best.raw, diff: diffTokens(gt, et) };
}

const KIND_LABEL: Record<ErrorKind, string> = {
  grammar: 'Erreur de grammaire',
  vocabulary: 'Erreur de vocabulaire',
  unnatural: 'Compréhensible mais peu naturel',
  comprehension: 'Problème de compréhension',
  spelling: 'Orthographe',
};

export function errorKindLabel(kind: ErrorKind): string {
  return KIND_LABEL[kind];
}

function textItemResult(item: Item & { type: 'gap' | 'translate' | 'conjugate' | 'order' | 'dictation' }, value: string): CheckResult {
  const french = item.type === 'translate' && item.direction === 'en-fr';
  const norm = french ? normalizeFrench : normalizeAnswer;
  const expected = displayAnswer(item);
  if (!value.trim()) {
    return { outcome: 'skipped', correct: false, score: 0, expected, feedback: ['Pas de réponse.', item.explanation] };
  }
  const traps = 'traps' in item ? item.traps : undefined;
  const trapHit = matchTrap(norm(value), traps, norm);
  if (trapHit) {
    return {
      outcome: trapHit.kind === 'unnatural' ? 'partial' : 'incorrect',
      correct: false,
      score: trapHit.kind === 'unnatural' ? 0.5 : 0,
      expected,
      feedback: [`${KIND_LABEL[trapHit.kind]} : ${trapHit.feedback}`, item.explanation],
      errorKind: trapHit.kind,
      trap: trapHit,
    };
  }
  const res = evaluateText(value, acceptedAnswers(item), french);
  if (res.outcome === 'correct') {
    const exact = acceptedAnswers(item).some((a) => a.trim() === value.trim());
    const feedback = ['Correct !'];
    if (!exact && normalizeAnswer(value) !== normalizeAnswer(expected) && item.type !== 'gap')
      feedback.push(`Variante acceptée. Autre formulation possible : « ${expected} ».`);
    return { outcome: 'correct', correct: true, score: 1, expected, feedback };
  }
  if (res.outcome === 'typo') {
    return {
      outcome: 'typo',
      correct: true,
      score: 0.8,
      expected,
      feedback: [`Presque parfait : attention à l’orthographe (${res.typoWords?.join(', ')}).`],
      errorKind: 'spelling',
    };
  }
  const feedback: string[] = [];
  if (res.diff && (res.diff.missing.length || res.diff.extra.length)) {
    const parts: string[] = [];
    if (res.diff.missing.length) parts.push(`il manque : ${res.diff.missing.join(' ')}`);
    if (res.diff.extra.length) parts.push(`en trop ou incorrect : ${res.diff.extra.join(' ')}`);
    feedback.push(`Comparaison avec la réponse attendue — ${parts.join(' ; ')}.`);
  }
  feedback.push(item.explanation);
  const issues = french ? [] : detectIssues(value);
  for (const issue of issues.filter((i) => i.kind === 'error').slice(0, 2)) feedback.push(`Repéré : « ${issue.match} » → ${issue.explanation}`);
  return {
    outcome: 'incorrect',
    correct: false,
    score: 0,
    expected,
    feedback,
    errorKind: item.type === 'translate' ? 'vocabulary' : 'grammar',
    diff: res.diff,
    issues,
  };
}

/** Proportion des mots attendus présents dans l'ordre (sous-séquence commune). */
export function wordMatchRatio(given: string, expected: string): number {
  const g = tokenize(normalizeAnswer(given));
  const e = tokenize(normalizeAnswer(expected));
  if (!e.length) return 0;
  const { missing } = diffTokens(g, e);
  return (e.length - missing.length) / e.length;
}

/** Vérifie la présence d'au moins un mot-clé (chaque mot-clé peut contenir des alternatives {a|b}). */
export function keywordsFound(text: string, keywords: string[]): string[] {
  const n = ` ${normalizeAnswer(text)} `;
  return keywords.filter((k) => expandPattern(k).some((alt) => n.includes(` ${normalizeAnswer(alt)} `)));
}

/** Correction d'une réponse orale (transcription de la reconnaissance vocale). */
function speechResult(item: Item & { type: 'speak' }, transcript: string): CheckResult {
  const disclaimer =
    'Note : ceci compare la TRANSCRIPTION de la reconnaissance vocale. Une transcription correcte ne garantit pas une prononciation parfaite.';
  if (!transcript.trim()) {
    return { outcome: 'skipped', correct: false, score: 0, expected: item.text, feedback: ['Rien n’a été entendu. Réessayez plus près du micro.'] };
  }
  if (item.question) {
    // Réponse libre à une question.
    const words = tokenize(normalizeAnswer(transcript));
    const found = item.keywords?.length ? keywordsFound(transcript, item.keywords) : [];
    const issues = detectIssues(transcript).filter((i) => i.kind === 'error');
    const longEnough = words.length >= 4;
    const onTopic = !item.keywords?.length || found.length > 0;
    const ok = longEnough && onTopic && issues.length === 0;
    const feedback: string[] = [];
    if (!longEnough) feedback.push('Essayez de répondre avec une phrase complète (au moins 4 mots).');
    if (!onTopic) feedback.push('Votre réponse ne semble pas répondre à la question. Réécoutez-la.');
    for (const i of issues.slice(0, 2)) feedback.push(`« ${i.match} » → ${i.suggestion}. ${i.explanation}`);
    if (ok) feedback.unshift('Bonne réponse complète !');
    feedback.push(`Exemple de réponse : « ${item.text} »`, disclaimer);
    return {
      outcome: ok ? 'correct' : longEnough ? 'partial' : 'incorrect',
      correct: ok,
      score: ok ? 1 : longEnough ? 0.5 : 0,
      expected: item.text,
      feedback,
      issues,
    };
  }
  const ratio = wordMatchRatio(transcript, item.text);
  const { missing } = diffTokens(tokenize(normalizeAnswer(transcript)), tokenize(normalizeAnswer(item.text)));
  const feedback: string[] = [];
  let outcome: Outcome;
  if (ratio >= 0.9) {
    outcome = 'correct';
    feedback.push('La reconnaissance vocale a compris votre phrase.');
  } else if (ratio >= 0.6) {
    outcome = 'partial';
    feedback.push(`Une partie n’a pas été reconnue : ${missing.join(', ')}. Réécoutez le modèle et insistez sur ces mots.`);
  } else {
    outcome = 'incorrect';
    feedback.push('La phrase n’a pas été reconnue. Écoutez le modèle, répétez lentement, puis accélérez.');
  }
  if (item.tip) feedback.push(`Conseil : ${item.tip}`);
  feedback.push(disclaimer);
  return { outcome, correct: outcome === 'correct', score: Math.round(ratio * 100) / 100, expected: item.text, feedback };
}

export interface WritingAnalysis {
  words: number;
  sentences: number;
  targetUsed: string[];
  targetMissing: string[];
  keywordsOk: boolean;
  issues: GrammarIssue[];
  /** Estimation automatique simplifiée (0 → 1). */
  score: number;
}

/** Analyse locale d'un texte libre (sans IA). */
export function analyzeWriting(item: Item & { type: 'free' }, text: string): WritingAnalysis {
  const tokens = tokenize(normalizeAnswer(text));
  const words = tokens.length;
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().split(/\s+/).length >= 2).length;
  const targetUsed = (item.targetWords ?? []).filter((w) => keywordsFound(text, [w]).length > 0);
  const targetMissing = (item.targetWords ?? []).filter((w) => !targetUsed.includes(w));
  const keywordsOk = !item.keywords?.length || keywordsFound(text, item.keywords).length > 0;
  const issues = detectIssues(text);
  const errors = issues.filter((i) => i.kind === 'error').length;
  const variety = words ? new Set(tokens).size / words : 0;
  let score = 0;
  score += Math.min(1, words / item.minWords) * 0.4;
  score += item.targetWords?.length ? (targetUsed.length / item.targetWords.length) * 0.2 : 0.2;
  score += keywordsOk ? 0.15 : 0;
  score += Math.max(0, 0.15 - errors * 0.05);
  score += variety > 0.55 ? 0.1 : variety * 0.15;
  return { words, sentences, targetUsed, targetMissing, keywordsOk, issues, score: Math.round(Math.min(1, score) * 100) / 100 };
}

function writingResult(item: Item & { type: 'free' }, text: string): CheckResult {
  if (!text.trim()) return { outcome: 'skipped', correct: false, score: 0, expected: item.modelAnswer, feedback: ['Pas de texte.'] };
  const a = analyzeWriting(item, text);
  const feedback: string[] = [];
  feedback.push(`${a.words} mots (objectif : ${item.minWords}), ${a.sentences} phrase(s).`);
  if (a.words < item.minWords) feedback.push('Développez davantage : ajoutez un détail, une raison (because…) ou un exemple.');
  if (!a.keywordsOk) feedback.push('Votre texte ne semble pas traiter directement la consigne.');
  if (a.targetMissing.length) feedback.push(`Mots à réutiliser : ${a.targetMissing.join(', ')}.`);
  const errs = a.issues.filter((i) => i.kind === 'error');
  const styles = a.issues.filter((i) => i.kind === 'style');
  for (const i of errs) feedback.push(`Erreur certaine — « ${i.match} » → ${i.suggestion}. ${i.explanation}`);
  for (const i of styles) feedback.push(`Suggestion — « ${i.match} » → ${i.suggestion}. ${i.explanation}`);
  if (!a.issues.length) feedback.push('Aucune erreur fréquente détectée par le correcteur local (il ne repère pas toutes les erreurs).');
  const ok = a.score >= 0.7 && errs.length === 0;
  return {
    outcome: ok ? 'correct' : a.score >= 0.45 ? 'partial' : 'incorrect',
    correct: ok,
    score: a.score,
    expected: item.modelAnswer,
    feedback,
    issues: a.issues,
  };
}

/** Point d'entrée : corrige n'importe quel exercice. */
export function checkAnswer(item: Item, response: Response): CheckResult {
  const expected = displayAnswer(item);
  if (response.kind === 'skip') {
    return { outcome: 'skipped', correct: false, score: 0, expected, feedback: ['Exercice passé.', item.explanation] };
  }
  switch (item.type) {
    case 'mcq':
    case 'listen': {
      if (response.kind !== 'choice') throw new Error('Réponse attendue : choix');
      const ok = response.index === item.answer;
      return {
        outcome: ok ? 'correct' : 'incorrect',
        correct: ok,
        score: ok ? 1 : 0,
        expected,
        feedback: ok ? ['Correct !', item.explanation] : [`La bonne réponse était : « ${expected} ».`, item.explanation],
        errorKind: ok ? undefined : item.type === 'listen' || item.passage ? 'comprehension' : item.skill === 'vocabulary' ? 'vocabulary' : 'grammar',
      };
    }
    case 'gap':
    case 'translate':
    case 'conjugate':
    case 'dictation':
      if (response.kind !== 'text') throw new Error('Réponse attendue : texte');
      return textItemResult(item, response.value);
    case 'order':
      if (response.kind !== 'tokens' && response.kind !== 'text') throw new Error('Réponse attendue : mots');
      return textItemResult(item, response.kind === 'tokens' ? response.value.join(' ') : response.value);
    case 'speak':
      if (response.kind === 'self') {
        return {
          outcome: response.ok ? 'correct' : 'partial',
          correct: response.ok,
          score: response.ok ? 1 : 0.5,
          expected: item.text,
          feedback: [response.ok ? 'Auto-évaluation : réussi.' : 'Auto-évaluation : à retravailler.', item.tip ? `Conseil : ${item.tip}` : ''].filter(Boolean),
        };
      }
      if (response.kind === 'text') return speechResult(item, response.value);
      if (response.kind !== 'speech') throw new Error('Réponse attendue : parole');
      return speechResult(item, response.transcript);
    case 'free':
      if (response.kind !== 'text') throw new Error('Réponse attendue : texte');
      return writingResult(item, response.value);
  }
}

/** Les exercices notés automatiquement (comptent dans les scores). */
export function isAutoGraded(item: Item): boolean {
  return item.type !== 'free' && !(item.type === 'speak');
}
