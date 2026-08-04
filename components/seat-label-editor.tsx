'use client';

import { useState, useTransition } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { renameSeat } from '@/actions/invitations';

const MAX_LENGTH = 80;

/**
 * Patient label (title of the fiche) with inline edit. The label is the
 * practitioner's own marker — non-nominative by convention — so it stays
 * editable whatever the seat status (typo fixes on ended follow-ups included).
 */
export function SeatLabelEditor({
  seatId,
  label,
  fallback,
}: {
  seatId: string;
  label: string | null;
  /** Shown when the seat has no label yet ("Sans libellé"). */
  fallback: string;
}) {
  const t = useTranslations('patientDetail');
  const tCommon = useTranslations('common');
  const tErrors = useTranslations('errors');
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(label ?? '');
  const [isPending, startTransition] = useTransition();

  function open() {
    setValue(label ?? '');
    setEditing(true);
  }

  function submit() {
    if (value.trim() === (label ?? '').trim()) {
      setEditing(false);
      return;
    }
    startTransition(async () => {
      const res = await renameSeat({ seatId, label: value });
      if (res.ok) {
        toast.success(t('toast.renamed'));
        setEditing(false);
        router.refresh();
      } else {
        toast.error(tErrors(res.error));
      }
    });
  }

  if (!editing) {
    return (
      <div className="flex items-center gap-1.5">
        <h2 className="text-xl font-semibold text-foreground">
          {label || fallback}
        </h2>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={open}
          aria-label={t('rename.edit')}
          title={t('rename.edit')}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }

  return (
    <form
      className="space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Input
          autoFocus
          value={value}
          maxLength={MAX_LENGTH}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setEditing(false);
          }}
          aria-label={t('rename.label')}
          placeholder={t('rename.placeholder')}
          className="h-9 w-56"
          disabled={isPending}
        />
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? <Spinner /> : null}
          {tCommon('save')}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setEditing(false)}
          disabled={isPending}
        >
          {tCommon('cancel')}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">{t('rename.hint')}</p>
    </form>
  );
}
