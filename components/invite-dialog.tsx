'use client';

import { useState, useTransition } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Spinner } from '@/components/ui/spinner';
import { InviteCodeCard } from '@/components/invite-code-card';
import { createInvitation, type CreateInvitationData } from '@/actions/invitations';
import { formatDate } from '@/lib/format';
import type { AppErrorKey } from '@/lib/errors';

export function InviteDialog({ trigger }: { trigger: React.ReactNode }) {
  const t = useTranslations('invite');
  const tCommon = useTranslations('common');
  const tErrors = useTranslations('errors');
  const locale = useLocale();

  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState('');
  const [email, setEmail] = useState('');
  const [sendEmail, setSendEmail] = useState(false);
  const [result, setResult] = useState<CreateInvitationData | null>(null);
  const [error, setError] = useState<AppErrorKey | null>(null);
  const [pending, startTransition] = useTransition();

  function reset() {
    setLabel('');
    setEmail('');
    setSendEmail(false);
    setResult(null);
    setError(null);
  }

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setTimeout(reset, 150);
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await createInvitation({
        label,
        email: email || undefined,
        sendEmail: sendEmail && !!email,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setResult(res.data);
      if (res.data.emailStatus === 'failed') {
        toast.error(t('success.emailFailed'));
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent closeLabel={tCommon('close')}>
        {result ? (
          <div className="space-y-4">
            <DialogHeader>
              <DialogTitle>{t('success.title')}</DialogTitle>
              <DialogDescription>{t('success.instructions')}</DialogDescription>
            </DialogHeader>
            <InviteCodeCard code={result.seat.invite_code} />
            <p className="text-sm text-muted-foreground">
              {t('success.expiresOn', {
                date: formatDate(result.seat.expires_at, locale) ?? '',
              })}
            </p>
            {result.emailStatus === 'sent' && email ? (
              <p className="text-sm text-muted-foreground">
                {t('success.emailSent', { email })}
              </p>
            ) : null}
            {result.emailStatus === 'failed' ? (
              <p className="text-sm text-destructive">
                {t('success.emailFailed')}
              </p>
            ) : null}
            <DialogFooter>
              <Button variant="outline" onClick={reset}>
                {t('success.inviteAnother')}
              </Button>
              <Button onClick={() => onOpenChange(false)}>
                {t('success.done')}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <DialogHeader>
              <DialogTitle>{t('title')}</DialogTitle>
              <DialogDescription>{t('description')}</DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="invite-label">{t('labelLabel')}</Label>
              <Input
                id="invite-label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                autoFocus
              />
              <p className="text-xs text-muted-foreground">{t('labelHint')}</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="invite-email">{t('emailLabel')}</Label>
                <span className="text-xs text-muted-foreground">
                  {tCommon('optional')}
                </span>
              </div>
              <Input
                id="invite-email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (!e.target.value) setSendEmail(false);
                }}
              />
            </div>
            <div className="flex items-start gap-2">
              <Checkbox
                id="invite-send"
                className="mt-0.5"
                checked={sendEmail}
                disabled={!email}
                onChange={(e) => setSendEmail(e.target.checked)}
              />
              <div className="space-y-0.5">
                <Label htmlFor="invite-send" className="text-sm font-normal">
                  {t('sendEmail')}
                </Label>
                {!email ? (
                  <p className="text-xs text-muted-foreground">
                    {t('sendEmailHint')}
                  </p>
                ) : null}
              </div>
            </div>
            {error ? (
              <p className="text-sm text-destructive" role="alert">
                {tErrors(error)}
              </p>
            ) : null}
            <DialogFooter>
              <Button type="submit" disabled={pending}>
                {pending ? <Spinner /> : null}
                {pending ? t('submitting') : t('submit')}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
