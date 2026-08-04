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
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead>{t('table.label')}</TableHead>
          <TableHead>{t('table.seatStatus')}</TableHead>
          <TableHead>{t('table.assiduity')}</TableHead>
          <TableHead>{t('table.lastActivity')}</TableHead>
          <TableHead className="text-right">{t('table.completions')}</TableHead>
          <TableHead className="w-12">
            <span className="sr-only">{tCommon('actions')}</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {patients.map((p) => {
          const last = formatDate(p.last_completed_at, locale);
          return (
            <TableRow
              key={p.seat_id}
              className="cursor-pointer"
              onClick={() => router.push(`/patients/${p.seat_id}`)}
            >
              <TableCell className="font-medium text-foreground">
                <Link
                  href={`/patients/${p.seat_id}`}
                  className="hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  {p.label || t('row.noLabel')}
                </Link>
              </TableCell>
              <TableCell>
                <SeatStatusBadge status={p.status} resumable={isResumable(p)} />
              </TableCell>
              <TableCell>
                <AssiduityBadge assiduity={p.assiduity} />
              </TableCell>
              <TableCell className="text-muted-foreground">
                {last ?? tCommon('none')}
              </TableCell>
              <TableCell className="text-right tabular-nums text-foreground">
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
  );
}
