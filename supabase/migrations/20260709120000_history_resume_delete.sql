-- ============================================================================
-- Migration 0004 — Portail Psy UMi (v0)
--   1) HISTORIQUE après fin de lien : le psy garde un accès LECTURE SEULE aux
--      complétions de la PÉRIODE de suivi, même si le siège est délié/révoqué.
--   2) REPRISE du suivi : re-saisir le même code (siège délié OU révoqué,
--      fenêtre 30 jours, même patient) réactive le MÊME siège -> historique
--      continu, on ne perd pas les semaines de suivi.
--   3) SUPPRESSION : le psy peut retirer définitivement de son portail un siège
--      terminé (délié/révoqué/expiré). Les données propres du patient (app)
--      ne sont pas touchées ; seul le lien de suivi disparaît.
-- IDEMPOTENTE. Appliquer via Studio > SQL Editor. Rollback en bas.
-- Prérequis : migrations 0001, 0002, 0003 appliquées.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. Colonne : fenêtre de reprise (échéance au-delà de laquelle le code n'est
--    plus réutilisable pour reprendre le suivi ; sert aussi à "réserver" le
--    code d'un siège terminé pour qu'il ne soit pas réattribué à une invitation).
-- ----------------------------------------------------------------------------
alter table public.patient_seats
  add column if not exists resume_until timestamptz;

-- Backfill : rend réutilisables les sièges déjà terminés (fenêtre de 30 jours
-- à partir de la date de fin), pour ne pas casser les suivis en cours de test.
update public.patient_seats
  set resume_until = coalesce(released_at, revoked_at) + interval '30 days'
  where status in ('released', 'revoked')
    and resume_until is null
    and coalesce(released_at, revoked_at) is not null;

-- ----------------------------------------------------------------------------
-- 1. RLS : lecture des complétions par le psy, sur la PÉRIODE de suivi,
--    quel que soit le statut du siège (active/released/revoked/expired).
--    Borne haute = fin du suivi (released_at/revoked_at) ou +inf si actif.
-- ----------------------------------------------------------------------------
drop policy if exists completion_practitioner_select on public.exercise_completions;
create policy completion_practitioner_select on public.exercise_completions
  for select using (
    exists (
      select 1 from public.patient_seats s
      where s.patient_user_id = exercise_completions.patient_user_id
        and s.practitioner_id = auth.uid()
        and s.redeemed_at is not null
        and exercise_completions.completed_at >= s.redeemed_at
        and exercise_completions.completed_at
              < coalesce(s.released_at, s.revoked_at, 'infinity'::timestamptz)
    )
  );
-- NB : la vue v_patient_usage (0002, security_invoker) borne déjà son JOIN sur
-- [redeemed_at, released_at/revoked_at) : elle reflète donc automatiquement
-- l'historique des sièges terminés grâce à cette nouvelle politique.

-- ----------------------------------------------------------------------------
-- 2. release_my_seat (patient) : déliaison + ouverture de la fenêtre de reprise.
-- ----------------------------------------------------------------------------
create or replace function public.release_my_seat()
returns public.patient_seats
language plpgsql security definer set search_path = public as $$
declare v_seat public.patient_seats;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  update public.patient_seats
    set status = 'released', released_at = now(),
        resume_until = now() + interval '30 days'
    where patient_user_id = auth.uid() and status = 'active'
    returning * into v_seat;
  if not found then raise exception 'no_active_seat'; end if;
  insert into public.audit_events(actor_user_id, action, target_seat_id)
    values (auth.uid(), 'seat_released', v_seat.id);
  return v_seat;
end; $$;

-- ----------------------------------------------------------------------------
-- 3. revoke_seat (psy) : révocation d'un actif (reprise possible 30 j) ou
--    annulation d'une invitation (pas de reprise : le code est libéré).
-- ----------------------------------------------------------------------------
create or replace function public.revoke_seat(p_seat_id uuid)
returns public.patient_seats
language plpgsql security definer set search_path = public as $$
declare v_seat public.patient_seats;
begin
  select * into v_seat from public.patient_seats
    where id = p_seat_id and practitioner_id = auth.uid() for update;
  if not found then raise exception 'not_owner'; end if;
  if v_seat.status not in ('active','invited') then
    raise exception 'seat_not_active_or_invited';
  end if;
  update public.patient_seats
    set status = 'revoked', revoked_at = now(),
        resume_until = case when patient_user_id is not null
                            then now() + interval '30 days' else null end
    where id = p_seat_id returning * into v_seat;
  insert into public.audit_events(actor_user_id, action, target_seat_id)
    values (auth.uid(), 'seat_revoked', p_seat_id);
  return v_seat;
end; $$;

-- ----------------------------------------------------------------------------
-- 4. redeem_seat_code (patient) : REPRISE (même siège, historique continu) OU
--    nouveau lien. Conserve le verrouillage progressif anti-brute-force (0003).
-- ----------------------------------------------------------------------------
create or replace function public.redeem_seat_code(p_code text)
returns public.patient_seats
language plpgsql security definer set search_path = public as $$
declare
  v_seat  public.patient_seats;
  v_code  text := regexp_replace(coalesce(p_code, ''), '\D', '', 'g'); -- chiffres
  v_fails int;
  v_last  timestamptz;
  v_delay interval;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;

  -- Verrouillage progressif (fenêtre 30 min) : 3 essais libres, puis 1 min, 5 min.
  select count(*), max(attempted_at) into v_fails, v_last
  from public.redemption_attempts
  where user_id = auth.uid() and attempted_at > now() - interval '30 minutes';

  v_delay := case
    when v_fails < 3 then interval '0'
    when v_fails = 3 then interval '1 minute'
    else interval '5 minutes'
  end;
  if v_last is not null and now() < v_last + v_delay then
    raise exception 'too_many_attempts';
  end if;

  -- (1) REPRISE : siège délié/révoqué de CE patient, encore dans la fenêtre.
  select * into v_seat from public.patient_seats
    where invite_code = v_code
      and patient_user_id = auth.uid()
      and status in ('released','revoked')
      and resume_until is not null
      and resume_until > now()
    order by coalesce(released_at, revoked_at) desc
    limit 1
    for update;

  if found then
    -- Bascule : libère l'éventuel autre siège actif du patient.
    update public.patient_seats
      set status = 'released', released_at = now(),
          resume_until = now() + interval '30 days'
      where patient_user_id = auth.uid() and status = 'active' and id <> v_seat.id;
    -- Réactive le MÊME siège : redeemed_at conservé => historique continu.
    update public.patient_seats
      set status = 'active', released_at = null, revoked_at = null, resume_until = null
      where id = v_seat.id returning * into v_seat;
    delete from public.redemption_attempts where user_id = auth.uid();
    insert into public.audit_events(actor_user_id, action, target_seat_id)
      values (auth.uid(), 'seat_resumed', v_seat.id);
    return v_seat;
  end if;

  -- (2) NOUVEAU LIEN : code 'invited'.
  select * into v_seat from public.patient_seats
    where invite_code = v_code and status = 'invited'
    for update;
  if not found then
    insert into public.redemption_attempts(user_id) values (auth.uid()); -- échec compté
    raise exception 'invalid_code';
  end if;
  if v_seat.expires_at < now() then
    update public.patient_seats set status = 'expired' where id = v_seat.id;
    raise exception 'code_expired';
  end if;

  update public.patient_seats
    set status = 'released', released_at = now(), resume_until = now() + interval '30 days'
    where patient_user_id = auth.uid() and status = 'active';

  update public.patient_seats
    set patient_user_id = auth.uid(), status = 'active', redeemed_at = now()
    where id = v_seat.id returning * into v_seat;

  delete from public.redemption_attempts where user_id = auth.uid();
  insert into public.audit_events(actor_user_id, action, target_seat_id)
    values (auth.uid(), 'code_redeemed', v_seat.id);
  return v_seat;
end; $$;
revoke all on function public.redeem_seat_code(text) from public, anon;
grant execute on function public.redeem_seat_code(text) to authenticated;

-- Limite connue (v0) : les complétions ne portent pas de seat_id ; l'attribution
-- au psy se fait par la PÉRIODE [redeemed_at, fin). Après une reprise, la période
-- redevient ouverte : si le patient s'était brièvement relié à un AUTRE psy
-- pendant l'intervalle, ces complétions (métadonnée "fait/non fait", non clinique)
-- pourraient réapparaître. Cas de bord rare ; à traiter via une table de périodes
-- si la bascule multi-psy devient fréquente.

-- ----------------------------------------------------------------------------
-- 5. create_invitation (psy) : ne pas réattribuer un code encore "réservé" par
--    un siège en fenêtre de reprise.
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
    -- Éviter un code encore mobilisé par un siège en attente de reprise.
    if exists (
      select 1 from public.patient_seats
      where invite_code = v_code
        and status in ('released','revoked')
        and resume_until is not null and resume_until > now()
    ) then
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
-- 6. delete_seat (psy) : retire DÉFINITIVEMENT un siège terminé du portail.
--    N'affecte pas les exercise_completions (données propres du patient).
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
  if v_seat.status not in ('released','revoked','expired') then
    raise exception 'seat_not_deletable';
  end if;
  insert into public.audit_events(actor_user_id, action, target_seat_id)
    values (auth.uid(), 'seat_deleted', v_seat.id);
  delete from public.patient_seats where id = p_seat_id;
end; $$;
revoke all on function public.delete_seat(uuid) from public, anon;
grant execute on function public.delete_seat(uuid) to authenticated;

-- ============================================================================
-- ROLLBACK (manuel)
-- drop function if exists public.delete_seat(uuid);
-- -- puis restaurer les versions 0001/0003 de create_invitation, redeem_seat_code,
-- -- revoke_seat, release_my_seat, et l'ancienne policy completion_practitioner_select
-- -- (statut = 'active'). alter table public.patient_seats drop column if exists resume_until;
-- ============================================================================
