import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { cache } from 'react';
import type { Practitioner } from '@/lib/types';

type CookieToSet = { name: string; value: string; options?: CookieOptions };

/**
 * Server-side Supabase client (RLS applies).
 * Reads env lazily at call time so the build never throws on missing keys.
 * Used from Server Components, Route Handlers and Server Actions.
 */
export function createClient() {
  const cookieStore = cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // `setAll` can be called from a Server Component where cookies are
          // read-only. Safe to ignore — the middleware refreshes the session.
        }
      },
    },
  });
}

export const getCachedUser = cache(async () => {
  const supabase = createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  return { user, error };
});

export const getCachedPractitioner = cache(async () => {
  const { user } = await getCachedUser();
  if (!user) return null;
  const supabase = createClient();
  const { data } = await supabase
    .from('practitioners')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();
  return data as Practitioner | null;
});
