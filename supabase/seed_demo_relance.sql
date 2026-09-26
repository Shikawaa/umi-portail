-- ============================================================================
-- SEED DÉMO — SCRIPT DE RELANCE — praticienne #1 (Coralie Dupont)
-- practitioner_id = 2f69fe7b-f12d-44c0-b1f1-f57dd79f2cc5
--
-- ▶ C'EST LE SEUL FICHIER À GARDER. Il contient tout l'état de démo actuel
--   (il remplace seed_demo_presentation + l'add-on « états terminés » + le
--   correctif « exercices explorés », qui étaient des correctifs ponctuels).
--   Relance-le avant la présentation : toutes les dates se recalent sur now(),
--   donc les graphiques 7 j / 14 j redeviennent pleins. Sans relance, les
--   courbes glissent (T. N. sera décroché depuis 20 j au lieu de 10, etc.).
--
-- Objet : reconstruire une patientèle crédible et lisible pour la démo du
--         portail, avec de l'activité RÉCENTE (les seeds précédents datent de
--         juillet : plus rien dans la fenêtre 14 jours des graphiques).
--
-- Contenu :
--   6 patients rattachés, 4 courbes d'engagement différentes :
--     M. D. (démo) — régulier, ~1 exercice/jour            -> « Engagé »
--     S. K. (démo) — par pics, surtout le week-end         -> « Engagé »
--     A. B. (démo) — progression croissante (démarrage lent -> montée)
--     L. R. (démo) — irrégulier, en dents de scie          -> « Engagé »
--     T. N. (démo) — décroché il y a ~10 jours             -> « À relancer »
--     C. F. (démo) — rattaché il y a 5 j, jamais démarré   -> « Jamais démarré »
--   + 1 suivi DÉLIÉ par le patient, historique conservé, reprise ouverte (P. V.)
--   + 1 suivi RÉVOQUÉ par la psy, fenêtre de reprise fermée (R. B.) : c'est la
--     fiche sur laquelle démontrer « Réactiver le code », puis la suppression
--     définitive, sans sacrifier l'historique de P. V.
--   + 2 invitations EN ATTENTE (dont une qui expire dans 3 jours)
--   + 1 invitation EXPIRÉE, jamais utilisée (D. C.)
--   + 2 à 3 recommandations d'exercices par patient, avec note FR/EN
--
-- ⚠️ PRÉSERVÉ : le siège de code 8120 (compte mobile réel) et toutes ses
--    complétions ne sont JAMAIS touchés — tu peux faire un exercice en direct
--    pendant la démo et montrer la mise à jour.
--
-- REJOUABLE : ré-exécuter le script repositionne toutes les dates sur now()
--    (utile la veille ou le matin de la présentation pour « rafraîchir »
--    les 14 derniers jours). Aucun doublon.
--
-- Où : Supabase Studio > SQL Editor. Tout coller, exécuter d'un bloc.
-- Nettoyage complet : section commentée tout en bas.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- ÉTAPE 0 (facultatif) — INVENTAIRE avant nettoyage.
-- À exécuter SEUL d'abord si tu veux vérifier ce qui existe et ce qui va
-- disparaître. Ne modifie rien.
-- ----------------------------------------------------------------------------
-- select s.invite_code, s.label, s.status, s.redeemed_at::date, s.released_at::date,
--        count(c.id) as completions, max(c.completed_at) as derniere_activite
--   from public.patient_seats s
--   left join public.exercise_completions c
--     on c.patient_user_id = s.patient_user_id
--    and c.completed_at >= s.redeemed_at
--  where s.practitioner_id = '2f69fe7b-f12d-44c0-b1f1-f57dd79f2cc5'
--  group by s.id order by s.status, s.invite_code;

begin;

-- ----------------------------------------------------------------------------
-- ÉTAPE 1 — Garde-fou : la bibliothèque d'exercices doit être peuplée.
-- (Le script pioche dans les ids réels de public.exercises, quel que soit
--  leur nombre ; il en faut au moins 6 pour que chaque patient ait une
--  sélection distincte.)
-- ----------------------------------------------------------------------------
do $$
declare v_n int;
begin
  select count(*) into v_n from public.exercises;
  if v_n < 6 then
    raise exception 'Bibliothèque trop petite : % exercice(s) en base, il en faut au moins 6.', v_n;
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- ÉTAPE 2 — NETTOYAGE des anciennes données de démo et de test.
-- Listes explicites uniquement : seed_demo_alexandre (9001-9004),
-- seed_demo_practitioner_1 (@umi.test, 8801-8803), un seed « (démo) »
-- antérieur (8804-8807) et les sièges de test manuels (9124, 8174, 3225,
-- 6267, 9034). Le code 8120 n'est dans aucune liste : il est conservé.
-- ----------------------------------------------------------------------------

-- 2.a Complétions du stand-in bancal « la psy est son propre patient »
--     (seed_demo_alexandre, siège 9001). Sécurité : on ne supprime rien si le
--     siège live 8120 est justement rattaché à ce même compte.
delete from public.exercise_completions c
 where c.patient_user_id = '2f69fe7b-f12d-44c0-b1f1-f57dd79f2cc5'
   and not exists (
     select 1 from public.patient_seats s
      where s.invite_code = '8120'
        and s.patient_user_id = c.patient_user_id
   );

-- 2.b Sièges de démo et de test (les recommandations rattachées partent en
--     cascade). Les complétions des patients concernés ne sont PAS supprimées :
--     ce sont leurs données propres, comme pour delete_seat() dans le portail.
--     Seul le lien de suivi disparaît du portail ; la personne peut se
--     rerattacher plus tard avec un code.
delete from public.patient_seats
 where practitioner_id = '2f69fe7b-f12d-44c0-b1f1-f57dd79f2cc5'
   and invite_code in (
     -- seed_demo_alexandre + seed_demo_practitioner_1
     '9001','9002','9003','9004','8801','8802','8803',
     -- seed « (démo) » antérieur, activité arrêtée en juillet
     '8804','8805','8806','8807',
     -- sièges de test manuels (AL.S, ALEXIS, Alexis Demo, mllml, testreco2)
     '9124','8174','3225','6267','9034'
   );
delete from public.patient_seats
 where id in ('5ea70001-0000-4000-a000-000000000001',
              '5ea70002-0000-4000-a000-000000000002',
              '5ea70003-0000-4000-a000-000000000003');

-- 2.c Faux comptes patients du seed précédent (leurs complétions cascadent).
delete from auth.users
 where id in ('0de70001-0000-4000-a000-000000000001',
              '0de70002-0000-4000-a000-000000000002',
              '0de70003-0000-4000-a000-000000000003');

-- 2.d Purge de CE seed (rend le script rejouable : les dates se recalent
--     sur now() à chaque exécution).
delete from public.exercise_completions
 where patient_user_id in (
   '0de72001-0000-4000-a000-000000000001','0de72002-0000-4000-a000-000000000002',
   '0de72003-0000-4000-a000-000000000003','0de72004-0000-4000-a000-000000000004',
   '0de72005-0000-4000-a000-000000000005','0de72006-0000-4000-a000-000000000006',
   '0de72007-0000-4000-a000-000000000007','0de72008-0000-4000-a000-000000000008'
 );
delete from public.patient_seats
 where id in (
   '5ea72001-0000-4000-a000-000000000001','5ea72002-0000-4000-a000-000000000002',
   '5ea72003-0000-4000-a000-000000000003','5ea72004-0000-4000-a000-000000000004',
   '5ea72005-0000-4000-a000-000000000005','5ea72006-0000-4000-a000-000000000006',
   '5ea72007-0000-4000-a000-000000000007','5ea72008-0000-4000-a000-000000000008',
   '5ea72009-0000-4000-a000-000000000009','5ea72010-0000-4000-a000-000000000010',
   '5ea72011-0000-4000-a000-000000000011'
 );
-- Les deux codes d'invitation réutilisés par le script doivent être libres
-- (index unique partiel sur les codes « invited »).
delete from public.patient_seats
 where practitioner_id = '2f69fe7b-f12d-44c0-b1f1-f57dd79f2cc5'
   and status = 'invited' and invite_code in ('8210','8211');

-- ----------------------------------------------------------------------------
-- ÉTAPE 3 — Comptes patients de test (auth.users).
-- Mots de passe volontairement inexploitables : ces comptes ne servent qu'à
-- porter les données, on ne s'y connecte pas. Emails en @umi.test.
-- ----------------------------------------------------------------------------
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
select '00000000-0000-0000-0000-000000000000', p.id, 'authenticated', 'authenticated',
       p.email, '$2a$10$demoDEMOdemoDEMOdemoDEMOdemoDEMOdemoDEMOdemoDEMO', now(),
       now() - (p.age_days * interval '1 day'), now(),
       '{"provider":"email","providers":["email"]}'::jsonb,
       jsonb_build_object('demo', true, 'display_name', p.display_name),
       '', '', '', ''
from (values
  ('0de72001-0000-4000-a000-000000000001'::uuid, 'demo.p1@umi.test', 'M. D.', 42),
  ('0de72002-0000-4000-a000-000000000002'::uuid, 'demo.p2@umi.test', 'S. K.', 42),
  ('0de72003-0000-4000-a000-000000000003'::uuid, 'demo.p3@umi.test', 'A. B.', 39),
  ('0de72004-0000-4000-a000-000000000004'::uuid, 'demo.p4@umi.test', 'L. R.', 42),
  ('0de72005-0000-4000-a000-000000000005'::uuid, 'demo.p5@umi.test', 'T. N.', 41),
  ('0de72006-0000-4000-a000-000000000006'::uuid, 'demo.p6@umi.test', 'C. F.', 6),
  ('0de72007-0000-4000-a000-000000000007'::uuid, 'demo.p7@umi.test', 'P. V.', 73),
  ('0de72008-0000-4000-a000-000000000008'::uuid, 'demo.p8@umi.test', 'R. B.', 57)
) as p(id, email, display_name, age_days)
on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- ÉTAPE 4 — Sièges (la relation de suivi psy <-> patient).
-- Libellés non nominatifs, conformes au parti-pris du portail.
-- ----------------------------------------------------------------------------
insert into public.patient_seats (
  id, practitioner_id, patient_user_id, label, invite_code, invite_email,
  status, created_at, expires_at, redeemed_at, released_at, revoked_at, resume_until
)
select s.id, '2f69fe7b-f12d-44c0-b1f1-f57dd79f2cc5', s.patient_id, s.label,
       s.code, null, s.status,
       now() - (s.created_days * interval '1 day'),
       now() + (s.expires_days * interval '1 day'),
       case when s.redeemed_days is null then null
            else now() - (s.redeemed_days * interval '1 day') end,
       case when s.released_days is null then null
            else now() - (s.released_days * interval '1 day') end,
       case when s.revoked_days is null then null
            else now() - (s.revoked_days * interval '1 day') end,
       case when s.resume_days is null then null
            else now() + (s.resume_days * interval '1 day') end
from (values
  -- id                                            patient                                        label            code   statut      créé  expire  rattaché  délié      révoqué    reprise
  ('5ea72001-0000-4000-a000-000000000001'::uuid, '0de72001-0000-4000-a000-000000000001'::uuid, 'M. D. (démo)', '8301', 'active',   42, 30,  41::int, null::int, null::int, null::int),
  ('5ea72002-0000-4000-a000-000000000002'::uuid, '0de72002-0000-4000-a000-000000000002'::uuid, 'S. K. (démo)', '8302', 'active',   42, 30,  41,      null,      null,      null),
  ('5ea72003-0000-4000-a000-000000000003'::uuid, '0de72003-0000-4000-a000-000000000003'::uuid, 'A. B. (démo)', '8303', 'active',   39, 30,  38,      null,      null,      null),
  ('5ea72004-0000-4000-a000-000000000004'::uuid, '0de72004-0000-4000-a000-000000000004'::uuid, 'L. R. (démo)', '8304', 'active',   42, 30,  41,      null,      null,      null),
  ('5ea72005-0000-4000-a000-000000000005'::uuid, '0de72005-0000-4000-a000-000000000005'::uuid, 'T. N. (démo)', '8305', 'active',   41, 30,  40,      null,      null,      null),
  ('5ea72006-0000-4000-a000-000000000006'::uuid, '0de72006-0000-4000-a000-000000000006'::uuid, 'C. F. (démo)', '8306', 'active',    6, 30,   5,      null,      null,      null),
  -- Délié par le patient : historique conservé, fenêtre de reprise ouverte
  -- (badge « Reprise possible » + date limite dans la bannière).
  ('5ea72007-0000-4000-a000-000000000007'::uuid, '0de72007-0000-4000-a000-000000000007'::uuid, 'P. V. (démo)', '8307', 'released', 73, 30,  72,         8,      null,        22),
  -- Révoqué par la psy, fenêtre de reprise fermée : bannière « suivi terminé »
  -- + bouton « Réactiver le code » (reactivate_seat), et siège supprimable.
  ('5ea72010-0000-4000-a000-000000000010'::uuid, '0de72008-0000-4000-a000-000000000008'::uuid, 'R. B. (démo)', '8308', 'revoked',  57, 30,  56,       null,         6,      null),
  -- Invitations en attente (aucun patient rattaché).
  ('5ea72008-0000-4000-a000-000000000008'::uuid, null,                                          'K. M. (démo)', '8210', 'invited',   3, 27,  null,   null,      null,      null),
  ('5ea72009-0000-4000-a000-000000000009'::uuid, null,                                          'N. S. (démo)', '8211', 'invited',  27,  3,  null,   null,      null,      null),
  -- Invitation jamais utilisée et périmée (badge « Expiré », supprimable).
  ('5ea72011-0000-4000-a000-000000000011'::uuid, null,                                          'D. C. (démo)', '8212', 'expired',  45, -10, null,   null,      null,      null)
) as s(id, patient_id, label, code, status, created_days, expires_days, redeemed_days, released_days, revoked_days, resume_days);

-- ----------------------------------------------------------------------------
-- ÉTAPE 5 — Complétions d'exercices : une courbe d'engagement par patient.
-- Chaque profil a sa formule (jour par jour), donc des graphiques nettement
-- différents les uns des autres dans la fiche patient (fenêtre 14 jours) et
-- sur les sparklines du dashboard (fenêtre 7 jours).
-- Les exercices « faits » tombent en majorité sur ceux recommandés par la psy
-- (étape 6) : l'histoire reste cohérente d'un écran à l'autre.
-- ----------------------------------------------------------------------------
with lib as (
  select array_agg(id order by id) as ids, count(*)::int as n from public.exercises
),
profil as (
  select * from (values
    -- `idx` décale la sélection d'exercices, `largeur` = nombre d'exercices
    -- distincts que le patient touche (anneau « Exercices explorés » de la
    -- fiche : un patient discipliné tourne sur 4, un curieux en explore 9).
    -- clé  patient                                        idx  du jour  au jour  largeur
    ('p1', '0de72001-0000-4000-a000-000000000001'::uuid, 0, 0,  40, 4),
    ('p2', '0de72002-0000-4000-a000-000000000002'::uuid, 1, 0,  40, 7),
    ('p3', '0de72003-0000-4000-a000-000000000003'::uuid, 2, 0,  37, 5),
    ('p4', '0de72004-0000-4000-a000-000000000004'::uuid, 3, 0,  40, 9),
    ('p5', '0de72005-0000-4000-a000-000000000005'::uuid, 4, 9,  39, 2),
    -- p6 (C. F.) n'a aucune complétion : « jamais démarré ».
    ('p7', '0de72007-0000-4000-a000-000000000007'::uuid, 5, 9,  71, 6),
    ('p8', '0de72008-0000-4000-a000-000000000008'::uuid, 6, 7,  55, 3)
  ) as t(cle, patient_id, idx, j_debut, j_fin, largeur)
),
jour as (
  select p.cle, p.patient_id, p.idx, p.largeur, d,
         (current_date - d)::date            as date_jour,
         extract(dow from current_date - d)::int as dow
  from profil p
  cross join lateral generate_series(p.j_debut, p.j_fin) as d
),
volume as (
  select cle, patient_id, idx, largeur, d, date_jour,
    case cle
      -- Régulier : ~1 par jour, 2 tous les 5 jours, un jour de pause par semaine.
      when 'p1' then (case when d % 7 = 6 then 0 else 1 end)
                   + (case when d % 5 = 0 then 1 else 0 end)
      -- Par pics : 3 le samedi et le dimanche, 1 le mercredi, rien sinon.
      when 'p2' then (case when dow in (0, 6) then 3 else 0 end)
                   + (case when dow = 3 then 1 else 0 end)
      -- Progression : démarrage timide il y a 5 semaines, montée jusqu'à 3/jour
      -- (la marche d'escalier est visible dans la fenêtre 14 jours de la fiche).
      when 'p3' then case when d > 28 then (case when d % 3 = 0 then 1 else 0 end)
                          when d > 14 then (case when d % 2 = 0 then 1 else 0 end)
                          when d > 9  then 1
                          when d > 4  then 1 + (case when d % 2 = 0 then 1 else 0 end)
                          else 3 end
      -- Irrégulier : grosses séances groupées (4) puis longues pauses.
      when 'p4' then case when d % 11 < 2 then 4
                          when d % 7 = 3 then 2
                          when d % 4 = 0 then 1
                          else 0 end
      -- En veille : actif jusqu'à il y a ~10 jours, puis plus rien.
      when 'p5' then (case when d % 2 = 0 then 1 else 0 end)
                   + (case when d % 7 = 0 then 1 else 0 end)
      -- Suivi délié : activité modérée sur toute la période de suivi.
      when 'p7' then (case when d % 3 = 0 then 1 else 0 end)
      -- Suivi révoqué : bon départ, puis essoufflement jusqu'à la clôture.
      when 'p8' then case when d > 28 then (case when d % 2 = 0 then 1 else 0 end)
                          when d > 8  then (case when d % 3 = 0 then 1 else 0 end)
                          else 1 end
      else 0
    end as nb
  from jour
),
etale as (
  select v.cle, v.patient_id, v.idx, v.largeur, v.date_jour,
         (row_number() over (partition by v.cle order by v.date_jour desc, g.i))::int as rn
  from volume v
  cross join lateral generate_series(1, v.nb) as g(i)
  where v.nb > 0
)
insert into public.exercise_completions (patient_user_id, exercise_id, completed_at)
select e.patient_id,
       -- ~60 % des séances sur les 3 exercices recommandés par la psy, le reste
       -- réparti sur ceux que le patient a trouvés seul (largeur de la palette).
       lib.ids[ (((e.idx * 3 + (case
                    when e.largeur <= 3 then e.rn % e.largeur
                    when e.rn % 5 < 3   then e.rn % 3
                    else 3 + (e.rn % (e.largeur - 3))
                  end)) % lib.n) + 1)::int ],
       -- Heure plausible dans la journée ; jamais dans le futur pour aujourd'hui.
       least(
         e.date_jour::timestamptz
           + interval '8 hours'
           + ((e.rn % 11) * interval '1 hour')
           + ((e.rn % 7)  * interval '7 minutes'),
         now() - interval '3 minutes'
       )
from etale e cross join lib;

-- ----------------------------------------------------------------------------
-- ÉTAPE 6 — Recommandations de la psy (carte « Recommandations » de la fiche,
-- lue telle quelle par l'app mobile). Note en FR et EN : le portail bascule
-- selon la langue choisie, la démo reste propre dans les deux.
-- Les exercices recommandés sont exactement ceux le plus souvent « faits ».
-- ----------------------------------------------------------------------------
with lib as (
  select array_agg(id order by id) as ids, count(*)::int as n from public.exercises
)
insert into public.recommendations (
  patient_seat_id, exercise_id, note, note_en, practitioner_name, is_active, created_at
)
select r.seat_id,
       lib.ids[ (((r.idx * 3 + r.j) % lib.n) + 1)::int ]::text,
       r.note_fr, r.note_en, 'Coralie Dupont', true,
       now() - (r.age_days * interval '1 day')
from (values
  -- M. D. — régulier
  ('5ea72001-0000-4000-a000-000000000001'::uuid, 0, 0, 38,
   'À faire chaque matin, avant le petit-déjeuner. Cinq minutes suffisent.',
   'Every morning, before breakfast. Five minutes is enough.'),
  ('5ea72001-0000-4000-a000-000000000001'::uuid, 0, 1, 24,
   'En complément, les jours où la journée s''annonce chargée.',
   'On top of that, on days that look busy.'),
  ('5ea72001-0000-4000-a000-000000000001'::uuid, 0, 2, 9,
   'On ajoute celui-ci, vous êtes prêt·e pour une pratique plus longue.',
   'Let''s add this one — you''re ready for a longer practice.'),
  -- S. K. — par pics le week-end
  ('5ea72002-0000-4000-a000-000000000002'::uuid, 1, 0, 35,
   'Le week-end, au calme : c''est là que vous avez le plus de disponibilité.',
   'On weekends, in a quiet moment: that''s when you have the most room.'),
  ('5ea72002-0000-4000-a000-000000000002'::uuid, 1, 1, 20,
   'Essayons d''en glisser un en milieu de semaine, même court.',
   'Let''s try to fit one mid-week, even a short one.'),
  ('5ea72002-0000-4000-a000-000000000002'::uuid, 1, 2, 6,
   'À tester le dimanche soir, avant la reprise.',
   'Worth trying on Sunday evening, before the week starts.'),
  -- A. B. — progression
  ('5ea72003-0000-4000-a000-000000000003'::uuid, 2, 0, 33,
   'On commence doucement : deux fois par semaine, sans objectif de performance.',
   'Let''s start gently: twice a week, with no performance goal.'),
  ('5ea72003-0000-4000-a000-000000000003'::uuid, 2, 1, 17,
   'Vous pouvez passer à un rythme quotidien, le format est court.',
   'You can move to a daily rhythm — the format is short.'),
  ('5ea72003-0000-4000-a000-000000000003'::uuid, 2, 2, 4,
   'Très belle progression. Celui-ci demande un peu plus d''attention.',
   'Great progress. This one asks for a bit more attention.'),
  -- L. R. — irrégulier
  ('5ea72004-0000-4000-a000-000000000004'::uuid, 3, 0, 36,
   'Quand la tension monte au travail : trois minutes, où que vous soyez.',
   'When tension rises at work: three minutes, wherever you are.'),
  ('5ea72004-0000-4000-a000-000000000004'::uuid, 3, 1, 15,
   'Peu importe la régularité : mieux vaut une série courte qu''une semaine blanche.',
   'Regularity matters less than you think: a short run beats a blank week.'),
  ('5ea72004-0000-4000-a000-000000000004'::uuid, 3, 2, 5,
   'On en reparle à la prochaine séance.',
   'We''ll come back to this at our next session.'),
  -- T. N. — décroché
  ('5ea72005-0000-4000-a000-000000000005'::uuid, 4, 0, 37,
   'Le plus accessible pour reprendre : trois minutes, allongé·e.',
   'The easiest way back in: three minutes, lying down.'),
  ('5ea72005-0000-4000-a000-000000000005'::uuid, 4, 1, 22,
   'Idéal en fin de journée, quand l''endormissement est difficile.',
   'Best at the end of the day, when falling asleep is hard.'),
  ('5ea72005-0000-4000-a000-000000000005'::uuid, 4, 2, 11,
   'Si vous n''avez pas eu le temps cette semaine, reprenez par celui-ci.',
   'If this week got away from you, start again with this one.'),
  -- C. F. — rattaché récemment, n'a pas encore démarré
  ('5ea72006-0000-4000-a000-000000000006'::uuid, 0, 1, 4,
   'Bienvenue. Commencez par celui-ci, à votre rythme, sans pression.',
   'Welcome. Start with this one, at your own pace, no pressure.'),
  ('5ea72006-0000-4000-a000-000000000006'::uuid, 0, 2, 4,
   'Et celui-ci si le premier vous paraît trop long.',
   'And this one if the first feels too long.'),
  -- P. V. — suivi délié (les recommandations restent dans l'historique)
  ('5ea72007-0000-4000-a000-000000000007'::uuid, 5, 0, 60,
   'On garde un rendez-vous fixe : même heure, même endroit.',
   'Let''s keep a fixed slot: same time, same place.'),
  ('5ea72007-0000-4000-a000-000000000007'::uuid, 5, 1, 33,
   'Celui-ci demande plus de concentration, à faire au calme.',
   'This one needs more focus — best done somewhere quiet.'),
  -- R. B. — suivi révoqué (les recommandations restent visibles dans l'historique)
  ('5ea72010-0000-4000-a000-000000000010'::uuid, 6, 0, 50,
   'Deux fois par semaine pour commencer, on ajustera ensemble.',
   'Twice a week to start with — we''ll adjust together.'),
  ('5ea72010-0000-4000-a000-000000000010'::uuid, 6, 1, 30,
   'Celui-ci fonctionne bien en fin de journée.',
   'This one works well at the end of the day.')
) as r(seat_id, idx, j, age_days, note_fr, note_en)
cross join lib;

commit;

-- ----------------------------------------------------------------------------
-- ÉTAPE 7 — VÉRIFICATION (lecture seule, s'exécute avec le reste).
-- Doit renvoyer 12 lignes :
--   active   : M. D. / S. K. / A. B. / L. R. (dernière activité = aujourd'hui),
--              T. N. (il y a ~10 j), C. F. (0 exercice), + ton siège 8120
--   released : P. V. (21 séances, reprise possible)
--   revoked  : R. B. (22 séances, clos il y a 6 j)
--   invited  : K. M. (expire dans 27 j), N. S. (expire dans 3 j)
--   expired  : D. C. (jamais utilisée)
-- ----------------------------------------------------------------------------
select s.label,
       s.status,
       s.invite_code,
       count(c.id)                                                            as total,
       count(c.id) filter (where c.completed_at >= now() - interval '7 days')  as sur_7j,
       count(c.id) filter (where c.completed_at >= now() - interval '14 days') as sur_14j,
       max(c.completed_at)::date                                              as derniere_activite
  from public.patient_seats s
  left join public.exercise_completions c
    on  c.patient_user_id = s.patient_user_id
    and c.completed_at >= s.redeemed_at
    and (s.released_at is null or c.completed_at < s.released_at)
    and (s.revoked_at  is null or c.completed_at < s.revoked_at)
 where s.practitioner_id = '2f69fe7b-f12d-44c0-b1f1-f57dd79f2cc5'
 group by s.id, s.label, s.status, s.invite_code
 order by s.status, s.label;

-- ============================================================================
-- NETTOYAGE COMPLET (décommenter et exécuter pour tout retirer).
-- Ne touche pas au siège 8120 ni à ses complétions.
-- ----------------------------------------------------------------------------
-- begin;
-- delete from public.patient_seats
--  where practitioner_id = '2f69fe7b-f12d-44c0-b1f1-f57dd79f2cc5'
--    and invite_code in ('8301','8302','8303','8304','8305','8306','8307','8308',
--                        '8210','8211','8212');
-- delete from auth.users
--  where id in (
--    '0de72001-0000-4000-a000-000000000001','0de72002-0000-4000-a000-000000000002',
--    '0de72003-0000-4000-a000-000000000003','0de72004-0000-4000-a000-000000000004',
--    '0de72005-0000-4000-a000-000000000005','0de72006-0000-4000-a000-000000000006',
--    '0de72007-0000-4000-a000-000000000007','0de72008-0000-4000-a000-000000000008'
--  );
-- commit;
-- ============================================================================
