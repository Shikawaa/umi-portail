'use client';

import { useMemo, useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Search, UserPlus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { PatientTable } from '@/components/patient-table';
import { InvitationsPanel, type PendingSeat } from '@/components/invitations-panel';
import { InviteDialog } from '@/components/invite-dialog';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { deleteSeat, revokeSeat } from '@/actions/invitations';
import type { Assiduity, PatientUsage, SeatStatus } from '@/lib/types';

const ASSIDUITY_OPTIONS: Assiduity[] = ['active', 'idle', 'never', 'paused'];
const STATUS_OPTIONS: SeatStatus[] = ['active', 'released', 'revoked', 'expired'];

type GroupKey = 'engaged' | 'toReengage' | 'released' | 'ended';
const GROUP_ORDER: GroupKey[] = ['engaged', 'toReengage', 'released', 'ended'];

function groupOf(p: PatientUsage): GroupKey {
  if (p.status === 'active') {
    return p.assiduity === 'active' ? 'engaged' : 'toReengage';
  }
  if (p.status === 'released') return 'released';
  return 'ended'; // revoked, expired, paused
}

export function PatientsView({
  patients,
  pending,
}: {
  patients: PatientUsage[];
  pending: PendingSeat[];
}) {
  const t = useTranslations('patients');
  const tCommon = useTranslations('common');
  const tErrors = useTranslations('errors');
  const tBadges = useTranslations('badges');
  const tConfirm = useTranslations('confirmRevokeSeat');
  const tConfirmDelete = useTranslations('confirmDeleteSeat');

  const [search, setSearch] = useState('');
  const [assiduity, setAssiduity] = useState<'all' | Assiduity>('all');
  const [status, setStatus] = useState<'all' | SeatStatus>('all');
  const [revokeTarget, setRevokeTarget] = useState<PatientUsage | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PatientUsage | null>(null);
  const [isPending, startRevoke] = useTransition();
  const [isDeleting, startDelete] = useTransition();

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return patients.filter((p) => {
      if (assiduity !== 'all' && p.assiduity !== assiduity) return false;
      if (status !== 'all' && p.status !== status) return false;
      if (term && !(p.label ?? '').toLowerCase().includes(term)) return false;
      return true;
    });
  }, [patients, assiduity, status, search]);

  const groups = useMemo(() => {
    const map = new Map<GroupKey, PatientUsage[]>();
    for (const p of filtered) {
      const key = groupOf(p);
      const list = map.get(key);
      if (list) list.push(p);
      else map.set(key, [p]);
    }
    return GROUP_ORDER.filter((k) => map.has(k)).map((k) => ({
      key: k,
      rows: map.get(k)!,
    }));
  }, [filtered]);

  const totalCount = patients.length + pending.length;

  function confirmRevoke() {
    if (!revokeTarget) return;
    const seatId = revokeTarget.seat_id;
    startRevoke(async () => {
      const res = await revokeSeat({ seatId });
      if (res.ok) {
        toast.success(t('toast.revoked'));
        setRevokeTarget(null);
      } else {
        toast.error(tErrors(res.error));
      }
    });
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    const seatId = deleteTarget.seat_id;
    startDelete(async () => {
      const res = await deleteSeat({ seatId });
      if (res.ok) {
        toast.success(t('toast.deleted'));
        setDeleteTarget(null);
      } else {
        toast.error(tErrors(res.error));
      }
    });
  }

  const inviteButton = (
    <Button className="h-11 px-5 text-sm gap-2 rounded-xl shadow-xs">
      <UserPlus className="h-4 w-4" />
      {t('invite')}
    </Button>
  );

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">{t('title')}</h2>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">{t('subtitle')}</p>
        </div>
        <InviteDialog trigger={inviteButton} />
      </div>

      {totalCount === 0 ? (
        <EmptyState
          icon={UserPlus}
          title={t('empty.title')}
          description={t('empty.body')}
          action={
            <InviteDialog
              trigger={
                <Button className="h-11 px-5 text-sm gap-2 rounded-xl shadow-xs">
                  <UserPlus className="h-4 w-4" />
                  {t('empty.cta')}
                </Button>
              }
            />
          }
        />
      ) : (
        <>
          {patients.length > 0 ? (
            <>
              <div className="flex flex-wrap items-center gap-3.5">
                <div className="relative min-w-[220px] flex-1">
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="pl-10 h-11 text-sm rounded-xl"
                    placeholder={t('search.placeholder')}
                    aria-label={t('search.placeholder')}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <select
                  className="h-11 rounded-xl border border-input bg-background px-4 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary shadow-2xs cursor-pointer transition-colors"
                  aria-label={t('filters.assiduityLabel')}
                  value={assiduity}
                  onChange={(e) =>
                    setAssiduity(e.target.value as 'all' | Assiduity)
                  }
                >
                  <option value="all">{t('filters.assiduityAll')}</option>
                  {ASSIDUITY_OPTIONS.map((a) => (
                    <option key={a} value={a}>
                      {tBadges(`assiduity.${a}`)}
                    </option>
                  ))}
                </select>
                <select
                  className="h-11 rounded-xl border border-input bg-background px-4 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary shadow-2xs cursor-pointer transition-colors"
                  aria-label={t('filters.statusLabel')}
                  value={status}
                  onChange={(e) =>
                    setStatus(e.target.value as 'all' | SeatStatus)
                  }
                >
                  <option value="all">{t('filters.statusAll')}</option>
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {tBadges(`seat.${s}`)}
                    </option>
                  ))}
                </select>
              </div>

              {filtered.length === 0 ? (
                <div className="rounded-2xl border border-border/80 bg-card px-6 py-14 text-center text-sm text-muted-foreground shadow-2xs">
                  {t('noResults')}
                </div>
              ) : (
                <div className="space-y-8">
                  {groups.map(({ key, rows }) => (
                    <section key={key} className="space-y-3">
                      <div className="flex items-center gap-2.5 px-1">
                        <h3 className="text-base font-bold text-foreground">
                          {t(`groups.${key}`)}
                        </h3>
                        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                          {rows.length}
                        </span>
                      </div>
                      <PatientTable
                        patients={rows}
                        onRevoke={(p) => setRevokeTarget(p)}
                        onDelete={(p) => setDeleteTarget(p)}
                      />
                    </section>
                  ))}
                </div>
              )}
            </>
          ) : null}

          {pending.length > 0 ? <InvitationsPanel pending={pending} /> : null}
        </>
      )}

      <ConfirmDialog
        open={!!revokeTarget}
        onOpenChange={(v) => {
          if (!v) setRevokeTarget(null);
        }}
        title={tConfirm('title')}
        description={tConfirm('body')}
        confirmLabel={tConfirm('confirm')}
        confirmingLabel={tConfirm('confirming')}
        cancelLabel={tConfirm('cancel')}
        onConfirm={confirmRevoke}
        pending={isPending}
        closeLabel={tCommon('close')}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(v) => {
          if (!v) setDeleteTarget(null);
        }}
        title={tConfirmDelete('title')}
        description={tConfirmDelete('body')}
        confirmLabel={tConfirmDelete('confirm')}
        confirmingLabel={tConfirmDelete('confirming')}
        cancelLabel={tConfirmDelete('cancel')}
        onConfirm={confirmDelete}
        pending={isDeleting}
        closeLabel={tCommon('close')}
      />
    </div>
  );
}
