import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { getItem, getWord, VOCAB, conceptLabel, recallItem } from '../content';
import { checkAnswer } from '../core/answerCheck';
import { introduceWords, reviewVocab } from '../core/learner';
import { introducedWordIds, dueCards, openMistakes } from '../core/progress';
import { cardStatus, gradeFromOutcome, newCard, reviewCard, STATUS_LABELS, type CardStatus, type Grade } from '../core/srs';
import { normalizeFrench } from '../core/normalize';
import { WordCard } from '../components/ContentViews';
import { Feedback } from '../components/ExerciseView';
import { useStudyTimer } from '../components/useStudyTimer';
import { Listen, PageHead, relativeDue, Segmented } from '../components/ui';
import { update, useLearner } from '../state/store';

type Tab = 'reviser' | 'fiches' | 'erreurs' | 'sessions';

export function ReviewPage() {
  const [params, setParams] = useSearchParams();
  const tab = (params.get('onglet') as Tab) || 'reviser';
  const setTab = (t: Tab) => setParams({ onglet: t });
  const s = useLearner();
  const due = dueCards(s, new Date(), 200).length;
  const mistakes = openMistakes(s).length;
  return (
    <div>
      <PageHead eyebrow="Révision" title="Mémoriser durablement">
        <p>Répétition espacée : les mots oubliés reviennent vite, les mots bien connus s’espacent. Un mot n’est « maîtrisé » qu’après au moins 3 réussites consécutives espacées d’une semaine.</p>
      </PageHead>
      <Segmented<Tab>
        label="Onglets de révision"
        value={tab}
        onChange={setTab}
        options={[
          { value: 'reviser', label: `Réviser (${due})` },
          { value: 'fiches', label: 'Mes fiches' },
          { value: 'erreurs', label: `Erreurs (${mistakes})` },
          { value: 'sessions', label: 'Sessions' },
        ]}
      />
      <div style={{ marginTop: 16 }}>
        {tab === 'reviser' && <ReviewSession />}
        {tab === 'fiches' && <WordBrowser />}
        {tab === 'erreurs' && <MistakesList />}
        {tab === 'sessions' && <Sessions />}
      </div>
    </div>
  );
}

const GRADES: { g: Grade; label: string }[] = [
  { g: 0, label: 'À revoir' },
  { g: 1, label: 'Difficile' },
  { g: 2, label: 'Bien' },
  { g: 3, label: 'Facile' },
];

function intervalLabel(days: number): string {
  if (days < 1) return days === 0 ? '10 min' : '6 h';
  if (days < 30) return `${Math.round(days)} j`;
  return `${Math.round(days / 30)} mois`;
}

/** Session de révision : cartes dues, ou sélection personnalisée. */
function ReviewSession({ selection, onDone }: { selection?: string[]; onDone?: () => void }) {
  const s = useLearner();
  const [queue] = useState<string[]>(() => (selection ?? dueCards(s, new Date(), 40).map((c) => c.id)).filter((id) => getWord(id)));
  const [pos, setPos] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [mode, setMode] = useState<'cartes' | 'saisie'>('cartes');
  const [reverse, setReverse] = useState(false);
  const [typed, setTyped] = useState('');
  const [typedResult, setTypedResult] = useState<ReturnType<typeof checkAnswer> | null>(null);
  useStudyTimer(true);

  if (!queue.length) {
    const nextDue = Object.values(s.vocab).sort((a, b) => a.due.localeCompare(b.due))[0];
    return (
      <div className="card center">
        <h2>🎉 Aucun mot à réviser maintenant</h2>
        <p className="muted">{nextDue ? `Prochaine révision ${relativeDue(nextDue.due)}.` : 'Commencez une activité de vocabulaire du parcours pour remplir votre file de révision.'}</p>
        <div className="row" style={{ justifyContent: 'center' }}>
          <Link to="/revision?onglet=fiches" className="btn">
            Réviser une sélection de mots
          </Link>
          <Link to="/activite/express" className="btn primary">
            Session express
          </Link>
        </div>
      </div>
    );
  }
  if (pos >= queue.length) {
    return (
      <div className="card center">
        <h2>✅ Session terminée</h2>
        <p className="muted">{queue.length} mot(s) révisé(s). Vos prochaines révisions sont planifiées automatiquement.</p>
        {onDone && (
          <button type="button" className="btn primary" onClick={onDone}>
            Retour
          </button>
        )}
      </div>
    );
  }
  const id = queue[pos];
  const w = getWord(id)!;
  const card = s.vocab[id] ?? newCard(id, new Date());
  const advance = () => {
    setPos(pos + 1);
    setRevealed(false);
    setTyped('');
    setTypedResult(null);
  };
  const grade = (g: Grade) => {
    update((st, now) => reviewVocab(introduceWords(st, [id], now), id, g, now));
    advance();
  };
  const recall = recallItem(w);

  return (
    <div className="exercise">
      <div className="row between" style={{ marginBottom: 10 }}>
        <span className="small muted">
          {pos + 1} / {queue.length} · {STATUS_LABELS[cardStatus(s.vocab[id])]}
        </span>
        <div className="row">
          <Segmented
            label="Mode de révision"
            value={mode}
            onChange={(m) => {
              setMode(m);
              setRevealed(false);
              setTypedResult(null);
            }}
            options={[
              { value: 'cartes', label: 'Cartes' },
              { value: 'saisie', label: 'Saisie' },
            ]}
          />
          {mode === 'cartes' && (
            <button type="button" className="btn ghost sm" onClick={() => setReverse(!reverse)} aria-pressed={reverse}>
              {reverse ? 'FR → EN' : 'EN → FR'}
            </button>
          )}
        </div>
      </div>

      {mode === 'cartes' ? (
        <div className="card flashcard">
          <div className="front">{reverse ? w.fr : w.en}</div>
          {!reverse && <div className="pron" style={{ fontFamily: 'monospace', color: 'var(--text-3)' }}>{w.pron}</div>}
          {!reverse && (
            <div style={{ marginTop: 8 }}>
              <Listen text={w.en} />
            </div>
          )}
          {revealed ? (
            <div style={{ marginTop: 16, animation: 'rise .25s ease' }}>
              <div style={{ fontSize: '1.3rem', fontWeight: 700 }}>{reverse ? w.en : w.fr}</div>
              {reverse && <Listen text={w.en} compact />}
              <p style={{ marginTop: 10 }}>
                <em>{w.example}</em>
                <br />
                <span className="muted small">{w.exampleFr}</span>
              </p>
              <p className="small muted">{w.context}</p>
            </div>
          ) : (
            <button type="button" className="btn primary" style={{ marginTop: 18 }} onClick={() => setRevealed(true)}>
              Afficher la réponse
            </button>
          )}
          {revealed && (
            <div className="grade-buttons" style={{ width: '100%' }}>
              {GRADES.map(({ g, label }) => (
                <button key={g} type="button" className="btn" onClick={() => grade(g)}>
                  {label}
                  <small>{intervalLabel(reviewCard(card, g, new Date()).interval)}</small>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="card">
          {recall.type === 'gap' ? (
            <>
              <div className="ex-instruction">Complétez avec le mot ou l’expression qui signifie « {w.fr} ».</div>
              <div className="gap-sentence">{recall.sentence.replace('___', '_____')}</div>
              <div className="ex-sub">{w.exampleFr}</div>
            </>
          ) : (
            <>
              <div className="ex-instruction">Traduisez en anglais :</div>
              <div className="ex-prompt">« {w.fr} »</div>
            </>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!typed.trim() || typedResult) return;
              const r = checkAnswer(recall, { kind: 'text', value: typed });
              setTypedResult(r);
            }}
          >
            <div className="row" style={{ flexWrap: 'nowrap' }}>
              <input type="text" value={typed} onChange={(e) => setTyped(e.target.value)} disabled={!!typedResult} aria-label="Votre réponse" autoFocus autoComplete="off" spellCheck={false} />
              {!typedResult && (
                <button className="btn primary" type="submit" disabled={!typed.trim()}>
                  Valider
                </button>
              )}
            </div>
          </form>
          {typedResult && (
            <>
              <Feedback item={recall} result={typedResult} />
              <div className="ex-actions">
                <button type="button" className="btn primary" autoFocus onClick={() => grade(gradeFromOutcome(typedResult.outcome))}>
                  Continuer →
                </button>
              </div>
            </>
          )}
        </div>
      )}
      {onDone && (
        <button type="button" className="btn ghost sm" style={{ marginTop: 10 }} onClick={onDone}>
          Arrêter la session
        </button>
      )}
    </div>
  );
}

function WordBrowser() {
  const s = useLearner();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<'all' | CardStatus>('all');
  const [scope, setScope] = useState<'mine' | 'all'>('mine');
  const [selected, setSelected] = useState<string[]>([]);
  const [reviewing, setReviewing] = useState<string[] | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const introduced = useMemo(() => new Set(introducedWordIds(s)), [s]);

  if (reviewing) return <ReviewSession selection={reviewing} onDone={() => setReviewing(null)} />;

  const nq = normalizeFrench(q);
  const words = VOCAB.filter((w) => (scope === 'all' || introduced.has(w.id)) && (status === 'all' || cardStatus(s.vocab[w.id]) === status) && (!nq || normalizeFrench(`${w.en} ${w.fr}`).includes(nq)));
  const toggle = (id: string) => setSelected(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);

  return (
    <div>
      <div className="card">
        <div className="grid grid-2">
          <label className="field" style={{ margin: 0 }}>
            <span>Rechercher (anglais ou français)</span>
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="ex. : se débrouiller, get by…" />
          </label>
          <div>
            <div className="small" style={{ fontWeight: 600, marginBottom: 6 }}>
              Filtres
            </div>
            <div className="row">
              <select value={status} onChange={(e) => setStatus(e.target.value as 'all' | CardStatus)} style={{ width: 'auto' }} aria-label="Statut">
                <option value="all">Tous les statuts</option>
                {(Object.keys(STATUS_LABELS) as CardStatus[]).map((k) => (
                  <option key={k} value={k}>
                    {STATUS_LABELS[k]}
                  </option>
                ))}
              </select>
              <select value={scope} onChange={(e) => setScope(e.target.value as 'mine' | 'all')} style={{ width: 'auto' }} aria-label="Portée">
                <option value="mine">Mots déjà rencontrés</option>
                <option value="all">Tout le vocabulaire ({VOCAB.length})</option>
              </select>
            </div>
          </div>
        </div>
        <div className="row between" style={{ marginTop: 12 }}>
          <span className="small muted">
            {words.length} fiche(s) · {selected.length} sélectionnée(s)
          </span>
          <div className="row">
            <button type="button" className="btn sm ghost" onClick={() => setSelected(words.slice(0, 50).map((w) => w.id))} disabled={!words.length}>
              Tout sélectionner (max 50)
            </button>
            <button type="button" className="btn sm primary" disabled={!selected.length} onClick={() => setReviewing(selected)}>
              Réviser la sélection
            </button>
          </div>
        </div>
      </div>
      {words.length === 0 && <p className="muted" style={{ marginTop: 16 }}>Aucune fiche. {scope === 'mine' && 'Les mots apparaissent ici dès que vous commencez une activité de vocabulaire.'}</p>}
      <ul className="list" style={{ marginTop: 8 }}>
        {words.slice(0, 200).map((w) => {
          const c = s.vocab[w.id];
          const st = cardStatus(c);
          return (
            <li key={w.id}>
              <div className="row" style={{ flexWrap: 'nowrap' }}>
                <input type="checkbox" checked={selected.includes(w.id)} onChange={() => toggle(w.id)} aria-label={`Sélectionner ${w.en}`} style={{ width: 18, height: 18, accentColor: 'var(--accent)' }} />
                <button type="button" className="btn ghost" style={{ flex: 1, justifyContent: 'flex-start', textAlign: 'left', borderRadius: 10 }} onClick={() => setOpen(open === w.id ? null : w.id)} aria-expanded={open === w.id}>
                  <span>
                    <strong>{w.en}</strong> <span className="muted">— {w.fr}</span>
                  </span>
                </button>
                <span className={`badge ${st === 'mastered' ? 'good' : st === 'fragile' ? 'warn' : ''}`}>{STATUS_LABELS[st]}</span>
                <span className="small muted" style={{ minWidth: 80, textAlign: 'right' }}>
                  {c && c.reps > 0 ? relativeDue(c.due) : `jour ${w.day}`}
                </span>
              </div>
              {open === w.id && (
                <div style={{ marginTop: 10 }}>
                  <WordCard id={w.id} />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function MistakesList() {
  const s = useLearner();
  const list = openMistakes(s);
  const resolved = Object.values(s.mistakes).filter((m) => m.resolvedAt).length;
  return (
    <div>
      <div className="card row between">
        <div>
          <h2 style={{ margin: 0 }}>{list.length} erreur(s) à corriger</h2>
          <p className="small muted" style={{ margin: 0 }}>
            Une erreur est résolue après deux bonnes réponses consécutives. {resolved} erreur(s) déjà résolue(s).
          </p>
        </div>
        <Link to="/activite/mistakes" className={`btn primary ${list.length ? '' : 'disabled'}`} aria-disabled={!list.length} onClick={(e) => !list.length && e.preventDefault()}>
          Corriger mes erreurs
        </Link>
      </div>
      <ul className="list" style={{ marginTop: 8 }}>
        {list.slice(0, 60).map((m) => {
          const it = getItem(m.itemId);
          if (!it) return null;
          const prompt =
            it.type === 'mcq' ? it.prompt : it.type === 'listen' ? it.question : it.type === 'gap' || it.type === 'conjugate' ? it.sentence : it.type === 'translate' ? it.source : it.type === 'order' ? it.translation : it.type === 'dictation' ? 'Dictée' : '';
          return (
            <li key={m.itemId}>
              <div className="row between">
                <span className="badge">{conceptLabel(m.concept)}</span>
                <span className="tiny muted">
                  {m.wrongCount} erreur(s) · {m.correctStreak}/2 réussites
                </span>
              </div>
              <div style={{ marginTop: 6 }}>{prompt}</div>
              {m.lastAnswer && <div className="small muted">Votre dernière réponse : « {m.lastAnswer} »</div>}
            </li>
          );
        })}
      </ul>
      {!list.length && <p className="muted">Aucune erreur en attente. 👏</p>}
    </div>
  );
}

function Sessions() {
  return (
    <div className="grid grid-3">
      <div className="card">
        <h3>⚡ Session express</h3>
        <p className="small muted">≈ 15 minutes : mots à réviser, erreurs à corriger, notions fragiles.</p>
        <Link to="/activite/express" className="btn primary sm">
          Lancer
        </Link>
      </div>
      <div className="card">
        <h3>🎯 Révision ciblée</h3>
        <p className="small muted">Exercices choisis d’après vos notions les plus fragiles.</p>
        <Link to="/activite/targeted" className="btn sm">
          Lancer
        </Link>
      </div>
      <div className="card">
        <h3>📚 Session longue</h3>
        <p className="small muted">Enchaînez les activités du jour en cours.</p>
        <Link to="/parcours" className="btn sm">
          Voir le parcours
        </Link>
      </div>
    </div>
  );
}
