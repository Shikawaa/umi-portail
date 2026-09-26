'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { mapSupabaseError } from '@/lib/errors';
import type { ActionResult } from '@/lib/action-result';
import type { PatientSeat } from '@/lib/types';
import { sendInviteEmail, type InviteEmailStatus } from '@/actions/email';
import { LOCALE_COOKIE, defaultLocale, isLocale } from '@/i18n/request';

import { getSiteUrl } from '@/lib/site';

function currentLocale(): string {
  const value = cookies().get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : defaultLocale;
}

export interface CreateInvitationData {
  seat: PatientSeat;
  emailStatus: InviteEmailStatus;
  joinUrl: string;
}

export async function createInvitation(input: {
  label: string;
  email?: string;
  sendEmail?: boolean;
  firstExerciseId: number;
  personalNote?: string;
  suggestions?: Record<string, string[]>;
}): Promise<ActionResult<CreateInvitationData>> {
  const supabase = createClient();
  const label = input.label?.trim() || null;
  const email = input.email?.trim() || null;

  const { data, error } = await supabase.rpc('create_invitation', {
    p_label: label,
    p_invite_email: email,
  });
  if (error) return { ok: false, error: mapSupabaseError(error) };
  if (!data) return { ok: false, error: 'generic' };

  const seat = data as PatientSeat;

  // 1. Fetch current practitioner info to attach their name to the recommendation
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let practitionerName: string | null = null;
  if (user) {
    const { data: practitioner } = await supabase
      .from('practitioners')
      .select('first_name, last_name')
      .eq('id', user.id)
      .maybeSingle();
    practitionerName =
      [practitioner?.first_name, practitioner?.last_name]
        .filter(Boolean)
        .join(' ') || null;
  }

  // 2. Insert mandatory first exercise recommendation
  const note = input.personalNote?.trim() || null;
  await supabase.from('recommendations').insert({
    patient_seat_id: seat.id,
    exercise_id: String(input.firstExerciseId),
    is_active: true,
    practitioner_name: practitionerName,
    note,
    note_en: note,
  });

  // 3. Insert optional questionnaire suggestions
  if (input.suggestions) {
    const suggestionRows: {
      patient_seat_id: string;
      question_key: string;
      option_key: string;
    }[] = [];
    for (const [qKey, opts] of Object.entries(input.suggestions)) {
      if (Array.isArray(opts)) {
        for (const optKey of opts) {
          if (optKey) {
            suggestionRows.push({
              patient_seat_id: seat.id,
              question_key: qKey,
              option_key: optKey,
            });
          }
        }
      }
    }

    if (suggestionRows.length > 0) {
      await supabase.from('patient_seat_suggestions').insert(suggestionRows);
    }
  }

  // 4. Build join link
  const siteUrl = getSiteUrl();
  const joinUrl = `${siteUrl}/join?code=${seat.invite_code}`;

  let emailStatus: InviteEmailStatus = 'skipped';
  if (input.sendEmail && email && seat.invite_code) {
    emailStatus = await sendInviteEmail({
      to: email,
      code: seat.invite_code,
      expiresAt: seat.expires_at,
      locale: currentLocale(),
      link: joinUrl,
      practitionerName,
    });
  }

  revalidatePath('/patients');
  revalidatePath('/dashboard');
  return { ok: true, data: { seat, emailStatus, joinUrl } };
}

export async function regenerateCode(input: {
  seatId: string;
}): Promise<ActionResult<PatientSeat>> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('regenerate_code', {
    p_seat_id: input.seatId,
  });
  if (error) return { ok: false, error: mapSupabaseError(error) };
  if (!data) return { ok: false, error: 'generic' };

  revalidatePath('/patients');
  return { ok: true, data: data as PatientSeat };
}

export async function revokeSeat(input: {
  seatId: string;
}): Promise<ActionResult> {
  const supabase = createClient();
  const { error } = await supabase.rpc('revoke_seat', {
    p_seat_id: input.seatId,
  });
  if (error) return { ok: false, error: mapSupabaseError(error) };

  revalidatePath('/patients');
  revalidatePath('/dashboard');
  revalidatePath(`/patients/${input.seatId}`);
  return { ok: true, data: undefined };
}

/**
 * Reopens the 30-day resume window of an ended follow-up: the patient re-enters
 * the code in the app and gets the SAME seat back (continuous history).
 * `newCode: true` reissues a fresh code for that same seat — used when the old
 * code has been reassigned in the meantime (`codeTaken`).
 */
export async function reactivateSeat(input: {
  seatId: string;
  newCode?: boolean;
}): Promise<ActionResult<PatientSeat>> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('reactivate_seat', {
    p_seat_id: input.seatId,
    p_new_code: input.newCode ?? false,
  });
  if (error) return { ok: false, error: mapSupabaseError(error) };
  if (!data) return { ok: false, error: 'generic' };

  revalidatePath('/patients');
  revalidatePath('/dashboard');
  revalidatePath(`/patients/${input.seatId}`);
  return { ok: true, data: data as PatientSeat };
}

/** Renames a seat (the practitioner's own, non-nominative label). */
export async function renameSeat(input: {
  seatId: string;
  label: string;
}): Promise<ActionResult> {
  const supabase = createClient();
  const label = input.label.trim().slice(0, 80) || null;

  const { error } = await supabase
    .from('patient_seats')
    .update({ label })
    .eq('id', input.seatId);
  if (error) return { ok: false, error: mapSupabaseError(error) };

  revalidatePath('/patients');
  revalidatePath('/dashboard');
  revalidatePath(`/patients/${input.seatId}`);
  return { ok: true, data: undefined };
}

export async function deleteSeat(input: {
  seatId: string;
}): Promise<ActionResult> {
  const supabase = createClient();
  const { error } = await supabase.rpc('delete_seat', {
    p_seat_id: input.seatId,
  });
  if (error) return { ok: false, error: mapSupabaseError(error) };

  revalidatePath('/patients');
  revalidatePath('/dashboard');
  return { ok: true, data: undefined };
}
