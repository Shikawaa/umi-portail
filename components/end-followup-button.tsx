'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { revokeSeat } from '@/actions/invitations';

export function EndFollowUpButton({ seatId }: { seatId: string }) {
  const t = useTranslations('patientDetail');
  const tConfirm = useTranslations('confirmRevokeSeat');
  const tCommon = useTranslations('common');
  const tErrors = useTranslations('errors');
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function onConfirm() {
    startTransition(async () => {
      const res = await revokeSeat({ seatId });
      if (res.ok) {
        toast.success(t('toast.revoked'));
        setOpen(false);
        router.refresh();
      } else {
        toast.error(tErrors(res.error));
      }
    });
  }

  return (
    <>
      <Button variant="destructive" size="sm" onClick={() => setOpen(true)}>
        {t('endFollowUp')}
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={tConfirm('title')}
        description={tConfirm('body')}
        confirmLabel={tConfirm('confirm')}
        confirmingLabel={tConfirm('confirming')}
        cancelLabel={tConfirm('cancel')}
        onConfirm={onConfirm}
        pending={isPending}
        closeLabel={tCommon('close')}
      />
    </>
  );
}
