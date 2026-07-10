'use client';

import { useTransition } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Check, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { setLocale } from '@/actions/settings';
import { cn } from '@/lib/utils';

const LOCALES = ['fr', 'en'] as const;

export function LanguageSwitcher({ withLabel = false }: { withLabel?: boolean }) {
  const locale = useLocale();
  const t = useTranslations('language');
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function change(next: (typeof LOCALES)[number]) {
    if (next === locale) return;
    startTransition(async () => {
      const res = await setLocale({ locale: next });
      if (res.ok) router.refresh();
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size={withLabel ? 'sm' : 'icon'}
          disabled={pending}
          aria-label={t('label')}
        >
          <Globe className="h-4 w-4" />
          {withLabel ? (
            <span>{t(locale)}</span>
          ) : (
            <span className="sr-only">{t('label')}</span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {LOCALES.map((l) => (
          <DropdownMenuItem key={l} onSelect={() => change(l)}>
            <Check
              className={cn('h-4 w-4', l === locale ? 'opacity-100' : 'opacity-0')}
            />
            {t(l)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
