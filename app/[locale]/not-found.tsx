import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { buttonVariants } from '@/components/ui/button';

export default async function NotFound() {
  const t = await getTranslations('notFound');
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-5xl font-semibold text-primary">404</p>
      <h1 className="text-xl font-semibold text-foreground">{t('title')}</h1>
      <p className="max-w-md text-sm text-muted-foreground">{t('body')}</p>
      <Link href="/dashboard" className={buttonVariants({ className: 'mt-2' })}>
        {t('home')}
      </Link>
    </main>
  );
}
