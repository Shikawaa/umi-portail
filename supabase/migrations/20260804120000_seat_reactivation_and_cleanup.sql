-- ============================================================================
-- Migration 0006 — Portail Psy UMi (v0)
--   1) ASSIDUITÉ : elle ne veut dire quelque chose que pendant un suivi ACTIF.
--      Un siège révoqué/délié/expiré n'est plus "Engagé" mais "En pause"
--      (nouvelle valeur `paused` de v_patient_usage.assiduity). Dès que le
--      suivi reprend (siège `active`), l'assiduité réelle revient (7 j).
--   2) RÉACTIVATION DU CODE : le psy peut rouvrir la fenêtre de reprise d'un
--      siège terminé (`reactivate_seat`) pour que le patient se relie à nouveau
--      avec le MÊME siège -> historique continu. Si le code a entre-temps été
--      réattribué, on peut en générer un nouveau sans perdre la fiche.
--   3) ANNULATION D'INVITATION : un code jamais activé n'a aucune valeur
--      d'historique -> `delete_seat` accepte désormais le statut `invited`
--      (suppression réelle, code libéré) au lieu de laisser un siège `revoked`.
--      + purge des invitations déjà révoquées sans avoir jamais été activées.
-- IDEMPOTENTE. Appliquer via Studio > SQL Editor. Rollback en bas.
-- Prérequis : migrations 0001 à 0005 appliquées.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. Helper interne : un code est-il encore "mobilisé" par un autre siège ?
--    Un code est indisponible s'il appartient à une invitation en attente
--    (`invited`) ou à un siège terminé encore dans sa fenêtre de reprise.
--    Interne : jamais exposé via l'API (appelé par les RPC security definer).
-- ----------------------------------------------------------------------------
create or replace function public.invite_code_taken(
  p_code text,
  p_exclude_seat uuid default null
) returns boolean
language sql stable set search_path = public as $$
  select exists (
    select 1 from public.patient_seats
    where invite_code = p_code
      and (p_exclude_seat is null or id <> p_exclude_seat)
      and (
        status = 'invited'
        or (
          status in ('released', 'revoked')
          and resume_until is not null
          and resume_until > now()
        )
      )
  );
$$;
revoke all on function public.invite_code_taken(text, uuid)
  from public, anon, authenticated;

-- ----------------------------------------------------------------------------
-- 1. v_patient_usage : assiduité bornée au suivi actif + exposition de
--    `resume_until` (le portail affiche "Reprise possible" et la date limite).
--    Recréée à l'identique pour le reste (security_invoker => RLS du psy).
-- ----------------------------------------------------------------------------
drop view if exists public.v_patient_usage;
create view public.v_patient_usage
with (security_invoker = on) as
select
  s.id                as seat_id,
  s.practitioner_id,
  s.patient_user_id,
  s.label,
  s.status,
  s.redeemed_at,
  count(c.id)                                                             as completions_total,
  count(c.id) filter (where c.completed_at >= now() - interval '7 days')   as completions_7d,
  count(c.id) filter (where c.completed_at >= now() - interval '30 days')  as completions_30d,
  max(c.completed_at)                                                     as last_completed_at,
  case
    -- Hors suivi actif, l'assiduité est suspendue (elle repart au rattachement).
    when s.status <> 'active'                              then 'paused'
    when max(c.completed_at) is null                       then 'never'
    when max(c.completed_at) >= now() - interval '7 days'   then 'active'
    else 'idle'
  end                                                                     as assiduity,
  s.resume_until
from public.patient_seats s
left join public.exercise_completions c
  on  c.patient_user_id = s.patient_user_id
  and c.completed_at   >= s.redeemed_at
  and (s.revoked_at  is null or c.completed_at < s.revoked_at)
  and (s.released_at is null or c.completed_at < s.released_at)
group by s.id, s.practitioner_id, s.patient_user_id, s.label, s.status,
         s.redeemed_at, s.resume_until;

grant select on public.v_patient_usage to authenticated;

-- ----------------------------------------------------------------------------
-- 2. reactivate_seat (psy) : rouvre la fenêtre de reprise d'un siège terminé.
--    Le siège, son `redeemed_at` et son historique sont conservés : le patient
--    ressaisit le code dans l'app et retrouve exactement son suivi (branche
--    "REPRISE" de redeem_seat_code, migration 0004).
--    p_new_code = true -> attribue un nouveau code au MÊME siège (cas où
--    l'ancien code a été réattribué entre-temps).
-- ----------------------------------------------------------------------------
create or replace function public.reactivate_seat(
  p_seat_id uuid,
  p_new_code boolean default false
) returns public.patient_seats
language plpgsql security definer set search_path = public as $$
declare
  v_seat public.patient_seats;
  v_code text;
  v_try  int := 0;
begin
  select * into v_seat from public.patient_seats
    where id = p_seat_id and practitioner_id = auth.uid() for update;
  if not found then raise exception 'not_owner'; end if;
  if v_seat.status not in ('released', 'revoked') then
    raise exception 'seat_not_reactivable';
  end if;
  -- Un siège jamais rattaché n'a pas de patient à faire revenir : le psy doit
  -- passer par une invitation (create_invitation / regenerate_code).
  if v_seat.patient_user_id is null or v_seat.redeemed_at is null then
    raise exception 'seat_never_attached';
  end if;

  if p_new_code then
    loop
      v_try := v_try + 1;
      v_code := public.gen_invite_code();
      exit when not public.invite_code_taken(v_code, v_seat.id);
      if v_try >= 20 then raise exception 'code_generation_failed'; end if;
    end loop;
  else
    -- Code déjà repris par une autre invitation / un autre suivi : on refuse,
    -- le portail proposera d'en générer un nouveau (fiche conservée).
    if public.invite_code_taken(v_seat.invite_code, v_seat.id) then
      raise exception 'code_taken';
    end if;
    v_code := v_seat.invite_code;
  end if;

  update public.patient_seats
     set invite_code  = v_code,
         resume_until = now() + interval '30 days'
   where id = p_seat_id
   returning * into v_seat;

  insert into public.audit_events(actor_user_id, action, target_seat_id)
    values (
      auth.uid(),
      case when p_new_code then 'seat_code_reissued' else 'seat_reactivated' end,
      p_seat_id
    );
  return v_seat;
end; $$;
revoke all on function public.reactivate_seat(uuid, boolean) from public, anon;
grant execute on function public.reactivate_seat(uuid, boolean) to authenticated;

-- ----------------------------------------------------------------------------
-- 3. create_invitation : même règle de disponibilité de code, centralisée dans
--    invite_code_taken (invitation en attente OU siège en fenêtre de reprise).
-- ----------------------------------------------------------------------------
create or replace function public.create_invitation(
  p_label text default null,
  p_invite_email text default null
) returns public.patient_seats
language plpgsql security definer set search_path = public as $$
declare v_seat public.patient_seats; v_code text; v_try int := 0;
begin
  if not exists (select 1 from public.practitioners where id = auth.uid()) then
    raise exception 'not_practitioner';
  end if;
  loop
    v_try := v_try + 1;
    v_code := public.gen_invite_code();
    if public.invite_code_taken(v_code) then
      if v_try >= 20 then raise exception 'code_generation_failed'; end if;
      continue;
    end if;
    begin
      insert into public.patient_seats (practitioner_id, label, invite_email, invite_code)
      values (auth.uid(), p_label, p_invite_email, v_code)
      returning * into v_seat;
      exit;
    exception when unique_violation then
      if v_try >= 20 then raise exception 'code_generation_failed'; end if;
    end;
  end loop;
  insert into public.audit_events(actor_user_id, action, target_seat_id)
    values (auth.uid(), 'invitation_created', v_seat.id);
  return v_seat;
end; $$;

-- ----------------------------------------------------------------------------
-- 4. regenerate_code : même centralisation (évite un code encore réservé par
--    un siège en fenêtre de reprise, ce que l'index unique partiel ne voit pas).
-- ----------------------------------------------------------------------------
create or replace function public.regenerate_code(p_seat_id uuid)
returns public.patient_seats
language plpgsql security definer set search_path = public as $$
declare v_seat public.patient_seats; v_code text; v_try int := 0;
begin
  select * into v_seat from public.patient_seats
    where id = p_seat_id and practitioner_id = auth.uid() for update;
  if not found then raise exception 'not_owner'; end if;
  if v_seat.status <> 'invited' then raise exception 'seat_not_invited'; end if;
  loop
    v_try := v_try + 1;
    v_code := public.gen_invite_code();
    if public.invite_code_taken(v_code, p_seat_id) then
      if v_try >= 20 then raise exception 'code_generation_failed'; end if;
      continue;
    end if;
    begin
      update public.patient_seats
        set invite_code = v_code, expires_at = now() + interval '30 days'
        where id = p_seat_id returning * into v_seat;
      exit;
    exception when unique_violation then
      if v_try >= 20 then raise exception 'code_generation_failed'; end if;
    end;
  end loop;
  insert into public.audit_events(actor_user_id, action, target_seat_id)
    values (auth.uid(), 'code_regenerated', p_seat_id);
  return v_seat;
end; $$;

-- ----------------------------------------------------------------------------
-- 5. delete_seat : accepte désormais une invitation jamais activée (`invited`).
--    Annuler un code non consommé = le supprimer (aucun historique à garder,
--    code immédiatement réutilisable), plutôt que laisser un siège `revoked`.
-- ----------------------------------------------------------------------------
create or replace function public.delete_seat(p_seat_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare v_seat public.patient_seats;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  select * into v_seat from public.patient_seats
    where id = p_seat_id and practitioner_id = auth.uid() for update;
  if not found then raise exception 'not_owner'; end if;
  if v_seat.status not in ('invited', 'released', 'revoked', 'expired') then
    raise exception 'seat_not_deletable';
  end if;
  insert into public.audit_events(actor_user_id, action, target_seat_id)
    values (
      auth.uid(),
      case when v_seat.redeemed_at is null then 'invitation_deleted' else 'seat_deleted' end,
      v_seat.id
    );
  delete from public.patient_seats where id = p_seat_id;
end; $$;
revoke all on function public.delete_seat(uuid) from public, anon;
grant execute on function public.delete_seat(uuid) to authenticated;

-- ----------------------------------------------------------------------------
-- 6. Purge : invitations annulées avant cette migration (statut `revoked` mais
--    jamais activées). Aucune valeur d'historique, elles polluaient la liste
--    "Révoqués / expirés" et gardaient leur code immobilisé.
-- ----------------------------------------------------------------------------
delete from public.patient_seats
 where status = 'revoked'
   and patient_user_id is null
   and redeemed_at is null;

-- ============================================================================
-- ROLLBACK (manuel)
-- drop function if exists public.reactivate_seat(uuid, boolean);
-- -- restaurer la version 0004 de delete_seat (sans 'invited'), de
-- -- create_invitation et la version 0001 de regenerate_code ;
-- -- recréer la vue 0002 (assiduité sans borne de statut, sans resume_until) :
-- --   drop view if exists public.v_patient_usage; -- puis coller la 0002
-- drop function if exists public.invite_code_taken(text, uuid);
-- -- ⚠️ la purge (§6) n'est pas réversible.
-- ============================================================================
