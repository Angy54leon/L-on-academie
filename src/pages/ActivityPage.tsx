import { useMemo, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router';
import { ACTIVITY_LABELS, conceptLabel, dayOfActivity, getActivity, getDay, getItem, isAssessmentActivity, isDynamicActivity, PROGRAM_LENGTH, type Activity, type Item } from '../content';
import { buildDynamicActivity, buildSessionItems, hintsVisible, immersionLevel, isDynamicId, learnerLevel, LEVEL_LABELS } from '../core/adaptive';
import { completeActivity, introduceWords, markActivityStarted, recordAttempt, saveSession } from '../core/learner';
import { PASS_SCORE } from '../core/progress';
import { ConceptReminder, DialogueView, LessonView, PassageView, WordCard } from '../components/ContentViews';
import { ExerciseView } from '../components/ExerciseView';
import { useStudyTimer } from '../components/useStudyTimer';
import { PageHead, ProgressBar, Ring } from '../components/ui';
import { getState, update, useLearner } from '../state/store';

type Phase = 'intro' | 'items' | 'summary';

interface Summary {
  score: number;
  correct: number;
  total: number;
  wrong: Item[];
  concepts: string[];
  isTest: boolean;
}

export function ActivityPage() {
  const id = decodeURIComponent(useParams().id ?? '');
  const state = useLearner();
  const nav = useNavigate();
  const resuming = state.session?.activityId === id;

  // L'activité : contenu fixe, ou construite à partir de vos données (révision ciblée, express…).
  const activity = useMemo<Activity | undefined>(() => {
    const fixed = getActivity(id);
    if (fixed && !isDynamicActivity(fixed)) return fixed;
    if (fixed || isDynamicId(id)) {
      if (resuming) {
        const s = getState().session!;
        const items = s.itemIds.map((i) => getItem(i)).filter((i): i is Item => !!i);
        return { ...(fixed ?? { id, kind: 'review', title: 'Révision', summary: '', minutes: 10, skills: ['grammar'] }), items } as Activity;
      }
      const dyn = buildDynamicActivity(id, getState(), new Date());
      return dyn ? { ...dyn, title: fixed?.title ?? dyn.title, summary: dyn.summary } : undefined;
    }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const [phase, setPhase] = useState<Phase>(resuming ? 'items' : 'intro');
  const [summary, setSummary] = useState<Summary | null>(null);
  const [reminder, setReminder] = useState<string | null>(null);
  const remindersShown = useRef(new Set<string>());
  const timer = useStudyTimer(phase === 'items');
  const startSeconds = useRef(0);

  if (!activity) {
    if (getActivity(id) && isAssessmentActivity(getActivity(id)!)) return <Navigate to={`/evaluation/${dayOfActivity(id) === PROGRAM_LENGTH ? 'final' : 'extension'}`} replace />;
    return (
      <div className="card">
        <h1>Rien à réviser ici pour l’instant</h1>
        <p className="muted">Cette session est construite à partir de vos erreurs et de vos mots à revoir. Faites quelques activités du parcours, puis revenez.</p>
        <Link to="/parcours" className="btn primary">
          Aller au parcours
        </Link>
      </div>
    );
  }
  if (isAssessmentActivity(activity)) return <Navigate to={`/evaluation/${dayOfActivity(id) === PROGRAM_LENGTH ? 'final' : 'extension'}`} replace />;

  const day = dayOfActivity(activity.id);
  const dynamic = !getActivity(id) || isDynamicActivity(getActivity(id)!);
  const immersion = immersionLevel(state, day);
  const session = state.session?.activityId === id ? state.session : undefined;
  const itemIds = session?.itemIds ?? [];
  const index = session?.index ?? 0;
  const item = itemIds[index] ? getItem(itemIds[index]) : undefined;

  const start = () => {
    const now = new Date();
    const ids = dynamic ? activity.items.map((i) => i.id) : buildSessionItems(activity, getState(), now.getTime() % 100000);
    if (!ids.length) {
      finish([], now);
      return;
    }
    startSeconds.current = timer.current;
    update((s) => {
      let st = markActivityStarted(s, activity.id, now);
      if (activity.kind === 'vocabulary' && activity.words) st = introduceWords(st, activity.words, now);
      return saveSession(st, { activityId: id, itemIds: ids, index: 0, results: [], startedAt: now.toISOString(), updatedAt: now.toISOString(), seconds: 0, dynamic });
    });
    setPhase('items');
  };

  const finish = (results: { itemId: string; score: number; correct: boolean }[], now: Date) => {
    const score = results.length ? results.reduce((a, r) => a + r.score, 0) / results.length : 1;
    const wrong = results.filter((r) => !r.correct).map((r) => getItem(r.itemId)).filter((i): i is Item => !!i);
    const seconds = Math.max(0, timer.current - startSeconds.current);
    update((s) => saveSession(completeActivity(s, activity.id, score, seconds, now), undefined));
    setSummary({
      score,
      correct: results.filter((r) => r.correct).length,
      total: results.length,
      wrong,
      concepts: Array.from(new Set(wrong.map((w) => w.concept))),
      isTest: activity.kind === 'test',
    });
    setPhase('summary');
  };

  const next = () => {
    const s = getState().session;
    if (!s) return;
    if (s.index + 1 >= s.itemIds.length) {
      finish(s.results, new Date());
      return;
    }
    // Réexplication automatique : 2 erreurs sur la même notion pendant la session.
    const wrongByConcept = new Map<string, number>();
    for (const r of s.results) {
      if (r.correct) continue;
      const c = getItem(r.itemId)?.concept;
      if (c && c !== 'comprehension' && c !== 'vocabulary') wrongByConcept.set(c, (wrongByConcept.get(c) ?? 0) + 1);
    }
    const toRemind = [...wrongByConcept.entries()].find(([c, n]) => n >= 2 && !remindersShown.current.has(c));
    if (toRemind) {
      remindersShown.current.add(toRemind[0]);
      setReminder(toRemind[0]);
    }
    update((st) => saveSession(st, { ...st.session!, index: st.session!.index + 1, updatedAt: new Date().toISOString() }));
  };

  // ------------------------------------------------------------------ Rendu

  if (phase === 'summary' && summary) return <SummaryView activity={activity} summary={summary} day={day} />;

  if (phase === 'intro') {
    return (
      <div>
        <Link to={day ? `/parcours/jour/${day}` : '/revision'} className="btn ghost sm">
          ← {day ? `Jour ${day}` : 'Retour'}
        </Link>
        <PageHead eyebrow={`${ACTIVITY_LABELS[activity.kind]}${day ? ` · jour ${day}` : ''} · ${activity.minutes} min`} title={activity.title}>
          <p>{activity.summary}</p>
        </PageHead>
        {activity.lesson && (
          <div className="card">
            <LessonView sections={activity.lesson} />
          </div>
        )}
        {activity.dialogue && (
          <div className="card">
            <h2>{activity.dialogue.title}</h2>
            <DialogueView dialogue={activity.dialogue} immersion={immersion} />
          </div>
        )}
        {activity.passage && (
          <div className="card">
            <PassageView passage={activity.passage} immersion={immersion} />
          </div>
        )}
        {activity.kind === 'vocabulary' && activity.words && (
          <div className="grid grid-2">
            {activity.words.map((w) => (
              <WordCard key={w} id={w} />
            ))}
          </div>
        )}
        <div className="card" style={{ marginTop: 16 }}>
          <p className="small muted" style={{ marginTop: 0 }}>
            {activity.items.length} exercice(s){!dynamic && activity.kind !== 'test' ? ` · adaptés à votre niveau (mode ${LEVEL_LABELS[learnerLevel(state)].toLowerCase()})` : ''}
            {activity.timed ? ` · ${activity.timed} s conseillées par question` : ''}
          </p>
          {state.session && state.session.activityId !== id && <p className="small notice warn">Une autre session est en cours ; elle sera remplacée si vous commencez celle-ci.</p>}
          <button type="button" className="btn primary" onClick={start}>
            {activity.lesson ? 'Vérifier ma compréhension →' : activity.kind === 'vocabulary' ? 'S’entraîner →' : 'Commencer →'}
          </button>
        </div>
      </div>
    );
  }

  if (!item || !session) {
    return (
      <div className="card">
        <p>Session introuvable.</p>
        <button type="button" className="btn" onClick={() => nav(0)}>
          Recharger
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="row between" style={{ marginBottom: 10 }}>
        <span className="small muted">
          {activity.title} · {index + 1} / {itemIds.length}
        </span>
        <button
          type="button"
          className="btn ghost sm"
          onClick={() => nav(day ? `/parcours/jour/${day}` : '/dashboard')}
          title="Votre progression est enregistrée : vous pourrez reprendre ici."
        >
          Pause (reprendre plus tard)
        </button>
      </div>
      <ProgressBar value={index / itemIds.length} label="Avancement de l’activité" />
      {reminder ? (
        <div style={{ marginTop: 16 }}>
          <ConceptReminder concept={reminder} />
          <button type="button" className="btn primary" onClick={() => setReminder(null)}>
            J’ai compris, continuer →
          </button>
        </div>
      ) : (
        <div className="card" style={{ marginTop: 16 }}>
          {item.type === 'mcq' && item.passage && activity.dialogue && (
            <details className="card" style={{ boxShadow: 'none', marginBottom: 16 }}>
              <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Revoir le dialogue</summary>
              <DialogueView dialogue={activity.dialogue} immersion={Math.max(immersion, 2)} />
            </details>
          )}
          {item.type === 'mcq' && item.passage && activity.passage && (
            <details className="card" open style={{ boxShadow: 'none', marginBottom: 16 }}>
              <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Texte</summary>
              <PassageView passage={activity.passage} immersion={immersion} />
            </details>
          )}
          <ExerciseView
            key={item.id + index}
            item={item}
            immersion={immersion}
            showHints={hintsVisible(state)}
            allowRetry={activity.kind !== 'test'}
            showFeedback
            timed={activity.timed}
            onAttempt={({ result, firstTry, userAnswer }) =>
              update((st, now) => {
                const s1 = recordAttempt(st, { item, result, activityId: activity.id, source: dynamic ? 'review' : 'activity', firstTry, userAnswer }, now);
                const sess = st.session!;
                return saveSession(s1, {
                  ...sess,
                  results: [...sess.results.filter((r) => r.itemId !== item.id), { itemId: item.id, outcome: result.outcome, score: result.score, correct: result.correct }],
                  updatedAt: now.toISOString(),
                });
              })
            }
            onNext={next}
          />
        </div>
      )}
    </div>
  );
}

function SummaryView({ activity, summary, day }: { activity: Activity; summary: Summary; day?: number }) {
  const pct = Math.round(summary.score * 100);
  const d = day ? getDay(day) : undefined;
  const idx = d ? d.activities.findIndex((a) => a.id === activity.id) : -1;
  const nextAct = d && idx >= 0 ? d.activities[idx + 1] : undefined;
  const failedTest = summary.isTest && summary.score < PASS_SCORE;
  return (
    <div>
      <PageHead eyebrow="Bilan" title={activity.title} />
      <div className="card row" style={{ gap: 24 }}>
        <Ring value={summary.score} label={`Score : ${pct} %`}>
          <div style={{ fontWeight: 800, fontSize: '1.5rem' }}>{pct}%</div>
        </Ring>
        <div style={{ flex: 1, minWidth: 200 }}>
          <h2>{pct >= 90 ? 'Excellent !' : pct >= 70 ? 'Bien joué !' : pct >= 50 ? 'Pas mal, on consolide.' : 'On va retravailler ça ensemble.'}</h2>
          <p className="muted">
            {summary.correct} réponse(s) réussie(s) sur {summary.total}. Les exercices manqués ont été ajoutés à vos « erreurs à corriger » et reviendront dans vos révisions.
          </p>
          {summary.isTest && !failedTest && day && day < 24 && <div className="notice good">✅ Test validé : le jour {day + 1} est débloqué.</div>}
          {failedTest && (
            <div className="notice warn">
              Score sous {Math.round(PASS_SCORE * 100)} % : le jour suivant est accessible, mais une consolidation ciblée (10 min) est fortement conseillée avant d’avancer.
            </div>
          )}
        </div>
      </div>

      {summary.concepts.length > 0 && (
        <div className="card">
          <h2>Notions à revoir</h2>
          <div className="row">
            {summary.concepts.map((c) => (
              <span key={c} className="badge warn">
                {conceptLabel(c)}
              </span>
            ))}
          </div>
        </div>
      )}

      {summary.wrong.length > 0 && (
        <div className="card">
          <h2>Corrections</h2>
          <ul className="list">
            {summary.wrong.slice(0, 12).map((w) => (
              <li key={w.id}>
                <div className="small muted">{conceptLabel(w.concept)}</div>
                <div>{describeItem(w)}</div>
                <div className="small">{w.explanation}</div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="row" style={{ marginTop: 16 }}>
        {failedTest && day && (
          <Link to={`/activite/remediation-${day}`} className="btn primary">
            Consolider maintenant
          </Link>
        )}
        {nextAct && !failedTest && (
          <Link to={isAssessmentActivity(nextAct) ? `/evaluation/${day === PROGRAM_LENGTH ? 'final' : 'extension'}` : `/activite/${encodeURIComponent(nextAct.id)}`} className="btn primary">
            Activité suivante : {nextAct.title} →
          </Link>
        )}
        {summary.isTest && !failedTest && day && day < 24 && (day < PROGRAM_LENGTH || getDay(day + 1)) && (
          <Link to={`/parcours/jour/${day + 1}`} className="btn primary">
            Jour {day + 1} →
          </Link>
        )}
        {day && (
          <Link to={`/parcours/jour/${day}`} className="btn">
            Retour au jour {day}
          </Link>
        )}
        <Link to="/dashboard" className="btn ghost">
          Tableau de bord
        </Link>
      </div>
    </div>
  );
}

function describeItem(i: Item): string {
  switch (i.type) {
    case 'mcq':
      return `${i.prompt} → ${i.options[i.answer]}`;
    case 'listen':
      return `« ${i.audio} » → ${i.options[i.answer]}`;
    case 'gap':
    case 'conjugate':
      return i.sentence.replace('___', `[${i.answers[0].replace(/[{}[\]]/g, '').split('|')[0]}]`);
    case 'translate':
      return `${i.source} → ${i.answers[0].replace(/\[.*?\]/g, '').replace(/\{([^|}]*)[^}]*\}/g, '$1')}`;
    case 'order':
      return i.words.join(' ');
    case 'dictation':
      return i.audio;
    case 'speak':
      return i.question ? `${i.question} → ${i.text}` : i.text;
    case 'free':
      return i.prompt;
  }
}
