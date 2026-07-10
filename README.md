# UMi - Practitioner Portal

Web portal for practitioners (psychologists) to invite patients, follow their
engagement, and manage their profile. It pairs with the UMi mobile app, where
patients complete CBT exercises.

The portal shows **engagement metadata only** (exercise done / not done, counts,
dates, assiduity). It never displays clinical content or patient journaling.

Bilingual **FR / EN**, sober theme (teal as the only accent color over neutral
grays).

## Tech stack

- **Next.js 14.2** (App Router, React 18.3, TypeScript)
- **Supabase** (`@supabase/ssr`, PostgREST RPC, Row Level Security)
- **Tailwind CSS 3.4** + hand-written UI (Radix dialog/dropdown, lucide, sonner)
- **next-intl v3** (cookie-based `NEXT_LOCALE`, no URL locale prefix)
- **Resend** (invitation code email, via a server action)
- Hosting: **Netlify** (`@netlify/plugin-nextjs`)

## Prerequisites

- **Node.js 20** (see `.nvmrc`; run `nvm use` if you use nvm)
- **npm** (bundled with Node)
- A **Supabase** project (EU region) with the migrations applied (see below)
- (Optional) a **Resend** account + verified domain to email invitation codes

## Getting started

```bash
npm install
npm run dev            # http://localhost:3000
```

Other commands:

```bash
npm run build          # production build (compiles without real keys)
npm run start          # serve the production build
npm run typecheck      # tsc --noEmit
```

### Environment variables

Copy `.env.example` to `.env.local` and fill in the values.
**Never commit `.env.local`** (already in `.gitignore`).

| Variable | Scope | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | public (browser) | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public (browser) | Supabase anon key (RLS applies) |
| `NEXT_PUBLIC_SITE_URL` | public | Site origin, e.g. `http://localhost:3000` in dev, the Netlify URL in prod. Used for confirmation / reset links. |
| `RESEND_API_KEY` | server secret | Resend API key. Never exposed to the client. If missing, email sending is skipped gracefully (the code stays visible on screen). |
| `RESEND_FROM_EMAIL` | server secret | Verified Resend sender, e.g. `UMi <noreply@your-domain>` |

> Security: never put the `service_role` key or the Resend key under a
> `NEXT_PUBLIC_*` variable. Keep all secrets server-side only.

## Supabase

### Migrations

Migrations are versioned files applied manually in **Studio > SQL Editor**
(or via `supabase db push`). Apply them in chronological order:

1. `20260708120000_portail_psy_v0.sql` - core schema (`practitioners`,
   `patient_seats`, `exercise_completions`, `audit_events`), RPCs
   (`create_invitation`, `regenerate_code`, `revoke_seat`, `redeem_seat_code`,
   `release_my_seat`, `record_completion`), and RLS.
2. `20260708130000_portail_psy_v0_usage_view.sql` - public read on `exercises`
   + the `v_patient_usage` view (dashboard, patient list, and fiche depend on it).
3. `20260709090000_invite_code_4_digits.sql` - 4-digit invitation codes and
   progressive lockout on `redeem_seat_code`.
4. `20260709120000_history_resume_delete.sql` - read-only history after
   unlink/revoke, resume-same-seat relink within a 30-day window
   (`resume_until`), and the `delete_seat` RPC.

Optional demo data: `supabase/seed_demo_practitioner_1.sql` (idempotent, with a
commented cleanup section) seeds test patients and completions.

### Auth configuration (one-time, in Studio > Authentication)

1. **Confirm email**: recommended ON so practitioners confirm before signing in.
   Use a custom SMTP (Resend) for reliable delivery; the built-in sender is
   heavily rate-limited.
2. **URL configuration**:
   - *Site URL* = value of `NEXT_PUBLIC_SITE_URL`.
   - *Redirect URLs*: add `${SITE_URL}/auth/callback` for both dev and prod, e.g.
     `http://localhost:3000/auth/callback` and
     `https://<your-site>.netlify.app/auth/callback`.

Auth flow: signup > confirmation email > `/auth/callback`
(`exchangeCodeForSession`) > `/dashboard`. On the first session a
`practitioners` row is created automatically (upsert) for accounts created
through the portal (`role = 'practitioner'` metadata). An account without that
role and without a `practitioners` row is redirected to `/403`.

## Deployment (Netlify)

- `netlify.toml` is provided; the `@netlify/plugin-nextjs` plugin handles publish
  and serverless functions. Build command: `npm run build`.
- In **Netlify > Site settings > Environment variables**, set the five variables
  above (`NEXT_PUBLIC_*` are exposed to the browser, `RESEND_*` stay server-side).
- Set `NEXT_PUBLIC_SITE_URL` to the Netlify site URL and add its
  `.../auth/callback` to the Supabase Redirect URLs.

## Project structure

```
app/            # App Router
  (auth)/       # login, signup, verify-email, forgot/reset password
  (app)/        # dashboard, patients (list + [seatId] detail), settings
  auth/         # /auth/callback (code exchange)
  legal/, 403/  # legal pages, practitioners-only gate
actions/        # server actions (invitations, auth, profile)
components/     # UI + feature components (tables, charts, dialogs, badges)
lib/            # Supabase clients, types, formatting, helpers
i18n/           # next-intl configuration
messages/       # fr.json, en.json (all UI strings)
supabase/       # migrations/ + demo seed scripts
middleware.ts   # session refresh + route guards
```

## Documentation

- `PRD_Portail_Psy_UMi.md` - product requirements (business rules, seat state
  machine, user stories, data dictionary, permissions, GDPR/retention).
- `SPEC_Portail_Web.md` - web portal specification.
- `ROADMAP.md` - milestones.
- `BRIEF_MOBILE_J4_J5.md` - mobile-side contract (RPCs, access gate).

## Notes

- The portal exposes no clinical content: only done / not done, counts, and
  dates, scoped to the attachment period (enforced by RLS + a `security_invoker`
  view).
- Invitation-code email is sent from a Resend server action; if the Resend
  variables are missing or sending fails, the code stays visible on screen
  (non-blocking fallback).
- A build warning about a Node.js API under the Edge Runtime comes from
  `@supabase/ssr` in the middleware. It is the official Supabase pattern, benign,
  and has no impact on Netlify.
