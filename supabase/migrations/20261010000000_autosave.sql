-- =====================================================================
-- LÉON ACADÉMIE — sauvegarde automatique fiable (complète 20261009000000_init.sql)
-- À exécuter APRÈS le premier fichier. Peut être ré-exécuté sans risque.
--
-- Nouveautés :
--  * push_state refuse de remplacer une progression existante par une
--    progression vide (sauf réinitialisation volontaire : allow_reset).
--  * Date de dernière sauvegarde côté client, pour le diagnostic.
-- =====================================================================

alter table public.learner_states add column if not exists client_saved_at timestamptz;

-- Une progression « contient quelque chose » si elle a des réponses, des activités ou des évaluations.
create or replace function public.state_has_progress(s jsonb)
returns boolean
language sql
immutable
set search_path = public, pg_temp
as $$
  select coalesce(jsonb_array_length(case when jsonb_typeof(s -> 'attempts') = 'array' then s -> 'attempts' end), 0) > 0
      or coalesce((select count(*) from jsonb_object_keys(case when jsonb_typeof(s -> 'activities') = 'object' then s -> 'activities' else '{}'::jsonb end)), 0) > 0
      or coalesce(jsonb_array_length(case when jsonb_typeof(s -> 'assessments') = 'array' then s -> 'assessments' end), 0) > 0
      or coalesce((s -> 'profile' ->> 'onboarded')::boolean, false);
$$;

-- On remplace l'ancienne version (3 paramètres) par la nouvelle (4 paramètres).
drop function if exists public.push_state(integer, jsonb, jsonb);

-- Retour :
--   > 0  nouvelle révision (sauvegarde réussie)
--   -1   conflit : les données en ligne ont changé depuis la dernière synchronisation
--   -2   refusé : tentative de remplacer une progression existante par une progression vide
create or replace function public.push_state(expected_revision integer, new_state jsonb, summary jsonb, allow_reset boolean default false)
returns integer
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  uid uuid := auth.uid();
  new_rev integer;
  current_state jsonb;
  name text := left(coalesce(nullif(summary ->> 'displayName', ''), 'Apprenant'), 40);
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  if jsonb_typeof(new_state) is distinct from 'object' then
    raise exception 'invalid state' using errcode = '22023';
  end if;

  if expected_revision is null then
    insert into public.learner_states (user_id, state, revision, client_saved_at) values (uid, new_state, 1, now())
    on conflict (user_id) do nothing
    returning revision into new_rev;
  else
    select state into current_state from public.learner_states where user_id = uid for update;
    if current_state is not null
       and not allow_reset
       and public.state_has_progress(current_state)
       and not public.state_has_progress(new_state) then
      return -2;
    end if;
    update public.learner_states
      set state = new_state, revision = revision + 1, updated_at = now(), client_saved_at = now()
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

revoke all on function public.push_state(integer, jsonb, jsonb, boolean) from anon, public;
revoke all on function public.state_has_progress(jsonb) from anon, public;
grant execute on function public.push_state(integer, jsonb, jsonb, boolean) to authenticated;
grant execute on function public.state_has_progress(jsonb) to authenticated;
