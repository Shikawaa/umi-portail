# SPEC — Portail Web Psy UMi (v0)

- **Version** : 0.1
- **Date** : 2026-07-08
- **Base** : découle du [PRD](PRD_Portail_Psy_UMi.md) v0.4. En cas de doute sur une règle métier, le PRD fait foi.
- **Portée** : conception détaillée du **portail web praticien** (front). Stack validée : **Next.js + Supabase**. Livrable : spec écrite (arborescence, écran par écran, composants, états, données).

---

## 1. Architecture front

| Élément | Choix |
|---|---|
| Framework | **Next.js** App Router, TypeScript, React Server Components |
| Auth/session | **@supabase/ssr** (cookies httpOnly, session côté serveur) |
| Accès données | Lecture via **PostgREST** (client Supabase, RLS-scopé) ; mutations via **RPC** `security definer` (cf. PRD §11) |
| UI | **Tailwind CSS + shadcn/ui** |
| i18n | **next-intl** (FR/EN) |
| Emails | **Resend** via **Server Action / Route Handler** (clé serveur only) |
| Hébergement | **Netlify** (`@netlify/plugin-nextjs`) |

### 1.1 Structure de dossiers (indicative)
```
app/
  [locale]/
    (auth)/login, signup, verify-email, forgot-password, reset-password
    (app)/dashboard, patients, patients/[seatId], settings, legal
    layout.tsx           # shell authentifié (sidebar + topbar)
  api/ (ou actions/)     # server actions : send-invite-email
lib/
  supabase/ (server.ts, client.ts, middleware.ts)
  i18n/ (messages/fr.json, messages/en.json)
components/ ui/ (shadcn) + composants métier (cf. §7)
middleware.ts            # protège les routes (auth) + résout la locale
```

### 1.2 Sécurité front
- **Jamais** de `service_role` ni de clé Resend côté client. Resend est appelé uniquement en **server action**.
- **Middleware** : redirige les non-authentifiés vers `/login` ; empêche un patient (compte sans ligne `practitioners`) d'accéder au portail (message « espace réservé aux praticiens »).
- Rôle = présence d'une ligne `practitioners` (vérifiée côté serveur).

---

## 2. Direction artistique & design tokens

**Principe** (cf. réponse DA) : même ADN de marque que l'app mobile, expression **pro** pour le portail. Réutiliser logo + palette + typo de la charte ; les appliquer dans un système d'UI sobre et dense.

### 2.1 Palette & tokens — **teal en accent unique + niveaux de gris**
**Règle de sobriété (imposée)** : le **teal est la SEULE couleur d'accentuation** (action primaire, état actif, liens, focus). Tout le reste = **échelle de gris**. Aucun aplat coloré superflu.

Échelle de marque (teal) — extrait utilisé :
| Rôle | Teal | Hex | HSL (shadcn) |
|---|---|---|---|
| Accent principal (boutons, focus, nav active) | teal-75 | `#27796e` | `172 51% 31%` |
| Accent survol (hover) | teal-82 | `#23685e` | `171 50% 27%` |
| Fond teinté léger (nav active, ligne sélectionnée) | teal-5 | `#e5fbf7` | `170 73% 94%` |
| Liens / emphase | teal-75 | `#27796e` | — |

Neutres (gris) : fond `#fff` / `gray-50` · texte `gray-900` / `gray-500` · bordures `gray-200`. Échelle de gris neutre (zinc/neutral).

Statuts (sobres, sans arc-en-ciel) : **actif** = pastille **teal** · **en veille** = gris moyen · **jamais commencé** = gris clair · **destructif** (révoquer) = **rouge discret**, réservé aux seules actions dangereuses (norme d'accessibilité).

Radius **modéré** (8px), UI **plate** (bordures fines, ombres légères), typo système en attendant la police de la charte.

### 2.2 Ton & microcopy (issus du Branding)
- **Vouvoiement** systématique.
- **Anti-« surveillance »** : « suivi de l'engagement », « accompagnement », jamais « surveiller / contrôler ». Ex. titre de la patientèle = *« Vos patients »*, pas *« Monitoring »*.
- « Le bien du patient d'abord ». Pas de gamification, pas de fausse promesse.
- Messages honnêtes et clairs (erreurs comprises, pas de jargon).

---

## 3. Layout & navigation (shell authentifié)

- **Sidebar gauche** (persistante desktop) : logo UMi · **Tableau de bord** · **Patients** · **Réglages**. Bas de sidebar : nom du psy + n° (`practitioner_number`).
- **Topbar** : titre de page · **sélecteur de langue FR/EN** · menu compte (profil, déconnexion).
- **Responsive** : desktop-first ; sidebar repliable en drawer < 1024px (le psy travaille sur ordinateur, mobile = secondaire).
- **États transverses** : toasts (succès/erreur), skeletons de chargement, empty states dédiés.

---

## 4. Arborescence & routing

| Route | Accès | Description |
|---|---|---|
| `/` | public | redirige : session psy → `/dashboard` ; sinon → `/login` |
| `/login` | public | connexion |
| `/signup` | public | inscription psy |
| `/verify-email` | semi | écran d'attente de confirmation |
| `/forgot-password`, `/reset-password` | public | reset mot de passe |
| `/dashboard` | psy | accueil |
| `/patients` | psy | liste patientèle |
| `/patients/[seatId]` | psy | fiche patient |
| `/settings` | psy | profil + langue |
| `/legal` | public | mentions / RGPD |
| `*` | — | 404 ; `/403` espace réservé aux praticiens |

Locale préfixée (`/fr/...`, `/en/...`) gérée par next-intl, ou cookie de locale (au choix implémentation) ; préférence persistée dans `practitioners.locale`.

---

## 5. Spécifications écran par écran

> Pour chaque écran : **Objectif · Contenu/Composants · Données · Actions · États (vide/chargement/erreur)**.

### 5.1 `/signup` — Inscription praticien
- **Objectif** : créer un compte psy.
- **Contenu** : champs *email, mot de passe (≥8), prénom, nom* ; case CGU/RGPD ; lien « déjà un compte ? ».
- **Données** : `supabase.auth.signUp` ; à la 1re session, upsert `practitioners` (id, first_name, last_name, locale courante).
- **Actions** : soumettre → envoi email de confirmation → redirection `/verify-email`.
- **États** : *erreur* email déjà utilisé / mot de passe faible (messages FR/EN) ; *chargement* bouton spinner.

### 5.2 `/login` — Connexion
- **Objectif** : se connecter.
- **Contenu** : email, mot de passe, « mot de passe oublié ? ».
- **Données** : `signInWithPassword`.
- **États** : *erreur* identifiants invalides / **email non confirmé** (proposer renvoi du mail) ; *chargement*.

### 5.3 `/verify-email`
- **Objectif** : expliquer qu'un email de confirmation a été envoyé.
- **Contenu** : message + bouton « renvoyer l'email » (rate-limited) + « j'ai confirmé → me connecter ».

### 5.4 `/forgot-password` · `/reset-password`
- Flux standard Supabase (envoi lien → nouvelle saisie de mot de passe). États erreur/succès.

### 5.5 `/dashboard` — Accueil
- **Objectif** : vue d'ensemble + inciter à inviter.
- **Contenu** :
  - Bandeau accueil « Bonjour {prénom} ».
  - **Tuiles de synthèse** : nb patients rattachés · dont **actifs** (7 j) · dont **en veille** · nb invitations en attente.
  - **Dernières activités** (liste courte : « {libellé} a réalisé {n} exercice(s) cette semaine »).
  - **CTA principal** : « Inviter un patient » (ouvre le modal §5.8).
- **Données** : agrégats depuis `patient_seats` + `exercise_completions` (via vue `v_patient_usage`, cf. §8 dépendance).
- **États** : *vide* (aucun patient) → grand empty state pédagogique « Invitez votre premier patient » + CTA ; *chargement* skeletons ; *erreur* → message + retry.

### 5.6 `/patients` — Patientèle
- **Objectif** : suivre l'ensemble des patients.
- **Contenu** : **table** ; 1 ligne = 1 siège :
  - **Libellé** (donné par le psy) · **Statut de rattachement** (badge : invité / actif / …) · **Assiduité** (badge : actif / en veille / jamais commencé) · **Dernière activité** (date) · **Exercices faits** (nb) · menu **⋯** (voir fiche, révoquer).
  - Barre : **recherche** (par libellé) · **filtres** (assiduité, statut) · bouton « Inviter un patient ».
  - Section repliable « **Invitations en attente** » (sièges `invited` : libellé, code, expiration, actions *régénérer/révoquer*).
- **Données** : `select` sur `patient_seats` (RLS = ses sièges) + agrégats `exercise_completions`.
- **Actions** : ouvrir fiche · révoquer (confirmation) · régénérer/révoquer un code.
- **États** : *vide* → empty state + CTA inviter ; *chargement* skeleton de table ; *erreur* → retry.

### 5.7 `/patients/[seatId]` — Fiche patient
- **Objectif** : détail d'engagement d'un patient rattaché. **Aucun contenu clinique.**
- **Contenu** :
  - En-tête : libellé · badges (rattachement + assiduité) · date de rattachement · action **« Mettre fin au suivi »** (révoquer).
  - **Bloc « Exercices »** : pour chaque exercice de la bibliothèque → **fait / non fait**, **nb de fois**, **dernière date** (période de rattachement uniquement, RG-14).
  - **Bloc « Activité »** : mini-visualisation simple (ex. complétions/semaine) — sobre, pas de « score ».
- **Données** : `exercise_completions` (RLS période-scopée) `join` `exercises` (titres) ; `patient_seats` pour l'entête.
- **Actions** : révoquer (→ confirmation → l'accès patient est coupé).
- **États** : *patient jamais commencé* → message doux « {libellé} n'a pas encore réalisé d'exercice » ; *chargement* ; *erreur* ; *siège non actif* (révoqué/released) → vue lecture seule + bandeau « suivi terminé ».

### 5.8 Modal « Inviter un patient »
- **Objectif** : générer un code de rattachement.
- **Contenu (étape 1)** : *libellé du siège* (aide : « un repère non nominatif, ex. initiales ») + *email du patient (optionnel)* + case « envoyer le code par email ».
- **Contenu (étape 2 — succès)** : **code affiché en grand**, bouton **Copier**, mention expiration (30 j), instructions à transmettre au patient (« crée ton compte sur l'app UMi puis entre ce code »). Si email fourni + coché → envoi Resend + confirmation.
- **Données** : RPC `create_invitation(label, invite_email)` → renvoie le siège + `invite_code`. Envoi email = server action Resend.
- **États** : *chargement* génération ; *erreur* `not_practitioner` (improbable) / échec email → **le code reste affiché** (fallback), toast « email non envoyé, transmets le code manuellement ».

### 5.9 `/settings` — Réglages
- **Objectif** : gérer profil & préférences.
- **Contenu** : prénom/nom (édition) · **langue FR/EN** · email (lecture) · n° de psy (lecture) · lien reset mot de passe · *(section « Abonnement » désactivée / « bientôt »)*.
- **Données** : `practitioners` (update prénom/nom/locale).
- **États** : succès (toast) / erreur validation.

### 5.10 `/legal`
- Mentions légales, politique de confidentialité (RGPD), contact. Contenu FR/EN. (Rédaction à fournir.)

### 5.11 États système
- **404** : page introuvable.
- **403 / espace praticien** : un compte sans profil `practitioners` (ex. patient) → « Cet espace est réservé aux praticiens ».
- **Erreur globale** (error boundary) : message rassurant + retry + contact.

---

## 6. Mapping écran → opérations (données)

| Écran | Lectures (PostgREST, RLS) | Mutations (RPC) |
|---|---|---|
| Dashboard | `v_patient_usage`, `patient_seats` | — |
| Patientèle | `patient_seats`, `exercise_completions` (agrégat), `v_patient_usage` | `create_invitation`, `regenerate_code`, `revoke_seat` |
| Fiche patient | `exercise_completions` + `exercises`, `patient_seats` | `revoke_seat` |
| Inviter (modal) | — | `create_invitation` (+ email Resend) |
| Réglages | `practitioners` | update `practitioners` (RLS) |

*(Rappel PRD : `redeem_seat_code`, `release_my_seat`, `record_completion` sont côté **app mobile**, pas portail.)*

---

## 7. Inventaire de composants réutilisables
- `AppShell` (sidebar + topbar) · `LanguageSwitcher` · `AccountMenu`
- `SummaryTile` (tuile de synthèse dashboard)
- `PatientTable` + `PatientRow` · `SeatStatusBadge` · `AssiduityBadge`
- `InvitationsPanel` (invitations en attente) · `InviteDialog` · `InviteCodeCard` (code + copier)
- `ExerciseCompletionList` (fait/non fait + nb + date) · `ActivitySparkline`
- `EmptyState` · `ConfirmDialog` (révocation) · `Toast` · `Skeleton` · `ErrorState`

---

## 8. Dépendances backend (petits ajouts)
1. **Vue `v_patient_usage`** (à ajouter — migration 0002) : par `patient_user_id`/siège → nb complétions, dernière activité, complétions sur 7/30 j, assiduité. Créer en **`security_invoker=on`** (PG15) pour respecter la RLS du psy.
2. **Lisibilité de `exercises`** : s'assurer que la table `exercises` est **lisible par les utilisateurs authentifiés** (policy `select` ou données de référence publiques) pour afficher les titres.
3. *(Optionnel)* RPC `list_patients` si l'on préfère encapsuler l'agrégat côté serveur plutôt qu'une vue.

*(Ces ajouts seront livrés en migration SQL versionnée, même workflow que 0001.)*

---

## 9. i18n (FR/EN)
- **next-intl** : messages dans `messages/fr.json` & `messages/en.json`, **aucune chaîne en dur**.
- Langue par défaut **FR**. Sélecteur dans la topbar. Préférence persistée dans `practitioners.locale` (et cookie).
- Emails Resend localisables (gabarits FR/EN).
- Formats dates/nombres via `Intl` (locale courante).

---

## 10. Accessibilité & qualité
- **WCAG 2.1 AA** : contrastes, focus visibles, navigation clavier, labels ARIA, `sr-only` pour les icônes seules.
- Table patientèle : en-têtes `<th scope>`, tri accessible.
- Cibles tactiles ≥ 44px sur drawer mobile.

---

## 11. Definition of Done (front v0)
- [ ] Parcours auth complet (signup → verify → login → reset).
- [ ] Middleware protège les routes psy ; patient/anonyme redirigé.
- [ ] Dashboard avec tuiles + empty state.
- [ ] Patientèle : table + filtres + invitations en attente.
- [ ] Modal inviter : génération code + copie + email Resend (fallback affichage).
- [ ] Fiche patient : fait/non fait + activité, sans contenu clinique.
- [ ] Révocation avec confirmation (accès patient coupé).
- [ ] Réglages : édition profil + bascule FR/EN persistée.
- [ ] i18n : 0 chaîne en dur ; FR & EN complets.
- [ ] AA : contrastes + clavier vérifiés.

---

## 12. Questions ouvertes
| # | Sujet | Détail |
|---|---|---|
| S-1 | Design tokens | Couleurs + typo de la charte à fournir (§2.1). |
| S-2 | `v_patient_usage` | Valider l'approche vue `security_invoker` vs RPC (§8). |
| S-3 | Locale routing | Préfixe `/fr` `/en` vs cookie — choix implémentation. |
| S-4 | Contenu légal | Textes mentions/RGPD à rédiger (`/legal`). |
| S-5 | Visualisation activité | Niveau de détail du sparkline (éviter l'effet « score »). |
