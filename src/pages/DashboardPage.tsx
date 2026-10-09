import { Link } from 'react-router';
import { getDay, SKILL_LABELS, conceptLabel, PROGRAM_LENGTH, isAssessmentActivity } from '../content';
import { learnerLevel, LEVEL_LABELS, immersionLevel } from '../core/adaptive';
import { levelFor } from '../core/assessment';
import { updateProfile } from '../core/learner';
import {
  activityDone,
  assessmentDone,
  currentDay,
  currentStreak,
  dueCards,
  isDayDone,
  lastAssessment,
  nextRecommendation,
  openMistakes,
  skillStats,
  today,
  vocabCounts,
  weakConcepts,
} from '../core/progress';
import { formatMinutes, ProgressBar, Ring, Stat } from '../components/ui';
import { update, useLearner } from '../state/store';

const IMMERSION_LABEL = ['Consignes en français', 'Bilingue', 'Anglais (aide FR sur demande)', 'Immersion anglaise'];

export function DashboardPage() {
  const s = useLearner();
  const now = new Date();
  const day = currentDay(s);
  const d = getDay(day);
  const t = today(s, now);
  const goalSec = s.profile.dailyMinutes * 60;
  const rec = nextRecommendation(s, now);
  const due = dueCards(s, now).length;
  const mistakes = openMistakes(s);
  const streak = currentStreak(s, now);
  const vc = vocabCounts(s);
  const weak = weakConcepts(s, 4);
  const skills = skillStats(s).filter((x) => x.attempts > 0);
  const placement = lastAssessment(s, 'placement');
  const lvl = learnerLevel(s);
  const doneDays = Array.from({ length: PROGRAM_LENGTH }, (_, i) => i + 1).filter((n) => isDayDone(s, n)).length;
  const dayActs = d?.activities ?? [];
  const dayDone = dayActs.filter((a) => (isAssessmentActivity(a) ? isDayDone(s, day) : activityDone(s, a.id))).length;

  return (
    <div>
      <header className="page-head row between">
        <div>
          <div className="eyebrow">{now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
          <h1>{s.profile.displayName ? `Bonjour ${s.profile.displayName} !` : 'Bonjour !'}</h1>
          <p className="muted" style={{ margin: 0 }}>
            Jour {day} {day > PROGRAM_LENGTH ? '(extension)' : `sur ${PROGRAM_LENGTH}`} · {d?.title}
          </p>
        </div>
        <div className="row">
          <span className="badge accent" title="Niveau d’accompagnement calculé à partir de vos 30 dernières réponses">
            Mode : {LEVEL_LABELS[lvl]}
          </span>
          <span className="badge" title="Proportion d’anglais dans les consignes, ajustée selon le jour et vos résultats">
            {IMMERSION_LABEL[immersionLevel(s)]}
          </span>
        </div>
      </header>

      {!assessmentDone(s, 'placement') && (
        <div className="notice info" style={{ marginBottom: 16 }}>
          Vous n’avez pas encore passé le test de positionnement. Il permet d’adapter la difficulté dès le premier jour.{' '}
          <Link to="/evaluation/placement">Passer le test →</Link>
        </div>
      )}

      <div className="grid grid-2">
        <div className="card glow">
          <div className="eyebrow">Prochaine étape recommandée</div>
          <h2>{rec.title}</h2>
          <p className="muted">{rec.reason}</p>
          <Link to={rec.link} className="btn primary">
            {rec.kind === 'resume' ? 'Reprendre →' : 'Commencer →'}
          </Link>
          <hr className="sep" />
          <div className="row">
            <Link to="/activite/express" className="btn sm">
              ⚡ Session express 15 min
            </Link>
            <Link to={`/parcours/jour/${day}`} className="btn sm">
              📚 Session longue : jour {day}
            </Link>
          </div>
        </div>

        <div className="card row" style={{ gap: 20, alignItems: 'center' }}>
          <Ring value={t.seconds / goalSec} label={`Objectif du jour : ${Math.round((100 * t.seconds) / goalSec)} %`}>
            <div style={{ fontWeight: 800, fontSize: '1.3rem' }}>{Math.min(999, Math.round((100 * t.seconds) / goalSec))}%</div>
            <div className="tiny muted">objectif</div>
          </Ring>
          <div className="stack" style={{ flex: 1, minWidth: 160 }}>
            <div>
              <strong>{formatMinutes(t.seconds)}</strong> <span className="muted">/ {formatMinutes(goalSec)} aujourd’hui</span>
            </div>
            <div className="row">
              <label className="small muted" htmlFor="goal">
                Objectif :
              </label>
              <select
                id="goal"
                value={s.profile.dailyMinutes}
                onChange={(e) => update((st) => updateProfile(st, { dailyMinutes: Number(e.target.value) }))}
                style={{ width: 'auto', padding: '4px 10px' }}
              >
                {[15, 30, 45, 60, 90, 120, 180, 240, 300].map((m) => (
                  <option key={m} value={m}>
                    {formatMinutes(m * 60)} / jour
                  </option>
                ))}
              </select>
            </div>
            <div className="small">
              🔥 Série : <strong>{streak} jour(s)</strong> · ✦ {t.xp} XP aujourd’hui
            </div>
            <div className="tiny muted">La série compte les jours avec un apprentissage réel (au moins une activité, 15 révisions ou 15 bonnes réponses).</div>
          </div>
        </div>
      </div>

      <div className="grid grid-4" style={{ marginTop: 16 }}>
        <div className="card">
          <Stat value={`${t.itemsCorrect}/${t.itemsTotal}`} label="bonnes réponses aujourd’hui" />
        </div>
        <div className="card">
          <Stat value={t.reviews} label="mots révisés aujourd’hui" />
        </div>
        <div className="card">
          <Stat value={t.activitiesDone} label="activités terminées aujourd’hui" />
        </div>
        <div className="card">
          <Stat value={`${doneDays}/${PROGRAM_LENGTH}`} label="jours validés" />
        </div>
      </div>

      <div className="grid grid-2" style={{ marginTop: 16 }}>
        <div className="card">
          <div className="row between">
            <h2>Objectifs du jour {day}</h2>
            <span className="small muted">
              {dayDone}/{dayActs.length} activités
            </span>
          </div>
          <ProgressBar value={dayActs.length ? dayDone / dayActs.length : 0} label="Activités du jour terminées" />
          <ul style={{ marginTop: 12, paddingLeft: 18 }}>
            {d?.objectives.map((o) => (
              <li key={o} className="small">
                {o}
              </li>
            ))}
          </ul>
          <Link to={`/parcours/jour/${day}`} className="btn sm">
            Voir les activités
          </Link>
        </div>

        <div className="card">
          <h2>À travailler</h2>
          <ul className="list">
            <li className="row between">
              <span>🧠 Mots à réviser maintenant</span>
              <Link to="/revision" className="btn sm">
                {due}
              </Link>
            </li>
            <li className="row between">
              <span>🛠️ Erreurs à corriger</span>
              <Link to="/revision?onglet=erreurs" className="btn sm">
                {mistakes.length}
              </Link>
            </li>
            <li>
              <div className="small muted">Notions fragiles (d’après vos réponses)</div>
              {weak.length ? (
                <div className="row" style={{ marginTop: 6 }}>
                  {weak.map((c) => (
                    <span key={c} className="badge warn">
                      {conceptLabel(c)}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="small">Aucune notion fragile détectée pour l’instant.</div>
              )}
            </li>
          </ul>
        </div>
      </div>

      <div className="grid grid-2" style={{ marginTop: 16 }}>
        <div className="card">
          <h2>Compétences travaillées</h2>
          {skills.length === 0 ? (
            <p className="muted small">Vos statistiques apparaîtront après vos premiers exercices.</p>
          ) : (
            skills.map((x) => (
              <div key={x.skill} style={{ marginBottom: 10 }}>
                <div className="row between small">
                  <span>{SKILL_LABELS[x.skill]}</span>
                  <span className="muted">
                    {Math.round((x.accuracy ?? 0) * 100)} % · {x.attempts} réponses
                  </span>
                </div>
                <ProgressBar value={x.accuracy ?? 0} label={SKILL_LABELS[x.skill]} />
              </div>
            ))
          )}
        </div>
        <div className="card">
          <h2>Progression globale</h2>
          <div className="grid grid-2">
            <Stat value={vc.mastered} label="mots maîtrisés" hint="Au moins 3 réussites consécutives et un intervalle de révision ≥ 7 jours" />
            <Stat value={vc.learning + vc.fragile} label="mots en cours / fragiles" />
            <Stat value={placement ? `${levelFor(placement.overall).code}` : '—'} label="niveau de départ estimé" />
            <Stat value={Object.keys(s.badges).length} label="badges obtenus" />
          </div>
          <Link to="/stats" className="btn sm" style={{ marginTop: 12 }}>
            Statistiques détaillées
          </Link>
        </div>
      </div>
    </div>
  );
}
