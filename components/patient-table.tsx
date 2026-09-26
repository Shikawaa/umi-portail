'use client';

import { Link, useRouter } from '@/i18n/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { MoreHorizontal } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SeatStatusBadge } from '@/components/seat-status-badge';
import { AssiduityBadge } from '@/components/assiduity-badge';
import { formatDate } from '@/lib/format';
import { isResumable } from '@/lib/seats';
import type { PatientUsage } from '@/lib/types';

const DELETABLE_STATUSES = new Set(['released', 'revoked', 'expired']);

export function PatientTable({
  patients,
  onRevoke,
  onDelete,
}: {
  patients: PatientUsage[];
  onRevoke: (patient: PatientUsage) => void;
  onDelete: (patient: PatientUsage) => void;
}) {
  const t = useTranslations('patients');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const router = useRouter();

  return (
    <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-2xs">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>{t('table.label')}</TableHead>
            <TableHead>{t('table.seatStatus')}</TableHead>
            <TableHead>{t('table.assiduity')}</TableHead>
            <TableHead>{t('table.lastActivity')}</TableHead>
            <TableHead className="text-right">{t('table.completions')}</TableHead>
            <TableHead className="w-14">
              <span className="sr-only">{tCommon('actions')}</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {patients.map((p) => {
            const last = formatDate(p.last_completed_at, locale);
            const initials = p.label
              ? p.label.replace(/[^A-Za-z0-9]/g, '').slice(0, 2).toUpperCase() || '?'
              : '?';
            return (
              <TableRow
                key={p.seat_id}
                className="cursor-pointer group"
                onClick={() => router.push(`/patients/${p.seat_id}`)}
              >
                <TableCell className="font-semibold text-foreground">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      {initials}
                    </span>
                    <Link
                      href={`/patients/${p.seat_id}`}
                      className="group-hover:text-primary transition-colors text-sm font-semibold"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {p.label || t('row.noLabel')}
                    </Link>
                  </div>
                </TableCell>
                <TableCell>
                  <SeatStatusBadge status={p.status} resumable={isResumable(p)} />
                </TableCell>
                <TableCell>
                  <AssiduityBadge assiduity={p.assiduity} />
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {last ?? tCommon('none')}
                </TableCell>
                <TableCell className="text-right tabular-nums text-sm font-bold text-foreground">
                  {p.completions_total}
                </TableCell>
                <TableCell
                  className="text-right"
                  onClick={(e) => e.stopPropagation()}
                >
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={tCommon('actions')}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link href={`/patients/${p.seat_id}`}>
                        {t('row.view')}
                      </Link>
                    </DropdownMenuItem>
                    {p.status === 'active' ? (
                      <DropdownMenuItem
                        destructive
                        onSelect={(e) => {
                          e.preventDefault();
                          onRevoke(p);
                        }}
                      >
                        {t('row.revoke')}
                      </DropdownMenuItem>
                    ) : null}
                    {DELETABLE_STATUSES.has(p.status) ? (
                      <DropdownMenuItem
                        destructive
                        onSelect={(e) => {
                          e.preventDefault();
                          onDelete(p);
                        }}
                      >
                        {t('row.delete')}
                      </DropdownMenuItem>
                    ) : null}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  </div>
);
}
