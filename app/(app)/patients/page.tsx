import { createClient } from '@/lib/supabase/server';
import { PatientsView } from '@/components/patients-view';
import type { PendingSeat } from '@/components/invitations-panel';
import type { PatientUsage } from '@/lib/types';

export default async function PatientsPage() {
  const supabase = createClient();

  const { data: usageData, error: usageError } = await supabase
    .from('v_patient_usage')
    .select('*');
  if (usageError) throw new Error(usageError.message);

  const { data: pendingData, error: pendingError } = await supabase
    .from('patient_seats')
    .select('id, label, invite_code, expires_at, status')
    .eq('status', 'invited')
    .order('created_at', { ascending: false });
  if (pendingError) throw new Error(pendingError.message);

  const usage = (usageData ?? []) as PatientUsage[];
  const patients = usage.filter((u) => u.status !== 'invited');

  const pending: PendingSeat[] = (pendingData ?? []).map(
    (s: {
      id: string;
      label: string | null;
      invite_code: string;
      expires_at: string;
    }) => ({
      id: s.id,
      label: s.label ?? null,
      invite_code: s.invite_code,
      expires_at: s.expires_at,
    }),
  );

  return <PatientsView patients={patients} pending={pending} />;
}
