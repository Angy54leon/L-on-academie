/// <reference types="vitest/config" />
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  callTeacher,
  createMemoryRateLimiter,
  TeacherError,
  validateTeacherRequest,
} from './supabase/functions/_shared/teacher-core.ts';

/**
 * Professeur IA en développement local : `/api/teacher`.
 * Les variables AI_* (sans préfixe VITE_) restent côté serveur et ne sont jamais envoyées au navigateur.
 */
function devTeacherApi(env: Record<string, string>): Plugin {
  const limiter = createMemoryRateLimiter(Number(env.AI_RATE_PER_MINUTE || 8), Number(env.AI_RATE_PER_DAY || 150));
  const configured = Boolean(env.AI_BASE_URL && env.AI_MODEL);
  const send = (res: ServerResponse, status: number, body: unknown) => {
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(body));
  };
  const readBody = (req: IncomingMessage) =>
    new Promise<string>((resolve, reject) => {
      let data = '';
      req.on('data', (chunk) => {
        data += chunk;
        if (data.length > 40_000) reject(new Error('too large'));
      });
      req.on('end', () => resolve(data));
      req.on('error', reject);
    });
  return {
    name: 'leon-dev-teacher-api',
    configureServer(server) {
      server.middlewares.use('/api/teacher', async (req, res) => {
        if (req.method === 'GET') return send(res, 200, { configured, provider: configured ? 'openai-compatible' : null });
        if (req.method !== 'POST') return send(res, 405, { error: 'Méthode non autorisée.' });
        if (!configured) return send(res, 503, { error: 'Professeur IA non configuré (voir README).' });
        const ip = req.socket.remoteAddress ?? 'local';
        if (!limiter(ip)) return send(res, 429, { error: 'Limite d’utilisation atteinte. Réessayez dans un moment.' });
        try {
          const parsed = validateTeacherRequest(JSON.parse(await readBody(req)));
          if (!parsed.ok) return send(res, 400, { error: parsed.error });
          const reply = await callTeacher(
            { baseUrl: env.AI_BASE_URL, apiKey: env.AI_API_KEY || undefined, model: env.AI_MODEL },
            parsed.value,
          );
          return send(res, 200, reply);
        } catch (e) {
          if (e instanceof TeacherError) return send(res, e.status, { error: e.message });
          return send(res, 400, { error: 'Requête invalide.' });
        }
      });
    },
  };
}

/** Injecte la liste des fichiers construits dans le service worker pour le mode hors ligne. */
function precacheManifest(): Plugin {
  let outDir = 'dist';
  return {
    name: 'leon-precache-manifest',
    apply: 'build',
    configResolved(config) {
      outDir = config.build.outDir;
    },
    closeBundle() {
      const files: string[] = [];
      const walk = (dir: string) => {
        for (const name of readdirSync(dir)) {
          const full = join(dir, name);
          if (statSync(full).isDirectory()) walk(full);
          else files.push(relative(outDir, full).split('\\').join('/'));
        }
      };
      walk(outDir);
      const list = ['./', ...files.filter((f) => f !== 'sw.js').map((f) => `./${f}`)];
      const swPath = join(outDir, 'sw.js');
      const version = Date.now().toString(36);
      const sw = readFileSync(swPath, 'utf8')
        .replace('self.__PRECACHE__', JSON.stringify(list))
        .replace('__BUILD_VERSION__', version);
      writeFileSync(swPath, sw);
    },
  };
}

/**
 * Configuration Supabase publique. En plus de VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY, on accepte les noms
 * créés automatiquement par l'intégration Supabase ↔ Vercel (NEXT_PUBLIC_SUPABASE_URL, …), pour ne rien avoir
 * à recopier. Seules l'URL et la clé PUBLIQUE sont reprises ; une clé secrète bloque la compilation.
 */
function resolvePublicSupabaseEnv(env: Record<string, string>) {
  const pick = (...names: string[]) => names.map((n) => env[n]?.trim()).find(Boolean) ?? '';
  const url = pick('VITE_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_URL');
  const key = pick(
    'VITE_SUPABASE_ANON_KEY',
    'VITE_SUPABASE_PUBLISHABLE_KEY',
    'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_PUBLISHABLE_KEY',
    'SUPABASE_ANON_KEY',
  );
  if (isSecretKey(key)) {
    throw new Error(
      'LÉON ACADÉMIE : la clé Supabase fournie est une clé SECRÈTE (service_role / sb_secret_). ' +
        'Elle ne doit jamais être envoyée au navigateur : utilisez la clé publique « publishable » (sb_publishable_…) ou « anon ».',
    );
  }
  if (url) process.env.VITE_SUPABASE_URL = url;
  if (key) process.env.VITE_SUPABASE_ANON_KEY = key;
}

function isSecretKey(key: string): boolean {
  if (key.startsWith('sb_secret_')) return true;
  const payload = key.split('.')[1];
  if (!payload) return false;
  try {
    return JSON.parse(Buffer.from(payload, 'base64url').toString()).role === 'service_role';
  } catch {
    return false;
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  resolvePublicSupabaseEnv(env);
  return {
    base: './',
    plugins: [react(), devTeacherApi(env), precacheManifest()],
    test: {
      environment: 'node',
      include: ['tests/**/*.test.ts'],
    },
  };
});
