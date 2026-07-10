import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { AppShell } from '@/components/app-shell';
import type { Practitioner } from '@/lib/types';
import { LOCALE_COOKIE, defaultLocale, isLocale } from '@/i18n/request';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: existing } = await supabase
    .from('practitioners')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  let practitioner = existing as Practitioner | null;

  // First authenticated load: create the practitioner row for accounts that
  // signed up through the portal. Any other account (e.g. a patient) is denied.
  if (!practitioner) {
    const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
    if (meta.role !== 'practitioner') {
      redirect('/403');
    }

    const cookieLocale = cookies().get(LOCALE_COOKIE)?.value;
    const metaLocale =
      typeof meta.locale === 'string' && isLocale(meta.locale)
        ? meta.locale
        : undefined;
    const locale = isLocale(cookieLocale)
      ? cookieLocale
      : (metaLocale ?? defaultLocale);

    const { data: upserted } = await supabase
      .from('practitioners')
      .upsert({
        id: user.id,
        first_name: typeof meta.first_name === 'string' ? meta.first_name : null,
        last_name: typeof meta.last_name === 'string' ? meta.last_name : null,
        locale,
      })
      .select('*')
      .maybeSingle();

    practitioner = upserted as Practitioner | null;
    if (!practitioner) {
      redirect('/403');
    }
  }

  return (
    <AppShell practitioner={practitioner} email={user.email ?? ''}>
      {children}
    </AppShell>
  );
}
