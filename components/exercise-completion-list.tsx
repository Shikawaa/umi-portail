'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Check, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/format';

export interface ExerciseItem {
  id: number;
  title: string;
  count: number;
  last: string | null;
}

export function ExerciseCompletionList({ items }: { items: ExerciseItem[] }) {
  const t = useTranslations('patientDetail');
  const locale = useLocale();

  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">{t('exercises.empty')}</p>
    );
  }

  return (
    <ul className="divide-y divide-border">
      {items.map((it) => {
        const done = it.count > 0;
        return (
          <li key={it.id} className="flex items-center gap-3 py-3">
            <span
              className={cn(
                'flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
                done ? 'bg-accent text-primary' : 'bg-muted text-muted-foreground',
              )}
              aria-hidden="true"
            >
              {done ? (
                <Check className="h-4 w-4" />
              ) : (
                <Minus className="h-4 w-4" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">
                {it.title}
              </p>
              {done ? (
                <p className="text-xs text-muted-foreground">
                  {t('exercises.times', { count: it.count })}
                  {it.last
                    ? ` · ${t('exercises.lastDate', {
                        date: formatDate(it.last, locale) ?? '',
                      })}`
                    : ''}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {t('exercises.notDone')}
                </p>
              )}
            </div>
            <span
              className={cn(
                'text-xs font-medium',
                done ? 'text-primary' : 'text-muted-foreground',
              )}
            >
              {done ? t('exercises.done') : t('exercises.notDone')}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
