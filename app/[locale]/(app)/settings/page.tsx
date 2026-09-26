import { createClient, getCachedUser, getCachedPractitioner } from '@/lib/supabase/server';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { SettingsView } from '@/components/settings-view';

export default async function SettingsPage({ params: { locale } }: { params: { locale: string } }) {
  setRequestLocale(locale);
  const { user } = await getCachedUser();
  const practitioner = await getCachedPractitioner();

  return (
    <SettingsView
      practitioner={practitioner}
      email={user?.email ?? ''}
    />
  );
}
