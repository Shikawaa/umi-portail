'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { resendConfirmation } from '@/actions/auth';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import type { AppErrorKey } from '@/lib/errors';

export default function VerifyEmailPage() {
  const t = useTranslations('verifyEmail');
  const tLogin = useTranslations('login');
  const tErrors = useTranslations('errors');
  const [email, setEmail] = useState('');
  const [resent, setResent] = useState(false);
  const [error, setError] = useState<AppErrorKey | null>(null);
  const [pending, startTransition] = useTransition();

  function onResend(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResent(false);
    startTransition(async () => {
      const res = await resendConfirmation({ email });
      if (res.ok) setResent(true);
      else setError(res.error);
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('title')}</CardTitle>
        <CardDescription>{t('body')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <form onSubmit={onResend} className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="email">{tLogin('emailLabel')}</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {tErrors(error)}
            </p>
          ) : null}
          {resent ? (
            <p className="text-sm text-muted-foreground">{t('resent')}</p>
          ) : null}
          <Button
            type="submit"
            variant="outline"
            className="w-full"
            disabled={pending || !email}
          >
            {pending ? <Spinner /> : null}
            {pending ? t('resending') : t('resend')}
          </Button>
        </form>
        <Link href="/login" className={buttonVariants({ className: 'w-full' })}>
          {t('backToLogin')}
        </Link>
      </CardContent>
    </Card>
  );
}
