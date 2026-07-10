# Roadmap — Portail Psy UMi (v0)

**Principe** : on avance **jalon par jalon**. On ne passe au suivant qu'une fois le précédent **validé** (critère « Fait quand »).

**Légende statut** : 🟢 fait · 🟡 en cours · ⚪ à faire
**Responsable** : `Portail` (front web) · `Mobile` (app) · `Toi` (config/compte)

---

## Jalon 0 — Fondations & specs 🟢
- PRD v0.4, SPEC web, DB (migrations **0001 + 0002 appliquées**), fichiers env.
- **Fait quand** : schéma en place + docs figées. ✅

## Jalon 1 — Squelette du portail qui compile 🟢
- Projet Next.js + thème teal/gris + client Supabase + i18n FR/EN + shell (sidebar/topbar).
- **Fait quand** : `npm run dev` démarre et la page de connexion s'affiche. ✅ **Validé 2026-07-08** (dev OK, `/login` 200 FR/EN, middleware protège les routes, build + typecheck passent).

## Jalon 2 — Compte praticien (auth) 🟢 `Portail` + `Toi`
- Inscription (email + mdp + nom), **confirmation email**, connexion, reset, création `practitioners`.
- **Fait quand** : un psy s'inscrit, confirme son email, se connecte et arrive sur le dashboard. ✅ **Validé** (inscription + connexion + dashboard OK). ✅ **« Confirm email » activé le 2026-07-09** : la confirmation est **appliquée par le code** (pas de session avant confirmation, connexion refusée si non confirmé). ⚠️ Sans provider email fiable (Resend + domaine, J8), le mail peut ne pas arriver → confirmer les comptes de test à la main (Dashboard → Auth → Users).

## Jalon 3 — Invitations (codes) ⚪ `Portail`
- Créer une invitation → **code affiché + copie** ; email optionnel (Resend, adresse de test) ; régénérer / révoquer.
- **Fait quand** : le psy génère un code, le voit à l'écran (et le reçoit par email si renseigné).

## Jalon 4 — Rattachement côté app ⚪ `Mobile`
- App mobile : écran **« saisir le code »** → `redeem_seat_code` ; **accès bloqué sans siège actif** ; retrait / bascule de psy.
- 📄 **Brief d'implémentation pour la dev (couvre J4 + J5)** : `BRIEF_MOBILE_J4_J5.md`.
- **Fait quand** : un patient s'inscrit sur l'app, entre le code, est rattaché et accède à l'app.

## Jalon 5 — Traçage des exercices ⚪ `Mobile`
- App mobile : `record_completion` à chaque exercice terminé (métadonnée seule).
- **Fait quand** : faire un exercice sur l'app crée bien une complétion en base.

## Jalon 6 — Suivi de la patientèle ⚪ `Portail`
- Dashboard (tuiles de synthèse), liste patients (assiduité), fiche patient (fait/non fait).
- **Dépend de** : J4 + J5 pour les **vraies** données (l'UI peut être finie avant avec des données de test).
- **Fait quand** : le psy voit ses patients rattachés et leurs exercices réalisés.

## Jalon 7 — Finitions ⚪ `Portail`
- i18n complet, états vide/chargement/erreur, accessibilité AA, responsive, textes légaux.
- **Fait quand** : checklist DoD (SPEC §11) entièrement verte.

## Jalon 8 — Mise en ligne (Netlify) ⚪ `Portail` + `Toi`
- Déploiement Netlify, variables d'env de prod, Redirect URLs Auth de prod, **domaine + SMTP Resend + activation de « Confirm email »** (emails d'auth fiables pour de vrais psys).
- **Fait quand** : le portail est accessible en ligne et les emails partent de façon fiable.

## Jalon 9 — Facturation (plus tard) ⚪
- Abonnement Stripe : 29 €/mois (2 sièges inclus) + 5 €/siège actif. Comptage des sièges `active`.

---

## Ordre conseillé (avec parallélisation)
1. **Portail seul** (testable sans le mobile) : **J1 → J2 → J3 → J6 (UI avec données de test) → J7**.
2. **En parallèle, équipe Mobile** : **J4 → J5**.
3. **Intégration** : brancher les vraies données du mobile dans J6, puis **J8** (déploiement).
4. **Plus tard** : **J9** (facturation).

> **J1 + J2 validés** ✅ (portail lancé, inscription/connexion/confirmation OK, dashboard atteint). On attaque **J3 (invitations)**.
