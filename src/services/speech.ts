// Fonctions vocales du navigateur (gratuites, sans clé API).
//  - Synthèse vocale (lecture à voix haute) : window.speechSynthesis. Disponible dans tous les navigateurs modernes.
//  - Reconnaissance vocale : SpeechRecognition / webkitSpeechRecognition. Disponible dans Chrome et Edge (ordinateur,
//    Android) et Safari (Mac, iPad, iPhone). PAS dans Firefox, ni dans les navigateurs intégrés aux applications
//    (Facebook, Instagram…), ni dans les navigateurs tiers sur iPad/iPhone.
//    ⚠️ Dans Chrome, l'audio est envoyé aux serveurs de Google pour la transcription ; dans Safari, à Apple.
//  - Enregistrement pour se réécouter : MediaRecorder, conservé uniquement en mémoire.
//
// Particularités gérées ici (sources de pannes « silencieuses » sur tablette et téléphone) :
//  - Safari (iPad/iPhone) ne marque souvent AUCUN résultat comme « final » : on garde le dernier texte entendu.
//  - Chrome Android peut renvoyer plusieurs résultats finaux qui se répètent : on les fusionne sans doublon.
//  - Certains navigateurs ne déclenchent jamais « onend » (après « Arrêter », ou dans une WebView) : minuteries de secours.
//  - Fin sans résultat ni erreur : on l'explique au lieu de revenir silencieusement au bouton « Parler ».
//  - Synthèse vocale : sur iPad/iPhone, la première lecture doit suivre un geste de l'utilisateur ; Safari ignore une
//    lecture lancée juste après cancel() ; « onend » peut être perdu si l'énoncé est libéré de la mémoire.

// ------------------------------------------------------------------ Environnement

export interface SpeechEnvironment {
  /** Page servie en HTTPS (ou localhost) : obligatoire pour le micro. */
  secure: boolean;
  ios: boolean;
  android: boolean;
  /** Nom de l'application si la page est ouverte dans un navigateur intégré (Facebook, Instagram…). */
  inApp: string | null;
  browser: 'safari' | 'chrome' | 'edge' | 'firefox' | 'samsung' | 'opera' | 'autre';
  ttsApi: boolean;
  sttApi: boolean;
  recorderApi: boolean;
}

const IN_APP: [RegExp, string][] = [
  [/FBAN|FBAV|FB_IAB|FBIOS/i, 'Facebook / Messenger'],
  [/Instagram/i, 'Instagram'],
  [/Snapchat/i, 'Snapchat'],
  [/TikTok|musical_ly|Bytedance/i, 'TikTok'],
  [/\bLine\//i, 'LINE'],
  [/LinkedInApp/i, 'LinkedIn'],
  [/Twitter|XApp/i, 'X (Twitter)'],
  [/Pinterest/i, 'Pinterest'],
  [/GSA\//i, 'l’application Google'],
];

/** Analyse le navigateur (fonction pure, testable avec un « user agent » donné). */
export function detectSpeechEnvironment(
  ua: string = typeof navigator !== 'undefined' ? navigator.userAgent : '',
  w: Partial<Window & { webkitSpeechRecognition: unknown; SpeechRecognition: unknown }> | undefined = typeof window !== 'undefined' ? window : undefined,
  maxTouchPoints: number = typeof navigator !== 'undefined' ? navigator.maxTouchPoints ?? 0 : 0,
): SpeechEnvironment {
  // iPadOS se présente comme un Mac : on le reconnaît à l'écran tactile.
  const ios = /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && maxTouchPoints > 1);
  const android = /Android/i.test(ua);
  let inApp = IN_APP.find(([re]) => re.test(ua))?.[1] ?? null;
  if (!inApp && android && /; wv\)/.test(ua)) inApp = 'une application (navigateur intégré)';
  const browser: SpeechEnvironment['browser'] = /Edg(e|A|iOS)?\//.test(ua)
    ? 'edge'
    : /SamsungBrowser/i.test(ua)
      ? 'samsung'
      : /OPR\/|Opera/i.test(ua)
        ? 'opera'
        : /Firefox|FxiOS/i.test(ua)
          ? 'firefox'
          : /CriOS|Chrome|Chromium/i.test(ua)
            ? 'chrome'
            : /Safari/i.test(ua)
              ? 'safari'
              : 'autre';
  return {
    secure: !!w && (w.isSecureContext ?? true),
    ios,
    android,
    inApp,
    browser,
    // On vérifie que l'objet existe vraiment (certains navigateurs déclarent la propriété sans la fournir).
    ttsApi: !!w && !!(w as { speechSynthesis?: unknown }).speechSynthesis && typeof (w as { SpeechSynthesisUtterance?: unknown }).SpeechSynthesisUtterance === 'function',
    sttApi: !!w && !!(w.SpeechRecognition || w.webkitSpeechRecognition),
    recorderApi: !!w && 'MediaRecorder' in w && typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia,
  };
}

export interface Availability {
  ok: boolean;
  /** Pourquoi la fonction n'est pas disponible (en français), ou mise en garde si elle risque de ne pas marcher. */
  reason?: string;
  warning?: string;
}

const OPEN_IN_BROWSER = (env: SpeechEnvironment) =>
  env.ios ? 'Ouvrez le site dans Safari (bouton ⋯ ou « Ouvrir dans Safari »).' : 'Ouvrez le site dans Chrome (menu ⋮ → « Ouvrir dans le navigateur » ou « Ouvrir dans Chrome »).';

/** La reconnaissance vocale peut-elle être utilisée ici ? Message clair sinon. */
export function sttAvailability(env: SpeechEnvironment = detectSpeechEnvironment()): Availability {
  if (!env.secure) return { ok: false, reason: 'La reconnaissance vocale nécessite une connexion sécurisée (adresse en https://).' };
  if (!env.sttApi) {
    if (env.inApp) return { ok: false, reason: `Vous utilisez le navigateur intégré de ${env.inApp}, qui ne permet pas la reconnaissance vocale. ${OPEN_IN_BROWSER(env)}` };
    if (env.ios && env.browser !== 'safari')
      return { ok: false, reason: 'Sur iPad et iPhone, la reconnaissance vocale fonctionne dans Safari. Ouvrez le site dans Safari pour répondre à l’oral.' };
    if (env.browser === 'firefox') return { ok: false, reason: 'Firefox ne propose pas la reconnaissance vocale. Utilisez Chrome, Edge ou Safari pour l’oral, ou répondez par écrit.' };
    return { ok: false, reason: 'Ce navigateur ne propose pas la reconnaissance vocale. Utilisez Chrome ou Edge (ordinateur, Android) ou Safari (Mac, iPad, iPhone), ou répondez par écrit.' };
  }
  if (env.inApp) return { ok: true, warning: `Le navigateur intégré de ${env.inApp} bloque souvent le micro. Si l’oral ne marche pas : ${OPEN_IN_BROWSER(env)}` };
  if (env.browser === 'samsung') return { ok: true, warning: 'Samsung Internet gère mal la reconnaissance vocale. Si elle ne marche pas, ouvrez le site dans Chrome.' };
  return { ok: true };
}

export function ttsSupported(): boolean {
  try {
    return typeof window !== 'undefined' && !!window.speechSynthesis && typeof window.SpeechSynthesisUtterance === 'function' && typeof window.speechSynthesis.speak === 'function';
  } catch {
    return false;
  }
}

/** Liste des voix sans jamais lever d'erreur (certains navigateurs mobiles échouent ici). */
function safeVoices(): SpeechSynthesisVoice[] {
  try {
    return window.speechSynthesis.getVoices?.() ?? [];
  } catch {
    return [];
  }
}

/** La reconnaissance vocale est-elle utilisable ici (API présente et page sécurisée) ? */
export function sttSupported(): boolean {
  return sttAvailability().ok;
}

export type MicPermission = 'granted' | 'denied' | 'prompt' | 'unknown';

/** État de l'autorisation du micro, SANS la demander (quand le navigateur sait le dire). */
export async function micPermission(): Promise<MicPermission> {
  try {
    const status = await navigator.permissions?.query({ name: 'microphone' as PermissionName });
    if (status && (status.state === 'granted' || status.state === 'denied' || status.state === 'prompt')) return status.state;
  } catch {
    /* Firefox, anciens Safari : non pris en charge */
  }
  return 'unknown';
}

/** Comment réactiver le micro après un refus, selon l'appareil. */
export function micDeniedHelp(env: SpeechEnvironment = detectSpeechEnvironment()): string {
  if (env.ios)
    return 'Accès au micro refusé. Sur iPad/iPhone : touchez « aA » (ou l’icône à gauche de l’adresse) → Réglages du site web → Microphone → Autoriser, puis rechargez la page. Vérifiez aussi Réglages › Safari › Microphone.';
  if (env.android)
    return 'Accès au micro refusé. Dans Chrome : touchez l’icône à gauche de l’adresse → Autorisations → Micro → Autoriser, puis rechargez la page. Vérifiez aussi que Chrome a accès au micro dans les réglages Android (Applications › Chrome › Autorisations).';
  return 'Accès au micro refusé. Cliquez sur l’icône à gauche de l’adresse du site → Micro → Autoriser, puis rechargez la page.';
}

// ------------------------------------------------------------------ Synthèse vocale

export interface VoiceInfo {
  uri: string;
  name: string;
  lang: string;
  local: boolean;
}

let voicesCache: SpeechSynthesisVoice[] = [];

export function loadVoices(): Promise<VoiceInfo[]> {
  if (!ttsSupported()) return Promise.resolve([]);
  const map = (vs: SpeechSynthesisVoice[]) =>
    vs.filter((v) => v.lang.toLowerCase().replace('_', '-').startsWith('en')).map((v) => ({ uri: v.voiceURI, name: v.name, lang: v.lang.replace('_', '-'), local: v.localService }));
  const now = safeVoices();
  if (now.length) {
    voicesCache = now;
    return Promise.resolve(map(now));
  }
  return new Promise((resolve) => {
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      voicesCache = safeVoices();
      resolve(map(voicesCache));
    };
    try {
      window.speechSynthesis.addEventListener?.('voiceschanged', done, { once: true });
    } catch {
      /* rien : le délai ci-dessous suffit */
    }
    setTimeout(done, 1500);
  });
}

function pickVoice(accent: string, uri?: string): SpeechSynthesisVoice | undefined {
  const voices = voicesCache.length ? voicesCache : safeVoices();
  if (uri) {
    // La voix choisie sur un autre appareil (réglages synchronisés) n'existe pas forcément ici.
    const v = voices.find((x) => x.voiceURI === uri);
    if (v) return v;
  }
  const norm = (l: string) => l.replace('_', '-').toLowerCase();
  const exact = voices.filter((v) => norm(v.lang) === accent.toLowerCase());
  // On préfère les voix « naturelles » / « premium » quand elles existent.
  const preferred = exact.find((v) => /natural|premium|enhanced|google/i.test(v.name)) ?? exact[0];
  return preferred ?? voices.find((v) => norm(v.lang).startsWith('en'));
}

export interface SpeakOptions {
  accent?: string;
  voiceURI?: string;
  rate?: number;
  onEnd?: () => void;
}

// Référence vers l'énoncé en cours : sans elle, certains navigateurs le libèrent et « onend » n'arrive jamais.
let currentUtterance: SpeechSynthesisUtterance | null = null;
let currentFinish: (() => void) | null = null;

export function speak(text: string, opts: SpeakOptions = {}): boolean {
  if (!ttsSupported()) return false;
  try {
    return speakUnsafe(text, opts);
  } catch {
    // La lecture à voix haute ne doit jamais casser la page.
    opts.onEnd?.();
    return false;
  }
}

function speakUnsafe(text: string, opts: SpeakOptions): boolean {
  const synth = window.speechSynthesis;
  const busy = synth.speaking || synth.pending;
  if (busy) {
    currentFinish?.();
    synth.cancel();
  }
  if (synth.paused) synth.resume(); // Chrome peut rester « en pause » après une mise en veille
  const rate = opts.rate ?? 0.9;
  const u = new SpeechSynthesisUtterance(text.replace(/___/g, 'blank'));
  u.lang = opts.accent ?? 'en-US';
  const voice = pickVoice(u.lang, opts.voiceURI);
  if (voice) u.voice = voice;
  u.rate = rate;
  u.pitch = 1;
  let ended = false;
  // Filet de sécurité : si « onend » n'arrive pas (bug connu sur certains mobiles), on termine quand même.
  const watchdog = setTimeout(() => finish(), 4000 + (text.length * 150) / Math.max(0.3, rate));
  const finish = () => {
    if (ended) return;
    ended = true;
    clearTimeout(watchdog);
    if (currentUtterance === u) {
      currentUtterance = null;
      currentFinish = null;
    }
    opts.onEnd?.();
  };
  u.onend = finish;
  u.onerror = finish;
  currentUtterance = u;
  currentFinish = finish;
  // Safari ignore parfois une lecture lancée juste après cancel() : petit délai dans ce cas.
  if (busy) setTimeout(() => currentUtterance === u && synth.speak(u), 80);
  else synth.speak(u);
  return true;
}

export function stopSpeaking(): void {
  if (!ttsSupported()) return;
  currentFinish?.();
  try {
    window.speechSynthesis.cancel();
  } catch {
    /* rien */
  }
}

let unlockInstalled = false;

/**
 * Sur iPad/iPhone, la synthèse vocale reste muette tant qu'une première lecture n'a pas été lancée pendant un geste
 * de l'utilisateur. On « déverrouille » donc la voix au premier toucher, avec une lecture silencieuse.
 */
export function unlockSpeechOnFirstGesture(env: SpeechEnvironment = detectSpeechEnvironment()): void {
  if (unlockInstalled || !env.ios || !ttsSupported()) return;
  unlockInstalled = true;
  const unlock = () => {
    document.removeEventListener('touchend', unlock, true);
    document.removeEventListener('click', unlock, true);
    try {
      const synth = window.speechSynthesis;
      if (synth.speaking || synth.pending) return;
      const u = new SpeechSynthesisUtterance(' ');
      u.volume = 0;
      synth.speak(u);
    } catch {
      /* rien */
    }
  };
  document.addEventListener('touchend', unlock, true);
  document.addEventListener('click', unlock, true);
}

// ------------------------------------------------------------------ Reconnaissance vocale

interface RecognitionResultLike {
  isFinal: boolean;
  length: number;
  [i: number]: { transcript: string; confidence: number };
}

export interface RecognitionLike {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: { resultIndex?: number; results: ArrayLike<RecognitionResultLike> }) => void) | null;
  onerror: ((e: { error: string; message?: string }) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
  onaudiostart?: (() => void) | null;
  onspeechstart?: (() => void) | null;
}

export type RecognitionCtor = new () => RecognitionLike;

function recognitionCtor(): RecognitionCtor | undefined {
  if (typeof window === 'undefined') return undefined;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

export interface RecognitionHandle {
  stop(): void;
  abort(): void;
}

export interface RecognitionCallbacks {
  /** Le micro est réellement ouvert : l'utilisateur peut parler. */
  onStart?: () => void;
  onInterim?: (text: string) => void;
  onResult: (text: string, confidence: number | undefined) => void;
  onError: (message: string, code: string) => void;
  onEnd?: () => void;
  /** Journal technique (page de diagnostic). */
  onEvent?: (name: string, detail?: string) => void;
}

export interface RecognitionOptions {
  Ctor?: RecognitionCtor;
  env?: SpeechEnvironment;
  /** Délai maximal pour que le micro s'ouvre (ms). */
  startTimeoutMs?: number;
  /** Durée maximale d'écoute (ms). */
  maxListenMs?: number;
  /** Délai maximal entre « Arrêter » et la fin effective (ms). */
  stopGraceMs?: number;
}

export function recognitionErrorMessage(code: string, env: SpeechEnvironment = detectSpeechEnvironment()): string {
  const hint = env.inApp ? ` ${OPEN_IN_BROWSER(env)}` : '';
  switch (code) {
    case 'not-allowed':
      return micDeniedHelp(env) + hint;
    case 'service-not-allowed':
      if (env.ios || env.browser === 'safari')
        return 'La reconnaissance vocale est désactivée sur cet appareil. Sur iPad/iPhone : Réglages › Général › Clavier → activez « Dictée » (et vérifiez Réglages › Siri), puis réessayez.' + hint;
      return 'La reconnaissance vocale est bloquée par ce navigateur ou par ses réglages.' + (hint || ' Essayez avec Chrome, Edge ou Safari, ou répondez par écrit.');
    case 'no-speech':
      return 'Aucune parole détectée. Appuyez sur « Parler », attendez « Je vous écoute », puis parlez un peu plus fort et plus près de l’appareil.';
    case 'audio-capture':
      return 'Le micro est indisponible : il est peut-être utilisé par une autre application (appel, dictée, enregistrement) ou absent. Fermez les autres applications puis réessayez.';
    case 'network':
      return 'La reconnaissance vocale de ce navigateur a besoin d’Internet et n’a pas pu joindre son service. Vérifiez la connexion, ou répondez par écrit.' + hint;
    case 'language-not-supported':
      return 'La reconnaissance de l’anglais n’est pas disponible sur cet appareil. Ajoutez l’anglais dans les langues de dictée de l’appareil, ou répondez par écrit.';
    case 'bad-grammar':
      return 'Erreur interne de reconnaissance vocale. Réessayez, ou répondez par écrit.';
    case 'start-timeout':
      return 'Le micro ne s’est pas ouvert. Ce navigateur ne permet probablement pas la reconnaissance vocale.' + (hint || ' Rechargez la page et réessayez, ou utilisez Chrome, Edge ou Safari.');
    case 'start-failed':
      return 'Impossible de démarrer la reconnaissance vocale. Rechargez la page et réessayez, ou répondez par écrit.' + hint;
    case 'nothing-heard':
      return 'Je n’ai rien compris. Appuyez sur « Parler », attendez « Je vous écoute », puis dites la phrase en entier. Vous pouvez aussi répondre par écrit.';
    default:
      return `Erreur de reconnaissance vocale (${code}). Réessayez, ou répondez par écrit.${hint}`;
  }
}

/**
 * Fusionne les résultats « finaux » sans doublon. Chrome Android renvoie parfois des résultats cumulatifs
 * (« I », « I am », « I am happy ») ou répétés ; on ne garde alors que la version la plus complète.
 */
export function mergeFinalTranscripts(parts: string[]): string {
  let acc = '';
  for (const raw of parts) {
    const p = raw.trim();
    if (!p) continue;
    const a = acc.toLowerCase();
    const b = p.toLowerCase();
    if (!acc || b.startsWith(a)) acc = p;
    else if (a.endsWith(b) || a.includes(b)) continue;
    else acc = `${acc} ${p}`;
  }
  return acc;
}

let activeSession: { abort(): void } | null = null;

/** Démarre la reconnaissance vocale (l'autorisation du micro est demandée par le navigateur si nécessaire). */
export function startRecognition(lang: string, cb: RecognitionCallbacks, opts: RecognitionOptions = {}): RecognitionHandle | null {
  const env = opts.env ?? detectSpeechEnvironment();
  const avail = sttAvailability(env);
  const Ctor = opts.Ctor ?? recognitionCtor();
  if (!Ctor || !avail.ok) {
    cb.onError(avail.reason ?? recognitionErrorMessage('start-failed', env), 'unsupported');
    return null;
  }
  // Une seule écoute à la fois (évite les doubles lancements et l'erreur « already started »).
  activeSession?.abort();
  // Sur iPad/iPhone, une lecture en cours empêche le micro de capter : on l'arrête.
  stopSpeaking();

  const startTimeoutMs = opts.startTimeoutMs ?? 8000;
  const maxListenMs = opts.maxListenMs ?? 15000;
  const stopGraceMs = opts.stopGraceMs ?? 2500;
  const log = (name: string, detail?: string) => cb.onEvent?.(name, detail);

  const rec = new Ctor();
  rec.lang = lang;
  rec.interimResults = true;
  rec.maxAlternatives = 1;
  rec.continuous = false;

  let started = false;
  let done = false;
  let errorReported = false;
  let userAborted = false;
  let finals: string[] = [];
  let lastHeard = '';
  let confidence: number | undefined;
  const timers: ReturnType<typeof setTimeout>[] = [];
  const later = (ms: number, fn: () => void) => timers.push(setTimeout(fn, ms));

  const reportError = (code: string, message?: string) => {
    if (errorReported || done) return;
    errorReported = true;
    log('error', code);
    cb.onError(message ?? recognitionErrorMessage(code, env), code);
  };

  const onHidden = () => {
    if (document.visibilityState === 'hidden') session.abort();
  };

  const finish = () => {
    if (done) return;
    const text = mergeFinalTranscripts(finals) || lastHeard.trim();
    // Après une vraie erreur (réseau, micro…), on n'envoie pas un fragment incomplet comme réponse.
    if (text && !userAborted && !errorReported) {
      done = true;
      cleanup();
      log('final', text);
      cb.onResult(text, confidence);
    } else {
      if (!errorReported && !userAborted) reportError('nothing-heard');
      done = true;
      cleanup();
    }
    cb.onEnd?.();
  };

  const cleanup = () => {
    timers.forEach(clearTimeout);
    rec.onresult = rec.onerror = rec.onend = rec.onstart = null;
    if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onHidden);
    if (activeSession === session) activeSession = null;
  };

  const markStarted = (name: string) => {
    log(name);
    if (started) return;
    started = true;
    cb.onStart?.();
  };
  rec.onstart = () => markStarted('start');
  rec.onaudiostart = () => markStarted('audiostart');
  rec.onspeechstart = () => markStarted('speechstart');

  rec.onresult = (e) => {
    if (!started) markStarted('result-before-start');
    const nextFinals: string[] = [];
    let interim = '';
    for (let i = 0; i < e.results.length; i++) {
      const r = e.results[i];
      const alt = r[0];
      if (!alt) continue;
      if (r.isFinal) {
        nextFinals.push(alt.transcript);
        if (alt.confidence) confidence = alt.confidence;
      } else interim += alt.transcript;
    }
    finals = nextFinals;
    const heard = `${mergeFinalTranscripts(finals)} ${interim}`.trim();
    if (heard) lastHeard = heard; // Safari : souvent jamais « final », on garde le dernier texte entendu
    log('result', `${finals.length ? 'final' : 'partiel'} : ${heard}`);
    cb.onInterim?.(heard);
  };

  rec.onerror = (e) => {
    if (e.error === 'aborted' && userAborted) return;
    // « no-speech » alors qu'on a déjà entendu quelque chose : on garde le texte.
    if (e.error === 'no-speech' && lastHeard) return;
    reportError(e.error || 'inconnue');
  };

  rec.onend = () => {
    log('end');
    finish();
  };

  const session = {
    stop() {
      if (done) return;
      log('stop');
      try {
        rec.stop();
      } catch {
        /* déjà arrêtée */
      }
      // Safari ne déclenche parfois pas « onend » après stop().
      later(stopGraceMs, finish);
    },
    abort() {
      if (done) return;
      userAborted = true;
      log('abort');
      try {
        rec.abort();
      } catch {
        /* rien */
      }
      done = true;
      cleanup();
      cb.onEnd?.();
    },
  };

  try {
    rec.start();
  } catch (err) {
    log('start-exception', String(err));
    reportError('start-failed');
    done = true;
    cleanup();
    return null;
  }
  activeSession = session;
  if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onHidden);
  log('start-requested', lang);
  // Le micro ne s'ouvre jamais (WebView, service indisponible) : on n'attend pas indéfiniment.
  later(startTimeoutMs, () => {
    if (started || done) return;
    reportError('start-timeout');
    try {
      rec.abort();
    } catch {
      /* rien */
    }
    done = true;
    cleanup();
    cb.onEnd?.();
  });
  // Écoute trop longue (Safari ne s'arrête pas toujours seul) : on arrête proprement.
  later(maxListenMs, () => session.stop());
  return session;
}

// ------------------------------------------------------------------ S'enregistrer pour se réécouter

export function recorderSupported(): boolean {
  const env = detectSpeechEnvironment();
  return env.recorderApi && env.secure;
}

export interface Recording {
  stop(): Promise<string>;
  cancel(): void;
}

/** Message clair pour une erreur de getUserMedia / MediaRecorder. */
export function recordingErrorMessage(err: unknown, env: SpeechEnvironment = detectSpeechEnvironment()): string {
  const name = (err as { name?: string })?.name ?? '';
  if (name === 'NotAllowedError' || name === 'SecurityError') return micDeniedHelp(env);
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return 'Aucun micro n’a été trouvé sur cet appareil.';
  if (name === 'NotReadableError' || name === 'AbortError') return 'Le micro est utilisé par une autre application. Fermez-la puis réessayez.';
  if (name === 'NotSupportedError') return 'L’enregistrement audio n’est pas pris en charge par ce navigateur.';
  return 'Micro indisponible. Réessayez, ou rechargez la page.';
}

function pickMimeType(): string | undefined {
  const MR = (window as unknown as { MediaRecorder?: { isTypeSupported?: (t: string) => boolean } }).MediaRecorder;
  for (const t of ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/aac']) {
    try {
      if (MR?.isTypeSupported?.(t)) return t;
    } catch {
      /* rien */
    }
  }
  return undefined;
}

/** Enregistre le micro. L'audio reste en mémoire (URL locale) et n'est jamais envoyé ni sauvegardé. */
export async function startRecording(): Promise<Recording> {
  stopSpeaking();
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const release = () => stream.getTracks().forEach((t) => t.stop());
  let recorder: MediaRecorder;
  try {
    const mimeType = pickMimeType();
    recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
    recorder.start();
  } catch (err) {
    release(); // ne jamais laisser le micro allumé
    throw err;
  }
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size) chunks.push(e.data);
  };
  return {
    stop: () =>
      new Promise((resolve) => {
        const done = () => {
          release();
          resolve(URL.createObjectURL(new Blob(chunks, { type: recorder.mimeType || 'audio/webm' })));
        };
        if (recorder.state === 'inactive') return done();
        recorder.onstop = done;
        recorder.stop();
      }),
    cancel: () => {
      try {
        if (recorder.state !== 'inactive') recorder.stop();
      } catch {
        /* rien */
      }
      release();
    },
  };
}
