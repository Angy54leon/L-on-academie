-- =====================================================================
-- LÉON ACADÉMIE — schéma Supabase (facultatif)
-- Comptes, sauvegarde de la progression, espace social, quotas IA.
-- Sécurité : Row Level Security (RLS) activée sur TOUTES les tables.
-- Peut être ré-exécuté sans risque (tables, politiques et fonctions recréées à l'identique).
-- Un utilisateur ne peut lire/écrire que ses propres données ; les membres
-- d'un groupe ne voient que les statistiques que chacun choisit de partager.
-- =====================================================================


-- ---------------------------------------------------------------- Profils
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default 'Apprenant' check (char_length(display_name) <= 40),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- Progression (une ligne par utilisateur)
create table if not exists public.learner_states (
  user_id uuid primary key references auth.users (id) on delete cascade,
  state jsonb not null,
  revision integer not null default 1,
  updated_at timestamptz not null default now(),
  constraint state_size check (pg_column_size(state) < 5000000)
);

-- ---------------------------------------------------------------- Statistiques publiques (résumé, selon les choix de partage)
create table if not exists public.public_stats (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default 'Apprenant',
  xp_total integer not null default 0,
  xp_week integer not null default 0,
  streak integer not null default 0,
  days_completed integer not null default 0,
  words_mastered integer not null default 0,
  badges integer not null default 0,
  share_progress boolean not null default false,
  share_streak boolean not null default false,
  share_badges boolean not null default false,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- Groupes
create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 60),
  invite_code text not null unique,
  owner_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.group_members (
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create table if not exists public.group_challenges (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  title text not null check (char_length(title) <= 80),
  metric text not null check (metric in ('xp_week', 'streak', 'days_completed', 'words_mastered')),
  target integer not null check (target > 0 and target < 1000000),
  ends_at timestamptz not null,
  created_by uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- Quotas du professeur IA (aucun accès direct client)
create table if not exists public.ai_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null default current_date,
  count integer not null default 0,
  primary key (user_id, day)
);

-- ---------------------------------------------------------------- RLS
alter table public.profiles enable row level security;
alter table public.learner_states enable row level security;
alter table public.public_stats enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.group_challenges enable row level security;
alter table public.ai_usage enable row level security;

-- Appartenance à un groupe (SECURITY DEFINER pour éviter la récursion des politiques).
create or replace function public.is_group_member(gid uuid)
returns boolean
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select exists (select 1 from public.group_members where group_id = gid and user_id = auth.uid());
$$;

-- Profils : chacun ne voit et ne modifie que le sien.
drop policy if exists "profil : lecture du sien" on public.profiles;
create policy "profil : lecture du sien" on public.profiles for select using (id = auth.uid());
drop policy if exists "profil : modification du sien" on public.profiles;
create policy "profil : modification du sien" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

-- Progression : strictement personnelle.
drop policy if exists "progression : lecture" on public.learner_states;
create policy "progression : lecture" on public.learner_states for select using (user_id = auth.uid());
drop policy if exists "progression : création" on public.learner_states;
create policy "progression : création" on public.learner_states for insert with check (user_id = auth.uid());
drop policy if exists "progression : mise à jour" on public.learner_states;
create policy "progression : mise à jour" on public.learner_states for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "progression : suppression" on public.learner_states;
create policy "progression : suppression" on public.learner_states for delete using (user_id = auth.uid());

-- Statistiques publiques : lecture directe de SA ligne uniquement.
-- Les autres membres passent par get_group_leaderboard (qui masque ce qui n'est pas partagé).
drop policy if exists "stats : lecture des siennes" on public.public_stats;
create policy "stats : lecture des siennes" on public.public_stats for select using (user_id = auth.uid());

-- Groupes : visibles par leurs membres ; supprimables par leur propriétaire.
drop policy if exists "groupes : lecture membres" on public.groups;
create policy "groupes : lecture membres" on public.groups for select using (public.is_group_member(id));
drop policy if exists "groupes : suppression propriétaire" on public.groups;
create policy "groupes : suppression propriétaire" on public.groups for delete using (owner_id = auth.uid());

-- Membres : visibles par les membres du même groupe.
drop policy if exists "membres : lecture" on public.group_members;
create policy "membres : lecture" on public.group_members for select using (public.is_group_member(group_id));

-- Défis de groupe.
drop policy if exists "défis : lecture membres" on public.group_challenges;
create policy "défis : lecture membres" on public.group_challenges for select using (public.is_group_member(group_id));
drop policy if exists "défis : création membres" on public.group_challenges;
create policy "défis : création membres" on public.group_challenges for insert with check (public.is_group_member(group_id) and created_by = auth.uid());
drop policy if exists "défis : suppression auteur" on public.group_challenges;
create policy "défis : suppression auteur" on public.group_challenges for delete using (created_by = auth.uid());

-- ai_usage : aucune politique => aucun accès direct depuis le client.

-- ---------------------------------------------------------------- Création automatique du profil
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(nullif(left(new.raw_user_meta_data ->> 'display_name', 40), ''), 'Apprenant'))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------- Sauvegarde avec contrôle de concurrence
-- Retourne la nouvelle révision, ou -1 si les données distantes ont changé entre-temps
-- (le client fusionne alors au lieu d'écraser).
create or replace function public.push_state(expected_revision integer, new_state jsonb, summary jsonb)
returns integer
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  uid uuid := auth.uid();
  new_rev integer;
  name text := left(coalesce(nullif(summary ->> 'displayName', ''), 'Apprenant'), 40);
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  if expected_revision is null then
    insert into public.learner_states (user_id, state, revision) values (uid, new_state, 1)
    on conflict (user_id) do nothing
    returning revision into new_rev;
  else
    update public.learner_states
      set state = new_state, revision = revision + 1, updated_at = now()
      where user_id = uid and revision = expected_revision
      returning revision into new_rev;
  end if;

  if new_rev is null then
    return -1;
  end if;

  insert into public.public_stats as ps (user_id, display_name, xp_total, xp_week, streak, days_completed, words_mastered, badges, share_progress, share_streak, share_badges, updated_at)
  values (
    uid, name,
    greatest(0, least(10000000, coalesce((summary ->> 'xpTotal')::integer, 0))),
    greatest(0, least(1000000, coalesce((summary ->> 'xpWeek')::integer, 0))),
    greatest(0, least(10000, coalesce((summary ->> 'streak')::integer, 0))),
    greatest(0, least(24, coalesce((summary ->> 'daysCompleted')::integer, 0))),
    greatest(0, least(100000, coalesce((summary ->> 'wordsMastered')::integer, 0))),
    greatest(0, least(1000, coalesce((summary ->> 'badges')::integer, 0))),
    coalesce((summary ->> 'shareProgress')::boolean, false),
    coalesce((summary ->> 'shareStreak')::boolean, false),
    coalesce((summary ->> 'shareBadges')::boolean, false),
    now()
  )
  on conflict (user_id) do update set
    display_name = excluded.display_name, xp_total = excluded.xp_total, xp_week = excluded.xp_week, streak = excluded.streak,
    days_completed = excluded.days_completed, words_mastered = excluded.words_mastered, badges = excluded.badges,
    share_progress = excluded.share_progress, share_streak = excluded.share_streak, share_badges = excluded.share_badges, updated_at = now();

  update public.profiles set display_name = name where id = uid;
  return new_rev;
end;
$$;

-- Les statistiques publiques ne sont écrites que par push_state : on autorise l'écriture
-- de SA ligne pour cette fonction (exécutée avec les droits de l'utilisateur).
drop policy if exists "stats : écriture des siennes" on public.public_stats;
create policy "stats : écriture des siennes" on public.public_stats for insert with check (user_id = auth.uid());
drop policy if exists "stats : mise à jour des siennes" on public.public_stats;
create policy "stats : mise à jour des siennes" on public.public_stats for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------- Groupes : création, adhésion, départ
create or replace function public.create_group(group_name text)
returns public.groups
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  g public.groups;
  code text;
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  i integer;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if (select count(*) from public.groups where owner_id = auth.uid()) >= 10 then
    raise exception 'Limite de 10 groupes créés atteinte.';
  end if;
  loop
    code := '';
    for i in 1..6 loop
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::integer, 1);
    end loop;
    exit when not exists (select 1 from public.groups where invite_code = code);
  end loop;
  insert into public.groups (name, invite_code, owner_id) values (left(trim(group_name), 60), code, auth.uid()) returning * into g;
  insert into public.group_members (group_id, user_id) values (g.id, auth.uid());
  return g;
end;
$$;

create or replace function public.join_group(code text)
returns public.groups
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  g public.groups;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  select * into g from public.groups where invite_code = upper(trim(code));
  if g.id is null then raise exception 'invalid invite code'; end if;
  if (select count(*) from public.group_members where group_id = g.id) >= 50 then
    raise exception 'Ce groupe est complet (50 membres).';
  end if;
  insert into public.group_members (group_id, user_id) values (g.id, auth.uid()) on conflict do nothing;
  return g;
end;
$$;

create or replace function public.leave_group(gid uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  delete from public.group_members where group_id = gid and user_id = auth.uid();
  -- Un groupe sans membre est supprimé.
  delete from public.groups g where g.id = gid and not exists (select 1 from public.group_members m where m.group_id = gid);
end;
$$;

-- ---------------------------------------------------------------- Classement : uniquement les données partagées
create or replace function public.get_group_leaderboard(gid uuid)
returns table (
  user_id uuid, display_name text, is_me boolean,
  xp_week integer, xp_total integer, streak integer, days_completed integer, words_mastered integer, badges integer
)
language plpgsql
security definer
set search_path = public, pg_temp
stable
as $$
begin
  if not public.is_group_member(gid) then
    raise exception 'not a member';
  end if;
  return query
    select m.user_id,
           coalesce(ps.display_name, p.display_name, 'Apprenant'),
           m.user_id = auth.uid(),
           case when ps.share_progress or m.user_id = auth.uid() then ps.xp_week end,
           case when ps.share_progress or m.user_id = auth.uid() then ps.xp_total end,
           case when ps.share_streak or m.user_id = auth.uid() then ps.streak end,
           case when ps.share_progress or m.user_id = auth.uid() then ps.days_completed end,
           case when ps.share_progress or m.user_id = auth.uid() then ps.words_mastered end,
           case when ps.share_badges or m.user_id = auth.uid() then ps.badges end
    from public.group_members m
    left join public.public_stats ps on ps.user_id = m.user_id
    left join public.profiles p on p.id = m.user_id
    where m.group_id = gid;
end;
$$;

-- ---------------------------------------------------------------- Suppression des données personnelles
create or replace function public.delete_my_data()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not authenticated'; end if;
  delete from public.learner_states where user_id = uid;
  delete from public.public_stats where user_id = uid;
  delete from public.ai_usage where user_id = uid;
  delete from public.group_challenges where created_by = uid;
  delete from public.group_members where user_id = uid;
  delete from public.groups g where not exists (select 1 from public.group_members m where m.group_id = g.id);
end;
$$;

-- ---------------------------------------------------------------- Quota IA (appelé par la fonction Edge « teacher »)
create or replace function public.consume_ai_quota(daily_limit integer)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  uid uuid := auth.uid();
  c integer;
begin
  if uid is null then return false; end if;
  insert into public.ai_usage (user_id, day, count) values (uid, current_date, 1)
  on conflict (user_id, day) do update set count = public.ai_usage.count + 1
  returning count into c;
  return c <= daily_limit;
end;
$$;

-- ---------------------------------------------------------------- Droits (explicites, requis sur les projets récents)
-- Principe du moindre privilège : Supabase accorde par défaut TOUS les droits sur les nouvelles tables et
-- fonctions aux rôles anon et authenticated. On les retire, puis on n'accorde que le strict nécessaire.
-- (Les règles RLS ci-dessus restent la protection principale ; ceci est une seconde barrière.)
revoke all on table public.profiles, public.learner_states, public.public_stats, public.groups,
  public.group_members, public.group_challenges, public.ai_usage from anon, authenticated;
revoke all on function public.is_group_member(uuid), public.handle_new_user(), public.push_state(integer, jsonb, jsonb),
  public.create_group(text), public.join_group(text), public.leave_group(uuid), public.get_group_leaderboard(uuid),
  public.delete_my_data(), public.consume_ai_quota(integer) from public, anon, authenticated;

grant usage on schema public to authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.learner_states to authenticated;
grant select, insert, update on public.public_stats to authenticated;
grant select, delete on public.groups to authenticated;
grant select on public.group_members to authenticated;
grant select, insert, delete on public.group_challenges to authenticated;

grant execute on function public.is_group_member(uuid) to authenticated;
grant execute on function public.push_state(integer, jsonb, jsonb) to authenticated;
grant execute on function public.create_group(text) to authenticated;
grant execute on function public.join_group(text) to authenticated;
grant execute on function public.leave_group(uuid) to authenticated;
grant execute on function public.get_group_leaderboard(uuid) to authenticated;
grant execute on function public.delete_my_data() to authenticated;
grant execute on function public.consume_ai_quota(integer) to authenticated;
