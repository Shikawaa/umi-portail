# UMi — Portail Psy (v0)

Portail web praticien : inviter des patients (code par siège), suivre leur
engagement (exercice fait / non fait, assiduité), gérer son profil. Bilingue
FR/EN, thème sobre (teal en accent unique + gris).

Stack : **Next.js 14.2 (App Router) + React 18.3 + TypeScript**, Tailwind CSS 3.4,
Supabase (`@supabase/ssr`), next-intl v3 (cookie), Resend, hébergement **Netlify**.

---

## 1. Prérequis

- **Node.js 20** (voir `.nvmrc`). `nvm use` si vous utilisez nvm.
- **npm** (fourni avec Node).
- Un projet **Supabase** (région UE) avec les migrations appliquées (voir §5).
- (Optionnel) un compte **Resend** + domaine vérifié pour l'envoi du code par email.

---

## 2. Variables d'environnement (`.env.local`)

Le fichier `.env.local` existe déjà. Renseignez les valeurs manquantes.
**Ne committez jamais ce fichier** (déjà dans `.gitignore`).

| Variable | Portée | Rôle |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | **public** (navigateur) | URL du projet Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **public** (navigateur) | Clé anon Supabase (RLS s'applique) |
| `NEXT_PUBLIC_SITE_URL` | **public** | Origine du site, ex. `http://localhost:3000` en dev, l'URL Netlify en prod. Sert aux liens de confirmation / reset. |
| `RESEND_API_KEY` | **secret serveur** | Clé API Resend. Jamais exposée au client. Si absente, l'envoi d'email est ignoré proprement (le code reste affiché à l'écran). |
| `RESEND_FROM_EMAIL` | **secret serveur** | Expéditeur vérifié Resend, ex. `UMi <noreply@votre-domaine>` |

> Sécurité : ne mettez **jamais** la clé `service_role` ni la clé Resend côté
> `NEXT_PUBLIC_*`. Les secrets exposés le 2026-07-08 (service_role + Resend)
> doivent être **régénérés** (cf. PRD §14.3).

---

## 3. Lancer en local

```bash
npm install
npm run dev            # http://localhost:3000
```

Autres commandes :

```bash
npm run build          # build de production (doit compiler sans clé réelle)
npm run start          # sert le build de production
npm run typecheck      # tsc --noEmit
```

---

## 4. Configuration Supabase Auth (manuel, à faire une fois)

Dans **Supabase Studio → Authentication** :

1. **Confirm email = ON** (par défaut). Le psy doit confirmer son email avant de
   se connecter.
2. **URL Configuration** :
   - *Site URL* = valeur de `NEXT_PUBLIC_SITE_URL`.
   - *Redirect URLs* : ajoutez `${SITE_URL}/auth/callback` (dev **et** prod), ex.
     `http://localhost:3000/auth/callback` et `https://<votre-site>.netlify.app/auth/callback`.
3. (Recommandé, PRD §15) **SMTP custom Resend** pour les emails Auth (confirmation
   / reset) : Auth → SMTP → hôte `smtp.resend.com`, user `resend`, password = clé
   API Resend. Améliore la délivrabilité et le branding.

Flux d'auth implémenté : signup → email de confirmation → `/auth/callback`
(`exchangeCodeForSession`) → `/dashboard`. À la 1re session, la ligne
`practitioners` est **créée automatiquement** (upsert) pour les comptes créés via
le portail (métadonnée `role = 'practitioner'`). Un compte **sans** ce rôle et
sans ligne `practitioners` (ex. un patient) est redirigé vers `/403`
« espace réservé aux praticiens ».

---

## 5. Migrations SQL

Workflow sans MCP (PRD §20) : migrations versionnées appliquées via **Studio →
SQL Editor** ou **CLI** (`supabase db push`).

- `supabase/migrations/20260708120000_portail_psy_v0.sql` — **appliquée** (0001) :
  `practitioners`, `patient_seats`, `exercise_completions`, `audit_events`, RPC
  (`create_invitation`, `regenerate_code`, `revoke_seat`, `redeem_seat_code`, …),
  RLS.
- `supabase/migrations/20260708130000_portail_psy_v0_usage_view.sql` — **à
  appliquer** (0002) : lecture publique de `exercises` + vue `v_patient_usage`
  (dashboard / patientèle / fiche patient en dépendent).

> Tant que 0002 n'est pas appliquée, le dashboard et la liste patients afficheront
> l'écran d'erreur (la vue `v_patient_usage` est requise).

---

## 6. Déploiement Netlify

- `netlify.toml` est fourni ; le plugin `@netlify/plugin-nextjs` gère le publish et
  les fonctions serverless. Build command : `npm run build`.
- Dans **Netlify → Site settings → Environment variables**, définissez les 5
  variables du §2 (les `NEXT_PUBLIC_*` sont exposées au navigateur, `RESEND_*`
  restent des secrets serveur).
- Mettez `NEXT_PUBLIC_SITE_URL` à l'URL du site Netlify, et ajoutez l'URL
  `.../auth/callback` dans les Redirect URLs Supabase (§4).

---

## 7. Notes / limites v0

- Emails **Auth** (confirmation, reset) : via Supabase (idéalement SMTP Resend, §4).
  L'email **d'invitation** (code) est envoyé depuis une **server action** Resend ;
  si `RESEND_API_KEY`/`RESEND_FROM_EMAIL` sont absentes ou l'envoi échoue, le code
  reste affiché à l'écran (fallback non bloquant).
- Le portail ne montre **aucun contenu clinique** : uniquement « fait / non fait »,
  nombre et dates, sur la période de rattachement (RLS + vue `security_invoker`).
- Anti-abus code (rate-limit sur `redeem_seat_code`) : côté mobile / edge, hors
  périmètre portail (PRD §14.3).
- Un avertissement build « Node.js API (process.version) … Edge Runtime » provient
  de `@supabase/ssr` dans le middleware : c'est le pattern officiel Supabase,
  bénin, sans impact sur Netlify.
