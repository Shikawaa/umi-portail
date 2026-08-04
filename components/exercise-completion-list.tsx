'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Check, ChevronDown, ChevronUp, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/format';

export interface ExerciseItem {
  id: number;
  title: string;
  count: number;
  last: string | null;
}

/** How many exercises are shown before the practitioner asks for the rest. */
const COLLAPSED_COUNT = 5;

/**
 * Exercises of the follow-up, most practised first. Only the top few are shown
 * by default: on a fiche the useful signal is what the patient actually does,
 * not the whole library. The rest stays one click away.
 */
export function ExerciseCompletionList({ items }: { items: ExerciseItem[] }) {
  const t = useTranslations('patientDetail');
  const locale = useLocale();
  const [expanded, setExpanded] = useState(false);

  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">{t('exercises.empty')}</p>
    );
  }

  // Most completed first; ties keep the library order (stable sort).
  const sorted = [...items].sort((a, b) => b.count - a.count);
  const hidden = sorted.length - COLLAPSED_COUNT;
  const visible = expanded ? sorted : sorted.slice(0, COLLAPSED_COUNT);

  return (
    <>
      <ul className="divide-y divide-border">
        {visible.map((it) => {
          const done = it.count > 0;
          return (
            <li key={it.id} className="flex items-center gap-3 py-3">
              <span
                className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
                  done
                    ? 'bg-accent text-primary'
                    : 'bg-muted text-muted-foreground',
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

      {hidden > 0 ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="mt-1 flex w-full items-center justify-center gap-1.5 border-t border-border pt-3 text-sm font-medium text-primary transition-colors hover:text-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {expanded ? (
            <>
              <ChevronUp className="h-4 w-4" />
              {t('exercises.showLess')}
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4" />
              {t('exercises.showAll', { count: hidden })}
            </>
          )}
        </button>
      ) : null}
    </>
  );
}
