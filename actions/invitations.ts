'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { mapSupabaseError } from '@/lib/errors';
import type { ActionResult } from '@/lib/action-result';
import type { PatientSeat } from '@/lib/types';
import { sendInviteEmail, type InviteEmailStatus } from '@/actions/email';
import { LOCALE_COOKIE, defaultLocale, isLocale } from '@/i18n/request';

function currentLocale(): string {
  const value = cookies().get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : defaultLocale;
}

export interface CreateInvitationData {
  seat: PatientSeat;
  emailStatus: InviteEmailStatus;
}

export async function createInvitation(input: {
  label?: string;
  email?: string;
  sendEmail?: boolean;
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

  let emailStatus: InviteEmailStatus = 'skipped';
  if (input.sendEmail && email && seat.invite_code) {
    emailStatus = await sendInviteEmail({
      to: email,
      code: seat.invite_code,
      expiresAt: seat.expires_at,
      locale: currentLocale(),
    });
  }

  revalidatePath('/patients');
  revalidatePath('/dashboard');
  return { ok: true, data: { seat, emailStatus } };
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
