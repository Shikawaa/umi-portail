'use client';

import { useState, useTransition } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { ChevronDown, RotateCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { deleteSeat, regenerateCode } from '@/actions/invitations';
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

  // A code that was never redeemed carries no history: cancelling deletes the
  // seat outright (and frees the code) instead of leaving a `revoked` row.
  function confirmRevoke() {
    if (!revokeTarget) return;
    const id = revokeTarget.id;
    setBusyId(id);
    startTx(async () => {
      const res = await deleteSeat({ seatId: id });
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
    <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-2xs">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-5 py-4 text-base font-semibold text-foreground hover:bg-muted/30 transition-colors"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2.5">
          <span>{t('pending.title')}</span>
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-accent text-accent-foreground">
            {pending.length}
          </span>
        </span>
        <ChevronDown
          className={cn(
            'h-4 w-4 text-muted-foreground transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>
      {open ? (
        <ul className="divide-y divide-border/70 border-t border-border/70">
          {pending.map((seat) => {
            const expired = new Date(seat.expires_at).getTime() < now;
            const busy = busyId === seat.id && isPending;
            return (
              <li
                key={seat.id}
                className="flex flex-wrap items-center justify-between gap-4 px-5 py-4 hover:bg-muted/20 transition-colors"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="truncate text-base font-semibold text-foreground">
                    {seat.label || t('row.noLabel')}
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center gap-2">
                    <span>{t('pending.code')}:</span>
                    <span className="font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md text-xs">
                      {seat.invite_code}
                    </span>
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <p
                    className={cn(
                      'text-xs',
                      expired ? 'text-destructive font-medium' : 'text-muted-foreground',
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
                      className="h-8.5 text-xs gap-1.5"
                    >
                      <RotateCw className="h-3.5 w-3.5" />
                      {t('pending.regenerate')}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setRevokeTarget(seat)}
                      disabled={busy}
                      className="h-8.5 text-xs text-muted-foreground hover:text-destructive gap-1"
                    >
                      <X className="h-3.5 w-3.5" />
                      {t('pending.revoke')}
                    </Button>
                  </div>
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
