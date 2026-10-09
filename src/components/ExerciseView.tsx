// Affichage et correction d'un exercice, quel que soit son type.
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import type { Item } from '../content';
import { checkAnswer, errorKindLabel, keywordsFound, analyzeWriting, type CheckResult, type Response } from '../core/answerCheck';
import { seededRandom, shuffle } from '../core/adaptive';
import { askTeacher, checkAi, type TeacherResponse } from '../services/ai';
import { recorderSupported, speak, startRecognition, startRecording, sttSupported, ttsSupported, type RecognitionHandle, type Recording } from '../services/speech';
import { useLearner } from '../state/store';
import { Listen } from './ui';

export interface AnswerEvent {
  result: CheckResult;
  response: Response;
  firstTry: boolean;
  userAnswer: string;
}

interface Props {
  item: Item;
  immersion: number;
  showHints: boolean;
  allowRetry: boolean;
  /** false = mode évaluation : pas de correction affichée. */
  showFeedback: boolean;
  timed?: number;
  levelLabel?: string;
  /** Évaluation : l'oral ne peut être validé que par la voix. */
  voiceOnly?: boolean;
  onAttempt: (e: AnswerEvent) => void;
  onNext: () => void;
}

const INSTRUCTIONS: Record<string, [string, string]> = {
  mcq: ['Choisissez la bonne réponse.', 'Choose the correct answer.'],
  gap: ['Complétez la phrase.', 'Fill in the blank.'],
  'translate-fr-en': ['Traduisez en anglais.', 'Translate into English.'],
  'translate-en-fr': ['Traduisez en français.', 'Translate into French.'],
  order: ['Remettez les mots dans l’ordre.', 'Put the words in the right order.'],
  conjugate: ['Écrivez la bonne forme du verbe.', 'Write the correct form of the verb.'],
  listen: ['Écoutez, puis répondez.', 'Listen, then answer.'],
  dictation: ['Écoutez et écrivez ce que vous entendez.', 'Listen and write what you hear.'],
  'speak-repeat': ['Écoutez, puis répétez à voix haute.', 'Listen, then repeat out loud.'],
  'speak-question': ['Répondez à voix haute (ou par écrit si le micro est indisponible).', 'Answer out loud.'],
  free: ['Rédigez votre réponse en anglais.', 'Write your answer in English.'],
};

function instructionKey(item: Item): string {
  if (item.type === 'translate') return `translate-${item.direction}`;
  if (item.type === 'speak') return item.question ? 'speak-question' : 'speak-repeat';
  return item.type;
}

/** Consigne adaptée au niveau d'immersion (0 = français … 3 = anglais, aide sur demande). */
export function Instruction({ fr, en, immersion }: { fr: string; en: string; immersion: number }) {
  const [showFr, setShowFr] = useState(false);
  if (immersion === 0) return <div className="ex-instruction">{fr}</div>;
  if (immersion === 1)
    return (
      <div className="ex-instruction">
        {en} <span className="muted">({fr})</span>
      </div>
    );
  return (
    <div className="ex-instruction row" style={{ gap: 8 }}>
      <span>{en}</span>
      {showFr ? (
        <span className="muted">— {fr}</span>
      ) : (
        <button type="button" className="btn ghost sm" onClick={() => setShowFr(true)}>
          {immersion === 3 ? 'Aide en français' : 'FR ?'}
        </button>
      )}
    </div>
  );
}

function useCountdown(seconds: number | undefined, key: string) {
  const [left, setLeft] = useState(seconds ?? 0);
  useEffect(() => {
    if (!seconds) return;
    setLeft(seconds);
    const t = setInterval(() => setLeft((l) => (l > -99 ? l - 1 : l)), 1000);
    return () => clearInterval(t);
  }, [seconds, key]);
  return left;
}

export function ExerciseView({ item, immersion, showHints, allowRetry, showFeedback, timed, voiceOnly, onAttempt, onNext }: Props) {
  const [result, setResult] = useState<CheckResult | null>(null);
  const [firstTry, setFirstTry] = useState(true);
  const [hintShown, setHintShown] = useState(false);
  const [attemptKey, setAttemptKey] = useState(0);
  const left = useCountdown(timed, `${item.id}-${attemptKey}`);
  const [fr, en] = INSTRUCTIONS[instructionKey(item)];

  useEffect(() => {
    setResult(null);
    setFirstTry(true);
    setHintShown(false);
    setAttemptKey(0);
  }, [item.id]);

  const submit = (response: Response, userAnswer: string) => {
    const r = checkAnswer(item, response);
    const counted = { ...r };
    onAttempt({ result: counted, response, firstTry: firstTry && !hintShown, userAnswer });
    if (!showFeedback) {
      onNext();
      return;
    }
    setResult(counted);
  };

  const retry = () => {
    setResult(null);
    setFirstTry(false);
    setAttemptKey((k) => k + 1);
  };

  const canRetry = allowRetry && firstTry && result && !result.correct && result.outcome !== 'skipped' && item.type !== 'mcq' && item.type !== 'listen';

  return (
    <div className="exercise">
      <div className="row between">
        <Instruction fr={fr} en={en} immersion={immersion} />
        {timed ? (
          <span className={`timer ${left < 0 ? 'late' : ''}`} aria-live="off">
            ⏱ {left >= 0 ? `${left}s` : 'temps écoulé'}
          </span>
        ) : null}
      </div>
      {timed && left < 0 && !result && <div className="notice warn small">Temps conseillé dépassé : répondez quand même, puis visez plus rapide la prochaine fois.</div>}

      <ItemBody key={`${item.id}-${attemptKey}`} item={item} disabled={!!result} onSubmit={submit} immersion={immersion} voiceOnly={voiceOnly} />

      {item.hint && !result && (showHints || hintShown ? (
        <div className="tip">💡 {item.hint}</div>
      ) : (
        <button type="button" className="btn ghost sm" onClick={() => setHintShown(true)} style={{ marginTop: 10 }}>
          💡 Afficher un indice
        </button>
      ))}

      {result && showFeedback && <Feedback item={item} result={result} />}

      {result && showFeedback && (
        <div className="ex-actions">
          {canRetry && (
            <button type="button" className="btn" onClick={retry}>
              ↺ Réessayer
            </button>
          )}
          <AutoFocusButton onClick={onNext}>Continuer →</AutoFocusButton>
        </div>
      )}
    </div>
  );
}

function AutoFocusButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => ref.current?.focus(), []);
  return (
    <button ref={ref} type="button" className="btn primary" onClick={onClick}>
      {children}
    </button>
  );
}

const OUTCOME_TITLE: Record<string, string> = {
  correct: '✅ Correct',
  typo: '🟡 Presque — attention à l’orthographe',
  partial: '🟠 Partiellement réussi',
  incorrect: '❌ Pas tout à fait',
  skipped: '⏭ Sans réponse',
};

export function Feedback({ item, result }: { item: Item; result: CheckResult }) {
  const showExpected = !result.correct || result.outcome === 'typo';
  return (
    <div className={`feedback ${result.outcome}`} role="status">
      <h4>{OUTCOME_TITLE[result.outcome]}</h4>
      {result.errorKind && result.outcome !== 'correct' && <div className="badge" style={{ marginBottom: 6 }}>{errorKindLabel(result.errorKind)}</div>}
      {showExpected && item.type !== 'free' && (
        <p style={{ margin: '6px 0' }}>
          Réponse attendue : <strong>{result.expected}</strong> {ttsSupported() && <Listen text={result.expected} compact />}
        </p>
      )}
      <ul>
        {result.feedback.filter(Boolean).map((f, i) => (
          <li key={i}>{f}</li>
        ))}
      </ul>
      {!result.correct && item.example && <p className="small" style={{ marginTop: 8 }}>Autre exemple : <em>{item.example}</em></p>}
    </div>
  );
}

// ------------------------------------------------------------------ Corps selon le type

interface BodyProps {
  item: Item;
  disabled: boolean;
  immersion: number;
  voiceOnly?: boolean;
  onSubmit: (r: Response, userAnswer: string) => void;
}

function ItemBody(props: BodyProps) {
  const { item } = props;
  switch (item.type) {
    case 'mcq':
      return <ChoiceBody {...props} prompt={item.prompt} sub={item.promptFr} options={item.options} answer={item.answer} />;
    case 'listen':
      return <ChoiceBody {...props} prompt={item.question} options={item.options} answer={item.answer} audio={item.audio} />;
    case 'gap':
      return <TextBody {...props} />;
    case 'conjugate':
      return <TextBody {...props} />;
    case 'translate':
      return <TextBody {...props} />;
    case 'dictation':
      return <TextBody {...props} />;
    case 'order':
      return <OrderBody {...props} item={item} />;
    case 'speak':
      return <SpeakBody {...props} item={item} />;
    case 'free':
      return <FreeBody {...props} item={item} />;
  }
}

function ChoiceBody({ item, disabled, onSubmit, prompt, sub, options, answer, audio }: BodyProps & { prompt: string; sub?: string; options: string[]; answer: number; audio?: string }) {
  const [picked, setPicked] = useState<number | null>(null);
  const s = useLearner().settings;
  useEffect(() => {
    if (audio && ttsSupported()) {
      const t = setTimeout(() => speak(audio, { accent: s.accent, voiceURI: s.voiceURI, rate: s.speechRate }), 300);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (disabled) return;
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      const n = Number(e.key);
      if (n >= 1 && n <= options.length) choose(n - 1);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  });
  const choose = (i: number) => {
    if (disabled) return;
    setPicked(i);
    onSubmit({ kind: 'choice', index: i }, options[i]);
  };
  return (
    <div>
      {audio && (
        <div className="row" style={{ marginBottom: 14 }}>
          <Listen text={audio} label="Réécouter" slowOption />
          {!ttsSupported() && <span className="small muted">Texte : {audio}</span>}
        </div>
      )}
      <div className="ex-prompt">{prompt}</div>
      {sub && <div className="ex-sub">{sub}</div>}
      <div className="options" role="group" aria-label="Réponses possibles">
        {options.map((o, i) => (
          <button
            key={i}
            type="button"
            className={`option ${disabled && i === answer ? 'correct' : ''} ${disabled && picked === i && i !== answer ? 'wrong' : ''}`}
            onClick={() => choose(i)}
            disabled={disabled}
          >
            <span className="key">{i + 1}</span>
            <span>{o}</span>
          </button>
        ))}
      </div>
      {disabled && audio && (
        <p className="small muted" style={{ marginTop: 10 }}>
          Transcription : « {audio} »
        </p>
      )}
    </div>
  );
}

function TextBody({ item, disabled, onSubmit }: BodyProps) {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => inputRef.current?.focus(), []);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (disabled || !value.trim()) return;
    onSubmit({ kind: 'text', value }, value);
  };
  let prompt: React.ReactNode = null;
  if (item.type === 'gap' || item.type === 'conjugate') {
    const [a, b] = item.sentence.split('___');
    prompt = (
      <>
        <div className="gap-sentence">
          {a}
          <span className="blank">{disabled ? value || '…' : ' '}</span>
          {b}
        </div>
        {item.type === 'conjugate' && (
          <div className="ex-sub" style={{ marginTop: 0 }}>
            Verbe : <strong>{item.verb}</strong> — {item.tense}
          </div>
        )}
        {item.type === 'gap' && item.translation && <div className="ex-sub" style={{ marginTop: 0 }}>{item.translation}</div>}
      </>
    );
  } else if (item.type === 'translate') {
    prompt = <div className="ex-prompt">« {item.source} »</div>;
  } else if (item.type === 'dictation') {
    prompt = (
      <div className="row" style={{ marginBottom: 14 }}>
        <Listen text={item.audio} label="Écouter" slowOption />
        {!ttsSupported() && <span className="notice warn small">Synthèse vocale indisponible : la phrase est « {item.audio} ».</span>}
      </div>
    );
  }
  return (
    <form onSubmit={submit}>
      {prompt}
      <div className="row" style={{ flexWrap: 'nowrap' }}>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={disabled}
          placeholder={item.type === 'gap' || item.type === 'conjugate' ? 'Mot(s) manquant(s)…' : 'Votre réponse en anglais…'}
          aria-label="Votre réponse"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
        />
        {!disabled && (
          <button type="submit" className="btn primary" disabled={!value.trim()}>
            Valider
          </button>
        )}
      </div>
      {!disabled && (
        <button type="button" className="btn ghost sm" style={{ marginTop: 8 }} onClick={() => onSubmit({ kind: 'skip' }, '')}>
          Je ne sais pas
        </button>
      )}
    </form>
  );
}

function OrderBody({ item, disabled, onSubmit }: BodyProps & { item: Extract<Item, { type: 'order' }> }) {
  const shuffled = useMemo(() => {
    const seed = [...item.id].reduce((a, c) => a + c.charCodeAt(0), 0);
    let s = shuffle(item.words.map((w, i) => ({ w, i })), seededRandom(seed));
    if (s.every((x, idx) => x.i === idx)) s = [...s.slice(1), s[0]];
    return s;
  }, [item]);
  const [chosen, setChosen] = useState<number[]>([]);
  const add = (i: number) => !disabled && setChosen([...chosen, i]);
  const remove = (pos: number) => !disabled && setChosen(chosen.filter((_, p) => p !== pos));
  const words = chosen.map((i) => shuffled[i].w);
  return (
    <div>
      <div className="ex-sub" style={{ marginTop: 0 }}>{item.translation}</div>
      <div className="answer-line" aria-label="Votre phrase" aria-live="polite">
        {words.length === 0 && <span className="muted small">Touchez les mots ci-dessous dans le bon ordre.</span>}
        {words.map((w, p) => (
          <button key={p} type="button" className="chip" onClick={() => remove(p)} disabled={disabled} aria-label={`Retirer ${w}`}>
            {w}
          </button>
        ))}
      </div>
      <div className="chips">
        {shuffled.map((x, i) => (
          <button key={i} type="button" className="chip" onClick={() => add(i)} disabled={disabled || chosen.includes(i)}>
            {x.w}
          </button>
        ))}
      </div>
      {!disabled && (
        <div className="ex-actions">
          <button type="button" className="btn ghost" onClick={() => setChosen([])} disabled={!chosen.length}>
            Effacer
          </button>
          <button type="button" className="btn primary" disabled={chosen.length !== item.words.length} onClick={() => onSubmit({ kind: 'tokens', value: words }, words.join(' '))}>
            Valider
          </button>
        </div>
      )}
    </div>
  );
}

let micNoticeShown = false;

function SpeakBody({ item, disabled, onSubmit, immersion, voiceOnly }: BodyProps & { item: Extract<Item, { type: 'speak' }> }) {
  const s = useLearner().settings;
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [error, setError] = useState('');
  const [typed, setTyped] = useState('');
  const [mode, setMode] = useState<'voice' | 'type' | 'self'>(sttSupported() ? 'voice' : 'type');
  const [showNotice] = useState(() => {
    const v = !micNoticeShown;
    micNoticeShown = true;
    return v;
  });
  const handle = useRef<RecognitionHandle | null>(null);
  useEffect(() => () => handle.current?.abort(), []);
  const isQuestion = !!item.question;

  const start = () => {
    setError('');
    setInterim('');
    setListening(true);
    handle.current = startRecognition(s.accent, {
      onInterim: setInterim,
      onResult: (text, confidence) => {
        setListening(false);
        onSubmit({ kind: 'speech', transcript: text, confidence }, text);
      },
      onError: (m) => {
        setListening(false);
        setError(m);
      },
      onEnd: () => setListening(false),
    });
    if (!handle.current) setListening(false);
  };

  return (
    <div>
      {isQuestion ? (
        <>
          <div className="ex-prompt row" style={{ gap: 10 }}>
            <span>{item.question}</span> <Listen text={item.question!} compact />
          </div>
          {immersion <= 1 && <div className="ex-sub">{item.translation}</div>}
        </>
      ) : (
        <>
          <div className="ex-prompt">{item.text}</div>
          <div className="ex-sub">{item.translation}</div>
          <div className="row" style={{ marginBottom: 12 }}>
            <Listen text={item.text} label="Écouter le modèle" slowOption />
          </div>
        </>
      )}
      {item.tip && !isQuestion && <div className="tip">🗣️ {item.tip}</div>}

      {!disabled && (
        <>
          {!voiceOnly && (<div className="segmented" style={{ margin: '14px 0' }} role="group" aria-label="Mode de réponse">
            <button type="button" aria-pressed={mode === 'voice'} onClick={() => setMode('voice')} disabled={!sttSupported()}>
              🎙️ Parler
            </button>
            <button type="button" aria-pressed={mode === 'type'} onClick={() => setMode('type')}>
              ⌨️ Écrire
            </button>
            {!isQuestion && (
              <button type="button" aria-pressed={mode === 'self'} onClick={() => setMode('self')}>
                🪞 M’auto-évaluer
              </button>
            )}
          </div>)}
          {!sttSupported() && <div className="notice warn small">La reconnaissance vocale n’est pas disponible dans ce navigateur (essayez Chrome, Edge ou Safari). Vous pouvez écrire votre réponse ou vous auto-évaluer.</div>}

          {mode === 'voice' && sttSupported() && (
            <div>
              {showNotice && (
                <p className="tiny muted">
                  🔒 Le micro est demandé seulement quand vous appuyez sur « Parler ». La transcription est réalisée par votre navigateur (dans Chrome, par un service de Google). LÉON ACADÉMIE ne conserve aucun enregistrement audio.
                </p>
              )}
              <button type="button" className={`btn ${listening ? 'recording' : 'primary'}`} onClick={() => (listening ? handle.current?.stop() : start())}>
                {listening ? '⏹ Arrêter' : '🎙️ Parler'}
              </button>
              <div className="mic-live" aria-live="polite" style={{ marginTop: 8 }}>
                {interim}
              </div>
            </div>
          )}
          {mode === 'type' && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (typed.trim()) onSubmit({ kind: 'text', value: typed }, typed);
              }}
            >
              <div className="row" style={{ flexWrap: 'nowrap' }}>
                <input type="text" value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="Écrivez ce que vous diriez…" aria-label="Votre réponse" />
                <button className="btn primary" type="submit" disabled={!typed.trim()}>
                  Valider
                </button>
              </div>
            </form>
          )}
          {mode === 'self' && <SelfEval onSubmit={onSubmit} />}
          {error && <div className="notice bad small" style={{ marginTop: 8 }}>{error}</div>}
          {recorderSupported() && mode !== 'self' && <SelfRecorder />}
        </>
      )}
    </div>
  );
}

/** S'enregistrer et se réécouter (audio conservé en mémoire uniquement). */
function SelfRecorder() {
  const [rec, setRec] = useState<Recording | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [err, setErr] = useState('');
  useEffect(() => () => {
    rec?.cancel();
    if (url) URL.revokeObjectURL(url);
  }, [rec, url]);
  return (
    <details style={{ marginTop: 12 }}>
      <summary className="small muted" style={{ cursor: 'pointer' }}>
        S’enregistrer pour se réécouter et comparer au modèle
      </summary>
      <div className="row" style={{ marginTop: 8 }}>
        {!rec ? (
          <button
            type="button"
            className="btn sm"
            onClick={async () => {
              setErr('');
              try {
                if (url) URL.revokeObjectURL(url);
                setUrl(null);
                setRec(await startRecording());
              } catch {
                setErr('Micro indisponible ou refusé.');
              }
            }}
          >
            ⏺ Enregistrer
          </button>
        ) : (
          <button
            type="button"
            className="btn sm recording"
            onClick={async () => {
              const u = await rec.stop();
              setRec(null);
              setUrl(u);
            }}
          >
            ⏹ Arrêter
          </button>
        )}
        {url && <audio controls src={url} />}
      </div>
      <p className="tiny muted">L’enregistrement reste dans la mémoire de votre navigateur et disparaît quand vous quittez l’exercice.</p>
      {err && <div className="notice bad small">{err}</div>}
    </details>
  );
}

function SelfEval({ onSubmit }: { onSubmit: BodyProps['onSubmit'] }) {
  return (
    <div>
      <p className="small">Écoutez le modèle, répétez-le (enregistrez-vous si possible), puis évaluez-vous honnêtement :</p>
      <div className="row">
        <button type="button" className="btn" onClick={() => onSubmit({ kind: 'self', ok: true }, '(auto-évaluation : réussi)')}>
          👍 J’ai réussi
        </button>
        <button type="button" className="btn" onClick={() => onSubmit({ kind: 'self', ok: false }, '(auto-évaluation : à retravailler)')}>
          🔁 À retravailler
        </button>
      </div>
    </div>
  );
}

function FreeBody({ item, disabled, onSubmit, immersion }: BodyProps & { item: Extract<Item, { type: 'free' }> }) {
  const [text, setText] = useState('');
  const [ai, setAi] = useState<TeacherResponse | null>(null);
  const [aiState, setAiState] = useState<'unknown' | 'available' | 'unavailable' | 'loading'>('unknown');
  const [aiMsg, setAiMsg] = useState('');
  const analysis = analyzeWriting(item, text);
  useEffect(() => {
    void checkAi().then((s) => {
      setAiState(s.available ? 'available' : 'unavailable');
      setAiMsg(s.reason);
    });
  }, []);
  const level = useLearner().assessments.find((a) => a.kind === 'placement')?.level ?? 'A2';
  const askAi = async () => {
    setAiState('loading');
    try {
      const r = await askTeacher({ mode: 'correction', level, immersion, topic: item.prompt.slice(0, 120), messages: [{ role: 'user', content: text.slice(0, 1200) }] });
      setAi(r);
      setAiState('available');
    } catch (e) {
      setAiMsg(e instanceof Error ? e.message : 'Erreur IA.');
      setAiState('available');
    }
  };
  return (
    <div>
      <div className="ex-prompt" style={{ fontSize: '1.1rem' }}>{item.prompt}</div>
      {immersion <= 2 && <div className="ex-sub">{item.promptFr}</div>}
      <textarea value={text} onChange={(e) => setText(e.target.value)} disabled={disabled} rows={7} aria-label="Votre texte" placeholder="Write here…" />
      <div className="row small muted" style={{ marginTop: 6 }}>
        <span>
          {analysis.words} / {item.minWords} mots
        </span>
        {item.targetWords?.length ? (
          <span>
            Mots à utiliser :{' '}
            {item.targetWords.map((w) => (
              <span key={w} className={`badge ${keywordsFound(text, [w]).length ? 'good' : ''}`} style={{ marginRight: 4 }}>
                {w}
              </span>
            ))}
          </span>
        ) : null}
      </div>
      {!disabled && (
        <div className="ex-actions">
          <button type="button" className="btn primary" disabled={!text.trim()} onClick={() => onSubmit({ kind: 'text', value: text }, text)}>
            Vérifier mon texte
          </button>
        </div>
      )}
      {disabled && (
        <div className="card" style={{ marginTop: 16, boxShadow: 'none' }}>
          <h3>Exemple de réponse</h3>
          <p style={{ whiteSpace: 'pre-line' }}>{item.modelAnswer}</p>
          <h3>Auto-vérification</h3>
          <ul className="small">
            {item.checklist.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
          <hr className="sep" />
          <h3>Correction par le professeur IA</h3>
          {aiState === 'unavailable' && <p className="small muted">Indisponible : {aiMsg} La correction ci-dessus provient du correcteur local (règles), qui ne repère pas toutes les erreurs.</p>}
          {(aiState === 'available' || aiState === 'loading') && !ai && (
            <button type="button" className="btn" onClick={askAi} disabled={aiState === 'loading'}>
              {aiState === 'loading' ? 'Correction en cours…' : '✨ Demander une correction détaillée'}
            </button>
          )}
          {aiMsg && aiState === 'available' && !ai && <p className="small muted">{aiMsg}</p>}
          {ai && <AiCorrection r={ai} />}
        </div>
      )}
    </div>
  );
}

export function AiCorrection({ r }: { r: TeacherResponse }) {
  return (
    <div>
      <p className="tiny muted">Réponse générée par le modèle d’IA configuré (peut contenir des erreurs).</p>
      <p>{r.reply}</p>
      {r.corrections.map((c, i) => (
        <div key={i} className={`correction ${c.kind}`}>
          <strong>{c.kind === 'error' ? 'Erreur' : 'Suggestion de style'}</strong> : « {c.original} » → « {c.corrected} »
          {c.explanationFr && <div className="small">{c.explanationFr}</div>}
        </div>
      ))}
      {r.betterVersion && (
        <p className="small" style={{ marginTop: 8 }}>
          Version plus naturelle : <em>{r.betterVersion}</em>
        </p>
      )}
      {r.tipFr && <div className="tip">{r.tipFr}</div>}
    </div>
  );
}
