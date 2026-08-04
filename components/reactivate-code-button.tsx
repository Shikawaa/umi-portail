'use client';

import { useState, useTransition } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { Spinner } from '@/components/ui/spinner';
import { reactivateSeat } from '@/actions/invitations';

/**
 * Reopens the resume window of an ended follow-up, so the patient can link
 * again with the same code and keep their history (same seat).
 * If the code has been reassigned in the meantime, a dialog offers to reissue a
 * new code on that same seat — the fiche and its history are preserved.
 */
export function ReactivateCodeButton({ seatId }: { seatId: string }) {
  const t = useTranslations('patientDetail');
  const tReissue = useTranslations('confirmReissueCode');
  const tCommon = useTranslations('common');
  const tErrors = useTranslations('errors');
  const router = useRouter();
  const [taken, setTaken] = useState(false);
  const [isPending, startTransition] = useTransition();

  function reactivate(newCode: boolean) {
    startTransition(async () => {
      const res = await reactivateSeat({ seatId, newCode });
      if (res.ok) {
        toast.success(newCode ? t('toast.codeReissued') : t('toast.reactivated'));
        setTaken(false);
        router.refresh();
        return;
      }
      // The code has been handed to another patient meanwhile: offer a new one
      // rather than losing this patient's fiche.
      if (res.error === 'codeTaken') {
        setTaken(true);
        return;
      }
      toast.error(tErrors(res.error));
    });
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => reactivate(false)}
        disabled={isPending}
        title={t('code.reactivateHint')}
      >
        {isPending && !taken ? (
          <Spinner />
        ) : (
          <RotateCw className="h-3.5 w-3.5" />
        )}
        {isPending && !taken ? t('code.reactivating') : t('code.reactivate')}
      </Button>

      <ConfirmDialog
        open={taken}
        onOpenChange={(v) => {
          if (!v) setTaken(false);
        }}
        title={tReissue('title')}
        description={tReissue('body')}
        confirmLabel={tReissue('confirm')}
        confirmingLabel={tReissue('confirming')}
        cancelLabel={tReissue('cancel')}
        onConfirm={() => reactivate(true)}
        pending={isPending}
        destructive={false}
        closeLabel={tCommon('close')}
      />
    </>
  );
}
