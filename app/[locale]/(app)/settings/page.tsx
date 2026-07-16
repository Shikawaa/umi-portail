import { createClient, getCachedUser, getCachedPractitioner } from '@/lib/supabase/server';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { SettingsView } from '@/components/settings-view';

export default async function SettingsPage({ params: { locale } }: { params: { locale: string } }) {
  setRequestLocale(locale);
  const supabase = createClient();
  const { user } = await getCachedUser();
  const data = await getCachedPractitioner();

  const practitioner = data as {
    first_name: string | null;
    last_name: string | null;
    practitioner_number: number | null;
  } | null;

  return (
    <SettingsView
      firstName={practitioner?.first_name ?? ''}
      lastName={practitioner?.last_name ?? ''}
      email={user?.email ?? ''}
      practitionerNumber={practitioner?.practitioner_number ?? null}
    />
  );
}
