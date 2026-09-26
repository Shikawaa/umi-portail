-- ============================================================================
-- Migration 0007 — Portail Psy UMi : Profil Praticien & Onboarding Personnalisé
-- ----------------------------------------------------------------------------
-- 1) Profil praticien enrichi (fiche présentée au patient lors de l'onboarding).
-- 2) Stockage du premier exercice obligatoire, mot personnel et suggestions.
-- 3) Tables de référence des questions et options d'onboarding (STAGING sync).
-- ============================================================================

-- 1. PRACTITIONERS : enrichissement du profil professionnel
alter table public.practitioners
  add column if not exists city text,
  add column if not exists description text,
  add column if not exists languages text[] default '{}',
  add column if not exists education jsonb default '[]'::jsonb,
  add column if not exists photo_url text;

-- 2. PATIENT_SEATS : métadonnées d'onboarding
alter table public.patient_seats
  add column if not exists first_exercise_id bigint references public.exercises (id),
  add column if not exists personal_note text,
  add column if not exists questionnaire_suggestions jsonb default '{}'::jsonb;

create index if not exists patient_seats_practitioner_status_idx
  on public.patient_seats (practitioner_id, status);

-- 3. QUESTIONS & OPTIONS D'ONBOARDING (référentiel STAGING)
create table if not exists public.onboarding_questions (
  key text primary key,
  display_order integer not null default 0,
  max_choices integer not null default 1
);

alter table public.onboarding_questions enable row level security;
drop policy if exists onboarding_questions_read on public.onboarding_questions;
create policy onboarding_questions_read on public.onboarding_questions
  for select to anon, authenticated using (true);

create table if not exists public.onboarding_options (
  question_key text not null references public.onboarding_questions(key) on delete cascade,
  option_key text not null,
  label_fr text not null,
  label_en text not null,
  display_order integer not null default 0,
  is_exclusive boolean not null default false,
  suggestable boolean not null default true,
  primary key (question_key, option_key)
);

alter table public.onboarding_options enable row level security;
drop policy if exists onboarding_options_read on public.onboarding_options;
create policy onboarding_options_read on public.onboarding_options
  for select to anon, authenticated using (true);

-- 4. SUGGESTIONS PAR SIÈGE
create table if not exists public.patient_seat_suggestions (
  patient_seat_id uuid not null references public.patient_seats(id) on delete cascade,
  question_key text not null,
  option_key text not null,
  created_at timestamptz not null default now(),
  primary key (patient_seat_id, question_key, option_key),
  foreign key (question_key, option_key) references public.onboarding_options(question_key, option_key) on delete cascade
);

alter table public.patient_seat_suggestions enable row level security;

drop policy if exists practitioners_manage_suggestions on public.patient_seat_suggestions;
create policy practitioners_manage_suggestions on public.patient_seat_suggestions
  for all using (
    exists (
      select 1 from public.patient_seats s
      where s.id = patient_seat_suggestions.patient_seat_id
        and s.practitioner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.patient_seats s
      where s.id = patient_seat_suggestions.patient_seat_id
        and s.practitioner_id = auth.uid()
    )
  );

grant select, insert, update, delete on public.patient_seat_suggestions to authenticated;
grant select on public.onboarding_questions to anon, authenticated;
grant select on public.onboarding_options to anon, authenticated;
