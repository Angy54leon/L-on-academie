import { useState } from 'react';
import { SKILLS, SKILL_LABELS, conceptLabel } from '../content';
import { BADGES } from '../core/rewards';
import { bestStreak, conceptMastery, currentStreak, lastNDays, skillStats, totalSeconds, vocabCounts } from '../core/progress';
import { CompareBars, HBarChart, StackedBar, VBarChart } from '../components/charts';
import { formatMinutes, PageHead, Segmented, Stat } from '../components/ui';
import { useLearner } from '../state/store';

type Metric = 'xp' | 'minutes' | 'correct';

export default function StatsPage() {
  const s = useLearner();
  const now = new Date();
  const [metric, setMetric] = useState<Metric>('xp');
  const [range, setRange] = useState<'14' | '30'>('14');
  const days = lastNDays(s, now, Number(range));
  const vc = vocabCounts(s);
  const skills = skillStats(s);
  const concepts = conceptMastery(s).sort((a, b) => a.ewma - b.ewma);
  const answered = s.attempts.filter((a) => a.source !== 'assessment' && a.outcome !== 'skipped');
  const accuracy = answered.length ? Math.round((100 * answered.filter((a) => a.correct).length) / answered.length) : null;
  const doneActivities = Object.values(s.activities).filter((a) => a.status === 'done').length;
  const assessments = ['placement', 'final', 'extension']
    .map((k) => [...s.assessments].reverse().find((a) => a.kind === k))
    .filter((a): a is NonNullable<typeof a> => !!a);
  const assessLabels: Record<string, string> = { placement: 'Positionnement', final: 'Finale (J14)', extension: 'Complémentaire (J24)' };
  const seriesColors = ['var(--series-1)', 'var(--series-2)', 'var(--series-3)'];

  const chartData = days.map((d) => ({
    label: d.date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'numeric' }),
    title: d.date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }),
    value: metric === 'xp' ? d.stats.xp : metric === 'minutes' ? Math.round(d.stats.seconds / 60) : d.stats.itemsCorrect,
  }));

  return (
    <div>
      <PageHead eyebrow="Statistiques" title="Vos progrès réels">
        <p>Toutes ces données proviennent de vos réponses enregistrées sur cet appareil{s.meta.lastSyncedAt ? ' et synchronisées avec votre compte' : ''}.</p>
      </PageHead>

      <div className="grid grid-4">
        <div className="card">
          <Stat value={s.xp} label="XP au total" hint="Gagnés uniquement en réussissant des exercices" />
        </div>
        <div className="card">
          <Stat value={`${currentStreak(s, now)} j`} label={`série actuelle · record ${bestStreak(s)} j`} />
        </div>
        <div className="card">
          <Stat value={formatMinutes(totalSeconds(s))} label="temps d’étude actif" />
        </div>
        <div className="card">
          <Stat value={accuracy === null ? '—' : `${accuracy} %`} label={`réussite sur ${answered.length} réponses`} />
        </div>
      </div>

      <div className="card">
        <div className="row between" style={{ marginBottom: 10 }}>
          <h2 style={{ margin: 0 }}>Activité quotidienne</h2>
          <div className="row">
            <Segmented<Metric>
              label="Indicateur"
              value={metric}
              onChange={setMetric}
              options={[
                { value: 'xp', label: 'XP' },
                { value: 'minutes', label: 'Minutes' },
                { value: 'correct', label: 'Bonnes réponses' },
              ]}
            />
            <Segmented<'14' | '30'>
              label="Période"
              value={range}
              onChange={setRange}
              options={[
                { value: '14', label: '14 j' },
                { value: '30', label: '30 j' },
              ]}
            />
          </div>
        </div>
        <VBarChart data={chartData} unit={metric === 'xp' ? 'XP' : metric === 'minutes' ? 'min' : 'bonnes réponses'} ariaLabel={`Histogramme : ${metric} par jour sur ${range} jours`} />
      </div>

      <div className="grid grid-2" style={{ marginTop: 16 }}>
        <div className="card">
          <h2>Précision par compétence</h2>
          <p className="small muted">Sur vos 200 dernières réponses par compétence (hors évaluations).</p>
          <HBarChart
            ariaLabel="Précision par compétence"
            data={skills.map((x) => ({ label: `${SKILL_LABELS[x.skill]} (${x.attempts})`, value: x.accuracy === null ? null : Math.round(x.accuracy * 100) }))}
          />
        </div>
        <div className="card">
          <h2>Vocabulaire</h2>
          <p className="small muted">Mots rencontrés dans le parcours, selon la répétition espacée.</p>
          <StackedBar
            ariaLabel="Répartition du vocabulaire par statut"
            segments={[
              { label: 'Nouveaux', value: vc.new, color: 'var(--series-1)' },
              { label: 'En cours', value: vc.learning, color: 'var(--series-2)' },
              { label: 'Fragiles', value: vc.fragile, color: 'var(--series-3)' },
              { label: 'Maîtrisés', value: vc.mastered, color: 'var(--series-4)' },
            ]}
          />
          <p className="small muted" style={{ marginTop: 10 }}>
            Activités terminées : <strong>{doneActivities}</strong>
          </p>
        </div>
      </div>

      {assessments.length > 0 && (
        <div className="card">
          <h2>Évaluations</h2>
          <p className="small muted">Scores estimés sur 100 par compétence (estimation pédagogique).</p>
          <CompareBars
            ariaLabel="Comparaison des évaluations par compétence"
            series={assessments.map((a, i) => ({ label: `${assessLabels[a.kind]} — ${a.overall}/100`, color: seriesColors[i] }))}
            rows={SKILLS.map((sk) => ({ label: SKILL_LABELS[sk], values: assessments.map((a) => a.skillScores[sk] ?? null) }))}
          />
        </div>
      )}

      <div className="card">
        <h2>Maîtrise des notions</h2>
        {concepts.length === 0 ? (
          <p className="muted small">Faites quelques exercices pour voir apparaître vos notions.</p>
        ) : (
          <div className="table-wrap"><table className="data">
            <thead>
              <tr>
                <th>Notion</th>
                <th>Statut</th>
                <th className="num">Maîtrise</th>
                <th className="num">Réponses</th>
              </tr>
            </thead>
            <tbody>
              {concepts.map((c) => (
                <tr key={c.concept}>
                  <td>{conceptLabel(c.concept)}</td>
                  <td>
                    <span className={`badge ${c.status === 'strong' ? 'good' : c.status === 'weak' ? 'warn' : ''}`}>{c.status === 'strong' ? '✓ Solide' : c.status === 'weak' ? '⚠ Fragile' : '… En cours'}</span>
                  </td>
                  <td className="num">{Math.round(c.ewma * 100)} %</td>
                  <td className="num">{c.attempts}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </div>

      <div className="card">
        <h2>Badges</h2>
        <div className="grid grid-4">
          {BADGES.map((b) => {
            const earned = s.badges[b.id];
            return (
              <div key={b.id} className="word-card" style={{ opacity: earned ? 1 : 0.5 }} title={b.description}>
                <div style={{ fontSize: '1.6rem' }} aria-hidden>
                  {earned ? b.icon : '🔒'}
                </div>
                <strong>{b.title}</strong>
                <div className="tiny muted">{b.description}</div>
                {earned && <div className="tiny">Obtenu le {new Date(earned).toLocaleDateString('fr-FR')}</div>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
