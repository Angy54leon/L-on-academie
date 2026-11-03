// Diagnostic de la connexion au serveur de comptes (Supabase), exécuté depuis le navigateur de l'utilisateur.
//
// Pourquoi : quand le navigateur ne peut pas joindre Supabase, il ne renvoie qu'une erreur générique
// (« Failed to fetch » / « Load failed »), quelle qu'en soit la cause. Les causes réelles sont très différentes :
//   - projet Supabase EN PAUSE (offre gratuite : pause après 7 jours d'inactivité) → réponses sans en-têtes CORS ;
//   - adresse du projet mal saisie dans Vercel (VITE_SUPABASE_URL) → serveur introuvable ;
//   - clé publique incorrecte → 401 ;
//   - tables non créées (fichiers SQL non exécutés) → la connexion marche mais la progression ne peut pas être lue ;
//   - appareil réellement hors ligne, ou bloqueur / réseau filtrant.
// On teste chaque hypothèse pour afficher la vraie cause et la marche à suivre, sans jamais exposer la clé.

export type HealthKind = 'ok' | 'offline' | 'bad-url' | 'unreachable' | 'paused' | 'unavailable' | 'bad-key' | 'no-tables' | 'not-configured';

export interface HealthReport {
  kind: HealthKind;
  /** Message pour l'utilisateur (français). */
  message: string;
  /** Ce que le propriétaire du site doit faire. */
  action?: string;
  /** Détails techniques (sans secret) pour un rapport. */
  details: string[];
}

export interface UrlCheck {
  ok: boolean;
  /** Adresse corrigée (barre finale ou suffixe /rest/v1 retirés). */
  normalized: string;
  problem?: string;
}

/** Vérifie et normalise l'adresse du projet Supabase (erreurs de copier-coller fréquentes). */
export function checkSupabaseUrl(raw: string): UrlCheck {
  const url = (raw ?? '').trim();
  if (!url) return { ok: false, normalized: '', problem: 'Adresse du projet Supabase absente (variable VITE_SUPABASE_URL).' };
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return { ok: false, normalized: url, problem: `Adresse du projet Supabase invalide : « ${url} ». Elle doit ressembler à https://abcdefghijklmnopqrst.supabase.co` };
  }
  const local = /^(localhost|127\.0\.0\.1)$/.test(u.hostname);
  if (u.protocol !== 'https:' && !(local && u.protocol === 'http:'))
    return { ok: false, normalized: url, problem: 'L’adresse du projet Supabase doit commencer par https://' };
  if (/(^|\.)supabase\.com$/i.test(u.hostname))
    return {
      ok: false,
      normalized: url,
      problem: 'VITE_SUPABASE_URL contient l’adresse du tableau de bord Supabase (supabase.com), pas celle de l’API du projet. Utilisez « Project URL » : https://VOTRE-REF.supabase.co',
    };
  // On tolère les suffixes copiés par erreur (/rest/v1, /auth/v1) et la barre finale.
  const path = u.pathname.replace(/\/+$/, '').replace(/\/(rest|auth|storage|functions)\/v1$/i, '');
  if (path && path !== '/') return { ok: false, normalized: url, problem: `L’adresse du projet Supabase ne doit pas contenir de chemin (« ${u.pathname} »). Utilisez seulement https://VOTRE-REF.supabase.co` };
  return { ok: true, normalized: `${u.protocol}//${u.host}` };
}

/** Type de clé publique (jamais la clé elle-même). */
export function describeKey(key: string): string {
  const k = (key ?? '').trim();
  if (!k) return 'absente';
  if (k.startsWith('sb_publishable_')) return 'clé « publishable » (sb_publishable_…)';
  if (k.startsWith('sb_secret_')) return '⚠️ clé SECRÈTE (à ne jamais utiliser dans le site)';
  const payload = k.split('.')[1];
  if (payload) {
    try {
      const role = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))).role;
      return `clé JWT (rôle : ${role ?? 'inconnu'})`;
    } catch {
      return 'clé illisible';
    }
  }
  return 'format de clé inconnu';
}

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

interface DiagnoseOptions {
  url: string;
  key: string;
  fetchImpl?: FetchLike;
  online?: boolean;
  timeoutMs?: number;
  /** Adresse de la page elle-même, pour vérifier que l'appareil a bien Internet. */
  selfUrl?: string;
}

async function timed(fetchImpl: FetchLike, url: string, init: RequestInit, ms: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetchImpl(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

const PAUSED_ACTION =
  'Ouvrez https://supabase.com/dashboard, choisissez le projet : s’il affiche « Paused » / « En pause », cliquez sur « Restore project » (gratuit) et attendez quelques minutes. Sur l’offre gratuite, un projet inutilisé pendant 7 jours est mis en pause automatiquement.';

/** Diagnostique la connexion au serveur de comptes, étape par étape. */
export async function diagnoseSupabase(opts: DiagnoseOptions): Promise<HealthReport> {
  const fetchImpl: FetchLike = opts.fetchImpl ?? ((i, init) => fetch(i, init));
  const ms = opts.timeoutMs ?? 8000;
  const urlCheck = checkSupabaseUrl(opts.url);
  const details = [`Serveur de comptes : ${urlCheck.normalized || '(non défini)'}`, `Clé publique : ${describeKey(opts.key)}`];

  if (!opts.url || !opts.key) return { kind: 'not-configured', message: 'Les comptes ne sont pas configurés sur ce site.', action: 'Renseignez VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY dans Vercel (Settings → Environment Variables), puis « Redeploy ».', details };
  if (!urlCheck.ok) return { kind: 'bad-url', message: 'L’adresse du serveur de comptes configurée sur ce site est incorrecte.', action: `${urlCheck.problem} À corriger dans Vercel (Settings → Environment Variables), puis « Redeploy ».`, details };
  if (describeKey(opts.key).includes('SECRÈTE')) return { kind: 'bad-key', message: 'Une clé secrète est configurée à la place de la clé publique.', action: 'Remplacez VITE_SUPABASE_ANON_KEY par la clé « publishable » ou « anon », puis « Redeploy ». Régénérez la clé secrète dans Supabase.', details };
  if (opts.online === false) return { kind: 'offline', message: 'Cet appareil est hors ligne. Reconnectez-vous à Internet puis réessayez.', details };

  const base = urlCheck.normalized;
  const headers = { apikey: opts.key, Authorization: `Bearer ${opts.key}` };

  // 1. Serveur d'authentification joignable (requête « CORS » normale, comme la connexion) ?
  let health: Response | null = null;
  let healthError = '';
  try {
    health = await timed(fetchImpl, `${base}/auth/v1/health`, { headers }, ms);
  } catch (e) {
    healthError = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
  }
  if (health) details.push(`Test du serveur d’authentification : HTTP ${health.status}`);

  if (!health) {
    details.push(`Test du serveur d’authentification : échec (${healthError})`);
    // 2. Le serveur répond-il sans en-têtes CORS (projet en pause / en cours de redémarrage) ?
    let opaque = false;
    try {
      await timed(fetchImpl, `${base}/auth/v1/health`, { mode: 'no-cors' }, ms);
      opaque = true;
    } catch {
      opaque = false;
    }
    details.push(`Serveur joignable sans CORS : ${opaque ? 'oui' : 'non'}`);
    if (opaque)
      return {
        kind: 'paused',
        message: 'Le serveur de comptes répond, mais refuse les connexions depuis le site : le projet Supabase est très probablement en pause (ou en train de redémarrer).',
        action: PAUSED_ACTION,
        details,
      };
    // 3. L'appareil a-t-il Internet ? (requête vers le site lui-même)
    let internet = true;
    if (opts.selfUrl) {
      try {
        await timed(fetchImpl, opts.selfUrl, { method: 'HEAD' }, ms);
      } catch {
        internet = false;
      }
      details.push(`Accès au site lui-même : ${internet ? 'oui' : 'non'}`);
    }
    if (!internet) return { kind: 'offline', message: 'Cet appareil n’arrive pas à joindre Internet. Vérifiez la connexion puis réessayez.', details };
    return {
      kind: 'unreachable',
      message: `Le serveur de comptes (${new URL(base).host}) est introuvable depuis cet appareil.`,
      action: `Vérifiez dans Vercel que VITE_SUPABASE_URL correspond exactement à la « Project URL » de Supabase (Project Settings → Data API / API). Si l’adresse est juste, le projet a peut-être été supprimé ou mis en pause (${PAUSED_ACTION}) ; un bloqueur de publicités ou un réseau filtrant (école, entreprise) peut aussi bloquer supabase.co.`,
      details,
    };
  }

  if (health.status === 401 || health.status === 403) {
    return {
      kind: 'bad-key',
      message: 'Le serveur de comptes refuse la clé publique configurée sur ce site.',
      action: 'Dans Supabase (Project Settings → API Keys), copiez la clé « publishable » (ou « anon ») du MÊME projet que l’adresse, collez-la dans Vercel (VITE_SUPABASE_ANON_KEY), puis « Redeploy ».',
      details,
    };
  }
  if (health.status >= 500) {
    return {
      kind: health.status === 540 || health.status === 503 ? 'paused' : 'unavailable',
      message: `Le serveur de comptes est indisponible (erreur ${health.status}).`,
      action: health.status === 540 || health.status === 503 ? PAUSED_ACTION : 'Réessayez dans quelques minutes ; consultez https://status.supabase.com si cela dure.',
      details,
    };
  }

  // 4. Les tables ont-elles été créées ? (le visiteur anonyme n'a aucun droit : « permission refusée » = la table existe)
  try {
    const rest = await timed(fetchImpl, `${base}/rest/v1/learner_states?select=user_id&limit=1`, { headers }, ms);
    let body: { code?: string; message?: string } = {};
    try {
      body = (await rest.json()) as typeof body;
    } catch {
      /* corps vide */
    }
    details.push(`Base de données : HTTP ${rest.status}${body.code ? ` (${body.code})` : ''}`);
    if (rest.status === 404 || body.code === 'PGRST205' || body.code === '42P01') {
      return {
        kind: 'no-tables',
        message: 'La connexion fonctionne, mais la base de données du site n’est pas encore initialisée : la progression ne pourra pas être sauvegardée.',
        action: 'Exécutez les deux fichiers SQL du dossier supabase/migrations dans Supabase (SQL Editor), dans l’ordre : 20261009000000_init.sql puis 20261010000000_autosave.sql (voir README §6).',
        details,
      };
    }
  } catch (e) {
    details.push(`Base de données : test impossible (${e instanceof Error ? e.message : String(e)})`);
  }

  return { kind: 'ok', message: 'Le serveur de comptes répond correctement.', details };
}
