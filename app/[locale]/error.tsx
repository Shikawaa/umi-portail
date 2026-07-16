'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations('errorBoundary');
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-xl font-semibold text-foreground">{t('title')}</h1>
      <p className="max-w-md text-sm text-muted-foreground">{t('body')}</p>
      <Button className="mt-2" onClick={() => reset()}>
        {t('retry')}
      </Button>
      <p className="text-xs text-muted-foreground">{t('contact')}</p>
    </main>
  );
}
