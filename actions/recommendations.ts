'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { mapSupabaseError } from '@/lib/errors';
import type { ActionResult } from '@/lib/action-result';
import type { Recommendation } from '@/lib/types';

export async function addRecommendation(input: {
  seatId: string;
  exerciseId: number;
  note?: string;
}): Promise<ActionResult<Recommendation>> {
  const supabase = createClient();
  const note = input.note?.trim() || null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'generic' };

  // Resolve the patient from the seat (RLS scopes seats to their owner) and
  // fetch the practitioner identity to denormalise `practitioner_name`, which
  // the mobile app displays as-is.
  const [{ data: seat }, { data: practitioner }] = await Promise.all([
    supabase
      .from('patient_seats')
      .select('patient_user_id')
      .eq('id', input.seatId)
      .maybeSingle(),
    supabase
      .from('practitioners')
      .select('first_name, last_name')
      .eq('id', user.id)
      .maybeSingle(),
  ]);
  if (!seat) return { ok: false, error: 'notOwner' };
  if (!seat.patient_user_id) return { ok: false, error: 'generic' };

  const practitionerName =
    [practitioner?.first_name, practitioner?.last_name]
      .filter(Boolean)
      .join(' ') || null;

  // Translation is not wired up on this part of the app yet: write the same
  // note in both locales. `is_active` is not used yet, always true.
  const { data, error } = await supabase
    .from('recommendations')
    .insert({
      practitioner_id: user.id,
      patient_id: seat.patient_user_id,
      exercise_id: String(input.exerciseId),
      note,
      note_en: note,
      practitioner_name: practitionerName,
      is_active: true,
    })
    .select()
    .single();
  if (error) {
    // Unique (practitioner, patient, exercise): the exercise is already
    // recommended. The UI hides those, but guard against double submits.
    if (error.code === '23505') return { ok: false, error: 'alreadyRecommended' };
    return { ok: false, error: mapSupabaseError(error) };
  }

  revalidatePath(`/patients/${input.seatId}`);
  return { ok: true, data: data as Recommendation };
}

export async function removeRecommendation(input: {
  recommendationId: string;
  seatId: string;
}): Promise<ActionResult> {
  const supabase = createClient();
  const { error } = await supabase
    .from('recommendations')
    .delete()
    .eq('id', input.recommendationId);
  if (error) return { ok: false, error: mapSupabaseError(error) };

  revalidatePath(`/patients/${input.seatId}`);
  return { ok: true, data: undefined };
}
