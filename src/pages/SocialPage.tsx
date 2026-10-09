import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { CHALLENGE_TEMPLATES, challengeProgress, createChallenge, METRIC_LABELS } from '../core/challenges';
import { currentStreak, isDayDone, vocabCounts } from '../core/progress';
import { appUrl, supabaseConfigured } from '../services/config';
import { createGroup, createGroupChallenge, groupChallenges, joinGroup, leaderboard, leaveGroup, myGroups, type Group, type GroupChallenge, type LeaderboardRow } from '../services/social';
import { PageHead, ProgressBar, toast, useOnline } from '../components/ui';
import { useAccount } from '../state/account';
import { update, useLearner } from '../state/store';

async function shareText(text: string) {
  try {
    if (navigator.share) {
      await navigator.share({ text });
      return;
    }
    await navigator.clipboard.writeText(text);
    toast('Texte copié dans le presse-papiers.');
  } catch {
    /* partage annulé */
  }
}

export default function SocialPage() {
  const account = useAccount();
  const online = useOnline();
  return (
    <div>
      <PageHead eyebrow="Espace social" title="Apprendre à plusieurs">
        <p>Défis, groupes et classements entre amis. Votre progression reste personnelle, et vos données sont privées par défaut : vous choisissez ce que vos amis peuvent voir.</p>
      </PageHead>
      {!supabaseConfigured() ? (
        <div className="notice info" style={{ marginBottom: 16 }}>
          <strong>Mode local.</strong> Les groupes et classements partagés nécessitent un serveur (Supabase, offre gratuite) que le propriétaire de cette installation doit configurer — voir le README, section « Activer les comptes et l’espace social ». En attendant, vous pouvez utiliser les défis personnels et partager vos réussites.
        </div>
      ) : !account.user ? (
        <div className="notice info" style={{ marginBottom: 16 }}>
          Connectez-vous pour rejoindre ou créer un groupe. <Link to="/parametres#compte">Se connecter ou créer un compte →</Link>
        </div>
      ) : !online ? (
        <div className="notice warn" style={{ marginBottom: 16 }}>
          Hors ligne : les groupes et classements seront disponibles au retour de la connexion.
        </div>
      ) : (
        <Groups />
      )}
      <PersonalChallenges />
      <ShareCard />
    </div>
  );
}

function PersonalChallenges() {
  const s = useLearner();
  const now = new Date();
  const active = s.challenges.filter((c) => new Date(c.endsAt) > now);
  const past = s.challenges.filter((c) => new Date(c.endsAt) <= now).slice(-5);
  return (
    <div className="card">
      <h2>Défis personnels</h2>
      <p className="small muted">Mesurés sur vos statistiques réelles (fonctionne sans compte et hors ligne).</p>
      {active.map((c) => {
        const p = challengeProgress(s, c);
        return (
          <div key={c.id} style={{ marginBottom: 14 }}>
            <div className="row between small">
              <strong>{c.title}</strong>
              <span>
                {Math.min(p, c.target)} / {c.target} {METRIC_LABELS[c.metric]} · fin le {new Date(c.endsAt).toLocaleDateString('fr-FR')}
              </span>
            </div>
            <ProgressBar value={p / c.target} label={c.title} />
            {p >= c.target && <span className="badge good">🎉 Défi réussi !</span>}
          </div>
        );
      })}
      <div className="row">
        {CHALLENGE_TEMPLATES.filter((t) => !active.some((a) => a.title === t.title)).map((t) => (
          <button key={t.title} type="button" className="btn sm" onClick={() => update((st, n) => ({ ...st, challenges: [...st.challenges, createChallenge(t, n)] }))}>
            + {t.title}
          </button>
        ))}
      </div>
      {past.length > 0 && (
        <details style={{ marginTop: 12 }}>
          <summary className="small muted">Défis terminés</summary>
          <ul className="small">
            {past.map((c) => (
              <li key={c.id}>
                {c.title} : {challengeProgress(s, c) >= c.target ? '✅ réussi' : `${challengeProgress(s, c)}/${c.target}`}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function ShareCard() {
  const s = useLearner();
  const now = new Date();
  let days = 0;
  for (let d = 1; d <= 24; d++) if (isDayDone(s, d)) days++;
  const summary = `J’apprends l’anglais avec LÉON ACADÉMIE : ${days} jour(s) validé(s), ${vocabCounts(s).mastered} mots maîtrisés, série de ${currentStreak(s, now)} jour(s) 🔥`;
  return (
    <div className="card">
      <h2>Inviter et partager</h2>
      <p className="small muted">Rien n’est publié automatiquement : vous choisissez ce que vous partagez et avec qui.</p>
      <div className="notice" style={{ marginBottom: 10 }}>{summary}</div>
      <div className="row">
        <button type="button" className="btn sm" onClick={() => void shareText(summary)}>
          Partager mes progrès
        </button>
        <button type="button" className="btn sm" onClick={() => void shareText(`Viens apprendre l’anglais avec moi sur LÉON ACADÉMIE (gratuit) : ${appUrl()}`)}>
          Inviter un ami
        </button>
      </div>
    </div>
  );
}

function Groups() {
  const s = useLearner();
  const [params, setParams] = useSearchParams();
  const [groups, setGroups] = useState<Group[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState(params.get('rejoindre') ?? '');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const g = await myGroups();
      setGroups(g);
      setSelected((cur) => cur ?? g[0]?.id ?? null);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void refresh();
  }, [refresh]);

  const privacy = s.settings.privacy;
  return (
    <div className="card">
      <h2>Mes groupes</h2>
      {!privacy.shareProgress && !privacy.shareStreak && !privacy.shareBadges && (
        <div className="notice warn small" style={{ marginBottom: 10 }}>
          Vous ne partagez actuellement aucune statistique : vos amis voient seulement votre pseudo. <Link to="/parametres#confidentialite">Choisir ce que je partage</Link>
        </div>
      )}
      {error && <div className="notice bad small">{error}</div>}
      {loading ? (
        <p className="muted">Chargement…</p>
      ) : (
        <>
          {groups.length > 0 && (
            <div className="row" style={{ marginBottom: 12 }}>
              {groups.map((g) => (
                <button key={g.id} type="button" className={`btn sm ${selected === g.id ? 'primary' : ''}`} onClick={() => setSelected(g.id)}>
                  {g.name}
                </button>
              ))}
            </div>
          )}
          {selected && groups.find((g) => g.id === selected) && <GroupDetail group={groups.find((g) => g.id === selected)!} onLeft={() => { setSelected(null); void refresh(); }} />}
          <div className="grid grid-2" style={{ marginTop: 16 }}>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!name.trim()) return;
                try {
                  const g = await createGroup(name.trim());
                  setName('');
                  setSelected(g.id);
                  await refresh();
                  toast(`Groupe créé. Code d’invitation : ${g.invite_code}`);
                } catch (err) {
                  setError(err instanceof Error ? err.message : 'Erreur');
                }
              }}
            >
              <label className="field">
                <span>Créer un groupe</span>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="ex. : Les anglophiles du jeudi" />
              </label>
              <button className="btn sm" type="submit" disabled={!name.trim()}>
                Créer
              </button>
            </form>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!code.trim()) return;
                try {
                  const g = await joinGroup(code);
                  setCode('');
                  setParams({});
                  setSelected(g.id);
                  await refresh();
                  toast(`Vous avez rejoint « ${g.name} ».`);
                } catch (err) {
                  setError(err instanceof Error ? err.message : 'Erreur');
                }
              }}
            >
              <label className="field">
                <span>Rejoindre avec un code</span>
                <input type="text" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={12} placeholder="ex. : K7P2QX" />
              </label>
              <button className="btn sm" type="submit" disabled={!code.trim()}>
                Rejoindre
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}

const LB_METRICS: { key: keyof LeaderboardRow; label: string }[] = [
  { key: 'xp_week', label: 'XP (7 jours)' },
  { key: 'streak', label: 'Série' },
  { key: 'days_completed', label: 'Jours validés' },
  { key: 'words_mastered', label: 'Mots maîtrisés' },
];

function GroupDetail({ group, onLeft }: { group: Group; onLeft: () => void }) {
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [challenges, setChallenges] = useState<GroupChallenge[]>([]);
  const [metric, setMetric] = useState<keyof LeaderboardRow>('xp_week');
  const [error, setError] = useState('');
  useEffect(() => {
    let alive = true;
    Promise.all([leaderboard(group.id), groupChallenges(group.id)])
      .then(([r, c]) => {
        if (!alive) return;
        setRows(r);
        setChallenges(c);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Erreur'));
    return () => {
      alive = false;
    };
  }, [group.id]);
  const sorted = [...rows].sort((a, b) => ((b[metric] as number | null) ?? -1) - ((a[metric] as number | null) ?? -1));
  const invite = `${appUrl()}#/social?rejoindre=${group.invite_code}`;
  return (
    <div className="card" style={{ boxShadow: 'none' }}>
      <div className="row between">
        <h3 style={{ margin: 0 }}>{group.name}</h3>
        <div className="row">
          <span className="badge">Code : {group.invite_code}</span>
          <button type="button" className="btn sm" onClick={() => void shareText(`Rejoins mon groupe « ${group.name} » sur LÉON ACADÉMIE : ${invite} (code ${group.invite_code})`)}>
            Inviter
          </button>
          <button
            type="button"
            className="btn sm danger"
            onClick={async () => {
              if (!confirm(`Quitter le groupe « ${group.name} » ?`)) return;
              await leaveGroup(group.id);
              onLeft();
            }}
          >
            Quitter
          </button>
        </div>
      </div>
      {error && <div className="notice bad small">{error}</div>}
      <div className="row" style={{ margin: '12px 0' }}>
        {LB_METRICS.map((m) => (
          <button key={m.key} type="button" className={`btn sm ${metric === m.key ? 'primary' : 'ghost'}`} onClick={() => setMetric(m.key)}>
            {m.label}
          </button>
        ))}
      </div>
      <div className="table-wrap"><table className="data">
        <thead>
          <tr>
            <th>#</th>
            <th>Membre</th>
            {LB_METRICS.map((m) => (
              <th key={m.key} className="num">
                {m.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((r, i) => (
            <tr key={r.user_id} style={r.is_me ? { background: 'var(--accent-soft)' } : undefined}>
              <td>{(r[metric] as number | null) === null ? '—' : i + 1}</td>
              <td>
                {r.display_name}
                {r.is_me && ' (vous)'}
              </td>
              {LB_METRICS.map((m) => (
                <td key={m.key} className="num">
                  {(r[m.key] as number | null) ?? <span className="muted" title="Non partagé">🔒</span>}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table></div>
      <p className="tiny muted">🔒 = statistique non partagée par ce membre. Les classements proviennent des progrès enregistrés par chaque membre.</p>
      <h3 style={{ marginTop: 16 }}>Défis du groupe</h3>
      {challenges.length === 0 && <p className="small muted">Aucun défi pour l’instant.</p>}
      {challenges.map((c) => {
        const reached = rows.filter((r) => ((r[c.metric] as number | null) ?? 0) >= c.target).length;
        return (
          <div key={c.id} className="small" style={{ marginBottom: 8 }}>
            <strong>{c.title}</strong> — objectif {c.target} ({LB_METRICS.find((m) => m.key === c.metric)?.label}) · {reached} membre(s) l’ont atteint · fin le {new Date(c.ends_at).toLocaleDateString('fr-FR')}
          </div>
        );
      })}
      <div className="row">
        {[
          { title: '500 XP cette semaine', metric: 'xp_week' as const, target: 500 },
          { title: 'Série de 7 jours', metric: 'streak' as const, target: 7 },
          { title: '50 mots maîtrisés', metric: 'words_mastered' as const, target: 50 },
        ].map((t) => (
          <button
            key={t.title}
            type="button"
            className="btn sm"
            onClick={async () => {
              try {
                await createGroupChallenge({ group_id: group.id, title: t.title, metric: t.metric, target: t.target, ends_at: new Date(Date.now() + 7 * 86_400_000).toISOString() });
                setChallenges(await groupChallenges(group.id));
              } catch (e) {
                setError(e instanceof Error ? e.message : 'Erreur');
              }
            }}
          >
            + {t.title}
          </button>
        ))}
      </div>
    </div>
  );
}
