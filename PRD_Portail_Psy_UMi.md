# PRD — Portail Psy UMi (v0)

- **Version** : 0.4 (build-ready — à valider)
- **Date** : 2026-07-08
- **Auteurs** : Équipe UMi (Alexandre – CEO, Alexis – CPO, Rawdath – CTO)
- **Portée** : v0 = poser les bases permettant à un psy de **donner accès** à l'app UMi à ses patients, via un **code par patient**, avec un **suivi minimal** (exercice fait / non fait). Facturation, journaling, notes, RDV, alertes : hors v0 (facturation anticipée dans le modèle de données).

### Journal des versions
| Version | Changements |
|---|---|
| 0.1 | Cadrage initial (MVP focalisé, code par siège, sans vérif ADELI). |
| 0.2 | Recentrage v0 « donner accès » ; auth de base ; traçage fait/non fait ; journaling dormant. |
| 0.3 | Version détaillée : règles de gestion, machine à états, user stories + critères d'acceptation, contrat d'opérations, matrice de permissions, emails (Resend), RGPD/rétention, DoD. Décisions verrouillées : accès = siège actif ; code écran + email Resend optionnel ; inactif = 7 j ; patient maître du lien (retrait/bascule). |
| 0.4 | Portail **bilingue FR/EN** (i18n) ; **numéro de psy** séquentiel auto-attribué ; traçage de complétion explicité (quel exercice / combien de fois / quand) ; Resend confirmé (3 000/mois) + clé en secret serveur ; confirmation d'email psy via Supabase Auth ; HDS = hypothèse retenue pour avancer. |

---

## 1. Contexte & objectif

UMi = solution hybride B2B2C, **le psy est le payeur**. App mobile (patient) = exercices TCC ; **portail web (psy)** = distribuer l'accès à l'app, puis suivre l'usage et (plus tard) être facturé.

**Objectif v0** — prouver le cœur du cycle de valeur, sans friction :
1. Le psy crée un compte (email + mot de passe).
2. Il génère un **code d'invitation par patient**.
3. Le patient s'inscrit sur mobile (email + mot de passe + code) → **rattaché** au psy → **accès à l'app**.
4. Le psy suit ses patients : **exercice fait / non fait** + assiduité.

**Cycle de valeur** : le psy invite → le patient utilise → le psy voit l'usage → il perçoit la valeur → il reste (et paiera).

---

## 2. Glossaire (terminologie précise)

| Terme | Définition |
|---|---|
| **Praticien / psy** | Utilisateur du portail web. Invite et suit ses patients. |
| **Numéro de psy (`practitioner_number`)** | Identifiant séquentiel lisible (psy 1, 2, 3…), attribué automatiquement à la création du compte. Sert à l'admin/support/affichage — **ne sert pas** au rattachement (celui-ci est assuré par le code, qui porte déjà le psy). |
| **Patient** | Utilisateur de l'app mobile, invité par un psy. |
| **Code d'invitation** | Chaîne unique à usage unique, liée à un psy et à un siège, saisie par le patient pour se rattacher. |
| **Siège (`patient_seat`)** | Objet pivot = invitation + rattachement + (futur) unité de facturation. Un siège = un patient. |
| **Rattachement** | Lien actif entre un patient et un psy (siège en statut `active`). |
| **Siège actif / rattaché** | Siège en statut `active` (le patient est lié à ce psy **maintenant**). |
| **Patient actif / en veille (assiduité)** | **actif** = ≥ 1 exercice fait dans les 7 derniers jours ; **en veille** = 0 exercice depuis 7 j ; **jamais commencé** = 0 exercice depuis le rattachement. *(À ne pas confondre avec le statut de siège.)* |
| **Complétion (`exercise_completion`)** | Événement « le patient a fait l'exercice X à l'instant T ». Métadonnée uniquement, aucun contenu. |
| **Redémption** | Action par laquelle le patient consomme un code et devient rattaché. |

---

## 3. Personas & rôles

| Rôle | Description | Surface |
|---|---|---|
| **Praticien (psy)** | Payeur (plus tard). Gère invitations + suivi patientèle. | Portail web |
| **Patient** | Invité, maître de son rattachement (retrait/bascule). | App mobile |
| **Admin UMi** *(interne)* | Support, cas limites (changement de psy manuel, litiges). | Outillage SQL (v0) |

Distinction de rôle : socle Supabase Auth unique. Ligne dans `practitioners` ⇒ psy ; ligne dans `profiles` ⇒ patient. (Claim `app_metadata.role` : optionnel, phase ultérieure.)

---

## 4. Périmètre

### 4.1 Dans le périmètre (v0)
- Auth praticien (email + mot de passe, confirmation email, reset).
- Création / gestion d'**invitations par patient** (code, libellé, expiration, régénération, révocation).
- Onboarding patient mobile : email + mot de passe + **code obligatoire**.
- **Rattachement** + cycle de vie du siège + **accès app conditionné au siège actif**.
- **Patient maître** : retrait de code (délie) / saisie d'un nouveau code (bascule).
- **Suivi minimal** : exercice fait/non fait + assiduité (7 j).
- Email transactionnel via **Resend** (confirmation, reset, envoi de code optionnel).
- Sécurité / RLS / minimisation / rétention.

### 4.2 Hors périmètre (anticipé, cf. §19-22)
Facturation/Stripe (modèle prévu, non implémenté) · journaling, mood, IA, marqueurs (tables dormantes) · consentement granulaire · vérification ADELI/RPPS · notes sécurisées · alertes d'urgence · Doctolib/RDV · personnalisation d'exercices par le psy · offre B2C sans psy.

---

## 5. Hypothèses & valeurs par défaut (ajustables)

| Réf | Hypothèse / défaut | Statut |
|---|---|---|
| H-1 | **Format de code** : **4 chiffres** (`0000`–`9999`), pour un écran PIN à 4 cases côté app. ⚠️ Espace faible (10 000) → verrouillage progressif (3 essais, puis 1 min, puis 5 min), expiration, unicité seulement parmi les codes actifs (migration 0003). | décidé |
| H-2 | **Expiration du code** : 30 jours après création. | par défaut |
| H-3 | **Politique mot de passe** : min. 8 caractères (défaut Supabase Auth), hachage géré par Supabase. | par défaut |
| H-4 | **Confirmation d'email** obligatoire (psy ET patient) avant usage. | par défaut |
| H-5 | **Nombre de sièges par psy** : illimité en v0 (pas de facturation). | par défaut |
| H-6 | **Un patient a au plus un siège actif** à un instant donné (mais peut basculer). | décidé |
| H-7 | **Assiduité** : inactif = 0 complétion sur 7 jours glissants. | décidé |
| H-8 | **Accès app** = existence d'un siège `active` pour le patient. | décidé |
| H-9 | **Langue** : portail **bilingue FR + EN**, entièrement basculable (i18n) ; FR par défaut. | décidé |
| H-10 | **Hébergement** : Supabase (région UE). Choix « fait/non fait » sans contenu → hors périmètre données de santé (à faire confirmer, §14.4). | décidé + à confirmer |

---

## 6. Règles de gestion (RG)

**Codes & invitations**
- **RG-1** Un code est unique (contrainte DB), à **usage unique**, lié à exactement un psy et un siège.
- **RG-2** Un code non consommé peut être **régénéré** (invalide l'ancien) ou **révoqué** par le psy.
- **RG-3** Un code **expiré** (RG H-2) ne peut plus être redeemé ; le siège passe `expired`.
- **RG-4** La redémption d'un code déjà consommé/expiré/révoqué échoue avec un message explicite.

**Rattachement & accès**
- **RG-5** À la redémption réussie, le siège passe `active` et `patient_user_id` est renseigné.
- **RG-6** **Accès app** : l'app n'est utilisable que si le patient a un siège `active`. Sinon → écran « saisis le code de ton psy ».
- **RG-7** **Bascule** : si un patient déjà rattaché redeeme un **nouveau** code, son siège courant passe `released` (automatique) puis le nouveau siège passe `active`. Le lien bascule vers le nouveau psy.
- **RG-8** **Retrait** : le patient peut délier lui-même son siège courant → `released` → il perd l'accès jusqu'à saisie d'un nouveau code.
- **RG-9** **Révocation psy** : le psy peut révoquer un siège `active` → `revoked` → le patient perd l'accès.
- **RG-10** Un patient ne peut avoir qu'**un seul** siège `active` (garanti par la logique de bascule).

**Suivi & assiduité**
- **RG-11** Une **complétion** est enregistrée à chaque exercice terminé (événement horodaté, sans contenu). Les répétitions sont permises (log d'événements).
- **RG-12** « Exercice fait » = ≥ 1 complétion pour cet exercice pendant le rattachement courant. Le **nombre de fois** et les **dates** sont dérivés du log de complétions (quel exercice / combien de fois / quand).
- **RG-13** **Assiduité** : `actif` si complétion < 7 j ; `en veille` si ≥ 7 j ; `jamais commencé` si aucune complétion depuis `redeemed_at`.
- **RG-14** **Visibilité psy** : un psy ne voit que les complétions réalisées **pendant sa période de rattachement** (`completed_at ≥ redeemed_at` du siège le liant, siège `active`). Il ne voit **jamais** l'historique fait sous un autre psy.

**Facturation (anticipée, non active en v0)**
- **RG-15** Unité facturable = siège `active`. Forfait = 2 sièges inclus ; au-delà 5 €/siège actif. (Détail §19.)

---

## 7. Machine à états du siège

États : `invited` · `active` · `released` · `revoked` · `expired` · `paused` *(réservé facturation, non utilisé en v0)*.

| Transition | Déclencheur | Acteur | Effets |
|---|---|---|---|
| ∅ → `invited` | Création d'invitation | Psy | génère `invite_code`, `expires_at` |
| `invited` → `active` | Redémption du code | Patient | set `patient_user_id`, `redeemed_at` |
| `invited` → `expired` | `expires_at` dépassé (à la tentative) | Système | — |
| `invited` → `revoked` | Annulation d'invitation | Psy | `revoked_at` |
| `active` → `released` | Retrait ou bascule | Patient | `released_at` ; coupe l'accès |
| `active` → `revoked` | Fin de suivi | Psy | `revoked_at` ; coupe l'accès |
| `active` → `paused` | *(réservé facturation)* | Système | non v0 |

États terminaux : `released`, `revoked`, `expired`. Revenir chez un psy = **nouvelle** invitation (nouveau code).

---

## 8. Parcours utilisateurs (nominal + erreurs)

### P1 — Inscription praticien (portail)
Nominal : email + mot de passe + nom/prénom → email de confirmation → 1re connexion → création `practitioners` → tableau de bord (vide, CTA « Inviter un patient »).
Erreurs : email déjà utilisé ; email non confirmé (accès bloqué) ; mot de passe faible.

### P2 — Créer une invitation (siège)
Nominal : « Inviter un patient » → libellé (non nominatif recommandé) + email patient (optionnel) → génération du code → affichage écran (copiable) + envoi email si renseigné (Resend) → siège `invited`.
Erreurs : collision de code (regénérée automatiquement) ; échec d'envoi email (le code reste affiché).

### P3 — Onboarding patient + redémption (mobile)
Nominal : création compte (email + mdp) → confirmation email → écran « code du psy » → `redeem_seat_code` → siège `active` → accès app.
Erreurs : code invalide / expiré / déjà utilisé → message dédié ; email non confirmé → accès bloqué.

### P4 — Le patient change ou retire son code (mobile)
- **Bascule** : le patient saisit un nouveau code → ancien siège `released`, nouveau `active` (RG-7).
- **Retrait** : le patient délie → siège `released`, accès coupé (RG-8), écran « saisis un code ».

### P5 — Le psy gère un siège (portail)
- **Révoquer** un siège `active` → `revoked` (RG-9).
- **Régénérer / révoquer** un code `invited` non consommé (RG-2).

### P6 — Suivi de la patientèle (portail)
Liste des sièges (libellé, statut de rattachement, assiduité, dernière activité, nb d'exercices faits) → fiche patient (par exercice : fait/non fait, nb, date) — **aucun contenu clinique**.

---

## 9. User stories & critères d'acceptation

> Format : **En tant que … je veux … afin de …** + critères Gherkin (Étant donné / Quand / Alors).

### Epic A — Compte praticien
- **US-A1** *psy* — créer un compte pour accéder au portail.
  - Étant donné un email non enregistré, quand je m'inscris avec un mot de passe valide, alors je reçois un email de confirmation et un profil `practitioners` est créé à la 1re connexion.
  - Étant donné un email non confirmé, quand je tente d'accéder au portail, alors l'accès est refusé avec un message de confirmation.
- **US-A2** *psy* — me connecter / réinitialiser mon mot de passe.

### Epic B — Invitations
- **US-B1** *psy* — générer un code pour inviter un patient.
  - Quand je crée une invitation avec un libellé, alors un code unique au format H-1 est généré, affiché et copiable, et le siège est `invited` avec `expires_at = now + 30 j`.
  - Si un email patient est renseigné, alors le code lui est envoyé par email (Resend) ; si l'envoi échoue, le code reste affiché et une erreur non bloquante est signalée.
- **US-B2** *psy* — régénérer ou révoquer un code non consommé.
  - Quand je régénère, alors l'ancien code devient invalide et un nouveau est émis.

### Epic C — Rattachement patient
- **US-C1** *patient* — saisir le code de mon psy pour accéder à l'app.
  - Étant donné un code valide `invited` non expiré, quand je le saisis, alors mon siège devient `active` et j'accède à l'app.
  - Étant donné un code invalide/expiré/déjà utilisé, quand je le saisis, alors un message d'erreur adapté s'affiche et je n'ai pas accès.
- **US-C2** *patient* — changer de psy en saisissant un nouveau code.
  - Étant donné un siège `active`, quand je saisis un nouveau code valide, alors mon ancien siège passe `released` et le nouveau `active` (bascule atomique).
- **US-C3** *patient* — retirer mon code (me délier).
  - Quand je retire mon code, alors mon siège passe `released` et je perds l'accès jusqu'à saisie d'un nouveau code.

### Epic D — Suivi patientèle
- **US-D1** *psy* — voir la liste de mes patients avec leur assiduité.
  - Alors chaque siège `active` affiche : libellé, assiduité (actif/en veille/jamais commencé), date de dernière activité, nb d'exercices faits.
- **US-D2** *psy* — voir le détail d'un patient (exercices faits/non faits).
  - Alors je vois, par exercice, s'il est fait (nb + dernière date) ou non, **uniquement** pour la période de mon rattachement (RG-14) ; aucun contenu clinique.
- **US-D3** *psy* — mettre fin au suivi (révoquer un siège).

### Epic E — Accès conditionné
- **US-E1** *patient* — ne plus accéder à l'app si mon psy révoque / si je me délie.
  - Étant donné un siège non `active`, quand j'ouvre l'app, alors l'accès aux exercices est bloqué et l'écran « code » s'affiche.

---

## 10. Exigences fonctionnelles (récap MoSCoW)

| Réf | Exigence | Prio |
|---|---|---|
| F-A1..A4 | Inscription/connexion/reset psy + création `practitioners` | M |
| F-A5 | Édition nom/prénom psy | S |
| F-I1 | Générer code unique à usage unique (H-1) | M |
| F-I2 | Libellé de siège | M |
| F-I3 | Expiration + statut `expired` | M |
| F-I4 | Régénérer / révoquer un code non consommé | S |
| F-I5 | Envoi du code par email (Resend) si email fourni | S |
| F-R1 | Redémption sécurisée (`redeem_seat_code`) | M |
| F-R2 | Cycle de vie du siège (§7) | M |
| F-R3 | Bascule automatique (release ancien + active nouveau) | M |
| F-R4 | Retrait par le patient (`release_my_seat`) | M |
| F-R5 | Révocation par le psy (`revoke_seat`) | M |
| F-R6 | Accès app conditionné au siège actif | M |
| F-U1 | Enregistrer une complétion (app mobile) | M |
| F-U2 | Complétion = métadonnée seule (aucun contenu) | M |
| F-P1 | Liste patientèle + assiduité | M |
| F-P2 | Fiche patient : fait/non fait par exercice (période de rattachement) | M |
| F-P3 | Filtres/tri (actifs, en veille) | C |
| F-P4 | Aucun contenu clinique affiché | M |
| F-X1 | Emails transactionnels (confirmation, reset) via Resend | S |
| F-X2 | Journal d'audit des événements sensibles | S |
| F-G1 | Portail **bilingue FR/EN** : chaînes externalisées, sélecteur de langue, préférence mémorisée | M |
| F-G2 | **Numéro de psy** séquentiel auto-attribué à la création du compte | S |

---

## 11. Contrat d'opérations (logique, backend-agnostique)

> Implémentables en RPC Supabase (`security definer`) + PostgREST. Toutes exigent un utilisateur authentifié.

| Opération | Acteur | Entrée | Sortie | Erreurs |
|---|---|---|---|---|
| `create_invitation` | psy | `label`, `invite_email?` | siège `invited` (dont `invite_code`) | `not_practitioner` |
| `regenerate_code` | psy | `seat_id` | nouveau `invite_code` | `not_owner`, `seat_not_invited` |
| `revoke_seat` | psy | `seat_id` | siège `revoked` | `not_owner`, `seat_not_active_or_invited` |
| `list_patients` | psy | filtres? | sièges + assiduité + nb complétions | — |
| `get_patient_usage` | psy | `seat_id` | complétions par exercice (période de rattachement) | `not_owner` |
| `redeem_seat_code` | patient | `code` | siège `active` (bascule si nécessaire) | `not_authenticated`, `invalid_code`, `code_expired`, `code_already_used` |
| `release_my_seat` | patient | — | siège `released` | `no_active_seat` |
| `record_completion` | patient | `exercise_id` | complétion créée | `no_active_seat` *(optionnel : n'enregistrer que si rattaché)* |
| `get_my_link` | patient | — | siège actif + infos psy (libellé/nom) | — |

*Note bascule (`redeem_seat_code`)* : si un siège `active` existe pour le patient, il est mis `released` avant l'activation du nouveau (transaction unique).

---

## 12. Modèle de données (dictionnaire précis)

> Nouvelles entités en `uuid`, FK réelles, **RLS activé partout**. SQL dans `supabase/migrations/`.

### 12.1 `practitioners`
| Colonne | Type | Contraintes / défaut |
|---|---|---|
| `id` | uuid | PK, FK → `auth.users(id)` on delete cascade |
| `practitioner_number` | bigint | identity, unique — numéro séquentiel (psy 1, 2, 3…) |
| `first_name` | text | null |
| `last_name` | text | null |
| `locale` | text | not null, `'fr'`, ∈ {fr,en} — langue préférée du portail |
| `created_at` | timestamptz | not null, `now()` |
| `updated_at` | timestamptz | not null, `now()` |

### 12.2 `patient_seats` *(pivot)*
| Colonne | Type | Contraintes / défaut |
|---|---|---|
| `id` | uuid | PK, `gen_random_uuid()` |
| `practitioner_id` | uuid | not null, FK → `practitioners(id)` on delete cascade |
| `patient_user_id` | uuid | null, FK → `auth.users(id)` on delete set null |
| `label` | text | null |
| `invite_code` | text | not null, **unique** |
| `invite_email` | text | null |
| `status` | text | not null, `invited` ∈ {invited,active,paused,revoked,released,expired} |
| `created_at` | timestamptz | not null, `now()` |
| `expires_at` | timestamptz | not null, `now() + 30 j` |
| `redeemed_at` | timestamptz | null |
| `revoked_at` | timestamptz | null |
| `released_at` | timestamptz | null |
Index : `(practitioner_id)`, `(patient_user_id)`, unique `(invite_code)`. Partiel recommandé : unicité d'un seul siège `active` par patient (`unique (patient_user_id) where status='active'`).

### 12.3 `exercise_completions`
| Colonne | Type | Contraintes / défaut |
|---|---|---|
| `id` | uuid | PK, `gen_random_uuid()` |
| `patient_user_id` | uuid | not null, FK → `auth.users(id)` on delete cascade |
| `exercise_id` | bigint | not null, FK → `exercises(id)` |
| `completed_at` | timestamptz | not null, `now()` |
Index : `(patient_user_id, completed_at)`.
Modèle **événementiel** : une ligne par réalisation → permet de savoir **quel** exercice, **combien de fois** et **quand** (RG-11/12). C'est ce qui alimente le suivi côté psy.

### 12.4 `audit_events` *(Should)*
`id` uuid PK · `actor_user_id` uuid · `action` text (`invitation_created`, `code_redeemed`, `seat_released`, `seat_revoked`, `code_regenerated`) · `target_seat_id` uuid null · `created_at` timestamptz.

### 12.5 Tables existantes
`profiles` : profil patient (compte). `moods`/`journal_entries`/`ai_analyses` : **dormantes v0**. Dette (Annexe B).

### 12.6 Facturation (anticipé, non créé) — `subscriptions`
`practitioner_id` · `stripe_customer_id` · `stripe_subscription_id` · `plan` · `included_seats` (=2) · `status` · période. Voir §19.

---

## 13. Matrice rôles × permissions

| Ressource | Psy | Patient | Anonyme |
|---|---|---|---|
| `practitioners` (sa ligne) | R/W | — | — |
| `patient_seats` (ses sièges) | R/W | — | — |
| `patient_seats` (son siège) | — | R (via `get_my_link`) | — |
| `redeem_seat_code` / `release_my_seat` | — | Exécuter | — |
| `create/regenerate/revoke` (sièges) | Exécuter (ses sièges) | — | — |
| `exercise_completions` (les siennes) | — | R/W | — |
| `exercise_completions` (patients rattachés actifs, période de rattachement) | R | — | — |
| `profiles`/`journal_entries`/`ai_analyses` | — | R/W (les siennes) | — |

---

## 14. Sécurité, RGPD & rétention

### 14.1 Principe — le psy voit « fait/non fait », jamais le contenu
Aucun accès psy à `profiles` détaillé, `journal_entries`, `moods`, `ai_analyses`. Uniquement `exercise_completions` des patients **rattachés actifs**, **sur la période de rattachement** (RG-14).

### 14.2 RLS (activé partout) — points clés
- `practitioners` : self-only.
- `patient_seats` : psy = ses sièges ; patient = son siège.
- `exercise_completions` : patient = les siennes ; psy = celles d'un patient lié par un siège `active` **et** `completed_at ≥ redeemed_at`.
- Redémption/retrait/révocation via fonctions `security definer` (aucune écriture directe de statut par un rôle non autorisé).

### 14.3 Durcissement
- **Anti-énumération de codes** : ⚠️ le code à **4 chiffres** (10 000 combinaisons, H-1) est de faible entropie → **verrouillage progressif implémenté** (3 essais libres, puis 1 min, puis 5 min par échec ; reset après succès ou 30 min ; migration 0003) + usage unique + expiration + unicité parmi les codes actifs. **Reco avant lancement** : durcir (blocage aussi par IP via Edge Function, ou code à 6 chiffres).
- Secrets côté serveur uniquement ; front en clé `anon`. Les secrets **exposés le 2026-07-08** (clé `service_role` Supabase + clé API **Resend**) sont à **régénérer** et à ne jamais mettre en repo/front. La clé Resend vit en config SMTP Supabase et/ou secret d'Edge Function.
- Journal d'audit (§12.4) des actions sensibles.

### 14.4 Conformité (⚠️ à faire valider)
Le choix « fait/non fait sans contenu » vise à rester **hors périmètre données de santé** (donc Supabase OK en v0). **Hypothèse retenue pour avancer** (décision CEO, 2026-07-08) ; à réévaluer si un élément contraire apparaît. Ce PRD n'est pas un avis juridique.

### 14.5 Rétention & suppression
- Compte patient supprimé → cascade sur `exercise_completions` (on delete cascade) ; `patient_seats.patient_user_id` → null (historique psy conservé, anonymisé du patient).
- Siège `released`/`revoked` : conservé pour audit ; le psy n'a plus de visibilité (RLS).
- Droit à l'effacement (RGPD) : procédure support en v0 (automatisée plus tard).

---

## 15. Emails transactionnels (Resend)

| Email | Déclencheur | Destinataire | v0 |
|---|---|---|---|
| Confirmation de compte | inscription | psy & patient | M (Auth) |
| Réinitialisation mot de passe | demande | psy & patient | M (Auth) |
| Invitation (code) | `create_invitation` avec email | patient | S (si email fourni) |

**Confirmation d'email psy** : Supabase Auth a l'option *Confirm email* **activée par défaut** → à l'inscription, le psy reçoit un email de vérification et **ne peut pas se connecter tant qu'il n'a pas confirmé** (idem patient). ✅ Répond au besoin « être sûr du bon mail ».

Fournisseur : **Resend** — tier gratuit **3 000 emails/mois** (~100/j, 1 domaine), suffisant en v0.
- **Emails Auth** (confirmation, reset) : configurer un **SMTP custom Resend** dans Supabase (Auth → SMTP : `smtp.resend.com`, user `resend`, password = clé API) pour la fiabilité et le branding.
- **Email d'invitation** (code) : appel **API Resend depuis une Edge Function**.
- **Sécurité clé** : la clé API Resend est un **secret serveur** (config SMTP Supabase + secret d'Edge Function `RESEND_API_KEY`) — **jamais** en repo/front. La clé exposée le 2026-07-08 est à **régénérer**.
- **Fallback** : si l'email échoue, le code reste **affiché à l'écran**.

---

## 16. Dépendances app mobile (bloquant la valeur)
1. **Écran de saisie du code** + appel `redeem_seat_code` (+ gestion bascule/retrait).
2. **Gate d'accès** : vérifier un siège `active` au lancement/session (RG-6) ; sinon écran « code ».
3. **Enregistrement `record_completion`** à la fin de chaque exercice (métadonnée seule).
4. Le chat de contextualisation IA reste **éphémère (RAM)**, jamais persisté.

---

## 17. Exigences non-fonctionnelles
- **Perf** : liste patientèle < 1,5 s (~50 sièges) ; redémption < 500 ms.
- **Dispo** : dépend de Supabase (SLA managé) ; pas d'exigence HA custom en v0.
- **Sécurité** : cf. §14.
- **i18n** : **FR + EN**, portail entièrement traduisible (chaînes externalisées via lib i18n type next-intl/i18next, sélecteur de langue, préférence mémorisée dans `practitioners.locale`). FR par défaut, ton « vous » psy (cf. Branding). Les emails transactionnels sont localisables (FR/EN).
- **Accessibilité** : viser WCAG 2.1 AA (contrastes, navigation clavier).
- **Observabilité** : logs applicatifs + audit (§12.4).
- **Rétention** : cf. §14.5.

---

## 18. Métriques de succès (définitions précises)
| Métrique | Définition |
|---|---|
| Activation psy | % psys confirmés ayant créé ≥ 1 invitation. |
| Taux de redémption | (sièges `active` ou passés par `active`) / (sièges `invited` créés). |
| Accès effectif patient | % patients rattachés ayant ≥ 1 session app. |
| Assiduité | % patients rattachés `actifs` (complétion < 7 j). |
| Rétention psy J+30 (proxy) | % psys avec ≥ 1 connexion entre J+23 et J+30. |

---

## 19. Anticipation facturation (hors v0)
- Offres : **Forfait Praticien 29 €/mois** (2 sièges `active` inclus) + **5 €/mois par siège `active` supplémentaire**.
- Comptage : `count(patient_seats where status='active')` par psy.
- Table `subscriptions` (§12.6) + intégration **Stripe** (customer, subscription, webhooks). Gestion des dépassements/prorata à spécifier en phase facturation.
- Effet sur l'accès : plus tard, un défaut de paiement pourra basculer des sièges en `paused` (état déjà réservé) → accès patient suspendu.

---

## 20. Gestion de Supabase (sans MCP)
MCP non installable (compte entreprise). Workflow : **migrations SQL versionnées** (`supabase/migrations/`, avec rollback) appliquées par l'équipe via **Studio → SQL Editor** ou **CLI (`supabase db push`)**. Lecture d'état : requête collée ou API REST read-only (clé `anon`). Aucun secret transmis à l'assistant.

---

## 21. Definition of Done (v0)
- [ ] Un psy peut s'inscrire, confirmer son email, se connecter.
- [ ] Un psy peut créer une invitation et obtenir un code (affiché + email optionnel).
- [ ] Un patient peut s'inscrire sur mobile et se rattacher via le code.
- [ ] L'accès app est bloqué sans siège actif ; débloqué avec.
- [ ] Le patient peut basculer de psy et se délier (accès mis à jour).
- [ ] Le psy peut révoquer un siège (accès patient coupé).
- [ ] Les complétions s'enregistrent et remontent dans la patientèle (fait/non fait + assiduité 7 j).
- [ ] RLS vérifiée : aucun psy ne voit les données d'un patient non rattaché, ni le contenu clinique.
- [ ] Migrations appliquées + rollback testé.

---

## 22. Risques & questions ouvertes
| # | Sujet | Détail | Owner |
|---|---|---|---|
| R-1 | Dépendance mobile | Sans écran code + gate + complétions, portail vide. | CTO |
| R-2 | Conformité RGPD/HDS | Valider le statut « non-données de santé » (§14.4). | CEO |
| R-3 | Anti-abus codes | Rate-limit + entropie (§14.3) à implémenter. | CTO |
| R-4 | Emails Resend | Vérifier limites du tier gratuit + domaine vérifié. | CTO |
| R-5 | Auth psy sans vérif ADELI | Usurpation possible ; ok en test fermé, à durcir avant ouverture. | CEO |
| Q-1 | Format/expiration du code | Valider H-1/H-2. | CPO |
| Q-2 | Champs de la fiche patient | Détail exact des indicateurs affichés (§9 US-D). | CPO |

---

## Annexe A — État actuel de la base (2026-07-08)
| Table | Rôle | Lignes |
|---|---|---|
| `profiles` | Profil patient | 5 |
| `moods` | Référentiel émotions | 24 |
| `journal_entries` | Journal + humeur (dormant v0) | 18 |
| `ai_analyses` | Analyse IA (dormant v0) | 0 |
| `exercises` | Bibliothèque TCC | 24 |
| `symptomes` | Référentiel symptômes | 8 |

Aucune notion de psy / code / rattachement / facturation / complétion aujourd'hui → apportées par ce PRD.

## Annexe B — Dette technique app (non bloquant portail)
- `ai_analyses.suggested_exercise_id` : uuid → bigint + FK vers `exercises`.
- Ajouter FK manquantes (journal/moods/analyses).
- `profiles.age` : text → int.
- Normaliser `symptomes_associes` / `exercices_associes` / `psychologues` (tables de jointure).
- Vérifier/activer RLS sur toutes les tables existantes.

## Annexe C — Catalogue d'erreurs (redémption & sièges)
| Code | Sens | Message patient (FR) |
|---|---|---|
| `invalid_code` | code inconnu | « Ce code n'existe pas. Vérifie-le avec ton psy. » |
| `code_expired` | expiré | « Ce code a expiré. Demande-en un nouveau à ton psy. » |
| `code_already_used` | déjà consommé | « Ce code a déjà été utilisé. » |
| `no_active_seat` | action sans rattachement | « Tu n'es rattaché à aucun psy pour l'instant. » |
| `not_authenticated` | non connecté | (redirection connexion) |
