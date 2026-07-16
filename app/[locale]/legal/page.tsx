import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { buttonVariants } from '@/components/ui/button';

const SECTIONS = ['editor', 'privacy', 'contact'] as const;

export default async function LegalPage() {
  const t = await getTranslations('legal');
  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <Link
        href="/"
        className={buttonVariants({
          variant: 'ghost',
          size: 'sm',
          className: '-ml-2 mb-6',
        })}
      >
        <ArrowLeft className="h-4 w-4" />
        {t('backHome')}
      </Link>
      <h1 className="text-2xl font-semibold text-foreground">{t('title')}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {t('placeholderNotice')}
      </p>
      <div className="mt-8 space-y-4">
        {SECTIONS.map((section) => (
          <Card key={section}>
            <CardHeader>
              <CardTitle className="text-base">
                {t(`${section}.title`)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {t(`${section}.body`)}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
}
