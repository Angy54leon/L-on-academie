// Diagnostic de la connexion au serveur de comptes (réseau SIMULÉ : aucun vrai serveur Supabase n'est contacté).
import { describe, expect, it } from 'vitest';
import { frenchAuthError, isNetworkAuthError } from '../src/services/auth';
import { checkSupabaseUrl, describeKey, diagnoseSupabase } from '../src/services/supabaseHealth';
import { withoutKeyAsBearer } from '../src/services/supabase';

const URL_OK = 'https://acjklhkkufoxfckcalop.supabase.co';
const KEY = 'sb_publishable_test_0123456789abcdef';
const json = (status: number, body: unknown = {}) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const corsFail = () => Promise.reject(new TypeError('Failed to fetch'));

/** Réseau simulé : `routes` décide de la réponse selon l'adresse et le mode de la requête. */
function net(routes: (url: string, init?: RequestInit) => Promise<Response>) {
  const calls: string[] = [];
  const fetchImpl = (url: string, init?: RequestInit) => {
    calls.push(`${init?.mode ?? 'cors'} ${init?.method ?? 'GET'} ${url}`);
    return routes(url, init);
  };
  return { fetchImpl, calls };
}

describe('adresse du projet Supabase (VITE_SUPABASE_URL)', () => {
  it('accepte l’adresse normale et corrige les suffixes copiés par erreur', () => {
    expect(checkSupabaseUrl(URL_OK)).toEqual({ ok: true, normalized: URL_OK });
    expect(checkSupabaseUrl(`${URL_OK}/`).normalized).toBe(URL_OK);
    expect(checkSupabaseUrl(`${URL_OK}/rest/v1/`).normalized).toBe(URL_OK);
    expect(checkSupabaseUrl(' https://acjklhkkufoxfckcalop.supabase.co/auth/v1 ').normalized).toBe(URL_OK);
    expect(checkSupabaseUrl('http://127.0.0.1:54321').ok).toBe(true);
  });

  it('refuse les erreurs fréquentes avec une explication', () => {
    expect(checkSupabaseUrl('https://supabase.com/dashboard/project/acjklhkkufoxfckcalop').problem).toMatch(/tableau de bord/);
    expect(checkSupabaseUrl('acjklhkkufoxfckcalop.supabase.co').ok).toBe(false);
    expect(checkSupabaseUrl('http://acjklhkkufoxfckcalop.supabase.co').problem).toMatch(/https/);
    expect(checkSupabaseUrl(`${URL_OK}/project/settings`).problem).toMatch(/chemin/);
    expect(checkSupabaseUrl('').ok).toBe(false);
  });

  it('décrit la clé sans jamais l’afficher', () => {
    expect(describeKey(KEY)).toBe('clé « publishable » (sb_publishable_…)');
    expect(describeKey('sb_secret_abc')).toMatch(/SECRÈTE/);
    const jwt = `x.${btoa(JSON.stringify({ role: 'anon' }))}.y`;
    expect(describeKey(jwt)).toBe('clé JWT (rôle : anon)');
    expect(describeKey(KEY)).not.toContain('0123456789');
  });
});

describe('diagnostic quand la connexion échoue', () => {
  it('réponse illisible partout (sans CORS) : réseau qui intercepte OU projet en pause — les deux pistes, sans conclure à tort', async () => {
    const { fetchImpl } = net((_u, init) => (init?.mode === 'no-cors' ? Promise.resolve(new Response(null, { status: 200 })) : corsFail()));
    const r = await diagnoseSupabase({ url: URL_OK, key: KEY, fetchImpl, online: true, selfUrl: 'https://l-on-academie.vercel.app/' });
    expect(r.kind).toBe('blocked');
    expect(r.message).toMatch(/réseau ou un appareil/);
    expect(r.message).toMatch(/en pause/);
    expect(r.action).toMatch(/4G/);
    expect(r.action).toMatch(/Restore project/);
  });

  it('requête simple lisible mais requête avec la clé bloquée : filtre réseau/appareil (pas le site)', async () => {
    const { fetchImpl } = net((_u, init) => {
      const h = new Headers(init?.headers);
      if (h.has('apikey')) return corsFail();
      return Promise.resolve(json(401, { message: 'No API key found in request' }));
    });
    const r = await diagnoseSupabase({ url: URL_OK, key: KEY, fetchImpl, online: true });
    expect(r.kind).toBe('blocked');
    expect(r.message).toMatch(/réseau ou de l’appareil/);
    expect(r.details.join(' ')).toMatch(/Test simple sans clé : HTTP 401/);
  });

  it('jamais la clé « publishable » en jeton Bearer (recommandation Supabase)', async () => {
    const seen: Headers[] = [];
    const fetchImpl = (_u: string, init?: RequestInit) => {
      seen.push(new Headers(init?.headers));
      return Promise.resolve(json(200, {}));
    };
    await diagnoseSupabase({ url: URL_OK, key: KEY, fetchImpl, online: true });
    expect(seen[0].get('apikey')).toBe(KEY);
    expect(seen[0].get('Authorization')).toBeNull();
  });

  it('adresse introuvable (faute de frappe, projet supprimé, réseau filtrant) mais Internet OK', async () => {
    const { fetchImpl } = net((u) => (u.startsWith('https://l-on-academie') ? Promise.resolve(new Response(null, { status: 200 })) : corsFail()));
    const r = await diagnoseSupabase({ url: 'https://acjklhkkufoxfckcalxx.supabase.co', key: KEY, fetchImpl, online: true, selfUrl: 'https://l-on-academie.vercel.app/' });
    expect(r.kind).toBe('unreachable');
    expect(r.action).toMatch(/VITE_SUPABASE_URL/);
  });

  it('appareil réellement hors ligne', async () => {
    const { fetchImpl } = net(() => corsFail());
    expect((await diagnoseSupabase({ url: URL_OK, key: KEY, fetchImpl, online: true, selfUrl: 'https://l-on-academie.vercel.app/' })).kind).toBe('offline');
    expect((await diagnoseSupabase({ url: URL_OK, key: KEY, fetchImpl, online: false })).kind).toBe('offline');
  });

  it('clé publique refusée (401)', async () => {
    const { fetchImpl } = net(() => Promise.resolve(json(401, { message: 'Invalid API key' })));
    const r = await diagnoseSupabase({ url: URL_OK, key: KEY, fetchImpl, online: true });
    expect(r.kind).toBe('bad-key');
    expect(r.action).toMatch(/VITE_SUPABASE_ANON_KEY/);
  });

  it('tables non créées (fichiers SQL non exécutés)', async () => {
    const { fetchImpl } = net((u) => Promise.resolve(u.includes('/rest/v1/') ? json(404, { code: 'PGRST205', message: "Could not find the table 'public.learner_states'" }) : json(200, { name: 'GoTrue' })));
    const r = await diagnoseSupabase({ url: URL_OK, key: KEY, fetchImpl, online: true });
    expect(r.kind).toBe('no-tables');
    expect(r.action).toMatch(/20261009000000_init\.sql/);
  });

  it('tout va bien : serveur joignable et tables présentes (le visiteur anonyme n’a aucun droit)', async () => {
    const { fetchImpl, calls } = net((u) => Promise.resolve(u.includes('/rest/v1/') ? json(401, { code: '42501', message: 'permission denied for table learner_states' }) : json(200, { name: 'GoTrue' })));
    const r = await diagnoseSupabase({ url: URL_OK, key: KEY, fetchImpl, online: true });
    expect(r.kind).toBe('ok');
    expect(calls[0]).toBe(`cors GET ${URL_OK}/auth/v1/health`);
    expect(r.details.join(' ')).not.toContain('0123456789'); // jamais la clé dans le rapport
  });

  it('erreur 503 / 540 de l’infrastructure : pause ou indisponibilité', async () => {
    const { fetchImpl } = net(() => Promise.resolve(new Response('paused', { status: 540 })));
    expect((await diagnoseSupabase({ url: URL_OK, key: KEY, fetchImpl, online: true })).kind).toBe('paused');
  });

  it('configuration absente, adresse fausse ou clé secrète : détecté sans requête', async () => {
    const { fetchImpl, calls } = net(() => corsFail());
    expect((await diagnoseSupabase({ url: '', key: '', fetchImpl })).kind).toBe('not-configured');
    expect((await diagnoseSupabase({ url: 'https://supabase.com/dashboard/project/x', key: KEY, fetchImpl })).kind).toBe('bad-url');
    expect((await diagnoseSupabase({ url: URL_OK, key: 'sb_secret_123', fetchImpl })).kind).toBe('bad-key');
    expect(calls).toEqual([]);
  });

  it('serveur muet : le test s’arrête après le délai', async () => {
    const fetchImpl = (_u: string, init?: RequestInit) =>
      new Promise<Response>((_, rej) => init?.signal?.addEventListener('abort', () => rej(Object.assign(new Error('aborted'), { name: 'AbortError' }))));
    const r = await diagnoseSupabase({ url: URL_OK, key: KEY, fetchImpl, online: true, timeoutMs: 50 });
    expect(['offline', 'unreachable', 'paused']).toContain(r.kind);
  });
});

describe('messages d’erreur de connexion', () => {
  it('reconnaît les erreurs réseau de Chrome, Safari, Firefox et de Supabase', () => {
    expect(isNetworkAuthError({ name: 'AuthRetryableFetchError', message: 'Failed to fetch', status: 0 })).toBe(true);
    expect(isNetworkAuthError({ message: 'Load failed' })).toBe(true); // Safari
    expect(isNetworkAuthError({ message: 'NetworkError when attempting to fetch resource.' })).toBe(true); // Firefox
    expect(isNetworkAuthError({ name: 'AuthApiError', message: 'Invalid login credentials', status: 400 })).toBe(false);
  });

  it('ne dit plus « vérifiez votre connexion Internet » quand c’est le serveur qui est en cause', () => {
    expect(frenchAuthError('Failed to fetch')).not.toMatch(/connexion Internet/);
    expect(frenchAuthError('Invalid login credentials')).toBe('E-mail ou mot de passe incorrect.');
    expect(frenchAuthError('Invalid API key')).toMatch(/clé publique/);
    expect(frenchAuthError("Could not find the table 'public.learner_states' in the schema cache")).toMatch(/pas encore initialisée/);
    expect(frenchAuthError('Database error saving new user')).toMatch(/fichiers SQL/);
  });
});

describe('envoi de la clé « publishable »', () => {
  it('retire « Authorization: Bearer <clé> » mais garde le jeton d’un utilisateur connecté', async () => {
    const sent: Headers[] = [];
    const base = (async (_i: RequestInfo | URL, init?: RequestInit) => {
      sent.push(new Headers(init?.headers));
      return new Response('{}');
    }) as typeof fetch;
    const f = withoutKeyAsBearer(KEY, base);
    await f('https://x/auth/v1/token', { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } });
    await f('https://x/rest/v1/t', { headers: { apikey: KEY, Authorization: 'Bearer user.jwt.token' } });
    expect(sent[0].get('Authorization')).toBeNull();
    expect(sent[0].get('apikey')).toBe(KEY);
    expect(sent[1].get('Authorization')).toBe('Bearer user.jwt.token');
    // Ancienne clé JWT « anon » : comportement inchangé.
    expect(withoutKeyAsBearer('eyJhbGciOi.payload.sig', base)).toBe(base);
  });
});
