// Diagnostic vocal : montre ce que l'appareil permet vraiment (lecture, reconnaissance, micro) et journalise
// les événements d'un essai. Sert à comprendre une panne sur une tablette ou un téléphone précis.
import { useEffect, useRef, useState } from 'react';
import {
  detectSpeechEnvironment,
  loadVoices,
  micPermission,
  recordingErrorMessage,
  speak,
  startRecognition,
  startRecording,
  sttAvailability,
  type MicPermission,
  type RecognitionHandle,
} from '../services/speech';
import { useLearner } from '../state/store';

const PERMISSION_LABEL: Record<MicPermission, string> = {
  granted: 'autorisé',
  denied: 'refusé',
  prompt: 'sera demandé au premier usage',
  unknown: 'inconnu (le navigateur ne l’indique pas)',
};

export function VoiceDiagnostics() {
  const settings = useLearner().settings;
  const [env] = useState(() => detectSpeechEnvironment());
  const [stt] = useState(() => sttAvailability(env));
  const [voices, setVoices] = useState<number | null>(null);
  const [perm, setPerm] = useState<MicPermission>('unknown');
  const [log, setLog] = useState<string[]>([]);
  const [running, setRunning] = useState<'tts' | 'stt' | 'rec' | null>(null);
  const recHandle = useRef<RecognitionHandle | null>(null);
  const t0 = useRef(0);

  useEffect(() => {
    void loadVoices().then((v) => setVoices(v.length));
    void micPermission().then(setPerm);
    return () => recHandle.current?.abort();
  }, []);

  const add = (line: string) => setLog((l) => [...l, `${((performance.now() - t0.current) / 1000).toFixed(1)} s — ${line}`]);
  const begin = (kind: 'tts' | 'stt' | 'rec', title: string) => {
    t0.current = performance.now();
    setLog([title]);
    setRunning(kind);
  };

  const device = env.ios ? 'iPad / iPhone' : env.android ? 'Android' : 'ordinateur';
  const summary = [
    `Appareil : ${device} · navigateur : ${env.browser}${env.inApp ? ` (intégré à ${env.inApp})` : ''}`,
    `Connexion sécurisée (https) : ${env.secure ? 'oui' : 'NON'}`,
    `Lecture à voix haute : ${env.ttsApi ? `oui (${voices ?? '…'} voix anglaise(s))` : 'non disponible'}`,
    `Reconnaissance vocale : ${stt.ok ? 'disponible' : 'non disponible'}${stt.reason ? ` — ${stt.reason}` : ''}${stt.warning ? ` — ${stt.warning}` : ''}`,
    `Enregistrement audio : ${env.recorderApi ? 'oui' : 'non'}`,
    `Autorisation du micro : ${PERMISSION_LABEL[perm]}`,
  ];

  const testTts = () => {
    begin('tts', 'Test de la lecture à voix haute');
    const ok = speak('Hello! If you can hear me, the voice works.', {
      accent: settings.accent,
      voiceURI: settings.voiceURI,
      rate: settings.speechRate,
      onEnd: () => {
        add('lecture terminée (si vous n’avez rien entendu : volume, mode silencieux de l’appareil, ou aucune voix anglaise installée)');
        setRunning(null);
      },
    });
    if (!ok) {
      add('la lecture à voix haute n’est pas disponible dans ce navigateur');
      setRunning(null);
    } else add('lecture lancée');
  };

  const testStt = () => {
    if (running === 'stt') {
      recHandle.current?.stop();
      return;
    }
    begin('stt', `Test de la reconnaissance vocale (${settings.accent}) : dites « Hello, how are you? »`);
    recHandle.current = startRecognition(settings.accent, {
      onEvent: (name, detail) => add(detail ? `${name} : ${detail}` : name),
      onStart: () => add('➡ micro ouvert : parlez maintenant'),
      onResult: (text, confidence) => add(`✅ COMPRIS : « ${text} »${confidence ? ` (confiance ${Math.round(confidence * 100)} %)` : ''}`),
      onError: (m, code) => add(`❌ ERREUR [${code}] ${m}`),
      onEnd: () => {
        recHandle.current = null;
        setRunning(null);
        void micPermission().then(setPerm);
      },
    });
    if (!recHandle.current) setRunning(null);
  };

  const testRecorder = async () => {
    begin('rec', 'Test du micro : enregistrement de 3 secondes, parlez…');
    try {
      const r = await startRecording();
      add('micro ouvert, enregistrement en cours');
      setTimeout(async () => {
        const url = await r.stop();
        add('enregistrement terminé : lecture…');
        const audio = new Audio(url);
        audio.onended = () => {
          add('fin de la lecture (vous deviez entendre votre voix)');
          URL.revokeObjectURL(url);
          setRunning(null);
        };
        audio.play().catch((e) => {
          add(`impossible de relire l’enregistrement (${(e as Error).name})`);
          setRunning(null);
        });
        void micPermission().then(setPerm);
      }, 3000);
    } catch (e) {
      add(`❌ ${recordingErrorMessage(e, env)} [${(e as { name?: string })?.name ?? 'erreur'}]`);
      setRunning(null);
    }
  };

  const report = [...summary, `Navigateur (détail) : ${navigator.userAgent}`, '', ...log].join('\n');

  return (
    <div className="voice-diag">
      <ul className="small" style={{ paddingLeft: 18, margin: '8px 0' }}>
        {summary.map((l) => (
          <li key={l}>{l}</li>
        ))}
      </ul>
      <div className="row">
        <button type="button" className="btn sm" onClick={testTts} disabled={!!running && running !== 'tts'}>
          🔈 Tester la lecture
        </button>
        <button type="button" className={`btn sm ${running === 'stt' ? 'recording' : ''}`} onClick={testStt} disabled={!stt.ok || (!!running && running !== 'stt')}>
          {running === 'stt' ? '⏹ Arrêter le test' : '🎙️ Tester la reconnaissance'}
        </button>
        <button type="button" className="btn sm" onClick={() => void testRecorder()} disabled={!env.recorderApi || !!running}>
          ⏺ Tester le micro (3 s)
        </button>
      </div>
      {log.length > 0 && (
        <>
          <pre className="diag-log" aria-live="polite">
            {log.join('\n')}
          </pre>
          <button
            type="button"
            className="btn sm ghost"
            onClick={() => {
              void navigator.clipboard?.writeText(report).then(
                () => add('rapport copié : collez-le dans un message pour le développeur'),
                () => add('copie impossible : faites une capture d’écran'),
              );
            }}
          >
            📋 Copier le rapport
          </button>
        </>
      )}
    </div>
  );
}
