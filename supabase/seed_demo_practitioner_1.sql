-- ============================================================================
-- SEED DEMO — 3 patients de démonstration pour le praticien #1 (Alexandre)
-- practitioner_id = 2f69fe7b-f12d-44c0-b1f1-f57dd79f2cc5
--
-- Objet : peupler le portail (tableau patients + courbes + fiche patient) avec
--         des données de TEST clairement identifiées "(démo)", rattachées
--         UNIQUEMENT à ce praticien.
--
-- Contenu : 3 comptes patients de test dans auth.users, 3 sièges 'active',
--           ~35 complétions réparties sur les 14 derniers jours :
--             - E. F. (démo)  : très engagé  (assiduité "Engagé")
--             - G. H. (démo)  : modéré       (assiduité "Engagé")
--             - J. P. (démo)  : en veille    (aucune activité depuis > 7 jours)
--
-- À exécuter dans Supabase Studio > SQL Editor (une seule fois ; idempotent).
-- IDEMPOTENT : ré-exécutable sans doublon (on conflict do nothing + purge des
--              complétions démo avant réinsertion).
-- NETTOYAGE : section commentée en bas — décommenter et exécuter pour tout retirer.
--
-- ⚠️ Écrit dans votre VRAIE base. Ce sont des données de test (emails @umi.test,
--    mots de passe non fonctionnels). Ne pas conserver en production.
-- ============================================================================

begin;

-- --- Identifiants fixes (pour idempotence + nettoyage ciblé) -----------------
-- Patients (auth.users) :  0de7000X-...   |  Sièges (patient_seats) : 5ea7000X-...

-- 1) Comptes patients de test dans auth.users -------------------------------
--    Mot de passe volontairement non exploitable (compte de démo, pas de login).
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
  confirmation_token, recovery_token, email_change_token_new, email_change
) values
  ('00000000-0000-0000-0000-000000000000', '0de70001-0000-4000-a000-000000000001',
   'authenticated', 'authenticated', 'demo.ef@umi.test',
   '$2a$10$demoDEMOdemoDEMOdemoDEMOdemoDEMOdemoDEMOdemoDEMO', now(),
   now() - interval '31 days', now(),
   '{"provider":"email","providers":["email"]}'::jsonb, '{"demo":true}'::jsonb,
   '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '0de70002-0000-4000-a000-000000000002',
   'authenticated', 'authenticated', 'demo.gh@umi.test',
   '$2a$10$demoDEMOdemoDEMOdemoDEMOdemoDEMOdemoDEMOdemoDEMO', now(),
   now() - interval '31 days', now(),
   '{"provider":"email","providers":["email"]}'::jsonb, '{"demo":true}'::jsonb,
   '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '0de70003-0000-4000-a000-000000000003',
   'authenticated', 'authenticated', 'demo.jp@umi.test',
   '$2a$10$demoDEMOdemoDEMOdemoDEMOdemoDEMOdemoDEMOdemoDEMO', now(),
   now() - interval '31 days', now(),
   '{"provider":"email","providers":["email"]}'::jsonb, '{"demo":true}'::jsonb,
   '', '', '', '')
on conflict (id) do nothing;

-- 2) Sièges actifs rattachés au praticien #1 --------------------------------
insert into public.patient_seats (
  id, practitioner_id, patient_user_id, label, invite_code, invite_email,
  status, created_at, expires_at, redeemed_at
) values
  ('5ea70001-0000-4000-a000-000000000001', '2f69fe7b-f12d-44c0-b1f1-f57dd79f2cc5',
   '0de70001-0000-4000-a000-000000000001', 'E. F. (démo)', '8801', null,
   'active', now() - interval '31 days', now() + interval '30 days', now() - interval '30 days'),
  ('5ea70002-0000-4000-a000-000000000002', '2f69fe7b-f12d-44c0-b1f1-f57dd79f2cc5',
   '0de70002-0000-4000-a000-000000000002', 'G. H. (démo)', '8802', null,
   'active', now() - interval '31 days', now() + interval '30 days', now() - interval '30 days'),
  ('5ea70003-0000-4000-a000-000000000003', '2f69fe7b-f12d-44c0-b1f1-f57dd79f2cc5',
   '0de70003-0000-4000-a000-000000000003', 'J. P. (démo)', '8803', null,
   'active', now() - interval '31 days', now() + interval '30 days', now() - interval '30 days')
on conflict (id) do nothing;

-- 3) Complétions sur les 14 derniers jours ----------------------------------
--    Purge d'abord les complétions démo (idempotence), puis réinsertion.
delete from public.exercise_completions
 where patient_user_id in (
   '0de70001-0000-4000-a000-000000000001',
   '0de70002-0000-4000-a000-000000000002',
   '0de70003-0000-4000-a000-000000000003'
 );

with ex as (
  -- ids réels de la bibliothèque d'exercices (on cycle dessus)
  select array_agg(id order by id) as ids, count(*)::int as n
  from public.exercises
),
plan(pid, days_ago, cnt) as (
  values
    -- E. F. — très engagé (activité récente et régulière)
    ('0de70001-0000-4000-a000-000000000001'::uuid, 0, 2),
    ('0de70001-0000-4000-a000-000000000001'::uuid, 1, 3),
    ('0de70001-0000-4000-a000-000000000001'::uuid, 2, 1),
    ('0de70001-0000-4000-a000-000000000001'::uuid, 3, 2),
    ('0de70001-0000-4000-a000-000000000001'::uuid, 5, 2),
    ('0de70001-0000-4000-a000-000000000001'::uuid, 6, 1),
    ('0de70001-0000-4000-a000-000000000001'::uuid, 8, 2),
    ('0de70001-0000-4000-a000-000000000001'::uuid, 10, 3),
    ('0de70001-0000-4000-a000-000000000001'::uuid, 11, 1),
    ('0de70001-0000-4000-a000-000000000001'::uuid, 13, 2),
    -- G. H. — modéré (moins d'exercices mais encore actif < 7 jours)
    ('0de70002-0000-4000-a000-000000000002'::uuid, 1, 1),
    ('0de70002-0000-4000-a000-000000000002'::uuid, 3, 1),
    ('0de70002-0000-4000-a000-000000000002'::uuid, 4, 2),
    ('0de70002-0000-4000-a000-000000000002'::uuid, 6, 1),
    ('0de70002-0000-4000-a000-000000000002'::uuid, 9, 1),
    ('0de70002-0000-4000-a000-000000000002'::uuid, 11, 2),
    -- J. P. — en veille (rien depuis plus de 7 jours)
    ('0de70003-0000-4000-a000-000000000003'::uuid, 8, 2),
    ('0de70003-0000-4000-a000-000000000003'::uuid, 9, 1),
    ('0de70003-0000-4000-a000-000000000003'::uuid, 10, 2),
    ('0de70003-0000-4000-a000-000000000003'::uuid, 12, 1),
    ('0de70003-0000-4000-a000-000000000003'::uuid, 13, 2)
),
expanded as (
  select p.pid, p.days_ago,
         (row_number() over (order by p.pid, p.days_ago))::int as rn
  from plan p cross join generate_series(1, p.cnt) as g
)
insert into public.exercise_completions (id, patient_user_id, exercise_id, completed_at)
select gen_random_uuid(),
       e.pid,
       ex.ids[(e.rn % ex.n) + 1],
       now() - (e.days_ago * interval '1 day') - ((e.rn % 8) * interval '1 hour')
from expanded e cross join ex;

commit;

-- ============================================================================
-- NETTOYAGE (décommenter et exécuter pour tout retirer)
-- ----------------------------------------------------------------------------
-- begin;
-- delete from public.exercise_completions
--  where patient_user_id in (
--    '0de70001-0000-4000-a000-000000000001',
--    '0de70002-0000-4000-a000-000000000002',
--    '0de70003-0000-4000-a000-000000000003'
--  );
-- delete from public.patient_seats
--  where id in (
--    '5ea70001-0000-4000-a000-000000000001',
--    '5ea70002-0000-4000-a000-000000000002',
--    '5ea70003-0000-4000-a000-000000000003'
--  );
-- delete from auth.users
--  where id in (
--    '0de70001-0000-4000-a000-000000000001',
--    '0de70002-0000-4000-a000-000000000002',
--    '0de70003-0000-4000-a000-000000000003'
--  );
-- commit;
-- ============================================================================
