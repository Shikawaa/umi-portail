import { redirect } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { isLocale } from '@/i18n/request';

export default async function RootPage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  redirect({ href: user ? '/dashboard' : '/login', locale: params.locale });
}
