// Seat helpers shared by the patient list and the patient fiche.

import type { Assiduity, SeatStatus } from '@/lib/types';

interface SeatResumeInfo {
  status: SeatStatus;
  resume_until: string | null;
}

/** Statuses a follow-up can be brought back from (same seat, same history). */
const ENDED_RESUMABLE: SeatStatus[] = ['released', 'revoked'];

/** True when the seat's code can still be re-entered by the patient to resume. */
export function isResumable(seat: SeatResumeInfo): boolean {
  return (
    ENDED_RESUMABLE.includes(seat.status) &&
    seat.resume_until != null &&
    new Date(seat.resume_until).getTime() > Date.now()
  );
}

/**
 * Class carrying the engagement color tokens (`--state-*`, see globals.css).
 * Put it on a container to tint a whole subtree (patient fiche) or on a single
 * element (assiduity badge inside a list of mixed states).
 */
const STATE_CLASS: Record<Assiduity, string> = {
  active: 'state-active',
  idle: 'state-idle',
  never: 'state-never',
  paused: 'state-paused',
};

export function stateClass(assiduity: Assiduity): string {
  return STATE_CLASS[assiduity] ?? STATE_CLASS.paused;
}

/** True when the practitioner can reopen the resume window for this seat. */
export function canReactivate(seat: {
  status: SeatStatus;
  patient_user_id: string | null;
  redeemed_at: string | null;
}): boolean {
  return (
    ENDED_RESUMABLE.includes(seat.status) &&
    seat.patient_user_id != null &&
    seat.redeemed_at != null
  );
}
