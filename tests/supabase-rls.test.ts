// Vérifie le schéma Supabase et ses politiques de sécurité (RLS) dans une vraie base Postgres embarquée (PGlite).
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';

const A = '11111111-1111-1111-1111-111111111111';
const B = '22222222-2222-2222-2222-222222222222';
const C = '33333333-3333-3333-3333-333333333333';
let db: PGlite;

async function as<T = Record<string, unknown>>(uid: string, sql: string, params: unknown[] = []) {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${uid}', false); set role authenticated;`);
  try {
    return (await db.query<T>(sql, params)).rows;
  } finally {
    await db.exec('reset role;');
  }
}

async function fails(uid: string, sql: string) {
  try {
    await as(uid, sql);
    return false;
  } catch {
    return true;
  }
}

const summary = (share: boolean) =>
  JSON.stringify({ displayName: 'Alice', xpTotal: 120, xpWeek: 80, streak: 3, daysCompleted: 2, wordsMastered: 5, badges: 2, shareProgress: share, shareStreak: false, shareBadges: false });

beforeAll(async () => {
  db = new PGlite();
  // Simulation minimale de l'environnement Supabase (rôles et schéma auth).
  await db.exec(`
    create role anon nologin; create role authenticated nologin;
    create schema auth;
    create table auth.users (id uuid primary key, raw_user_meta_data jsonb default '{}'::jsonb);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to authenticated, anon;
    grant execute on function auth.uid() to authenticated, anon;
  `);
  // Les deux migrations, dans l'ordre, puis une seconde fois : elles doivent pouvoir être ré-exécutées sans erreur.
  for (let i = 0; i < 2; i++) {
    await db.exec(readFileSync('supabase/migrations/20261009000000_init.sql', 'utf8'));
    await db.exec(readFileSync('supabase/migrations/20261010000000_autosave.sql', 'utf8'));
  }
  await db.exec(`insert into auth.users (id, raw_user_meta_data) values ('${A}', '{"display_name":"Alice"}'), ('${B}', '{"display_name":"Bob"}'), ('${C}', '{}');`);
}, 60_000);

describe('schéma Supabase et sécurité RLS', () => {
  it('crée un profil à l’inscription', async () => {
    const r = await db.query<{ display_name: string }>('select display_name from public.profiles order by display_name');
    expect(r.rows.map((x) => x.display_name)).toEqual(['Alice', 'Apprenant', 'Bob']);
  });

  it('sauvegarde avec contrôle de concurrence (pas d’écrasement silencieux)', async () => {
    expect((await as<{ rev: number }>(A, `select public.push_state(null, '{"v":1}'::jsonb, $1::jsonb) as rev`, [summary(false)]))[0].rev).toBe(1);
    expect((await as<{ rev: number }>(A, `select public.push_state(1, '{"v":2}'::jsonb, $1::jsonb) as rev`, [summary(false)]))[0].rev).toBe(2);
    expect((await as<{ rev: number }>(A, `select public.push_state(1, '{"v":3}'::jsonb, $1::jsonb) as rev`, [summary(false)]))[0].rev).toBe(-1);
    const rows = await as<{ state: { v: number } }>(A, 'select state from public.learner_states');
    expect(rows[0].state.v).toBe(2);
  });

  it('refuse de remplacer une progression par une progression vide, sauf remise à zéro volontaire', async () => {
    const withProgress = JSON.stringify({ attempts: [{ id: 'a1' }], activities: {}, assessments: [], profile: { onboarded: true } });
    const empty = JSON.stringify({ attempts: [], activities: {}, assessments: [], profile: { onboarded: false } });
    expect((await as<{ rev: number }>(C, `select public.push_state(null, $1::jsonb, $2::jsonb) as rev`, [withProgress, summary(false)]))[0].rev).toBe(1);
    expect((await as<{ rev: number }>(C, `select public.push_state(1, $1::jsonb, $2::jsonb) as rev`, [empty, summary(false)]))[0].rev).toBe(-2);
    let rows = await as<{ state: { attempts: unknown[] } }>(C, 'select state from public.learner_states');
    expect(rows[0].state.attempts).toHaveLength(1);
    expect((await as<{ rev: number }>(C, `select public.push_state(1, $1::jsonb, $2::jsonb, true) as rev`, [empty, summary(false)]))[0].rev).toBe(2);
    rows = await as<{ state: { attempts: unknown[] } }>(C, 'select state from public.learner_states');
    expect(rows[0].state.attempts).toHaveLength(0);
    expect(await fails(C, `select public.push_state(2, '[]'::jsonb, '{}'::jsonb)`)).toBe(true);
    await db.exec(`delete from public.learner_states where user_id = '${C}'; delete from public.public_stats where user_id = '${C}';`);
  });

  it('refuse toute sauvegarde sans être connecté', async () => {
    let failed = false;
    try {
      await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false); set role anon;`);
      await db.query(`select public.push_state(null, '{}'::jsonb, '{}'::jsonb)`);
    } catch {
      failed = true;
    } finally {
      await db.exec('reset role;');
    }
    expect(failed).toBe(true);
  });

  it('isole les données de chaque utilisateur', async () => {
    expect(await as(B, 'select * from public.learner_states')).toHaveLength(0);
    expect(await as(B, 'select * from public.public_stats')).toHaveLength(0);
    const upd = await db
      .exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${B}', false);`)
      .then(() => db.query(`update public.learner_states set state = '{}' where user_id = '${A}'`))
      .finally(() => db.exec('reset role;'));
    expect(upd.affectedRows ?? 0).toBe(0);
    expect((await fails(B, 'select * from public.ai_usage')) || (await as(B, 'select * from public.ai_usage')).length === 0).toBe(true);
  });

  it('protège les groupes et ne montre que les statistiques partagées', async () => {
    const [g] = await as<{ id: string; invite_code: string }>(A, `select * from public.create_group('Les anglophiles')`);
    expect(g.invite_code).toMatch(/^[A-Z2-9]{6}$/);
    expect(await as(C, 'select * from public.groups')).toHaveLength(0);
    expect(await fails(C, `select * from public.get_group_leaderboard('${g.id}')`)).toBe(true);
    expect(await fails(C, `select public.join_group('ZZZZZZ')`)).toBe(true);
    await as(B, `select public.join_group('${g.invite_code}')`);
    type Row = { display_name: string; xp_week: number | null; streak: number | null; is_me: boolean };
    let rows = await as<Row>(B, `select * from public.get_group_leaderboard('${g.id}')`);
    expect(rows.find((r) => r.display_name === 'Alice')).toMatchObject({ xp_week: null, streak: null });
    await as(A, `select public.push_state(2, '{"v":4}'::jsonb, $1::jsonb)`, [summary(true)]);
    rows = await as<Row>(B, `select * from public.get_group_leaderboard('${g.id}')`);
    expect(rows.find((r) => r.display_name === 'Alice')).toMatchObject({ xp_week: 80, streak: null });
    expect(rows.find((r) => r.is_me)?.display_name).toBe('Bob');
    expect(await fails(C, `insert into public.group_challenges (group_id, title, metric, target, ends_at) values ('${g.id}', 'X', 'xp_week', 5, now())`)).toBe(true);
    expect(await as(B, `insert into public.group_challenges (group_id, title, metric, target, ends_at) values ('${g.id}', 'Défi', 'xp_week', 500, now() + interval '7 days') returning id`)).toHaveLength(1);
  });

  it('applique le quota IA quotidien', async () => {
    const q = async () => (await as<{ ok: boolean }>(C, 'select public.consume_ai_quota(2) as ok'))[0].ok;
    expect([await q(), await q(), await q()]).toEqual([true, true, false]);
  });

  it('supprime les données personnelles sur demande et en cascade', async () => {
    await as(A, 'select public.delete_my_data()');
    const r = await db.query<{ n: number }>(`select ((select count(*) from public.learner_states where user_id='${A}') + (select count(*) from public.public_stats where user_id='${A}') + (select count(*) from public.group_members where user_id='${A}'))::int as n`);
    expect(r.rows[0].n).toBe(0);
    await db.exec(`delete from auth.users where id='${B}'`);
    const p = await db.query<{ n: number }>(`select count(*)::int as n from public.profiles where id='${B}'`);
    expect(p.rows[0].n).toBe(0);
  });
});
