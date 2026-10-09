// Fonctions vocales du navigateur (gratuites, sans clé API).
//  - Synthèse vocale : window.speechSynthesis (fonctionne hors ligne avec les voix installées).
//  - Reconnaissance vocale : SpeechRecognition / webkitSpeechRecognition (Chrome, Edge, Safari).
//    ⚠️ Dans Chrome, l'audio est envoyé aux serveurs de Google pour la transcription : l'utilisateur en est informé.
//  - Enregistrement pour se réécouter : MediaRecorder, conservé uniquement en mémoire.

export interface VoiceInfo {
  uri: string;
  name: string;
  lang: string;
  local: boolean;
}

export function ttsSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
}

let voicesCache: SpeechSynthesisVoice[] = [];

export function loadVoices(): Promise<VoiceInfo[]> {
  if (!ttsSupported()) return Promise.resolve([]);
  const map = (vs: SpeechSynthesisVoice[]) =>
    vs.filter((v) => v.lang.toLowerCase().startsWith('en')).map((v) => ({ uri: v.voiceURI, name: v.name, lang: v.lang, local: v.localService }));
  const now = window.speechSynthesis.getVoices();
  if (now.length) {
    voicesCache = now;
    return Promise.resolve(map(now));
  }
  return new Promise((resolve) => {
    const done = () => {
      voicesCache = window.speechSynthesis.getVoices();
      resolve(map(voicesCache));
    };
    window.speechSynthesis.addEventListener('voiceschanged', done, { once: true });
    setTimeout(done, 1500);
  });
}

function pickVoice(accent: string, uri?: string): SpeechSynthesisVoice | undefined {
  const voices = voicesCache.length ? voicesCache : window.speechSynthesis.getVoices();
  if (uri) {
    const v = voices.find((x) => x.voiceURI === uri);
    if (v) return v;
  }
  const exact = voices.filter((v) => v.lang.replace('_', '-').toLowerCase() === accent.toLowerCase());
  // On préfère les voix « naturelles » / « premium » quand elles existent.
  const preferred = exact.find((v) => /natural|premium|enhanced|google/i.test(v.name)) ?? exact[0];
  return preferred ?? voices.find((v) => v.lang.toLowerCase().startsWith('en'));
}

export interface SpeakOptions {
  accent?: string;
  voiceURI?: string;
  rate?: number;
  onEnd?: () => void;
}

export function speak(text: string, opts: SpeakOptions = {}): boolean {
  if (!ttsSupported()) return false;
  const synth = window.speechSynthesis;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text.replace(/___/g, 'blank'));
  u.lang = opts.accent ?? 'en-US';
  const voice = pickVoice(u.lang, opts.voiceURI);
  if (voice) u.voice = voice;
  u.rate = opts.rate ?? 0.9;
  u.pitch = 1;
  if (opts.onEnd) {
    u.onend = opts.onEnd;
    u.onerror = opts.onEnd;
  }
  synth.speak(u);
  return true;
}

export function stopSpeaking(): void {
  if (ttsSupported()) window.speechSynthesis.cancel();
}

// ------------------------------------------------------------------ Reconnaissance vocale

interface RecognitionLike {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string; confidence: number }> & { isFinal: boolean }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}

function recognitionCtor(): (new () => RecognitionLike) | undefined {
  if (typeof window === 'undefined') return undefined;
  const w = window as unknown as { SpeechRecognition?: new () => RecognitionLike; webkitSpeechRecognition?: new () => RecognitionLike };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

export function sttSupported(): boolean {
  return !!recognitionCtor();
}

export interface RecognitionHandle {
  stop(): void;
  abort(): void;
}

export interface RecognitionCallbacks {
  onInterim?: (text: string) => void;
  onResult: (text: string, confidence: number | undefined) => void;
  onError: (message: string) => void;
  onEnd?: () => void;
}

const ERROR_MESSAGES: Record<string, string> = {
  'not-allowed': 'Accès au micro refusé. Autorisez le micro dans les réglages du navigateur pour utiliser l’oral.',
  'service-not-allowed': 'La reconnaissance vocale n’est pas autorisée dans ce navigateur.',
  'no-speech': 'Aucune parole détectée. Réessayez en parlant un peu plus fort.',
  'audio-capture': 'Aucun micro détecté.',
  network: 'La reconnaissance vocale nécessite une connexion Internet dans ce navigateur.',
  aborted: '',
};

/** Démarre la reconnaissance vocale (l'autorisation du micro est demandée à ce moment-là). */
export function startRecognition(lang: string, cb: RecognitionCallbacks): RecognitionHandle | null {
  const Ctor = recognitionCtor();
  if (!Ctor) {
    cb.onError('La reconnaissance vocale n’est pas disponible dans ce navigateur. Utilisez Chrome, Edge ou Safari, ou tapez votre réponse.');
    return null;
  }
  const rec = new Ctor();
  rec.lang = lang;
  rec.interimResults = true;
  rec.maxAlternatives = 1;
  rec.continuous = false;
  let finalText = '';
  let confidence: number | undefined;
  rec.onresult = (e) => {
    let interim = '';
    finalText = '';
    for (let i = 0; i < e.results.length; i++) {
      const r = e.results[i];
      if (r.isFinal) {
        finalText += r[0].transcript;
        confidence = r[0].confidence || undefined;
      } else interim += r[0].transcript;
    }
    cb.onInterim?.(finalText + interim);
  };
  rec.onerror = (e) => {
    const msg = ERROR_MESSAGES[e.error] ?? `Erreur de reconnaissance vocale (${e.error}).`;
    if (msg) cb.onError(msg);
  };
  rec.onend = () => {
    if (finalText.trim()) cb.onResult(finalText.trim(), confidence);
    cb.onEnd?.();
  };
  try {
    rec.start();
  } catch {
    cb.onError('Impossible de démarrer la reconnaissance vocale.');
    return null;
  }
  return { stop: () => rec.stop(), abort: () => rec.abort() };
}

// ------------------------------------------------------------------ S'enregistrer pour se réécouter

export function recorderSupported(): boolean {
  return typeof window !== 'undefined' && 'MediaRecorder' in window && !!navigator.mediaDevices?.getUserMedia;
}

export interface Recording {
  stop(): Promise<string>;
  cancel(): void;
}

/** Enregistre le micro. L'audio reste en mémoire (URL locale) et n'est jamais envoyé ni sauvegardé. */
export async function startRecording(): Promise<Recording> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const recorder = new MediaRecorder(stream);
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => chunks.push(e.data);
  recorder.start();
  const release = () => stream.getTracks().forEach((t) => t.stop());
  return {
    stop: () =>
      new Promise((resolve) => {
        recorder.onstop = () => {
          release();
          resolve(URL.createObjectURL(new Blob(chunks, { type: recorder.mimeType || 'audio/webm' })));
        };
        recorder.stop();
      }),
    cancel: () => {
      try {
        recorder.stop();
      } catch {
        /* rien */
      }
      release();
    },
  };
}
