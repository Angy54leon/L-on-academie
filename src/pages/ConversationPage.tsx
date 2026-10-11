import { useEffect, useMemo, useRef, useState } from 'react';
import { SCENARIOS, conceptLabel, type Scenario } from '../content';
import { immersionLevel } from '../core/adaptive';
import { correctSentence, evaluateReply, retryPrompt, reviewPrompts, usesWord, type ReviewPrompt } from '../core/localPartner';
import { awaitingTeacher, buildTeacherHistory, CONVERSATION_TOPICS, latestObservation, pickTopic, referenceLevel, SURPRISE, type Topic } from '../core/conversation';
import { recordAiCall, recordConceptSignal, recordConversationTurn, reviewVocab, saveConversation } from '../core/learner';
import { today, weakConcepts } from '../core/progress';
import { cardStatus } from '../core/srs';
import { normalizeAnswer, tokenize } from '../core/normalize';
import { randomId, type ConversationLog, type ConversationMessage } from '../core/state';
import { AiError, askTeacher, checkAi, type AiStatus } from '../services/ai';
import { speak, startRecognition, sttAvailability, type RecognitionHandle } from '../services/speech';
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
  const [topic, setTopic] = useState<string>(SURPRISE);
  const [activeTopic, setActiveTopic] = useState<Topic | null>(null);
  const [conv, setConv] = useState<ConversationLog | null>(null);
  const [step, setStep] = useState(0);
  const [tries, setTries] = useState(0);
  const [prompts, setPrompts] = useState<ReviewPrompt[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  /** La dernière demande au professeur IA a échoué : le message de l'apprenant est conservé, on peut réessayer. */
  const [failed, setFailed] = useState(false);
  const sendingRef = useRef(false); // anti double envoi (plus rapide qu'un état React)
  const abortRef = useRef<AbortController | null>(null);
  const convIdRef = useRef<string | null>(null);
  useEffect(() => () => abortRef.current?.abort(), []);
  const [showFrFor, setShowFrFor] = useState<Set<number>>(new Set());
  const [autoPlay, setAutoPlay] = useState(false);
  const [listening, setListening] = useState(false);
  const [micPhase, setMicPhase] = useState<'starting' | 'listening' | null>(null);
  const [stt] = useState(() => sttAvailability());
  const rec = useRef<RecognitionHandle | null>(null);
  // Quitter la page coupe le micro (sinon il resterait ouvert en arrière-plan).
  useEffect(() => () => rec.current?.abort(), []);
  const endRef = useRef<HTMLDivElement>(null);
  useStudyTimer(!!conv);
  const immersion = immersionLevel(state);
  const level = referenceLevel(state);

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
    convIdRef.current = c.id;
    setConv(c);
    update((s) => saveConversation(s, c), { silent: false });
  };

  /** Ferme la conversation en cours (et annule une demande au professeur en attente). */
  const closeConversation = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    convIdRef.current = null;
    sendingRef.current = false;
    setBusy(false);
    setFailed(false);
    setError('');
    setConv(null);
  };

  const addMessages = (c: ConversationLog, msgs: ConversationMessage[]): ConversationLog => ({ ...c, messages: [...c.messages, ...msgs], updatedAt: now() });

  const teacherSay = (msg: ConversationMessage) => {
    if (autoPlay && msg.role === 'teacher') speak(msg.text, { accent: state.settings.accent, voiceURI: state.settings.voiceURI, rate: state.settings.speechRate });
    return msg;
  };

  const startConversation = () => {
    abortRef.current?.abort();
    setError('');
    setFailed(false);
    setStep(0);
    setTries(0);
    const chosen = pickTopic(topic);
    setActiveTopic(chosen);
    const base: ConversationLog = {
      id: randomId('conv'),
      mode,
      source: engine,
      title: engine === 'ai' ? `${MODES.find((m) => m.id === mode)!.label} · ${mode === 'situation' ? scenario?.title : mode === 'correction' ? 'Correction' : mode === 'review' ? 'Révision' : chosen.fr}` : `${MODES.find((m) => m.id === mode)!.label} · ${mode === 'correction' ? 'Correction' : mode === 'review' ? 'Révision' : scenario?.title}`,
      startedAt: now(),
      updatedAt: now(),
      scenarioId: mode === 'correction' || mode === 'review' ? undefined : scenarioId,
      messages: [],
    };
    let first: ConversationMessage[] = [];
    if (engine === 'ai') {
      const hint =
        mode === 'situation' && scenario
          ? `Jeu de rôle avec le professeur IA : ${scenario.setting} Léon joue « ${scenario.role} » et commence.`
          : mode === 'correction'
            ? 'Mode correction : Léon va vous inviter à écrire des phrases en anglais, puis les corrigera.'
            : mode === 'review'
              ? 'Révision : Léon va discuter avec vous en vous faisant réutiliser vos mots fragiles.'
              : `Sujet de départ : ${chosen.fr}. Léon lance la conversation ; répondez en anglais, à l’écrit ou au micro. La discussion peut ensuite changer de sujet.`;
      const opened = addMessages(base, [{ role: 'system', text: hint, at: now() }]);
      persist(opened);
      void requestReply(opened, chosen);
      return;
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
    if (!content || !conv || busy || sendingRef.current) return;
    sendingRef.current = true;
    try {
      await sendContent(conv, content);
    } finally {
      sendingRef.current = false;
    }
  };

  /**
   * Demande une réponse au professeur IA pour la conversation `c` (dont la dernière réplique est celle de
   * l'apprenant, ou aucune réplique pour l'ouverture). Ne duplique jamais le message de l'apprenant :
   * en cas d'échec, il reste affiché et « Réessayer » relance la même demande.
   */
  const requestReply = async (c: ConversationLog, topicOverride?: Topic) => {
    const waiting = awaitingTeacher(c.messages);
    if (!waiting) return;
    const s = getState();
    if (today(s, new Date()).aiCalls >= s.settings.aiDailyLimit) {
      setError(`Limite quotidienne d’échanges avec l’IA atteinte (${s.settings.aiDailyLimit}). Vous pouvez la modifier dans les paramètres, ou continuer avec le partenaire local.`);
      setFailed(true);
      return;
    }
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setBusy(true);
    setFailed(false);
    setError('');
    try {
      const weakWords = Object.values(s.vocab)
        .filter((v) => cardStatus(v) === 'fragile' || cardStatus(v) === 'learning')
        .slice(0, 10)
        .map((v) => getWord(v.id)?.en)
        .filter((x): x is string => !!x);
      const history = buildTeacherHistory(c.messages);
      const t = topicOverride ?? activeTopic;
      const r = await askTeacher(
        {
          mode: c.mode,
          level,
          immersion: c.mode === 'immersion' ? 3 : immersion,
          topic: c.mode === 'situation' ? undefined : t?.en,
          scenario: c.mode === 'situation' && scenario ? `${scenario.role} — ${scenario.title}. ${scenario.setting}` : undefined,
          weakWords,
          weakConcepts: weakConcepts(s, 5).map(conceptLabel),
          opening: waiting === 'opening' || undefined,
          memory: history.memory.length ? history.memory : undefined,
          messages: history.messages,
        },
        { signal: controller.signal },
      );
      // Conversation fermée ou remplacée entre-temps : on n'ajoute rien.
      if (controller.signal.aborted || convIdRef.current !== c.id) return;
      const reply = teacherSay({
        role: 'teacher',
        text: r.reply,
        fr: r.replyFr,
        at: now(),
        corrections: r.corrections?.length ? r.corrections : undefined,
        betterVersion: r.betterVersion,
        tipFr: r.tipFr,
        levelHint: r.levelHint,
        focusFr: r.focusFr,
      });
      persist(addMessages(c, [reply]));
      if (waiting === 'reply') {
        const lastLearner = [...c.messages].reverse().find((m) => m.role === 'learner')?.text ?? '';
        recordTurn(lastLearner, true, correctSentence(lastLearner).issues.filter((i) => i.kind === 'error').map((i) => i.concept));
      } else update((st, n) => recordAiCall(st, n));
    } catch (e) {
      if (controller.signal.aborted && !(e instanceof AiError && e.retryable)) return; // annulée volontairement
      if (convIdRef.current !== c.id) return;
      const message = e instanceof Error ? e.message : 'Erreur inconnue.';
      // Journal technique (sans contenu de conversation).
      console.warn('[conversation] réponse du professeur IA impossible :', e instanceof AiError ? `${e.status || 'réseau'} ${e.retryable ? '(réessayable)' : ''}` : 'erreur');
      setError(message);
      setFailed(true);
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
        setBusy(false);
      }
    }
  };

  const sendContent = async (conv: ConversationLog, content: string) => {
    setText('');
    setError('');
    const learnerMsg: ConversationMessage = { role: 'learner', text: content, at: now() };
    let c = addMessages(conv, [learnerMsg]);

    if (conv.source === 'ai') {
      persist(c);
      await requestReply(c);
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

    const st = scenario?.steps[step];
    if (!scenario || !st) {
      // Ne jamais faire disparaître un message sans explication.
      setText(content);
      setError('Ce scénario est terminé. Recommencez-le ou choisissez-en un autre pour continuer.');
      return;
    }
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
      // Le partenaire relance toujours la conversation (au lieu de rester muet).
      const again = retryPrompt(st, fb);
      out.push(teacherSay({ role: 'teacher', text: again.text, fr: again.fr, at: now() }));
      setTries(tries + 1);
    }
    c = addMessages(c, out);
    persist(c);
    recordTurn(content, false, fb.issues.filter((i) => i.kind === 'error').map((i) => i.concept));
  };

  const mic = () => {
    if (listening) {
      if (micPhase === 'starting') rec.current?.abort();
      else rec.current?.stop();
      return;
    }
    setError('');
    setListening(true);
    setMicPhase('starting');
    rec.current = startRecognition(state.settings.accent, {
      onStart: () => setMicPhase('listening'),
      onInterim: (t) => setText(t),
      onResult: (t) => {
        setText(t);
        setListening(false);
        setMicPhase(null);
      },
      onError: (m) => {
        setError(m);
        setListening(false);
        setMicPhase(null);
      },
      onEnd: () => {
        rec.current = null;
        setListening(false);
        setMicPhase(null);
      },
    });
    if (!rec.current) {
      setListening(false);
      setMicPhase(null);
    }
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
                <option value={SURPRISE}>🎲 Surprise (sujet au hasard)</option>
                {CONVERSATION_TOPICS.map((t) => (
                  <option key={t.en} value={t.en}>
                    {t.fr}
                  </option>
                ))}
              </select>
              <span className="tiny muted" style={{ fontWeight: 400 }}>Léon lance la discussion sur ce sujet, puis la conversation peut évoluer librement.</span>
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
              <button type="button" className="btn sm" onClick={closeConversation}>
                Nouvelle conversation
              </button>
            </div>
          </div>
          <div className="chat" aria-live="polite">
            {conv.messages.map((m, i) => (
              <div key={i} className={`msg ${m.role}`}>
                {m.role === 'teacher' && m.corrections?.length ? <Corrections items={m.corrections} better={m.betterVersion} /> : null}
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
                {m.role !== 'teacher' &&
                  m.corrections?.map((c, j) => (
                    <div key={j} className={`correction ${c.kind}`}>
                      <strong>{c.kind === 'error' ? 'Erreur' : 'Suggestion'}</strong> : « {c.original} » → « {c.corrected} »<div className="small">{c.explanationFr}</div>
                    </div>
                  ))}
                {m.role === 'teacher' && !m.corrections?.length && m.betterVersion && (
                  <div className="small" style={{ marginTop: 6 }}>
                    💡 Version plus naturelle de votre phrase : <em>{m.betterVersion}</em>
                  </div>
                )}
                {m.role !== 'teacher' && m.betterVersion && (
                  <div className="small" style={{ marginTop: 6 }}>
                    💡 <em>{m.betterVersion}</em>
                  </div>
                )}
                {m.tipFr && <div className="tip">{m.tipFr}</div>}
              </div>
            ))}
            {busy && (
              <div className="msg teacher muted" role="status">
                Léon réfléchit…
              </div>
            )}
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
              {error && (
                <div className="notice bad small" style={{ marginBottom: 8 }} role="alert">
                  {error}
                  {failed && conv.source === 'ai' && awaitingTeacher(conv.messages) && (
                    <div className="row" style={{ marginTop: 8 }}>
                      <button type="button" className="btn sm primary" onClick={() => void requestReply(conv)} disabled={busy}>
                        ↻ Réessayer
                      </button>
                      <span className="tiny muted">Votre message est conservé, il ne sera pas envoyé deux fois.</span>
                    </div>
                  )}
                </div>
              )}
              {conv.source === 'ai' && <Observation messages={conv.messages} />}
              {micPhase === 'listening' && !text && <div className="small muted" aria-live="polite" style={{ marginBottom: 6 }}>🔴 Je vous écoute… parlez en anglais.</div>}
              {!stt.ok && conv && <div className="tiny muted" style={{ marginBottom: 6 }}>🎙️ Dictée vocale indisponible : {stt.reason}</div>}
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
                {stt.ok && (
                  <button
                    type="button"
                    className={`btn icon ${micPhase === 'listening' ? 'recording' : ''}`}
                    onClick={mic}
                    aria-label={micPhase === 'listening' ? 'Arrêter le micro' : micPhase === 'starting' ? 'Ouverture du micro, toucher pour annuler' : 'Dicter au micro'}
                    title={stt.warning ?? 'Le micro est demandé à ce moment-là. La transcription est réalisée par le navigateur (Google dans Chrome, Apple dans Safari).'}
                  >
                    {micPhase === 'listening' ? '⏹' : micPhase === 'starting' ? '⏳' : '🎙️'}
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
              <button type="button" className="btn" onClick={closeConversation}>
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

/** Corrections du professeur IA, affichées avant sa réponse (qui poursuit toujours la conversation). */
function Corrections({ items, better }: { items: NonNullable<ConversationMessage['corrections']>; better?: string }) {
  const errors = items.filter((c) => c.kind === 'error');
  return (
    <div className="conv-correction">
      <div className="small" style={{ fontWeight: 600 }}>{errors.length ? '✏️ Petite correction' : '✨ Pour être plus naturel'}</div>
      {items.map((c, j) => (
        <div key={j} className="small" style={{ marginTop: 4 }}>
          « {c.original} » → <strong>« {c.corrected} »</strong>
          {c.explanationFr && <div className="muted">Pourquoi ? {c.explanationFr}</div>}
        </div>
      ))}
      {better && (
        <div className="small" style={{ marginTop: 6 }}>
          Tu peux dire : <em>{better}</em>
        </div>
      )}
    </div>
  );
}

/** Indication de niveau observée pendant la conversation (pédagogique, jamais officielle). */
function Observation({ messages }: { messages: ConversationMessage[] }) {
  const o = latestObservation(messages);
  if (!o) return null;
  return (
    <div className="tiny muted" style={{ marginBottom: 6 }}>
      📊 Observation de Léon (indicative, pas une évaluation officielle){o.levelHint ? ` : niveau proche de ${o.levelHint}` : ''}
      {o.focusFr ? ` · À travailler : ${o.focusFr}` : ''}
    </div>
  );
}
