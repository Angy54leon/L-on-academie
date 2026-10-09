// Affichage des contenus : leçons, dialogues, textes, fiches de vocabulaire.
import { useEffect, useRef, useState } from 'react';
import { getConcept, getWord, type Activity, type LessonSection } from '../content';
import { cardStatus, STATUS_LABELS } from '../core/srs';
import { speak, stopSpeaking, ttsSupported } from '../services/speech';
import { useLearner } from '../state/store';
import { Listen } from './ui';

export function LessonView({ sections }: { sections: LessonSection[] }) {
  return (
    <div>
      {sections.map((s) => (
        <section key={s.heading} className="lesson-section">
          <h3>{s.heading}</h3>
          <div className="lesson-body">{s.body}</div>
          {s.examples?.map((ex) => (
            <div key={ex.en} className="example">
              <Listen text={ex.en} compact />
              <div>
                <div className="en">{ex.en}</div>
                <div className="fr">
                  {ex.fr}
                  {ex.note && <em> — {ex.note}</em>}
                </div>
              </div>
            </div>
          ))}
          {s.tip && <div className="tip">💡 {s.tip}</div>}
        </section>
      ))}
    </div>
  );
}

export function DialogueView({ dialogue, immersion }: { dialogue: NonNullable<Activity['dialogue']>; immersion: number }) {
  const settings = useLearner().settings;
  const [showFr, setShowFr] = useState(immersion <= 1);
  const [playing, setPlaying] = useState<number | null>(null);
  const stopRef = useRef(false);
  useEffect(
    () => () => {
      stopRef.current = true;
      stopSpeaking();
    },
    [],
  );
  const playFrom = (i: number) => {
    if (i >= dialogue.lines.length || stopRef.current) {
      setPlaying(null);
      return;
    }
    setPlaying(i);
    speak(dialogue.lines[i].text, { accent: settings.accent, voiceURI: settings.voiceURI, rate: settings.speechRate, onEnd: () => setTimeout(() => playFrom(i + 1), 350) });
  };
  return (
    <div>
      <p className="muted small">{dialogue.setting}</p>
      <div className="row" style={{ marginBottom: 8 }}>
        {ttsSupported() &&
          (playing === null ? (
            <button
              type="button"
              className="btn sm"
              onClick={() => {
                stopRef.current = false;
                playFrom(0);
              }}
            >
              ▶ Écouter tout le dialogue
            </button>
          ) : (
            <button
              type="button"
              className="btn sm"
              onClick={() => {
                stopRef.current = true;
                stopSpeaking();
                setPlaying(null);
              }}
            >
              ⏹ Stop
            </button>
          ))}
        <button type="button" className="btn sm ghost" onClick={() => setShowFr(!showFr)} aria-pressed={showFr}>
          {showFr ? 'Masquer la traduction' : 'Afficher la traduction'}
        </button>
      </div>
      {dialogue.lines.map((l, i) => (
        <div key={i} className={`dialogue-line ${playing === i ? 'playing' : ''}`}>
          <div className="who">{l.speaker}</div>
          <div className="bubble">
            <div className="row" style={{ gap: 8, flexWrap: 'nowrap', alignItems: 'flex-start' }}>
              <span style={{ flex: 1 }}>{l.text}</span>
              <Listen text={l.text} compact />
            </div>
            {showFr && <div className="fr">{l.fr}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

export function PassageView({ passage, immersion }: { passage: NonNullable<Activity['passage']>; immersion: number }) {
  const [showFr, setShowFr] = useState(false);
  return (
    <div>
      <h3>{passage.title}</h3>
      <div className="lesson-body" style={{ color: 'var(--text)' }}>
        {passage.text}
      </div>
      <div className="row" style={{ marginTop: 10 }}>
        <Listen text={passage.text} label="Écouter le texte" />
        {passage.fr && immersion < 3 && (
          <button type="button" className="btn sm ghost" onClick={() => setShowFr(!showFr)}>
            {showFr ? 'Masquer la traduction' : 'Afficher la traduction'}
          </button>
        )}
      </div>
      {showFr && <p className="muted small" style={{ marginTop: 10 }}>{passage.fr}</p>}
    </div>
  );
}

export function WordCard({ id, compact = false }: { id: string; compact?: boolean }) {
  const w = getWord(id);
  const card = useLearner().vocab[id];
  if (!w) return null;
  const status = cardStatus(card);
  return (
    <div className="word-card">
      <div className="row between" style={{ flexWrap: 'nowrap', alignItems: 'flex-start' }}>
        <div>
          <div className="en">{w.en}</div>
          <div className="pron">{w.pron}</div>
          <div>{w.fr}</div>
        </div>
        <div className="row" style={{ gap: 6, flexWrap: 'nowrap' }}>
          <span className={`badge ${status === 'mastered' ? 'good' : status === 'fragile' ? 'warn' : ''}`}>{STATUS_LABELS[status]}</span>
          <Listen text={w.en} compact />
        </div>
      </div>
      {!compact && (
        <>
          <div className="example" style={{ marginTop: 10 }}>
            <Listen text={w.example} compact />
            <div>
              <div className="en">{w.example}</div>
              <div className="fr">{w.exampleFr}</div>
            </div>
          </div>
          <p className="small muted" style={{ margin: 0 }}>
            {w.context} · Niveau {w.level}
          </p>
        </>
      )}
    </div>
  );
}

/** Rappel simplifié d'une notion (réexplication en cas de difficulté). */
export function ConceptReminder({ concept }: { concept: string }) {
  const c = getConcept(concept);
  if (!c) return null;
  return (
    <div className="card glow" style={{ marginBottom: 16 }}>
      <div className="eyebrow">Rappel — {c.label}</div>
      <p>{c.summary}</p>
      {c.simple.map((ex) => (
        <div key={ex.en} className="example">
          <Listen text={ex.en} compact />
          <div>
            <div className="en">{ex.en}</div>
            <div className="fr">{ex.fr}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
