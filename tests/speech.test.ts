// Fonctions vocales : détection de compatibilité et reconnaissance vocale, avec un moteur simulé qui reproduit
// les comportements réels de Safari (iPad/iPhone), Chrome Android et des navigateurs intégrés.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  detectSpeechEnvironment,
  mergeFinalTranscripts,
  recognitionErrorMessage,
  recordingErrorMessage,
  startRecognition,
  sttAvailability,
  type RecognitionLike,
  type SpeechEnvironment,
} from '../src/services/speech';

const UA = {
  ipadSafari: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
  macSafari: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
  iphoneChrome: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0 Mobile/15E148 Safari/604.1',
  iphoneInstagram: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 350.0',
  androidChrome: 'Mozilla/5.0 (Linux; Android 14; SM-X200) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36',
  androidFacebook: 'Mozilla/5.0 (Linux; Android 14; SM-X200; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/130.0 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/480.0;]',
  androidWebView: 'Mozilla/5.0 (Linux; Android 14; SM-X200; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/130.0 Safari/537.36',
  samsung: 'Mozilla/5.0 (Linux; Android 14; SM-X200) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/26.0 Chrome/122.0 Safari/537.36',
  firefox: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:131.0) Gecko/20100101 Firefox/131.0',
  edge: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36 Edg/130.0',
};

const withStt = { isSecureContext: true, speechSynthesis: {}, SpeechSynthesisUtterance: function () {}, webkitSpeechRecognition: function () {} } as never;
const withoutStt = { isSecureContext: true, speechSynthesis: {}, SpeechSynthesisUtterance: function () {} } as never;

describe('détection de compatibilité vocale', () => {
  it('reconnaît un iPad (qui se présente comme un Mac) grâce à l’écran tactile', () => {
    const env = detectSpeechEnvironment(UA.ipadSafari, withStt, 5);
    expect(env).toMatchObject({ ios: true, browser: 'safari', inApp: null, sttApi: true, ttsApi: true });
    expect(detectSpeechEnvironment(UA.macSafari, withStt, 0).ios).toBe(false);
    expect(sttAvailability(env).ok).toBe(true);
  });

  it('sur iPhone hors Safari, conseille d’ouvrir Safari', () => {
    const a = sttAvailability(detectSpeechEnvironment(UA.iphoneChrome, withoutStt, 5));
    expect(a.ok).toBe(false);
    expect(a.reason).toMatch(/Safari/);
  });

  it('dans un navigateur intégré (Instagram, Facebook), explique comment ouvrir le vrai navigateur', () => {
    const insta = sttAvailability(detectSpeechEnvironment(UA.iphoneInstagram, withoutStt, 5));
    expect(insta.ok).toBe(false);
    expect(insta.reason).toMatch(/Instagram.*Safari/);
    const fb = sttAvailability(detectSpeechEnvironment(UA.androidFacebook, withStt, 5));
    expect(fb.ok).toBe(true); // l'API existe : on laisse essayer, mais on prévient
    expect(fb.warning).toMatch(/Facebook.*Chrome/);
    expect(detectSpeechEnvironment(UA.androidWebView, withStt, 5).inApp).not.toBeNull();
  });

  it('Chrome Android, Edge, Samsung Internet et Firefox', () => {
    expect(sttAvailability(detectSpeechEnvironment(UA.androidChrome, withStt, 5))).toEqual({ ok: true });
    expect(detectSpeechEnvironment(UA.edge, withStt, 0).browser).toBe('edge');
    expect(sttAvailability(detectSpeechEnvironment(UA.samsung, withStt, 5)).warning).toMatch(/Chrome/);
    const ff = sttAvailability(detectSpeechEnvironment(UA.firefox, withoutStt, 0));
    expect(ff.ok).toBe(false);
    expect(ff.reason).toMatch(/Firefox/);
  });

  it('exige une connexion sécurisée (https)', () => {
    const a = sttAvailability(detectSpeechEnvironment(UA.androidChrome, { ...(withStt as object), isSecureContext: false } as never, 5));
    expect(a.ok).toBe(false);
    expect(a.reason).toMatch(/https/);
  });

  it('messages d’erreur adaptés à l’appareil', () => {
    const ipad = detectSpeechEnvironment(UA.ipadSafari, withStt, 5);
    expect(recognitionErrorMessage('service-not-allowed', ipad)).toMatch(/Dictée/);
    expect(recognitionErrorMessage('not-allowed', ipad)).toMatch(/Réglages du site web/);
    expect(recognitionErrorMessage('not-allowed', detectSpeechEnvironment(UA.androidChrome, withStt, 5))).toMatch(/Chrome/);
    expect(recordingErrorMessage({ name: 'NotAllowedError' }, ipad)).toMatch(/refusé/);
    expect(recordingErrorMessage({ name: 'NotFoundError' }, ipad)).toMatch(/Aucun micro/);
    expect(recordingErrorMessage({ name: 'NotReadableError' }, ipad)).toMatch(/autre application/);
  });
});

describe('fusion des résultats', () => {
  it('ne répète pas les résultats cumulatifs ou en double (Chrome Android)', () => {
    expect(mergeFinalTranscripts(['I', 'I am', 'I am a teacher'])).toBe('I am a teacher');
    expect(mergeFinalTranscripts(['I am a teacher', 'I am a teacher'])).toBe('I am a teacher');
    expect(mergeFinalTranscripts(['Hello', 'how are you'])).toBe('Hello how are you');
    expect(mergeFinalTranscripts(['', '  '])).toBe('');
  });
});

// ------------------------------------------------------------------ Moteur simulé

class FakeRecognition implements RecognitionLike {
  static instances: FakeRecognition[] = [];
  static throwOnStart = false;
  lang = '';
  interimResults = false;
  maxAlternatives = 1;
  continuous = false;
  started = false;
  stopped = false;
  aborted = false;
  onresult: RecognitionLike['onresult'] = null;
  onerror: RecognitionLike['onerror'] = null;
  onend: RecognitionLike['onend'] = null;
  onstart: RecognitionLike['onstart'] = null;
  onaudiostart: RecognitionLike['onaudiostart'] = null;
  onspeechstart: RecognitionLike['onspeechstart'] = null;
  constructor() {
    FakeRecognition.instances.push(this);
  }
  start() {
    if (FakeRecognition.throwOnStart) throw new Error('InvalidStateError');
    this.started = true;
  }
  stop() {
    this.stopped = true;
  }
  abort() {
    this.aborted = true;
  }
  emit(results: { text: string; final: boolean; confidence?: number }[]) {
    const list = results.map((r) => Object.assign([{ transcript: r.text, confidence: r.confidence ?? 0 }], { isFinal: r.final }));
    this.onresult?.({ results: list });
  }
}

const env: SpeechEnvironment = { secure: true, ios: false, android: true, inApp: null, browser: 'chrome', ttsApi: true, sttApi: true, recorderApi: true };

function run(opts: Partial<Parameters<typeof startRecognition>[2]> = {}) {
  const calls = { results: [] as string[], errors: [] as string[], ends: 0, starts: 0, interim: [] as string[] };
  const handle = startRecognition(
    'en-US',
    {
      onStart: () => calls.starts++,
      onInterim: (t) => calls.interim.push(t),
      onResult: (t) => calls.results.push(t),
      onError: (_m, code) => calls.errors.push(code),
      onEnd: () => calls.ends++,
    },
    { Ctor: FakeRecognition, env, ...opts },
  );
  return { handle, calls, rec: FakeRecognition.instances.at(-1)! };
}

describe('reconnaissance vocale', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    FakeRecognition.instances = [];
    FakeRecognition.throwOnStart = false;
  });
  afterEach(() => vi.useRealTimers());

  it('cas normal : micro ouvert, résultat final, fin', () => {
    const { calls, rec } = run();
    expect(rec.started).toBe(true);
    expect(rec.lang).toBe('en-US');
    rec.onstart?.();
    rec.emit([{ text: 'I am a', final: false }]);
    rec.emit([{ text: 'I am a teacher', final: true, confidence: 0.9 }]);
    rec.onend?.();
    expect(calls).toMatchObject({ starts: 1, results: ['I am a teacher'], errors: [], ends: 1 });
  });

  it('Safari : aucun résultat « final » → on garde le dernier texte entendu (cause de panne silencieuse)', () => {
    const { calls, rec } = run({ env: { ...env, ios: true, android: false, browser: 'safari' } });
    rec.onstart?.();
    rec.emit([{ text: 'Hello', final: false }]);
    rec.emit([{ text: 'Hello how are you', final: false }]);
    rec.onend?.();
    expect(calls.results).toEqual(['Hello how are you']);
    expect(calls.errors).toEqual([]);
  });

  it('Chrome Android : résultats finaux répétés → une seule phrase', () => {
    const { calls, rec } = run();
    rec.onstart?.();
    rec.emit([
      { text: 'I live in Lyon', final: true },
      { text: 'I live in Lyon', final: true },
    ]);
    rec.onend?.();
    expect(calls.results).toEqual(['I live in Lyon']);
  });

  it('fin sans rien entendu : message clair au lieu d’un retour silencieux', () => {
    const { calls, rec } = run();
    rec.onstart?.();
    rec.onend?.();
    expect(calls.results).toEqual([]);
    expect(calls.errors).toEqual(['nothing-heard']);
    expect(calls.ends).toBe(1);
  });

  it('permission refusée : erreur « not-allowed », aucun résultat, un seul message', () => {
    const { calls, rec } = run();
    rec.onerror?.({ error: 'not-allowed' });
    rec.onend?.();
    expect(calls.errors).toEqual(['not-allowed']);
    expect(calls.results).toEqual([]);
    expect(calls.ends).toBe(1);
  });

  it('« no-speech » après avoir entendu une phrase : la phrase est conservée', () => {
    const { calls, rec } = run();
    rec.onstart?.();
    rec.emit([{ text: 'Good morning', final: false }]);
    rec.onerror?.({ error: 'no-speech' });
    rec.onend?.();
    expect(calls.results).toEqual(['Good morning']);
    expect(calls.errors).toEqual([]);
  });

  it('erreur réseau en cours de phrase : pas de fragment envoyé comme réponse', () => {
    const { calls, rec } = run();
    rec.onstart?.();
    rec.emit([{ text: 'I would', final: false }]);
    rec.onerror?.({ error: 'network' });
    rec.onend?.();
    expect(calls.results).toEqual([]);
    expect(calls.errors).toEqual(['network']);
  });

  it('le micro ne s’ouvre jamais (WebView) : abandon après le délai, pas de chargement infini', () => {
    const { calls, rec } = run();
    vi.advanceTimersByTime(8100);
    expect(rec.aborted).toBe(true);
    expect(calls.errors).toEqual(['start-timeout']);
    expect(calls.ends).toBe(1);
  });

  it('« J’ai fini » sans événement de fin (Safari) : terminé quand même avec le texte entendu', () => {
    const { calls, handle, rec } = run();
    rec.onstart?.();
    rec.emit([{ text: 'See you tomorrow', final: false }]);
    handle!.stop();
    expect(rec.stopped).toBe(true);
    vi.advanceTimersByTime(2600);
    expect(calls.results).toEqual(['See you tomorrow']);
    expect(calls.ends).toBe(1);
    rec.onend?.(); // un « onend » tardif ne déclenche rien de plus
    expect(calls.ends).toBe(1);
  });

  it('écoute trop longue : arrêt automatique', () => {
    const { calls, rec } = run();
    rec.onstart?.();
    rec.emit([{ text: 'This is a long answer', final: false }]);
    vi.advanceTimersByTime(15000 + 2600);
    expect(rec.stopped).toBe(true);
    expect(calls.results).toEqual(['This is a long answer']);
  });

  it('pas de double lancement : la nouvelle écoute coupe la précédente', () => {
    const first = run();
    const second = run();
    expect(first.rec.aborted).toBe(true);
    expect(first.calls.ends).toBe(1);
    expect(first.calls.errors).toEqual([]);
    second.rec.onstart?.();
    second.rec.emit([{ text: 'Yes', final: true }]);
    second.rec.onend?.();
    expect(second.calls.results).toEqual(['Yes']);
  });

  it('annulation par l’utilisateur (changement de page) : aucun message d’erreur', () => {
    const { calls, handle, rec } = run();
    handle!.abort();
    rec.onerror?.({ error: 'aborted' });
    rec.onend?.();
    expect(calls).toMatchObject({ errors: [], results: [], ends: 1 });
  });

  it('démarrage impossible (exception) : null et message', () => {
    FakeRecognition.throwOnStart = true;
    const { handle, calls } = run();
    expect(handle).toBeNull();
    expect(calls.errors).toEqual(['start-failed']);
  });

  it('API absente : message explicatif, rien n’est lancé', () => {
    const { handle, calls } = run({ env: { ...env, sttApi: false, browser: 'firefox', android: false } });
    expect(handle).toBeNull();
    expect(calls.errors).toEqual(['unsupported']);
    expect(FakeRecognition.instances).toHaveLength(0);
  });
});
