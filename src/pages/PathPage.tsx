import { Link, Navigate, useParams } from 'react-router';
import { ACTIVITY_LABELS, EXTENSION_DAYS, getDay, PROGRAM_DAYS, PROGRAM_LENGTH, isAssessmentActivity, conceptLabel } from '../content';
import { activityDone, currentDay, dayCompletion, dayStatus, isDayDone, isDayUnlocked, needsRemediation, PASS_SCORE, programFinished } from '../core/progress';
import { PageHead, ProgressBar } from '../components/ui';
import { update, useLearner } from '../state/store';

const ICON: Record<string, string> = {
  lesson: '📖',
  vocabulary: '🔤',
  grammar: '✏️',
  dialogue: '💬',
  listening: '🎧',
  reading: '📄',
  translation: '🔁',
  writing: '📝',
  speaking: '🗣️',
  review: '♻️',
  test: '🏁',
};

export function PathPage() {
  const s = useLearner();
  const cur = currentDay(s);
  return (
    <div>
      <PageHead eyebrow="Parcours" title="Votre programme">
        <p>14 jours progressifs. Le jour suivant se débloque après le test de validation du jour. En cas de difficulté, une consolidation ciblée vous est proposée — sans jamais vous bloquer.</p>
      </PageHead>
      <div className="day-grid">
        {PROGRAM_DAYS.map((d) => {
          const st = dayStatus(s, d.day);
          return (
            <Link key={d.day} to={`/parcours/jour/${d.day}`} className={`day-tile ${st === 'locked' ? 'locked' : ''} ${d.day === cur ? 'current' : ''}`} aria-label={`Jour ${d.day} : ${d.title} (${st === 'locked' ? 'verrouillé' : st === 'done' ? 'terminé' : 'disponible'})`}>
              <div className="row between">
                <span className="day-num">JOUR {d.day}</span>
                <span>{st === 'done' ? '✅' : st === 'locked' ? '🔒' : d.day === cur ? '▶' : ''}</span>
              </div>
              <h3 style={{ margin: '6px 0' }}>{d.title}</h3>
              <p className="small muted" style={{ minHeight: 40 }}>
                {d.theme}
              </p>
              <ProgressBar value={dayCompletion(s, d.day)} label={`Avancement du jour ${d.day}`} />
            </Link>
          );
        })}
      </div>

      <h2 style={{ marginTop: 32 }}>Extension facultative : jours 15 à 24</h2>
      {s.program.extensionEnabled ? (
        <div className="day-grid">
          {EXTENSION_DAYS.map((d) => {
            const st = dayStatus(s, d.day);
            return (
              <Link key={d.day} to={`/parcours/jour/${d.day}`} className={`day-tile ${st === 'locked' ? 'locked' : ''} ${d.day === cur ? 'current' : ''}`}>
                <div className="row between">
                  <span className="day-num">JOUR {d.day}</span>
                  <span>{st === 'done' ? '✅' : st === 'locked' ? '🔒' : ''}</span>
                </div>
                <h3 style={{ margin: '6px 0' }}>{d.title}</h3>
                <ProgressBar value={dayCompletion(s, d.day)} label={`Avancement du jour ${d.day}`} />
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="card">
          <p>
            Après l’évaluation finale du jour 14, l’application vous propose — si vos résultats le justifient — 10 jours supplémentaires personnalisés à partir de vos difficultés réelles.
          </p>
          {programFinished(s) ? (
            <Link to="/rapport" className="btn primary">
              Voir mon rapport et l’extension
            </Link>
          ) : (
            <p className="small muted">Disponible après le jour {PROGRAM_LENGTH}.</p>
          )}
        </div>
      )}
      {programFinished(s) && (
        <div className="notice info" style={{ marginTop: 16 }}>
          Le parcours n’est jamais « fini » : continuez avec les révisions, la conversation, les sessions express et la révision ciblée, aussi longtemps que vous le souhaitez.
        </div>
      )}
    </div>
  );
}

export function DayPage() {
  const params = useParams();
  const n = Number(params.day);
  const s = useLearner();
  const d = getDay(n);
  if (!d) return <Navigate to="/parcours" replace />;
  const unlocked = isDayUnlocked(s, n);
  const prevRemediation = n > 1 && needsRemediation(s, n - 1);
  const testScore = (() => {
    const t = d.activities.find((a) => a.kind === 'test' && !isAssessmentActivity(a));
    return t ? s.activities[t.id] : undefined;
  })();

  return (
    <div>
      <Link to="/parcours" className="btn ghost sm">
        ← Parcours
      </Link>
      <PageHead eyebrow={`Jour ${n}${n > PROGRAM_LENGTH ? ' · extension' : ''}`} title={d.title}>
        <p>{d.theme}</p>
      </PageHead>

      {!unlocked && (
        <div className="notice warn" style={{ marginBottom: 16 }}>
          🔒 Ce jour se débloquera après le test de validation du jour {n - 1}.{' '}
          {n > PROGRAM_LENGTH && !s.program.extensionEnabled && 'L’extension doit d’abord être activée depuis le rapport final.'}
          <div style={{ marginTop: 8 }}>
            <Link to={`/parcours/jour/${n - 1}`}>Aller au jour {n - 1}</Link>
          </div>
        </div>
      )}

      {unlocked && prevRemediation && (
        <div className="notice warn" style={{ marginBottom: 16 }}>
          Votre test du jour {n - 1} est sous {Math.round(PASS_SCORE * 100)} %. Nous vous conseillons une consolidation ciblée avant d’avancer (10 minutes).
          <div className="row" style={{ marginTop: 8 }}>
            <Link to={`/activite/remediation-${n - 1}`} className="btn sm primary">
              Consolider le jour {n - 1}
            </Link>
            <button type="button" className="btn sm ghost" onClick={() => update((st) => ({ ...st, program: { ...st.program, skippedRemediation: [...st.program.skippedRemediation, n - 1] } }))}>
              Continuer quand même
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-2">
        <div className="card">
          <h2>Objectifs</h2>
          <ul style={{ paddingLeft: 18 }}>
            {d.objectives.map((o) => (
              <li key={o}>{o}</li>
            ))}
          </ul>
        </div>
        <div className="card">
          <h2>Notions</h2>
          <div className="row">
            {d.concepts.map((c) => (
              <span key={c} className="badge">
                {conceptLabel(c)}
              </span>
            ))}
          </div>
          <p className="small muted" style={{ marginTop: 12 }}>
            Durée indicative : {d.activities.reduce((a, x) => a + x.minutes, 0)} minutes. Faites-le en une fois ou en plusieurs sessions : votre progression est enregistrée à chaque exercice.
          </p>
          {testScore?.status === 'done' && (
            <p className="small">
              Test de validation : <strong>{Math.round(testScore.bestScore * 100)} %</strong> (meilleur score)
            </p>
          )}
        </div>
      </div>

      <h2 style={{ marginTop: 24 }}>Activités</h2>
      <div>
        {d.activities.map((a) => {
          const isAssess = isAssessmentActivity(a);
          const done = isAssess ? isDayDone(s, n) : activityDone(s, a.id);
          const p = s.activities[a.id];
          const link = isAssess ? `/evaluation/${n === PROGRAM_LENGTH ? 'final' : 'extension'}` : `/activite/${encodeURIComponent(a.id)}`;
          const content = (
            <>
              <span className={`status ${done ? 'done' : ''}`} aria-hidden>
                {done ? '✓' : ICON[a.kind]}
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{a.title}</div>
                <div className="small muted">
                  {ACTIVITY_LABELS[a.kind]} · {a.minutes} min{a.timed ? ' · chronométré' : ''}
                  {p?.status === 'done' && !isAssess && ` · meilleur score ${Math.round(p.bestScore * 100)} %`}
                </div>
              </div>
              <span aria-hidden>→</span>
            </>
          );
          return unlocked ? (
            <Link key={a.id} to={link} className="activity-row">
              {content}
            </Link>
          ) : (
            <div key={a.id} className="activity-row" style={{ opacity: 0.6 }}>
              {content}
            </div>
          );
        })}
      </div>
    </div>
  );
}
