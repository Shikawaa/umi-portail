'use server';

import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { mapSupabaseError } from '@/lib/errors';
import type { ActionResult } from '@/lib/action-result';
import { getSiteUrl } from '@/lib/site';
import { LOCALE_COOKIE, defaultLocale, isLocale } from '@/i18n/request';

function currentLocale(): string {
  const value = cookies().get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : defaultLocale;
}

export async function signIn(input: {
  email: string;
  password: string;
}): Promise<ActionResult> {
  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: input.email,
    password: input.password,
  });
  if (error) return { ok: false, error: mapSupabaseError(error) };
  redirect('/dashboard');
}

export async function signUp(input: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}): Promise<ActionResult> {
  const supabase = createClient();
  const locale = currentLocale();
  const { error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      data: {
        first_name: input.firstName || null,
        last_name: input.lastName || null,
        locale,
        role: 'practitioner',
      },
      emailRedirectTo: `${getSiteUrl()}/auth/callback?next=/dashboard`,
    },
  });
  if (error) return { ok: false, error: mapSupabaseError(error) };
  redirect('/verify-email');
}

export async function signOut(): Promise<void> {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect('/login');
}

export async function resendConfirmation(input: {
  email: string;
}): Promise<ActionResult> {
  const supabase = createClient();
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email: input.email,
    options: {
      emailRedirectTo: `${getSiteUrl()}/auth/callback?next=/dashboard`,
    },
  });
  if (error) return { ok: false, error: mapSupabaseError(error) };
  return { ok: true, data: undefined };
}

export async function requestPasswordReset(input: {
  email: string;
}): Promise<ActionResult> {
  const supabase = createClient();
  // Errors are swallowed to avoid email enumeration — always report success.
  await supabase.auth.resetPasswordForEmail(input.email, {
    redirectTo: `${getSiteUrl()}/auth/callback?next=/reset-password`,
  });
  return { ok: true, data: undefined };
}

export async function updatePassword(input: {
  password: string;
}): Promise<ActionResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'generic' };

  const { error } = await supabase.auth.updateUser({ password: input.password });
  if (error) return { ok: false, error: mapSupabaseError(error) };

  // Invalidate the recovery session so the user re-authenticates.
  await supabase.auth.signOut();
  return { ok: true, data: undefined };
}
