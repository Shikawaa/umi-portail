'use client';

import { useTranslations } from 'next-intl';
import { Badge, Dot } from '@/components/ui/badge';
import type { SeatStatus } from '@/lib/types';

const STYLES: Record<SeatStatus, { badge: string; dot: string }> = {
  active: {
    badge: 'border-transparent bg-accent text-accent-foreground',
    dot: 'bg-primary',
  },
  invited: {
    badge: 'border-border bg-muted text-muted-foreground',
    dot: 'bg-muted-foreground/60',
  },
  released: {
    badge: 'border-border bg-muted text-muted-foreground',
    dot: 'bg-muted-foreground',
  },
  revoked: {
    badge: 'border-destructive/30 bg-destructive/10 text-destructive',
    dot: 'bg-destructive',
  },
  expired: {
    badge: 'border-border bg-muted text-muted-foreground',
    dot: 'bg-muted-foreground',
  },
  paused: {
    badge: 'border-border bg-muted text-muted-foreground',
    dot: 'bg-muted-foreground/60',
  },
};

export function SeatStatusBadge({ status }: { status: SeatStatus }) {
  const t = useTranslations('badges');
  const style = STYLES[status] ?? STYLES.invited;
  return (
    <Badge className={style.badge}>
      <Dot className={style.dot} />
      {t(`seat.${status}`)}
    </Badge>
  );
}
