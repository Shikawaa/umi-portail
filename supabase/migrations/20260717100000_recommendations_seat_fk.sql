-- ============================================================================
-- 0006 — RECOMMENDATIONS : rattachement au siège patient
-- ----------------------------------------------------------------------------
-- La table `recommendations` (créée côté mobile, hors migrations de ce repo)
-- référençait directement le psy (practitioner_id) et le patient (patient_id).
-- On la rattache désormais au siège (`patient_seat_id` → patient_seats) : une
-- recommandation appartient à la relation de suivi, pas aux personnes.
-- Les colonnes practitioner_id / patient_id sont supprimées.
-- ============================================================================

-- 1. Nouvelle colonne + backfill depuis le couple (practitioner, patient).
--    S'il existe plusieurs sièges pour le même couple (périodes successives),
--    on prend le siège actif, sinon le plus récemment rattaché.
alter table public.recommendations add column if not exists patient_seat_id uuid;

update public.recommendations r
set patient_seat_id = s.id
from (
  select distinct on (practitioner_id, patient_user_id) id, practitioner_id, patient_user_id
  from public.patient_seats
  where patient_user_id is not null
  order by practitioner_id, patient_user_id,
    (status = 'active') desc, redeemed_at desc nulls last
) s
where s.practitioner_id = r.practitioner_id
  and s.patient_user_id = r.patient_id
  and r.patient_seat_id is null;

-- Recos orphelines (aucun siège correspondant) : plus rattachables, on purge.
delete from public.recommendations where patient_seat_id is null;

alter table public.recommendations
  alter column patient_seat_id set not null;
alter table public.recommendations
  add constraint recommendations_patient_seat_id_fkey
    foreign key (patient_seat_id) references public.patient_seats (id) on delete cascade;

-- 2. Unicité : un exercice n'est recommandé qu'une fois par siège.
alter table public.recommendations drop constraint if exists recommendations_unique;
alter table public.recommendations
  add constraint recommendations_unique unique (patient_seat_id, exercise_id);

create index if not exists recommendations_patient_seat_idx
  on public.recommendations (patient_seat_id);

-- 3. RLS : mêmes droits qu'avant, exprimés via le siège.
-- Le psy gère les recommandations de ses propres sièges.
drop policy if exists practitioners_manage_recommendations on public.recommendations;
create policy practitioners_manage_recommendations on public.recommendations
  for all using (
    exists (
      select 1 from public.patient_seats s
      where s.id = recommendations.patient_seat_id
        and s.practitioner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.patient_seats s
      where s.id = recommendations.patient_seat_id
        and s.practitioner_id = auth.uid()
    )
  );
-- Le patient lit les recommandations du siège auquel il est rattaché
-- (seat_patient_select couvre la lecture du siège dans la sous-requête).
-- `patient_own_recommendations` était un doublon de la même règle, on le purge.
drop policy if exists patient_own_recommendations on public.recommendations;
drop policy if exists patients_read_recommendations on public.recommendations;
create policy patients_read_recommendations on public.recommendations
  for select using (
    exists (
      select 1 from public.patient_seats s
      where s.id = recommendations.patient_seat_id
        and s.patient_user_id = auth.uid()
    )
  );

-- 4. Suppression des anciennes colonnes.
alter table public.recommendations drop column if exists practitioner_id;
alter table public.recommendations drop column if exists patient_id;
