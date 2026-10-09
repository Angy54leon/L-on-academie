import { Link } from 'react-router';
import { SKILL_LABELS, conceptLabel, type Skill } from '../content';
import { adviseExtension, compareAssessments, levelFor } from '../core/assessment';
import { pushNotification } from '../core/learner';
import { conceptMastery, lastAssessment, openMistakes, totalSeconds, vocabCounts } from '../core/progress';
import { GOALS } from '../core/state';
import { CompareBars } from '../components/charts';
import { formatMinutes, PageHead, Stat } from '../components/ui';
import { update, useLearner } from '../state/store';

/** Compétences les plus liées à chaque objectif (pour dire honnêtement si l'objectif est atteint). */
const GOAL_SKILLS: Record<keyof typeof GOALS, Skill[]> = {
  conversation: ['speaking', 'listening', 'construction'],
  travel: ['listening', 'speaking', 'vocabulary'],
  work: ['writing', 'reading', 'speaking'],
  media: ['listening', 'vocabulary', 'reading'],
  exam: ['grammar', 'reading', 'writing'],
  general: ['vocabulary', 'grammar', 'listening'],
};

export default function ReportPage() {
  const s = useLearner();
  const placement = lastAssessment(s, 'placement');
  const final = lastAssessment(s, 'extension') ?? lastAssessment(s, 'final');
  if (!final) {
    return (
      <div className="card">
        <PageHead eyebrow="Rapport" title="Rapport de progression" />
        <p>Le rapport détaillé est disponible après l’évaluation finale du jour 14.</p>
        <Link to="/evaluation/final" className="btn">
          Évaluation finale
        </Link>
      </div>
    );
  }
  const isExt = final.kind === 'extension';
  const finalB = lastAssessment(s, 'final');
  const comparison = compareAssessments(placement, final);
  const advice = adviseExtension(s, final);
  const strengths = comparison.filter((c) => c.after !== null && (c.after >= 70 || (c.delta ?? 0) >= 10));
  const persistent = comparison.filter((c) => c.after !== null && c.after < 60);
  const weak = conceptMastery(s).filter((c) => c.status === 'weak').map((c) => c.concept);
  const goalSkills = GOAL_SKILLS[s.profile.goal];
  const goalScores = goalSkills.map((sk) => final.skillScores[sk]).filter((v): v is number => v !== null && v !== undefined);
  const goalAvg = goalScores.length ? Math.round(goalScores.reduce((a, b) => a + b, 0) / goalScores.length) : null;
  const vc = vocabCounts(s);

  const enableExtension = () =>
    update((st, now) =>
      pushNotification({ ...st, program: { ...st.program, extensionEnabled: true, extensionFocus: advice.focusConcepts } }, { at: now.toISOString(), kind: 'program', title: 'Extension activée : jour 15', body: 'Révisions ciblées et small talk avancé.', link: '/parcours/jour/15' }),
    );

  const series = [
    ...(placement ? [{ label: `Positionnement (${placement.overall}/100)`, color: 'var(--series-1)', a: placement }] : []),
    ...(isExt && finalB ? [{ label: `Finale J14 (${finalB.overall}/100)`, color: 'var(--series-2)', a: finalB }] : []),
    { label: `${isExt ? 'Complémentaire J24' : 'Finale J14'} (${final.overall}/100)`, color: isExt ? 'var(--series-3)' : 'var(--series-2)', a: final },
  ];

  return (
    <div>
      <PageHead eyebrow="Rapport" title={isExt ? 'Bilan après l’extension' : 'Bilan de vos 14 jours'}>
        <p>Comparaison entre vos évaluations, compétence par compétence. Estimation pédagogique, pas une certification officielle.</p>
      </PageHead>

      <div className="grid grid-4">
        <div className="card glow">
          <Stat value={`${final.overall}/100`} label={`score estimé · ${levelFor(final.overall).code}`} />
        </div>
        <div className="card">
          <Stat value={placement ? `${final.overall - placement.overall >= 0 ? '+' : ''}${final.overall - placement.overall}` : '—'} label="points depuis le positionnement" />
        </div>
        <div className="card">
          <Stat value={formatMinutes(totalSeconds(s))} label="d’étude active" />
        </div>
        <div className="card">
          <Stat value={vc.mastered} label="mots maîtrisés" />
        </div>
      </div>

      <div className="card">
        <h2>Progrès observés</h2>
        <CompareBars ariaLabel="Scores par compétence aux différentes évaluations" series={series} rows={comparison.map((c) => ({ label: c.label, values: series.map((x) => x.a.skillScores[c.skill] ?? null) }))} />
        {!placement && <p className="small muted">Vous n’avez pas passé le test de positionnement : la comparaison avant / après n’est pas possible.</p>}
      </div>

      <div className="grid grid-2" style={{ marginTop: 16 }}>
        <div className="card">
          <h2>Compétences renforcées</h2>
          {strengths.length ? (
            <ul>
              {strengths.map((c) => (
                <li key={c.skill}>
                  {c.label} : {c.after}/100 {c.delta !== null && `(${c.delta >= 0 ? '+' : ''}${c.delta})`}
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted small">Pas encore de compétence nettement renforcée selon les évaluations.</p>
          )}
        </div>
        <div className="card">
          <h2>Difficultés persistantes</h2>
          {persistent.length || weak.length ? (
            <ul>
              {persistent.map((c) => (
                <li key={c.skill}>
                  {c.label} : {c.after}/100
                </li>
              ))}
              {weak.slice(0, 6).map((c) => (
                <li key={c}>Notion fragile : {conceptLabel(c)}</li>
              ))}
              {openMistakes(s).length > 0 && <li>{openMistakes(s).length} erreur(s) récurrente(s) non résolue(s)</li>}
            </ul>
          ) : (
            <p className="muted small">Aucune difficulté majeure détectée.</p>
          )}
          {final.skillScores.speaking === null && <p className="small muted">L’expression orale n’a pas pu être évaluée (micro / reconnaissance vocale indisponible).</p>}
        </div>
      </div>

      <div className="card">
        <h2>Votre objectif : {GOALS[s.profile.goal]}</h2>
        {goalAvg === null ? (
          <p className="muted">Pas assez de données sur les compétences liées à cet objectif.</p>
        ) : goalAvg >= 70 ? (
          <p>
            ✅ <strong>Objectif largement engagé</strong> : moyenne de {goalAvg}/100 sur les compétences clés ({goalSkills.map((k) => SKILL_LABELS[k].toLowerCase()).join(', ')}). Continuez à pratiquer régulièrement pour le consolider.
          </p>
        ) : (
          <p>
            ⏳ <strong>Objectif pas encore atteint</strong> : moyenne de {goalAvg}/100 sur les compétences clés ({goalSkills.map((k) => SKILL_LABELS[k].toLowerCase()).join(', ')}). C’est normal après quelques semaines : la fluidité demande une pratique prolongée.
          </p>
        )}
      </div>

      <div className="card">
        <h2>Recommandations pour continuer</h2>
        <ul>
          <li>Révisez vos mots chaque jour (5 à 10 minutes) : c’est le meilleur rapport effort / résultat.</li>
          {persistent.some((c) => c.skill === 'listening') && <li>Compréhension orale : 10 minutes par jour de série ou podcast avec sous-titres anglais, puis sans.</li>}
          {persistent.some((c) => c.skill === 'speaking') && <li>Expression orale : utilisez la salle de conversation au moins 3 fois par semaine, à voix haute.</li>}
          {persistent.some((c) => c.skill === 'grammar') && <li>Grammaire : faites la révision ciblée deux fois par semaine.</li>}
          {persistent.some((c) => c.skill === 'writing') && <li>Écriture : rédigez un court texte par semaine et faites-le corriger.</li>}
          <li>Gardez une régularité réaliste plutôt que de longues sessions espacées.</li>
        </ul>
      </div>

      {!isExt && (
        <div className="card glow">
          <h2>Extension de 10 jours</h2>
          {advice.recommended ? (
            <>
              <p>Vos résultats montrent que vous gagneriez à poursuivre :</p>
              <ul>
                {advice.reasons.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
              {advice.focusConcepts.length > 0 && <p className="small">Les révisions ciblées de l’extension porteront notamment sur : {advice.focusConcepts.map(conceptLabel).join(', ')}.</p>}
            </>
          ) : (
            <p>Vos résultats sont solides : l’extension n’est pas indispensable, mais elle reste disponible pour aller plus loin (conversations plus longues, anglais naturel, situations professionnelles).</p>
          )}
          {s.program.extensionEnabled ? (
            <Link to="/parcours/jour/15" className="btn primary">
              Aller au jour 15 →
            </Link>
          ) : (
            <div className="row">
              <button type="button" className="btn primary" onClick={enableExtension}>
                Activer l’extension (facultatif)
              </button>
              <Link to="/conversation" className="btn">
                Continuer en entraînement libre
              </Link>
            </div>
          )}
        </div>
      )}
      {isExt && (
        <div className="card">
          <h2>Et maintenant ?</h2>
          <p>Le programme est terminé, mais l’entraînement continue : révisions quotidiennes, sessions express, révision ciblée et conversation restent disponibles sans limite.</p>
          <Link to="/dashboard" className="btn primary">
            Tableau de bord
          </Link>
        </div>
      )}
    </div>
  );
}
