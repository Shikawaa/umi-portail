// Shared domain types mirroring the Supabase schema (migrations 0001 & 0002).

export type SeatStatus =
  | 'invited'
  | 'active'
  | 'paused'
  | 'revoked'
  | 'released'
  | 'expired';

export type Assiduity = 'never' | 'active' | 'idle';

export interface Practitioner {
  id: string;
  practitioner_number: number;
  first_name: string | null;
  last_name: string | null;
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
}

export interface Exercise {
  id: number;
  titre: string | null;
  titre_en: string | null;
  description_courte: string | null;
  duree_moyenne: string | null;
  effort_cognitif: string | null;
}

export interface ExerciseCompletion {
  id: string;
  patient_user_id: string;
  exercise_id: number;
  completed_at: string;
}
