// « Partenaire local » : conversation à partir de scénarios préparés + correcteur à règles.
// Ce n'est pas une IA : l'interface le précise toujours à l'utilisateur.
import type { ScenarioStep } from '../content/scenarios';
import { getWord, VOCAB } from '../content';
import { keywordsFound } from './answerCheck';
import { detectIssues, type GrammarIssue } from './grammarRules';
import { normalizeAnswer, tokenize } from './normalize';
import { cardStatus } from './srs';
import type { LearnerState } from './state';

export interface LocalFeedback {
  ok: boolean;
  words: number;
  onTopic: boolean;
  issues: GrammarIssue[];
  messages: string[];
  /** La réponse semble écrite en français. */
  french: boolean;
}

const FRENCH_MARKERS = /\b(je|tu|nous|vous|est|suis|avec|pour|dans|mais|pas|une|le|la|les|des|et|c'est|j'ai|parce)\b/gi;

export function looksFrench(text: string): boolean {
  const words = text.split(/\s+/).filter(Boolean).length;
  const fr = (text.match(FRENCH_MARKERS) ?? []).length;
  return words >= 3 && fr / words > 0.3;
}

export function evaluateReply(step: ScenarioStep, text: string): LocalFeedback {
  const words = tokenize(normalizeAnswer(text)).length;
  const issues = detectIssues(text);
  const french = looksFrench(text);
  const onTopic = !step.keywords?.length || keywordsFound(text, step.keywords).length > 0;
  const minWords = step.minWords ?? 3;
  const messages: string[] = [];
  if (french) messages.push('On dirait du français ! Essayez de le dire en anglais : utilisez l’aide ou l’exemple si besoin.');
  else {
    if (words < minWords) messages.push(`Essayez une réponse plus complète (au moins ${minWords} mots).`);
    if (!onTopic) messages.push('Votre réponse ne semble pas répondre directement à la question. Relisez-la (ou affichez la traduction).');
  }
  const errors = issues.filter((i) => i.kind === 'error');
  const ok = !french && words >= minWords && onTopic && errors.length === 0;
  if (ok) messages.unshift(issues.length ? 'Bonne réponse ! Une petite suggestion ci-dessous.' : 'Bonne réponse, claire et complète !');
  return { ok, words, onTopic, issues, messages, french };
}

/** Mode correction : analyse d'une phrase libre par le correcteur local. */
export function correctSentence(text: string): { issues: GrammarIssue[]; summary: string } {
  const issues = detectIssues(text);
  const errors = issues.filter((i) => i.kind === 'error').length;
  const styles = issues.length - errors;
  let summary: string;
  if (!issues.length)
    summary = 'Le correcteur local n’a détecté aucune des erreurs fréquentes qu’il connaît. Cela ne garantit pas que la phrase est parfaite : il ne vérifie qu’une liste de pièges courants.';
  else summary = `${errors} erreur(s) certaine(s) et ${styles} suggestion(s) de style détectées par le correcteur local (liste de pièges fréquents des francophones).`;
  return { issues, summary };
}

export interface ReviewPrompt {
  wordId: string;
  en: string;
  fr: string;
  prompt: string;
  promptFr: string;
}

/** Mode révision local : faire réutiliser les mots fragiles ou en cours d'apprentissage. */
export function reviewPrompts(state: LearnerState, limit = 6): ReviewPrompt[] {
  const cards = Object.values(state.vocab)
    .filter((c) => c.reps > 0)
    .sort((a, b) => {
      const order = { fragile: 0, learning: 1, new: 2, mastered: 3 } as const;
      return order[cardStatus(a)] - order[cardStatus(b)] || a.ease - b.ease;
    })
    .slice(0, limit);
  const words = cards.length ? cards.map((c) => getWord(c.id)).filter((w) => !!w) : VOCAB.filter((w) => w.day === 1).slice(0, limit);
  return words.map((w) => ({
    wordId: w!.id,
    en: w!.en,
    fr: w!.fr,
    prompt: `Write a sentence about yourself using “${w!.en}”.`,
    promptFr: `Écrivez une phrase sur vous avec « ${w!.en} » (${w!.fr}).`,
  }));
}

/** Le mot demandé apparaît-il dans la phrase ? (on tolère « to » initial et les formes conjuguées simples) */
export function usesWord(text: string, en: string): boolean {
  const base = normalizeAnswer(en.replace(/\(.*?\)/g, '').replace(/^to /i, '').replace(/[…?!]/g, ''));
  const [first, ...rest] = base.split(' ');
  if (!first) return false;
  const forms = [first, `${first}s`, `${first}es`, `${first}ed`, `${first}d`, `${first}ing`, `${first.replace(/e$/, '')}ing`, `${first.replace(/y$/, 'ie')}s`];
  const n = ` ${normalizeAnswer(text)} `;
  return forms.some((f) => n.includes(` ${[f, ...rest].join(' ')} `));
}

/**
 * Le partenaire local ne reste jamais muet : quand la réponse doit être retravaillée, il relance
 * la question avec bienveillance (au lieu d'un simple message d'aide gris).
 */
export function retryPrompt(step: ScenarioStep, fb: LocalFeedback): { text: string; fr: string } {
  if (fb.french) return { text: `Could you try to say that in English? 😊 ${step.ai}`, fr: `Tu peux essayer de le dire en anglais ? 😊 ${step.fr}` };
  const errors = fb.issues.some((i) => i.kind === 'error');
  if (fb.words < (step.minWords ?? 3)) return { text: `Tell me a little more! ${step.ai}`, fr: `Dis-m’en un peu plus ! ${step.fr}` };
  if (!fb.onTopic) return { text: `Hmm, I’m not sure that answers my question. ${step.ai}`, fr: `Hmm, je ne suis pas sûr que ça réponde à ma question. ${step.fr}` };
  if (errors) return { text: 'I understand you! Can you say it again with the correction above?', fr: 'Je te comprends ! Tu peux le redire avec la correction ci-dessus ?' };
  return { text: step.ai, fr: step.fr };
}
