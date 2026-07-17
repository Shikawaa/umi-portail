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

  // Fetch the practitioner identity to denormalise `practitioner_name`,
  // which the mobile app displays as-is.
  const { data: practitioner } = await supabase
    .from('practitioners')
    .select('first_name, last_name')
    .eq('id', user.id)
    .maybeSingle();

  const practitionerName =
    [practitioner?.first_name, practitioner?.last_name]
      .filter(Boolean)
      .join(' ') || null;

  // The recommendation belongs to the seat; RLS (with check) guarantees the
  // seat is owned by the signed-in practitioner. Translation is not wired up
  // on this part of the app yet: write the same note in both locales.
  // `is_active` is not used yet, always true.
  const { data, error } = await supabase
    .from('recommendations')
    .insert({
      patient_seat_id: input.seatId,
      exercise_id: String(input.exerciseId),
      note,
      note_en: note,
      practitioner_name: practitionerName,
      is_active: true,
    })
    .select()
    .single();
  if (error) {
    // Unique (seat, exercise): the exercise is already recommended. The UI
    // hides those, but guard against double submits.
    if (error.code === '23505') return { ok: false, error: 'alreadyRecommended' };
    // RLS rejection: the seat does not belong to this practitioner.
    if (error.code === '42501') return { ok: false, error: 'notOwner' };
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
