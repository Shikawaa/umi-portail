import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createClient, getCachedUser, getCachedPractitioner } from '@/lib/supabase/server';
import { AppShell } from '@/components/app-shell';
import type { Practitioner } from '@/lib/types';
import { setRequestLocale } from 'next-intl/server';
import { LOCALE_COOKIE, defaultLocale, isLocale } from '@/i18n/request';

export default async function AppLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  setRequestLocale(locale);
  const { user } = await getCachedUser();
  if (!user) redirect('/login');

  let practitioner = await getCachedPractitioner();

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

    const supabase = createClient();
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
