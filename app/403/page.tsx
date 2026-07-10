import { getTranslations } from 'next-intl/server';
import { Button } from '@/components/ui/button';
import { signOut } from '@/actions/auth';

export default async function ForbiddenPage() {
  const t = await getTranslations('forbidden');
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-xl font-semibold text-foreground">{t('title')}</h1>
      <p className="max-w-md text-sm text-muted-foreground">{t('body')}</p>
      <form action={signOut}>
        <Button type="submit" variant="outline" className="mt-2">
          {t('logout')}
        </Button>
      </form>
    </main>
  );
}
