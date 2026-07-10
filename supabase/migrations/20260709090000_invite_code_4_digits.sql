-- ============================================================================
-- Migration 0003 — Portail Psy UMi (v0) : code d'invitation à 4 chiffres
-- Passe le code de UMI-XXXX-XX à un code numérique à 4 chiffres (écran PIN mobile).
-- + unicité partielle (seuls les codes 'invited' sont uniques : espace = 10 000)
-- + verrouillage progressif anti-brute-force (façon iPhone) : 3 essais libres,
--   puis 1 min, puis 5 min à chaque échec suivant.
-- IDEMPOTENTE : ré-exécutable sans risque (create or replace / if [not] exists).
-- Appliquer via Studio > SQL Editor. Rollback en bas. Prérequis : 0001 (+0002).
-- ============================================================================

-- 1) Unicité : seuls les codes ENCORE UTILISABLES ('invited') doivent être uniques.
alter table public.patient_seats drop constraint if exists patient_seats_invite_code_key;
create unique index if not exists patient_seats_invite_code_active_uidx
  on public.patient_seats (invite_code) where status = 'invited';

-- 2) Générateur : code numérique à 4 chiffres ("0000".."9999").
create or replace function public.gen_invite_code()
returns text language plpgsql as $$
begin
  return lpad((floor(random() * 10000))::int::text, 4, '0');
end;
$$;
revoke all on function public.gen_invite_code() from public, anon, authenticated;

-- 3) Journal des tentatives ÉCHOUÉES (base du verrouillage progressif).
create table if not exists public.redemption_attempts (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null,
  attempted_at timestamptz not null default now()
);
create index if not exists redemption_attempts_user_idx
  on public.redemption_attempts (user_id, attempted_at);
alter table public.redemption_attempts enable row level security;
-- aucune policy => accès direct interdit (seule la fonction security definer écrit).

-- 4) Redémption : lookup 'invited' + verrouillage progressif + bascule.
create or replace function public.redeem_seat_code(p_code text)
returns public.patient_seats
language plpgsql security definer set search_path = public as $$
declare
  v_seat  public.patient_seats;
  v_code  text := regexp_replace(coalesce(p_code, ''), '\D', '', 'g'); -- garde les chiffres
  v_fails int;
  v_last  timestamptz;
  v_delay interval;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;

  -- Échecs récents (fenêtre 30 min) -> niveau de blocage progressif.
  select count(*), max(attempted_at) into v_fails, v_last
  from public.redemption_attempts
  where user_id = auth.uid() and attempted_at > now() - interval '30 minutes';

  v_delay := case
    when v_fails < 3 then interval '0'        -- 3 essais libres
    when v_fails = 3 then interval '1 minute' -- puis 1 min
    else interval '5 minutes'                 -- puis 5 min (plafond)
  end;

  if v_last is not null and now() < v_last + v_delay then
    raise exception 'too_many_attempts';      -- encore verrouillé
  end if;

  -- Validation du code.
  select * into v_seat from public.patient_seats
    where invite_code = v_code and status = 'invited'
    for update;

  if not found then
    insert into public.redemption_attempts(user_id) values (auth.uid()); -- échec compté
    raise exception 'invalid_code';           -- inconnu OU déjà utilisé
  end if;

  if v_seat.expires_at < now() then
    update public.patient_seats set status = 'expired' where id = v_seat.id;
    raise exception 'code_expired';            -- code réel mais expiré : non compté
  end if;

  -- Succès : bascule + activation + reset du compteur d'échecs.
  update public.patient_seats set status = 'released', released_at = now()
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

-- ⚠️ Anciennes invitations "UMI-XXXX-XX" : plus redeemables via un écran PIN 4
--    chiffres. Les ignorer ou les supprimer (invitations de test).

-- ============================================================================
-- ROLLBACK (manuel)
-- drop function if exists public.redeem_seat_code(text);      -- puis recréer la version 0001
-- drop table   if exists public.redemption_attempts;
-- drop index   if exists public.patient_seats_invite_code_active_uidx;
-- alter table  public.patient_seats add constraint patient_seats_invite_code_key unique (invite_code);
-- ============================================================================
