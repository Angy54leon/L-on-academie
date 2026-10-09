// Calcul des résultats d'évaluation et recommandation d'extension.
// Les niveaux sont des ESTIMATIONS pédagogiques inspirées du CECRL, pas une certification.
import { SKILLS, SKILL_LABELS, type Activity, type Skill } from '../content';
import type { CheckResult } from './answerCheck';
import { conceptMastery, openMistakes } from './progress';
import type { AssessmentResult, LearnerState } from './state';

export const LEVEL_SCALE = [
  { min: 0, code: 'A1', label: 'A1 — découverte' },
  { min: 20, code: 'A2', label: 'A2 — intermédiaire de survie' },
  { min: 40, code: 'B1', label: 'B1 — seuil' },
  { min: 60, code: 'B2', label: 'B2 — avancé' },
  { min: 80, code: 'C1', label: 'C1 — autonome' },
];

export function levelFor(score: number): (typeof LEVEL_SCALE)[number] {
  let lvl = LEVEL_SCALE[0];
  for (const l of LEVEL_SCALE) if (score >= l.min) lvl = l;
  return lvl;
}

const WEIGHT: Record<1 | 2 | 3, number> = { 1: 1, 2: 1.5, 3: 2 };

/**
 * Score par compétence (0–100), pondéré par la difficulté.
 * Une compétence sans réponse exploitable (ex. micro indisponible) vaut `null` (« non évaluée »).
 */
export function scoreAssessment(form: Activity, results: Record<string, CheckResult | null>) {
  const skillScores: Record<Skill, number | null> = Object.fromEntries(SKILLS.map((s) => [s, null])) as Record<Skill, number | null>;
  const acc: Record<string, { num: number; den: number }> = {};
  let answered = 0;
  for (const item of form.items) {
    const r = results[item.id];
    if (!r) continue; // non évalué
    answered++;
    const w = WEIGHT[item.difficulty];
    const a = (acc[item.skill] ??= { num: 0, den: 0 });
    a.num += r.score * w;
    a.den += w;
  }
  for (const [skill, a] of Object.entries(acc)) skillScores[skill as Skill] = Math.round((a.num / a.den) * 100);
  const values = Object.values(skillScores).filter((v): v is number => v !== null);
  const overall = values.length ? Math.round(values.reduce((x, y) => x + y, 0) / values.length) : 0;
  return { skillScores, overall, level: levelFor(overall).code, answered, total: form.items.length };
}

export interface SkillComparison {
  skill: Skill;
  label: string;
  before: number | null;
  after: number | null;
  delta: number | null;
}

export function compareAssessments(before: AssessmentResult | undefined, after: AssessmentResult): SkillComparison[] {
  return SKILLS.map((skill) => {
    const b = before?.skillScores[skill] ?? null;
    const a = after.skillScores[skill] ?? null;
    return { skill, label: SKILL_LABELS[skill], before: b, after: a, delta: a !== null && b !== null ? a - b : null };
  });
}

export interface ExtensionAdvice {
  recommended: boolean;
  reasons: string[];
  focusSkills: Skill[];
  focusConcepts: string[];
}

/** Faut-il proposer l'extension de 10 jours ? Décision fondée sur les résultats observés. */
export function adviseExtension(state: LearnerState, final: AssessmentResult): ExtensionAdvice {
  const reasons: string[] = [];
  const focusSkills = SKILLS.filter((s) => {
    const v = final.skillScores[s];
    return v !== null && v !== undefined && v < 70;
  });
  if (focusSkills.length) reasons.push(`${focusSkills.length} compétence(s) sous 70 % : ${focusSkills.map((s) => SKILL_LABELS[s].toLowerCase()).join(', ')}.`);
  const weak = conceptMastery(state)
    .filter((c) => c.status === 'weak')
    .sort((a, b) => a.ewma - b.ewma)
    .map((c) => c.concept);
  if (weak.length >= 3) reasons.push(`${weak.length} notions grammaticales encore fragiles.`);
  const mistakes = openMistakes(state).length;
  if (mistakes >= 10) reasons.push(`${mistakes} erreurs récurrentes non résolues.`);
  if (final.overall < 75) reasons.push(`Score global estimé de ${final.overall}/100 : un entraînement supplémentaire consoliderait vos acquis.`);
  return { recommended: reasons.length > 0, reasons, focusSkills, focusConcepts: weak.slice(0, 6) };
}
