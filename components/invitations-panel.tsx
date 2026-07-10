'use client';

import { useState, useTransition } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { ChevronDown, RotateCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { regenerateCode, revokeSeat } from '@/actions/invitations';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';

export interface PendingSeat {
  id: string;
  label: string | null;
  invite_code: string;
  expires_at: string;
}

export function InvitationsPanel({ pending }: { pending: PendingSeat[] }) {
  const t = useTranslations('patients');
  const tCommon = useTranslations('common');
  const tErrors = useTranslations('errors');
  const tConfirm = useTranslations('confirmRevokeInvite');
  const locale = useLocale();

  const [open, setOpen] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [isPending, startTx] = useTransition();
  const [revokeTarget, setRevokeTarget] = useState<PendingSeat | null>(null);

  function regenerate(seat: PendingSeat) {
    setBusyId(seat.id);
    startTx(async () => {
      const res = await regenerateCode({ seatId: seat.id });
      setBusyId(null);
      if (res.ok) toast.success(t('toast.codeRegenerated'));
      else toast.error(tErrors(res.error));
    });
  }

  function confirmRevoke() {
    if (!revokeTarget) return;
    const id = revokeTarget.id;
    setBusyId(id);
    startTx(async () => {
      const res = await revokeSeat({ seatId: id });
      setBusyId(null);
      if (res.ok) {
        toast.success(t('toast.inviteCancelled'));
        setRevokeTarget(null);
      } else {
        toast.error(tErrors(res.error));
      }
    });
  }

  const now = Date.now();

  return (
    <div className="rounded-lg border border-border bg-card">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-foreground"
        aria-expanded={open}
      >
        <span>
          {t('pending.title')} ({pending.length})
        </span>
        <ChevronDown
          className={cn(
            'h-4 w-4 text-muted-foreground transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>
      {open ? (
        <ul className="divide-y divide-border border-t border-border">
          {pending.map((seat) => {
            const expired = new Date(seat.expires_at).getTime() < now;
            const busy = busyId === seat.id && isPending;
            return (
              <li
                key={seat.id}
                className="flex flex-wrap items-center gap-3 px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {seat.label || t('row.noLabel')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t('pending.code')}:{' '}
                    <span className="font-mono text-foreground">
                      {seat.invite_code}
                    </span>
                  </p>
                </div>
                <p
                  className={cn(
                    'text-xs',
                    expired ? 'text-destructive' : 'text-muted-foreground',
                  )}
                >
                  {expired
                    ? t('pending.expired')
                    : t('pending.expiresOn', {
                        date: formatDate(seat.expires_at, locale) ?? '',
                      })}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => regenerate(seat)}
                    disabled={busy}
                  >
                    <RotateCw className="h-3.5 w-3.5" />
                    {t('pending.regenerate')}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setRevokeTarget(seat)}
                    disabled={busy}
                  >
                    <X className="h-3.5 w-3.5" />
                    {t('pending.revoke')}
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}

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
    </div>
  );
}
