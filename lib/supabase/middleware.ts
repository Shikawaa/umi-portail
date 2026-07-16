import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

type CookieToSet = { name: string; value: string; options?: CookieOptions };

const PROTECTED_PREFIXES = ['/dashboard', '/patients', '/settings'];
const AUTH_ONLY_PATHS = ['/login', '/signup'];

function stripLocale(pathname: string) {
  const parts = pathname.split('/');
  if (parts.length > 1 && (parts[1] === 'fr' || parts[1] === 'en')) {
    return '/' + parts.slice(2).join('/');
  }
  return pathname;
}

function isProtected(pathname: string) {
  const stripped = stripLocale(pathname);
  return PROTECTED_PREFIXES.some(
    (p) => stripped === p || stripped.startsWith(`${p}/`),
  );
}

/**
 * Refreshes the Supabase session on every request and guards the app routes.
 * Unauthenticated users hitting a protected route are redirected to /login.
 * Authenticated users hitting /login or /signup are sent to /dashboard.
 */
export async function updateSession(request: NextRequest, response?: NextResponse) {
  let supabaseResponse = response || NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Without configured keys we cannot verify the session — let requests through
  // (the app layout still enforces auth server-side).
  if (!url || !anonKey) {
    return supabaseResponse;
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const stripped = stripLocale(pathname);
  
  // Extract locale prefix if present
  let localePrefix = '';
  const parts = pathname.split('/');
  if (parts.length > 1 && (parts[1] === 'fr' || parts[1] === 'en')) {
    localePrefix = '/' + parts[1];
  }

  if (!user && isProtected(pathname)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = `${localePrefix}/login`;
    redirectUrl.search = '';
    return NextResponse.redirect(redirectUrl);
  }

  if (user && AUTH_ONLY_PATHS.includes(stripped)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = `${localePrefix}/dashboard`;
    redirectUrl.search = '';
    return NextResponse.redirect(redirectUrl);
  }

  return supabaseResponse;
}
