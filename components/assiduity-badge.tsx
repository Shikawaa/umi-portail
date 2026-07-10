'use client';

import { useTranslations } from 'next-intl';
import { Badge, Dot } from '@/components/ui/badge';
import type { Assiduity } from '@/lib/types';

const STYLES: Record<Assiduity, { badge: string; dot: string }> = {
  active: {
    badge: 'border-transparent bg-accent text-accent-foreground',
    dot: 'bg-primary',
  },
  idle: {
    badge: 'border-border bg-muted text-muted-foreground',
    dot: 'bg-muted-foreground',
  },
  never: {
    badge: 'border-border bg-background text-muted-foreground',
    dot: 'bg-border',
  },
};

export function AssiduityBadge({ assiduity }: { assiduity: Assiduity }) {
  const t = useTranslations('badges');
  const style = STYLES[assiduity] ?? STYLES.never;
  return (
    <Badge className={style.badge}>
      <Dot className={style.dot} />
      {t(`assiduity.${assiduity}`)}
    </Badge>
  );
}
