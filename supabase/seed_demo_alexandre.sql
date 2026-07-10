-- ============================================================================
-- MOCK DATA (démo portail) — praticien Alexandre Andurand
-- id = 2f69fe7b-f12d-44c0-b1f1-f57dd79f2cc5
--
-- But : remplir la patientèle pour voir le dashboard + les fiches, SANS l'app.
-- Astuce : le seul "vrai" patient actif utilise l'id auth du praticien lui-même
-- comme stand-in (évite de créer de faux comptes auth.users). Le reste = sièges
-- invités / révoqué. À exécuter UNE FOIS (relancer échoue : codes en double).
-- Nettoyage tout en bas.
-- ============================================================================

-- 1) Un patient ACTIF (données d'usage réelles -> assiduité "actif")
insert into public.patient_seats
  (practitioner_id, patient_user_id, label, invite_code, status, redeemed_at, expires_at)
values
  ('2f69fe7b-f12d-44c0-b1f1-f57dd79f2cc5', '2f69fe7b-f12d-44c0-b1f1-f57dd79f2cc5',
   'M. D. (démo)', '9001', 'active', now() - interval '25 days', now() + interval '5 days');

-- 2) Ses exercices "faits" : 4 exercices, plusieurs dates (dont récentes + répétitions)
insert into public.exercise_completions (patient_user_id, exercise_id, completed_at)
select '2f69fe7b-f12d-44c0-b1f1-f57dd79f2cc5', e.id, now() - (d || ' days')::interval
from   (select id from public.exercises order by id limit 4) e
cross join (values (1), (3), (6), (12), (20)) as t(d);

-- 3) Deux invitations EN ATTENTE (panneau "Invitations en attente")
insert into public.patient_seats (practitioner_id, label, invite_code, status, expires_at)
values
  ('2f69fe7b-f12d-44c0-b1f1-f57dd79f2cc5', 'A. B. (démo)', '9002', 'invited', now() + interval '25 days'),
  ('2f69fe7b-f12d-44c0-b1f1-f57dd79f2cc5', 'C. L. (démo)', '9003', 'invited', now() + interval '5 days');

-- 4) Un suivi TERMINÉ (révoqué)
insert into public.patient_seats
  (practitioner_id, label, invite_code, status, redeemed_at, revoked_at, expires_at)
values
  ('2f69fe7b-f12d-44c0-b1f1-f57dd79f2cc5', 'R. T. (démo)', '9004', 'revoked',
   now() - interval '60 days', now() - interval '10 days', now() - interval '30 days');

-- ============================================================================
-- NETTOYAGE (supprime uniquement cette mock data)
-- delete from public.exercise_completions
--   where patient_user_id = '2f69fe7b-f12d-44c0-b1f1-f57dd79f2cc5';
-- delete from public.patient_seats
--   where practitioner_id = '2f69fe7b-f12d-44c0-b1f1-f57dd79f2cc5'
--     and invite_code in ('9001','9002','9003','9004');
-- ============================================================================
