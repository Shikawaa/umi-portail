'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { updatePassword } from '@/actions/auth';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import type { AppErrorKey } from '@/lib/errors';

export function ResetPasswordForm() {
  const t = useTranslations('resetPassword');
  const tErrors = useTranslations('errors');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [mismatch, setMismatch] = useState(false);
  const [error, setError] = useState<AppErrorKey | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMismatch(false);
    if (password !== confirm) {
      setMismatch(true);
      return;
    }
    startTransition(async () => {
      const res = await updatePassword({ password });
      if (res.ok) setDone(true);
      else setError(res.error);
    });
  }

  if (done) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">{t('success')}</p>
        <Link href="/login" className={buttonVariants({ className: 'w-full' })}>
          {t('goToLogin')}
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div className="space-y-2">
        <Label htmlFor="password">{t('newPasswordLabel')}</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">{t('passwordHint')}</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirm">{t('confirmPasswordLabel')}</Label>
        <Input
          id="confirm"
          type="password"
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
      </div>
      {mismatch ? (
        <p className="text-sm text-destructive" role="alert">
          {t('mismatch')}
        </p>
      ) : null}
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {tErrors(error)}
        </p>
      ) : null}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? <Spinner /> : null}
        {pending ? t('submitting') : t('submit')}
      </Button>
    </form>
  );
}
