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
}): Promise<ActionResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'generic' };

  const { error } = await supabase
    .from('practitioners')
    .update({
      first_name: input.firstName.trim() || null,
      last_name: input.lastName.trim() || null,
    })
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

  cookies().set(LOCALE_COOKIE, input.locale, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  });

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

  revalidatePath('/', 'layout');
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
