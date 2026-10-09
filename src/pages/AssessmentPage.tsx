import { useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router';
import { ASSESSMENT_FORMS, FORM_BY_KIND, type AssessmentKind } from '../content/assessments';
import { SKILLS, SKILL_LABELS } from '../content';
import type { CheckResult } from '../core/answerCheck';
import { levelFor, scoreAssessment } from '../core/assessment';
import { recordAttempt, saveAssessment, saveSession } from '../core/learner';
import { isDayDone, lastAssessment } from '../core/progress';
import { randomId } from '../core/state';
import { sttSupported } from '../services/speech';
import { HBarChart } from '../components/charts';
import { PassageView } from '../components/ContentViews';
import { ExerciseView } from '../components/ExerciseView';
import { useStudyTimer } from '../components/useStudyTimer';
import { PageHead, ProgressBar } from '../components/ui';
import { getState, update, useLearner } from '../state/store';

const TITLES: Record<AssessmentKind, string> = {
  placement: 'Test de positionnement',
  final: 'Évaluation finale (jour 14)',
  extension: 'Évaluation complémentaire (jour 24)',
};

export function AssessmentPage() {
  const { kind } = useParams();
  const state = useLearner();
  const nav = useNavigate();
  const valid = kind === 'placement' || kind === 'final' || kind === 'extension';
  const k = (valid ? kind : 'placement') as AssessmentKind;
  const form = ASSESSMENT_FORMS[FORM_BY_KIND[k]];
  const sessionMatches = state.session?.activityId === form.id;
  const [started, setStarted] = useState(sessionMatches);
  const [finishedId, setFinishedId] = useState<string | null>(null);
  useStudyTimer(started && !finishedId);

  const index = sessionMatches ? state.session!.index : 0;
  const item = form.items[index];
  const stt = useMemo(() => sttSupported(), []);

  if (!valid) return <Navigate to="/" replace />;
  if (!state.profile.onboarded) return <Navigate to="/bienvenue" replace />;
  const locked = (k === 'final' && !isDayDone(state, 13)) || (k === 'extension' && !isDayDone(state, 23));

  if (finishedId) {
    const res = state.assessments.find((a) => a.id === finishedId)!;
    const lvl = levelFor(res.overall);
    return (
      <div>
        <PageHead eyebrow="Résultats" title={TITLES[k]}>
          <p>Estimation pédagogique fondée sur vos réponses — ce n’est pas une certification officielle.</p>
        </PageHead>
        <div className="grid grid-3">
          <div className="card glow">
            <div className="stat">
              <span className="value gradient-text">{res.overall}/100</span>
              <span className="label">Score global estimé</span>
            </div>
          </div>
          <div className="card">
            <div className="stat">
              <span className="value">{lvl.code}</span>
              <span className="label">{lvl.label} (estimation)</span>
            </div>
          </div>
          <div className="card">
            <div className="stat">
              <span className="value">
                {res.answered}/{res.total}
              </span>
              <span className="label">exercices évalués</span>
            </div>
          </div>
        </div>
        <div className="card">
          <h2>Par compétence</h2>
          <HBarChart ariaLabel="Score par compétence" data={SKILLS.map((s) => ({ label: SKILL_LABELS[s], value: res.skillScores[s] ?? null }))} />
          {res.skillScores.speaking === null && <p className="small muted">L’expression orale n’a pas été évaluée (micro ou reconnaissance vocale indisponible).</p>}
          <p className="small muted">L’expression écrite est estimée automatiquement (longueur, mots attendus, erreurs fréquentes repérées) : c’est une indication, pas une note de correcteur.</p>
        </div>
        <div className="row" style={{ marginTop: 16 }}>
          {k === 'placement' ? (
            <Link to="/parcours/jour/1" className="btn primary">
              Commencer le jour 1 →
            </Link>
          ) : (
            <Link to="/rapport" className="btn primary">
              Voir le rapport détaillé →
            </Link>
          )}
          <Link to="/dashboard" className="btn">
            Tableau de bord
          </Link>
        </div>
      </div>
    );
  }

  if (!started) {
    const previous = lastAssessment(state, k);
    return (
      <div style={{ maxWidth: 760 }}>
        <PageHead eyebrow="Évaluation" title={TITLES[k]}>
          <p>
            {form.items.length} exercices progressifs (environ {form.minutes} minutes) : vocabulaire, grammaire, compréhension écrite et orale, construction de phrases, expression écrite
            {stt ? ' et orale' : ''}.
          </p>
        </PageHead>
        {locked && <div className="notice warn">Cette évaluation est prévue à la fin du parcours. Vous pouvez la passer maintenant, mais elle sera plus utile après les jours précédents.</div>}
        <div className="card">
          <ul>
            <li>Pas de correction pendant le test : vous verrez vos résultats à la fin.</li>
            <li>Répondez sans dictionnaire ; « Je ne sais pas » est une réponse honnête et utile.</li>
            <li>Les questions d’écoute utilisent la synthèse vocale de votre navigateur : activez le son.</li>
            <li>{stt ? 'Une question orale utilise le micro (autorisation demandée à ce moment-là).' : 'La reconnaissance vocale n’est pas disponible ici : l’oral sera marqué « non évalué ».'}</li>
            <li>Vous pouvez interrompre le test : il reprendra où vous l’avez laissé.</li>
          </ul>
          {previous && <p className="small muted">Déjà passé le {new Date(previous.at).toLocaleDateString('fr-FR')} (score {previous.overall}/100). Un nouveau passage sera ajouté à l’historique.</p>}
          <div className="row" style={{ marginTop: 12 }}>
            <button
              type="button"
              className="btn primary"
              onClick={() => {
                const now = new Date().toISOString();
                update((s) => saveSession(s, { activityId: form.id, itemIds: form.items.map((i) => i.id), index: 0, results: [], startedAt: now, updatedAt: now, seconds: 0, dynamic: false }));
                setStarted(true);
              }}
            >
              Commencer →
            </button>
            <button type="button" className="btn ghost" onClick={() => nav(-1)}>
              Plus tard
            </button>
          </div>
        </div>
      </div>
    );
  }

  const finish = () => {
    const s = getState();
    const results: Record<string, CheckResult | null> = {};
    for (const r of s.session?.results ?? []) {
      const it = form.items.find((i) => i.id === r.itemId);
      // Oral non évaluable → null (compétence « non évaluée ») ; sinon le score obtenu.
      results[r.itemId] = it?.type === 'speak' && r.outcome === 'skipped' ? null : ({ outcome: r.outcome, correct: r.correct, score: r.score, expected: '', feedback: [] } as CheckResult);
    }
    const scored = scoreAssessment(form, results);
    const id = randomId('as');
    update((st, now) =>
      saveSession(
        saveAssessment(st, { id, kind: k, form: FORM_BY_KIND[k], at: now.toISOString(), skillScores: scored.skillScores, overall: scored.overall, level: scored.level, answered: scored.answered, total: scored.total }),
        undefined,
      ),
    );
    setFinishedId(id);
  };

  const advance = () => {
    const s = getState();
    if (!s.session) return;
    if (s.session.index + 1 >= form.items.length) finish();
    else update((st) => saveSession(st, { ...st.session!, index: st.session!.index + 1, updatedAt: new Date().toISOString() }));
  };

  const skipSpeaking = () => {
    update((st) => saveSession(st, { ...st.session!, results: [...st.session!.results, { itemId: item.id, outcome: 'skipped', score: 0, correct: false }] }));
    advance();
  };

  return (
    <div>
      <div className="row between" style={{ marginBottom: 10 }}>
        <span className="small muted">
          {TITLES[k]} · {index + 1} / {form.items.length} · {SKILL_LABELS[item.skill]}
        </span>
        <button type="button" className="btn ghost sm" onClick={() => nav('/dashboard')}>
          Interrompre (reprise possible)
        </button>
      </div>
      <ProgressBar value={index / form.items.length} label="Avancement du test" />
      <div className="card" style={{ marginTop: 16 }}>
        {item.type === 'mcq' && item.passage && form.passage && (
          <details open className="card" style={{ boxShadow: 'none', marginBottom: 16 }}>
            <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Texte à lire</summary>
            <PassageView passage={{ ...form.passage, fr: undefined }} immersion={3} />
          </details>
        )}
        {item.type === 'speak' && !stt ? (
          <div>
            <p>Question orale : « {item.question ?? item.text} »</p>
            <div className="notice warn">La reconnaissance vocale n’est pas disponible dans ce navigateur. Cette question sera marquée « non évaluée » (elle ne compte ni pour ni contre vous).</div>
            <button type="button" className="btn primary" style={{ marginTop: 12 }} onClick={skipSpeaking}>
              Continuer →
            </button>
          </div>
        ) : (
          <ExerciseView
            key={item.id}
            item={item}
            immersion={k === 'placement' ? 0 : 1}
            showHints={false}
            allowRetry={false}
            showFeedback={false}
            voiceOnly
            onAttempt={({ result, firstTry, userAnswer }) =>
              update((st, now) => {
                const withAttempt = recordAttempt(st, { item, result, source: 'assessment', firstTry, userAnswer, activityId: form.id }, now);
                return saveSession(withAttempt, {
                  ...st.session!,
                  results: [...st.session!.results.filter((r) => r.itemId !== item.id), { itemId: item.id, outcome: result.outcome, score: result.score, correct: result.correct }],
                  updatedAt: now.toISOString(),
                });
              })
            }
            onNext={advance}
          />
        )}
      </div>
      {item.type === 'speak' && stt && (
        <button type="button" className="btn ghost sm" style={{ marginTop: 10 }} onClick={skipSpeaking}>
          Je ne peux pas parler maintenant (oral non évalué)
        </button>
      )}
    </div>
  );
}
