-- ============================================================================
-- Migration 0002 — Portail Psy UMi (v0) : lecture des exercices + vue d'usage
-- Dépendance du portail (dashboard / patientèle / fiche patient).
-- Appliquer via Studio > SQL Editor ou `supabase db push`. Rollback en bas.
-- Prérequis : migration 0001 appliquée.
-- ============================================================================

-- 1) Bibliothèque d'exercices lisible par les utilisateurs connectés
--    (le portail affiche les titres ; le patient les lit aussi côté mobile).
--    RLS activée + lecture publique (anon + authenticated). Aucune écriture cliente.
--    ⚠️ Vérifier après application que l'app mobile liste toujours les exercices.
alter table public.exercises enable row level security;
drop policy if exists exercises_read_all on public.exercises;
create policy exercises_read_all on public.exercises
  for select to anon, authenticated using (true);

-- 2) Vue d'agrégation d'usage par siège (assiduité + complétions).
--    security_invoker=on => la RLS du psy s'applique : il ne voit que SES sièges,
--    et pour les complétions, uniquement la période de rattachement actif (RG-14).
create or replace view public.v_patient_usage
with (security_invoker = on) as
select
  s.id                as seat_id,
  s.practitioner_id,
  s.patient_user_id,
  s.label,
  s.status,
  s.redeemed_at,
  count(c.id)                                                             as completions_total,
  count(c.id) filter (where c.completed_at >= now() - interval '7 days')  as completions_7d,
  count(c.id) filter (where c.completed_at >= now() - interval '30 days') as completions_30d,
  max(c.completed_at)                                                     as last_completed_at,
  case
    when max(c.completed_at) is null                      then 'never'
    when max(c.completed_at) >= now() - interval '7 days'  then 'active'
    else 'idle'
  end                                                                     as assiduity
from public.patient_seats s
left join public.exercise_completions c
  on  c.patient_user_id = s.patient_user_id
  and c.completed_at   >= s.redeemed_at
  and (s.revoked_at  is null or c.completed_at < s.revoked_at)
  and (s.released_at is null or c.completed_at < s.released_at)
group by s.id, s.practitioner_id, s.patient_user_id, s.label, s.status, s.redeemed_at;

grant select on public.v_patient_usage to authenticated;

-- ============================================================================
-- ROLLBACK (manuel)
-- drop view if exists public.v_patient_usage;
-- drop policy if exists exercises_read_all on public.exercises;
-- -- pour revenir totalement : alter table public.exercises disable row level security;
-- ============================================================================
