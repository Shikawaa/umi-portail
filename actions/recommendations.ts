'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { mapSupabaseError } from '@/lib/errors';
import type { ActionResult } from '@/lib/action-result';
import type { Recommendation } from '@/lib/types';

/**
 * Recommends one or several exercises at once (the practitioner picks them in a
 * single pass). The optional note is shared by every exercise of the batch: the
 * insert is one statement, so it either lands entirely or not at all.
 */
export async function addRecommendations(input: {
  seatId: string;
  exerciseIds: number[];
  note?: string;
}): Promise<ActionResult<Recommendation[]>> {
  const supabase = createClient();
  const note = input.note?.trim() || null;
  const exerciseIds = [...new Set(input.exerciseIds)];
  if (exerciseIds.length === 0) return { ok: false, error: 'generic' };

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

  // The recommendations belong to the seat; RLS (with check) guarantees the
  // seat is owned by the signed-in practitioner. Translation is not wired up
  // on this part of the app yet: write the same note in both locales.
  // `is_active` is not used yet, always true.
  const { data, error } = await supabase
    .from('recommendations')
    .insert(
      exerciseIds.map((exerciseId) => ({
        patient_seat_id: input.seatId,
        exercise_id: String(exerciseId),
        note,
        note_en: note,
        practitioner_name: practitionerName,
        is_active: true,
      })),
    )
    .select();
  if (error) {
    // Unique (seat, exercise): one of them is already recommended. The UI hides
    // those, but guard against double submits and stale pickers.
    if (error.code === '23505') return { ok: false, error: 'alreadyRecommended' };
    // RLS rejection: the seat does not belong to this practitioner.
    if (error.code === '42501') return { ok: false, error: 'notOwner' };
    return { ok: false, error: mapSupabaseError(error) };
  }

  revalidatePath(`/patients/${input.seatId}`);
  return { ok: true, data: (data ?? []) as Recommendation[] };
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
