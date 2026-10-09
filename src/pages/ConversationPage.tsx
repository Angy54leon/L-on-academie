import { useEffect, useMemo, useRef, useState } from 'react';
import { SCENARIOS, conceptLabel, type Scenario } from '../content';
import { immersionLevel } from '../core/adaptive';
import { correctSentence, evaluateReply, reviewPrompts, usesWord, type ReviewPrompt } from '../core/localPartner';
import { recordConceptSignal, recordConversationTurn, reviewVocab, saveConversation } from '../core/learner';
import { lastAssessment, today, weakConcepts } from '../core/progress';
import { cardStatus } from '../core/srs';
import { normalizeAnswer, tokenize } from '../core/normalize';
import { randomId, type ConversationLog, type ConversationMessage } from '../core/state';
import { askTeacher, checkAi, type AiStatus } from '../services/ai';
import { speak, startRecognition, sttSupported, type RecognitionHandle } from '../services/speech';
import { getWord } from '../content';
import { useStudyTimer } from '../components/useStudyTimer';
import { Listen, PageHead, Segmented, useOnline } from '../components/ui';
import { getState, update, useLearner } from '../state/store';

type Mode = ConversationLog['mode'];
type Engine = 'ai' | 'local';

const MODES: { id: Mode; label: string; desc: string }[] = [
  { id: 'guided', label: 'Guidé', desc: 'On vous aide à construire chaque phrase (début de phrase et mots utiles).' },
  { id: 'conversation', label: 'Conversation', desc: 'Vous parlez librement ; les corrections arrivent après chaque réponse.' },
  { id: 'immersion', label: 'Immersion', desc: 'Tout en anglais. L’aide en français reste disponible sur demande.' },
  { id: 'correction', label: 'Correction', desc: 'Écrivez ou dites une phrase : vous recevez une correction détaillée.' },
  { id: 'situation', label: 'Situation réelle', desc: 'Jeu de rôle : café, hôtel, aéroport, entretien, médecin…' },
  { id: 'review', label: 'Révision', desc: 'Réutilisez les mots et notions que vous maîtrisez mal.' },
];

const TOPICS = ['Daily life', 'Hobbies and free time', 'Travel', 'Work and career', 'Plans and projects', 'Food and cooking', 'Films and series', 'Technology and society', 'Relationships and friends', 'Health and sport'];

function now() {
  return new Date().toISOString();
}

function scenariosFor(mode: Mode): Scenario[] {
  if (mode === 'situation') return SCENARIOS.filter((s) => s.kind === 'situation');
  if (mode === 'guided') return SCENARIOS.filter((s) => s.steps.some((st) => st.chips));
  return SCENARIOS.filter((s) => s.kind === 'topic');
}

export default function ConversationPage() {
  const state = useLearner();
  const online = useOnline();
  const [ai, setAi] = useState<AiStatus | null>(null);
  const [engine, setEngine] = useState<Engine>('local');
  const [mode, setMode] = useState<Mode>('conversation');
  const [scenarioId, setScenarioId] = useState<string>(scenariosFor('conversation')[0].id);
  const [topic, setTopic] = useState(TOPICS[0]);
  const [conv, setConv] = useState<ConversationLog | null>(null);
  const [step, setStep] = useState(0);
  const [tries, setTries] = useState(0);
  const [prompts, setPrompts] = useState<ReviewPrompt[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [showFrFor, setShowFrFor] = useState<Set<number>>(new Set());
  const [autoPlay, setAutoPlay] = useState(false);
  const [listening, setListening] = useState(false);
  const rec = useRef<RecognitionHandle | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  useStudyTimer(!!conv);
  const immersion = immersionLevel(state);
  const level = lastAssessment(state, 'placement')?.level ?? 'A2';

  useEffect(() => {
    void checkAi(true).then((s) => {
      setAi(s);
      if (s.available) setEngine('ai');
    });
  }, [online]);

  useEffect(() => endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }), [conv?.messages.length]);

  const scenario = useMemo(() => SCENARIOS.find((s) => s.id === scenarioId), [scenarioId]);
  const options = scenariosFor(mode);

  const persist = (c: ConversationLog) => {
    setConv(c);
    update((s) => saveConversation(s, c), { silent: false });
  };

  const addMessages = (c: ConversationLog, msgs: ConversationMessage[]): ConversationLog => ({ ...c, messages: [...c.messages, ...msgs], updatedAt: now() });

  const teacherSay = (msg: ConversationMessage) => {
    if (autoPlay && msg.role === 'teacher') speak(msg.text, { accent: state.settings.accent, voiceURI: state.settings.voiceURI, rate: state.settings.speechRate });
    return msg;
  };

  const startConversation = () => {
    setError('');
    setStep(0);
    setTries(0);
    const base: ConversationLog = {
      id: randomId('conv'),
      mode,
      source: engine,
      title: engine === 'ai' ? `${MODES.find((m) => m.id === mode)!.label} · ${mode === 'situation' ? scenario?.title : topic}` : `${MODES.find((m) => m.id === mode)!.label} · ${mode === 'correction' ? 'Correction' : mode === 'review' ? 'Révision' : scenario?.title}`,
      startedAt: now(),
      updatedAt: now(),
      scenarioId: mode === 'correction' || mode === 'review' ? undefined : scenarioId,
      messages: [],
    };
    let first: ConversationMessage[] = [];
    if (engine === 'ai') {
      const hint =
        mode === 'situation' && scenario
          ? `Jeu de rôle avec le professeur IA : ${scenario.setting} Il jouera « ${scenario.role} ». Écrivez votre première réplique (ex. : « ${scenario.steps[0].sample} »).`
          : mode === 'correction'
            ? 'Écrivez une phrase ou un court texte en anglais : le professeur IA le corrigera.'
            : mode === 'review'
              ? 'Le professeur IA va vous faire réutiliser vos mots fragiles. Écrivez « Hi! Let’s review. » pour commencer.'
              : `Sujet : ${topic}. Écrivez votre premier message en anglais pour lancer la conversation.`;
      first = [{ role: 'system', text: hint, at: now() }];
    } else if (mode === 'correction') {
      first = [{ role: 'system', text: 'Mode correction (correcteur local à règles) : écrivez une phrase en anglais. Le correcteur repère les erreurs fréquentes des francophones — pas toutes les erreurs.', at: now() }];
    } else if (mode === 'review') {
      const p = reviewPrompts(getState());
      setPrompts(p);
      first = [teacherSay({ role: 'teacher', text: p[0].prompt, fr: p[0].promptFr, at: now() })];
    } else if (scenario) {
      first = [
        { role: 'system', text: `Partenaire local (scénario préparé, pas une IA) — ${scenario.setting} Rôle : ${scenario.role}.`, at: now() },
        teacherSay({ role: 'teacher', text: scenario.steps[0].ai, fr: scenario.steps[0].fr, at: now() }),
      ];
    }
    persist(addMessages(base, first));
  };

  const recordTurn = (learnerText: string, usedAi: boolean, conceptsWrong: string[]) => {
    const words = tokenize(normalizeAnswer(learnerText)).length;
    update((s, n) => {
      let st = recordConversationTurn(s, n, usedAi, words);
      for (const c of conceptsWrong) st = recordConceptSignal(st, c, false, n);
      return st;
    });
  };

  const send = async () => {
    const content = text.trim();
    if (!content || !conv || busy) return;
    setText('');
    setError('');
    const learnerMsg: ConversationMessage = { role: 'learner', text: content, at: now() };
    let c = addMessages(conv, [learnerMsg]);

    if (conv.source === 'ai') {
      const todayCalls = today(getState(), new Date()).aiCalls;
      if (todayCalls >= getState().settings.aiDailyLimit) {
        setError(`Limite quotidienne d’échanges avec l’IA atteinte (${getState().settings.aiDailyLimit}). Vous pouvez la modifier dans les paramètres, ou continuer avec le partenaire local.`);
        setText(content);
        return;
      }
      persist(c);
      setBusy(true);
      try {
        const s = getState();
        const weakWords = Object.values(s.vocab)
          .filter((v) => cardStatus(v) === 'fragile' || cardStatus(v) === 'learning')
          .slice(0, 10)
          .map((v) => getWord(v.id)?.en)
          .filter((x): x is string => !!x);
        const r = await askTeacher({
          mode: conv.mode,
          level,
          immersion,
          topic: conv.mode === 'situation' ? undefined : topic,
          scenario: conv.mode === 'situation' && scenario ? `${scenario.role} — ${scenario.title}` : undefined,
          weakWords,
          weakConcepts: weakConcepts(s, 5).map(conceptLabel),
          messages: c.messages
            .filter((m) => m.role !== 'system')
            .slice(-14)
            .map((m) => ({ role: m.role === 'learner' ? ('user' as const) : ('assistant' as const), content: m.text })),
        });
        c = addMessages(c, [teacherSay({ role: 'teacher', text: r.reply, at: now(), corrections: r.corrections, betterVersion: r.betterVersion, tipFr: r.tipFr })]);
        persist(c);
        const local = correctSentence(content).issues.filter((i) => i.kind === 'error').map((i) => i.concept);
        recordTurn(content, true, local);
      } catch (e) {
        setError(`${e instanceof Error ? e.message : 'Erreur'} — vous pouvez réessayer ou passer au partenaire local.`);
      } finally {
        setBusy(false);
      }
      return;
    }

    // ------------------------------------------------ Partenaire local
    if (conv.mode === 'correction') {
      const r = correctSentence(content);
      c = addMessages(c, [
        {
          role: 'system',
          text: r.summary,
          at: now(),
          corrections: r.issues.map((i) => ({ original: i.match, corrected: i.suggestion, kind: i.kind, explanationFr: i.explanation })),
        },
      ]);
      persist(c);
      recordTurn(content, false, r.issues.filter((i) => i.kind === 'error').map((i) => i.concept));
      return;
    }

    if (conv.mode === 'review') {
      const idx = conv.messages.filter((m) => m.role === 'teacher').length - 1;
      const p = prompts[idx];
      const used = p ? usesWord(content, p.en) : false;
      const issues = correctSentence(content).issues;
      const errs = issues.filter((i) => i.kind === 'error');
      const ok = used && errs.length === 0 && tokenize(normalizeAnswer(content)).length >= 4;
      if (p) update((s, n) => reviewVocab(s, p.wordId, ok ? 2 : used ? 1 : 0, n));
      const fb: ConversationMessage = {
        role: 'system',
        at: now(),
        text: ok ? `✅ Bien ! Vous avez utilisé « ${p?.en} » correctement dans une phrase complète.` : used ? `Vous avez utilisé « ${p?.en} », mais vérifiez la phrase ci-dessous.` : `Le mot « ${p?.en} » (${p?.fr}) n’apparaît pas dans votre phrase. Exemple : ${getWord(p?.wordId ?? '')?.example ?? ''}`,
        corrections: issues.map((i) => ({ original: i.match, corrected: i.suggestion, kind: i.kind, explanationFr: i.explanation })),
      };
      const nextP = prompts[idx + 1];
      c = addMessages(c, nextP ? [fb, teacherSay({ role: 'teacher', text: nextP.prompt, fr: nextP.promptFr, at: now() })] : [fb, { role: 'system', text: 'Révision terminée ! Les mots travaillés ont été mis à jour dans votre répétition espacée.', at: now() }]);
      persist(c);
      recordTurn(content, false, errs.map((i) => i.concept));
      return;
    }

    if (!scenario) return;
    const st = scenario.steps[step];
    if (!st) return;
    const fb = evaluateReply(st, content);
    const feedbackMsg: ConversationMessage = {
      role: 'system',
      at: now(),
      text: fb.messages.join(' '),
      corrections: fb.issues.map((i) => ({ original: i.match, corrected: i.suggestion, kind: i.kind, explanationFr: i.explanation })),
      betterVersion: fb.ok ? undefined : `Exemple de réponse : ${st.sample}`,
    };
    const moveOn = fb.ok || tries >= 1;
    const out: ConversationMessage[] = [feedbackMsg];
    if (moveOn) {
      const next = scenario.steps[step + 1];
      if (next) out.push(teacherSay({ role: 'teacher', text: next.ai, fr: next.fr, at: now() }));
      else out.push(teacherSay({ role: 'teacher', text: scenario.closing, fr: scenario.closingFr, at: now() }));
      setStep(step + 1);
      setTries(0);
    } else {
      out.push({ role: 'system', text: 'Essayez de reformuler (ou utilisez l’aide), puis renvoyez votre réponse.', at: now() });
      setTries(tries + 1);
    }
    c = addMessages(c, out);
    persist(c);
    recordTurn(content, false, fb.issues.filter((i) => i.kind === 'error').map((i) => i.concept));
  };

  const mic = () => {
    if (listening) {
      rec.current?.stop();
      return;
    }
    setError('');
    setListening(true);
    rec.current = startRecognition(state.settings.accent, {
      onInterim: (t) => setText(t),
      onResult: (t) => {
        setText(t);
        setListening(false);
      },
      onError: (m) => {
        setError(m);
        setListening(false);
      },
      onEnd: () => setListening(false),
    });
    if (!rec.current) setListening(false);
  };

  const currentStep = conv && conv.source === 'local' && scenario && conv.scenarioId ? scenario.steps[step] : undefined;
  const finished = conv?.source === 'local' && conv.scenarioId && scenario && step >= scenario.steps.length;

  return (
    <div>
      <PageHead eyebrow="Salle de conversation" title="Parler avec Léon">
        <p>Pratiquez à l’écrit ou à l’oral. Les explications sont en français, la conversation en anglais.</p>
      </PageHead>

      <div className={`notice ${ai?.available ? 'good' : 'info'}`} style={{ marginBottom: 16 }}>
        {ai === null
          ? 'Vérification du professeur IA…'
          : ai.available
            ? '🤖 Professeur IA connecté. Ses réponses sont générées par un modèle d’IA et peuvent contenir des erreurs.'
            : `🧩 Mode gratuit : partenaire local (scénarios préparés et correcteur à règles — ce n’est pas une IA). ${ai.reason}`}
      </div>

      {!conv ? (
        <div className="card">
          {ai?.available && (
            <div style={{ marginBottom: 16 }}>
              <div className="small" style={{ fontWeight: 600, marginBottom: 6 }}>
                Interlocuteur
              </div>
              <Segmented<Engine>
                label="Interlocuteur"
                value={engine}
                onChange={setEngine}
                options={[
                  { value: 'ai', label: '🤖 Professeur IA' },
                  { value: 'local', label: '🧩 Partenaire local (hors ligne)' },
                ]}
              />
            </div>
          )}
          <div className="small" style={{ fontWeight: 600, marginBottom: 6 }}>
            Mode
          </div>
          <div className="choice-grid">
            {MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                className="choice"
                aria-pressed={mode === m.id}
                onClick={() => {
                  setMode(m.id);
                  const opts = scenariosFor(m.id);
                  if (opts.length) setScenarioId(opts[0].id);
                }}
              >
                <strong>{m.label}</strong>
                <div className="small muted">{m.desc}</div>
              </button>
            ))}
          </div>
          {mode !== 'correction' && mode !== 'review' && (engine === 'local' || mode === 'situation') && (
            <label className="field" style={{ marginTop: 16 }}>
              <span>{mode === 'situation' ? 'Situation' : 'Scénario'}</span>
              <select value={scenarioId} onChange={(e) => setScenarioId(e.target.value)}>
                {options.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.titleFr} ({s.title}) · niveau {s.level}
                  </option>
                ))}
              </select>
            </label>
          )}
          {engine === 'ai' && mode !== 'situation' && mode !== 'correction' && mode !== 'review' && (
            <label className="field" style={{ marginTop: 16 }}>
              <span>Sujet</span>
              <select value={topic} onChange={(e) => setTopic(e.target.value)}>
                {TOPICS.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </label>
          )}
          <button type="button" className="btn primary" style={{ marginTop: 12 }} onClick={startConversation}>
            Commencer la conversation →
          </button>
        </div>
      ) : (
        <div>
          <div className="row between" style={{ marginBottom: 12 }}>
            <span className="badge accent">
              {conv.source === 'ai' ? '🤖 Professeur IA' : '🧩 Partenaire local'} · {conv.title}
            </span>
            <div className="row">
              <label className="check small" style={{ padding: 0 }}>
                <input type="checkbox" checked={autoPlay} onChange={(e) => setAutoPlay(e.target.checked)} /> Lecture audio auto
              </label>
              <button type="button" className="btn sm" onClick={() => setConv(null)}>
                Nouvelle conversation
              </button>
            </div>
          </div>
          <div className="chat" aria-live="polite">
            {conv.messages.map((m, i) => (
              <div key={i} className={`msg ${m.role}`}>
                {m.role === 'teacher' ? (
                  <div className="row" style={{ gap: 8, flexWrap: 'nowrap', alignItems: 'flex-start' }}>
                    <span style={{ flex: 1 }}>{m.text}</span>
                    <Listen text={m.text} compact />
                  </div>
                ) : (
                  <span>{m.text}</span>
                )}
                {m.fr && (immersion <= 1 && conv.mode !== 'immersion' ? true : showFrFor.has(i)) && <div className="fr">{m.fr}</div>}
                {m.fr && !(immersion <= 1 && conv.mode !== 'immersion') && !showFrFor.has(i) && (
                  <button type="button" className="btn ghost sm" onClick={() => setShowFrFor(new Set([...showFrFor, i]))}>
                    Aide en français
                  </button>
                )}
                {m.corrections?.map((c, j) => (
                  <div key={j} className={`correction ${c.kind}`}>
                    <strong>{c.kind === 'error' ? 'Erreur' : 'Suggestion'}</strong> : « {c.original} » → « {c.corrected} »<div className="small">{c.explanationFr}</div>
                  </div>
                ))}
                {m.betterVersion && <div className="small" style={{ marginTop: 6 }}>💡 {m.role === 'teacher' ? 'Version plus naturelle de votre phrase : ' : ''}<em>{m.betterVersion}</em></div>}
                {m.tipFr && <div className="tip">{m.tipFr}</div>}
              </div>
            ))}
            {busy && <div className="msg teacher muted">Léon réfléchit…</div>}
            <div ref={endRef} />
          </div>

          {!finished && (
            <div className="composer">
              {currentStep && (conv.mode === 'guided' || showFrFor.has(-1)) && (
                <div className="card" style={{ marginBottom: 10, padding: 14, boxShadow: 'none' }}>
                  <div className="small">💡 {currentStep.hint}</div>
                  {currentStep.frame && <div className="small muted">Début de phrase : « {currentStep.frame} »</div>}
                  {currentStep.chips && (
                    <div className="chips" style={{ marginTop: 8 }}>
                      {currentStep.chips.map((ch) => (
                        <button key={ch} type="button" className="chip" onClick={() => setText((t) => (t ? `${t} ${ch}` : ch))}>
                          {ch}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {error && <div className="notice bad small" style={{ marginBottom: 8 }}>{error}</div>}
              <div className="row" style={{ flexWrap: 'nowrap', alignItems: 'flex-end' }}>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      void send();
                    }
                  }}
                  placeholder="Écrivez en anglais… (Entrée pour envoyer)"
                  rows={2}
                  style={{ minHeight: 56 }}
                  aria-label="Votre message"
                  maxLength={1200}
                />
                {sttSupported() && (
                  <button type="button" className={`btn icon ${listening ? 'recording' : ''}`} onClick={mic} aria-label={listening ? 'Arrêter le micro' : 'Dicter au micro'} title="Le micro est demandé à ce moment-là. Dans Chrome, la transcription passe par un service de Google.">
                    {listening ? '⏹' : '🎙️'}
                  </button>
                )}
                <button type="button" className="btn primary" onClick={() => void send()} disabled={!text.trim() || busy}>
                  Envoyer
                </button>
              </div>
              {currentStep && conv.mode !== 'guided' && (
                <div className="row" style={{ marginTop: 6 }}>
                  <button type="button" className="btn ghost sm" onClick={() => setShowFrFor(new Set([...showFrFor, -1]))}>
                    Aide pour répondre
                  </button>
                  <button type="button" className="btn ghost sm" onClick={() => setText(currentStep.sample)}>
                    Voir un exemple
                  </button>
                </div>
              )}
            </div>
          )}
          {finished && (
            <div className="row" style={{ marginTop: 16 }}>
              <button type="button" className="btn primary" onClick={startConversation}>
                Recommencer ce scénario
              </button>
              <button type="button" className="btn" onClick={() => setConv(null)}>
                Choisir un autre scénario
              </button>
            </div>
          )}
        </div>
      )}

      {!conv && state.conversations.length > 0 && (
        <div className="card">
          <h2>Historique des conversations</h2>
          <p className="small muted">Conservé sur cet appareil (texte uniquement, jamais d’audio). Vous pouvez l’effacer à tout moment.</p>
          <ul className="list">
            {state.conversations.slice(0, 10).map((c) => (
              <li key={c.id}>
                <details>
                  <summary style={{ cursor: 'pointer' }}>
                    {c.title} · <span className="muted small">{new Date(c.updatedAt).toLocaleString('fr-FR')} · {c.messages.filter((m) => m.role === 'learner').length} réplique(s)</span>
                  </summary>
                  <div className="chat" style={{ minHeight: 0, marginTop: 10 }}>
                    {c.messages.map((m, i) => (
                      <div key={i} className={`msg ${m.role}`}>
                        {m.text}
                      </div>
                    ))}
                  </div>
                </details>
              </li>
            ))}
          </ul>
          <button type="button" className="btn sm danger" onClick={() => update((s) => ({ ...s, conversations: [] }))}>
            Effacer l’historique
          </button>
        </div>
      )}
    </div>
  );
}
