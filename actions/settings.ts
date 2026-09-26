'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { mapSupabaseError } from '@/lib/errors';
import type { ActionResult } from '@/lib/action-result';
import { getSiteUrl } from '@/lib/site';
import { LOCALE_COOKIE, isLocale, type Locale } from '@/i18n/request';

export async function updateProfile(input: {
  firstName: string;
  lastName: string;
  city?: string | null;
  description?: string | null;
  languages?: string[] | null;
  education?: Array<{ title: string; institution: string }> | null;
  photoUrl?: string | null;
}): Promise<ActionResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'generic' };

  const updatePayload: Record<string, unknown> = {
    first_name: input.firstName.trim() || null,
    last_name: input.lastName.trim() || null,
  };

  if (input.city !== undefined) {
    updatePayload.city = input.city?.trim() || null;
  }
  if (input.description !== undefined) {
    updatePayload.description = input.description?.trim() || null;
  }
  if (input.languages !== undefined) {
    updatePayload.languages = (input.languages ?? [])
      .map((l) => l.trim())
      .filter(Boolean);
  }
  if (input.education !== undefined) {
    updatePayload.education = (input.education ?? []).filter(
      (e) => e.title?.trim() || e.institution?.trim(),
    );
  }
  if (input.photoUrl !== undefined) {
    updatePayload.photo_url = input.photoUrl?.trim() || null;
  }

  const { error } = await supabase
    .from('practitioners')
    .update(updatePayload)
    .eq('id', user.id);
  if (error) return { ok: false, error: mapSupabaseError(error) };

  revalidatePath('/settings');
  revalidatePath('/dashboard');
  return { ok: true, data: undefined };
}

export async function setLocale(input: {
  locale: Locale;
}): Promise<ActionResult> {
  if (!isLocale(input.locale)) return { ok: false, error: 'generic' };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    await supabase
      .from('practitioners')
      .update({ locale: input.locale })
      .eq('id', user.id);
  }

  return { ok: true, data: undefined };
}

export async function sendMyPasswordReset(): Promise<ActionResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { ok: false, error: 'generic' };

  const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
    redirectTo: `${getSiteUrl()}/auth/callback?next=/reset-password`,
  });
  if (error) return { ok: false, error: mapSupabaseError(error) };
  return { ok: true, data: undefined };
}
