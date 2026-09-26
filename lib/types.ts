// Shared domain types mirroring the Supabase schema (migrations 0001 & 0002).

export type SeatStatus =
  | 'invited'
  | 'active'
  | 'paused'
  | 'revoked'
  | 'released'
  | 'expired';

/**
 * Engagement over the last 7 days. `paused` = the seat is no longer active
 * (revoked / released / expired), so engagement is suspended: it resumes as
 * soon as the patient is attached again (migration 0006).
 */
export type Assiduity = 'never' | 'active' | 'idle' | 'paused';

export interface EducationItem {
  title: string;
  institution: string;
}

export interface Practitioner {
  id: string;
  practitioner_number: number;
  first_name: string | null;
  last_name: string | null;
  city: string | null;
  description: string | null;
  languages: string[] | null;
  education: EducationItem[] | null;
  photo_url: string | null;
  locale: string;
  created_at: string;
  updated_at: string;
}

export interface PatientSeat {
  id: string;
  practitioner_id: string;
  patient_user_id: string | null;
  label: string | null;
  invite_code: string;
  invite_email: string | null;
  status: SeatStatus;
  created_at: string;
  expires_at: string;
  redeemed_at: string | null;
  revoked_at: string | null;
  released_at: string | null;
  resume_until: string | null;
}

/** Row from the `v_patient_usage` view. */
export interface PatientUsage {
  seat_id: string;
  practitioner_id: string;
  patient_user_id: string | null;
  label: string | null;
  status: SeatStatus;
  redeemed_at: string | null;
  completions_total: number;
  completions_7d: number;
  completions_30d: number;
  last_completed_at: string | null;
  assiduity: Assiduity;
  resume_until: string | null;
}

export interface Exercise {
  id: number;
  titre: string | null;
  titre_en: string | null;
  description_courte: string | null;
  duree_moyenne: string | null;
  effort_cognitif: string | null;
  color?: string | null;
  symptomes?: string[] | null;
}

export interface ExerciseCompletion {
  id: string;
  patient_user_id: string;
  exercise_id: number;
  completed_at: string;
}

/**
 * Row from the `recommendations` table, shared with the mobile app.
 * A recommendation belongs to a patient seat (migration 0006), i.e. to the
 * follow-up relationship rather than to the practitioner or patient directly.
 * `exercise_id` is text on purpose (mobile stores the numeric exercise id as
 * a string). The portal writes the same note in `note` and `note_en` until
 * translation is handled, and always keeps `is_active` true for now.
 */
export interface Recommendation {
  id: string;
  patient_seat_id: string;
  exercise_id: string;
  note: string | null;
  note_en: string | null;
  practitioner_name: string | null;
  is_active: boolean;
  created_at: string;
}

export type OnboardingQuestionKey =
  | 'q1_goals'
  | 'q2_impact'
  | 'q3_moments'
  | 'q4_experience'
  | 'q5_tone';

export interface OnboardingQuestion {
  key: OnboardingQuestionKey;
  display_order: number;
  max_choices: number;
}

export interface OnboardingOption {
  question_key: OnboardingQuestionKey;
  option_key: string;
  label_fr: string;
  label_en: string;
  display_order: number;
  is_exclusive: boolean;
  suggestable: boolean;
}

export interface PatientSeatSuggestion {
  patient_seat_id: string;
  question_key: string;
  option_key: string;
}

/**
 * Checks if a practitioner profile is complete according to P01.
 * Description, city, and at least one language are required.
 * Formations are required in strict mode, but can be skipped in demo mode.
 */
export function isPractitionerProfileComplete(
  p: Practitioner | null | undefined,
  strict = false,
): boolean {
  if (!p) return false;
  const hasName = Boolean(p.first_name?.trim() && p.last_name?.trim());
  if (!hasName) return false;
  if (!strict) return true; // Demo mode: Name is sufficient
  const hasDesc = Boolean(p.description?.trim());
  const hasCity = Boolean(p.city?.trim());
  const hasLang = Array.isArray(p.languages) && p.languages.some((l) => l.trim().length > 0);
  const hasEdu = Array.isArray(p.education) && p.education.some((e) => e.title?.trim() && e.institution?.trim());
  return hasDesc && hasCity && hasLang && hasEdu;
}
