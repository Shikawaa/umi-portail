import { createClient } from '@/lib/supabase/server';
import { SettingsView } from '@/components/settings-view';

export default async function SettingsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data } = await supabase
    .from('practitioners')
    .select('first_name, last_name, practitioner_number')
    .eq('id', user?.id ?? '')
    .maybeSingle();

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
