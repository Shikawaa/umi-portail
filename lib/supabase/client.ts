import { createBrowserClient } from '@supabase/ssr';

/**
 * Browser Supabase client (RLS applies). Used only in client components that
 * need direct auth interactions; most flows go through server actions.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
  );
}
