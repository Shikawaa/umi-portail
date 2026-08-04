'use client';

import { useTranslations } from 'next-intl';
import { Badge, Dot } from '@/components/ui/badge';
import { stateClass } from '@/lib/seats';
import { cn } from '@/lib/utils';
import type { Assiduity } from '@/lib/types';

/**
 * Engagement badge. Colors come from the `--state-*` tokens, set by the
 * `.state-*` class on the badge itself so a list can mix states on one page:
 * teal (engaged), amber (idle), red (never started), gray (paused).
 */
export function AssiduityBadge({ assiduity }: { assiduity: Assiduity }) {
  const t = useTranslations('badges');
  return (
    <Badge
      className={cn(
        stateClass(assiduity),
        'border-state-border bg-state-bg text-state-fg',
      )}
    >
      <Dot className="bg-state" />
      {t(`assiduity.${assiduity}`)}
    </Badge>
  );
}
