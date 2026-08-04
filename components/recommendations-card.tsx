'use client';

import { useState, useTransition } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { toast } from 'sonner';
import { Plus, X } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/ui/spinner';
import { ConfirmDialog } from '@/components/confirm-dialog';
import {
  addRecommendations,
  removeRecommendation,
} from '@/actions/recommendations';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';

export interface RecommendedItem {
  id: string;
  title: string;
  note: string | null;
  createdAt: string;
}

export interface RecommendableExercise {
  id: number;
  title: string;
}

/**
 * "Recommended exercises" card on the patient fiche. Lists the exercises the
 * practitioner recommended to this patient (title, optional note, date) and
 * offers a dashed placeholder that opens a dialog to add some. Several
 * exercises can be picked in one pass (they share the note). Exercises already
 * recommended are hidden from the picker (unique per seat in DB).
 */
export function RecommendationsCard({
  seatId,
  items,
  available,
}: {
  seatId: string;
  items: RecommendedItem[];
  available: RecommendableExercise[];
}) {
  const t = useTranslations('patientDetail.recommendations');
  const tCommon = useTranslations('common');
  const tErrors = useTranslations('errors');
  const locale = useLocale();
  const router = useRouter();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [note, setNote] = useState('');
  const [removeTarget, setRemoveTarget] = useState<RecommendedItem | null>(
    null,
  );
  const [pending, startTransition] = useTransition();
  const [removePending, startRemoveTransition] = useTransition();

  function onDialogOpenChange(next: boolean) {
    setDialogOpen(next);
    if (!next) {
      setSelectedIds([]);
      setNote('');
    }
  }

  function toggle(exerciseId: number) {
    setSelectedIds((prev) =>
      prev.includes(exerciseId)
        ? prev.filter((id) => id !== exerciseId)
        : [...prev, exerciseId],
    );
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (selectedIds.length === 0) return;
    startTransition(async () => {
      const res = await addRecommendations({
        seatId,
        exerciseIds: selectedIds,
        note: note || undefined,
      });
      if (!res.ok) {
        toast.error(tErrors(res.error));
        return;
      }
      toast.success(t('toast.added', { count: selectedIds.length }));
      onDialogOpenChange(false);
      router.refresh();
    });
  }

  function onConfirmRemove() {
    if (!removeTarget) return;
    startRemoveTransition(async () => {
      const res = await removeRecommendation({
        recommendationId: removeTarget.id,
        seatId,
      });
      if (!res.ok) {
        toast.error(tErrors(res.error));
        return;
      }
      toast.success(t('toast.removed'));
      setRemoveTarget(null);
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t('title')}</CardTitle>
        <CardDescription>{t('subtitle')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length > 0 ? (
          <ul className="space-y-2">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex items-start justify-between gap-3 rounded-md border border-border px-3 py-2.5"
              >
                <div className="min-w-0 space-y-0.5">
                  <p className="text-sm font-medium text-foreground">
                    {item.title}
                  </p>
                  {item.note ? (
                    <p className="text-sm text-muted-foreground">
                      {item.note}
                    </p>
                  ) : null}
                  <p className="text-xs text-muted-foreground">
                    {t('addedOn', {
                      date: formatDate(item.createdAt, locale) ?? '',
                    })}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setRemoveTarget(item)}
                  className="rounded-sm p-1 text-muted-foreground transition-colors hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">{t('remove')}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        {available.length > 0 ? (
          <button
            type="button"
            onClick={() => setDialogOpen(true)}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-card px-4 py-4 text-sm text-muted-foreground transition-colors hover:border-ring hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <Plus className="h-4 w-4" />
            {t('addPlaceholder')}
          </button>
        ) : (
          <p className="text-center text-sm text-muted-foreground">
            {t('allAdded')}
          </p>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={onDialogOpenChange}>
        <DialogContent closeLabel={tCommon('close')}>
          <form onSubmit={onSubmit} className="space-y-4">
            <DialogHeader>
              <DialogTitle>{t('dialog.title')}</DialogTitle>
              <DialogDescription>{t('dialog.description')}</DialogDescription>
            </DialogHeader>
            <fieldset className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <legend className="text-sm font-medium text-foreground">
                  {t('dialog.exerciseLabel')}
                </legend>
                {selectedIds.length > 0 ? (
                  <span className="text-xs text-muted-foreground">
                    {t('dialog.selectedCount', { count: selectedIds.length })}
                  </span>
                ) : null}
              </div>
              <div className="max-h-60 space-y-1 overflow-y-auto rounded-md border border-input p-1">
                {available.map((exercise) => (
                  <label
                    key={exercise.id}
                    className={cn(
                      'flex cursor-pointer items-center gap-2.5 rounded-sm px-3 py-2 text-sm transition-colors',
                      selectedIds.includes(exercise.id)
                        ? 'bg-muted font-medium text-foreground'
                        : 'text-foreground hover:bg-muted',
                    )}
                  >
                    <Checkbox
                      checked={selectedIds.includes(exercise.id)}
                      onChange={() => toggle(exercise.id)}
                    />
                    {exercise.title}
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="recommend-note">{t('dialog.noteLabel')}</Label>
                <span className="text-xs text-muted-foreground">
                  {tCommon('optional')}
                </span>
              </div>
              <Textarea
                id="recommend-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={t('dialog.notePlaceholder')}
              />
              {/* One note for the whole batch: say so before they submit. */}
              {selectedIds.length > 1 ? (
                <p className="text-xs text-muted-foreground">
                  {t('dialog.noteShared')}
                </p>
              ) : null}
            </div>
            <DialogFooter>
              <Button
                type="submit"
                disabled={pending || selectedIds.length === 0}
              >
                {pending ? <Spinner /> : null}
                {pending ? t('dialog.submitting') : t('dialog.submit')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={removeTarget != null}
        onOpenChange={(next) => {
          if (!next) setRemoveTarget(null);
        }}
        title={t('confirmRemove.title')}
        description={t('confirmRemove.body')}
        confirmLabel={t('confirmRemove.confirm')}
        confirmingLabel={t('confirmRemove.confirming')}
        cancelLabel={t('confirmRemove.cancel')}
        onConfirm={onConfirmRemove}
        pending={removePending}
        closeLabel={tCommon('close')}
      />
    </Card>
  );
}
