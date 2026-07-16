'use client';

import { useState, useTransition } from 'react';
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { signIn, resendConfirmation } from '@/actions/auth';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import type { AppErrorKey } from '@/lib/errors';

export default function LoginPage() {
  const t = useTranslations('login');
  const tErrors = useTranslations('errors');
  const tVerify = useTranslations('verifyEmail');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<AppErrorKey | null>(null);
  const [resent, setResent] = useState(false);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResent(false);
    startTransition(async () => {
      const res = await signIn({ email, password });
      if (res && !res.ok) setError(res.error);
    });
  }

  function onResend() {
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
        <CardDescription>{t('subtitle')}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="email">{t('emailLabel')}</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">{t('passwordLabel')}</Label>
              <Link
                href="/forgot-password"
                className="text-xs text-primary hover:underline"
              >
                {t('forgotPassword')}
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {tErrors(error)}
            </p>
          ) : null}

          {error === 'emailNotConfirmed' && !resent ? (
            <Button
              type="button"
              variant="link"
              className="h-auto p-0 text-xs"
              onClick={onResend}
              disabled={pending || !email}
            >
              {t('resendConfirmation')}
            </Button>
          ) : null}
          {resent ? (
            <p className="text-sm text-muted-foreground">{tVerify('resent')}</p>
          ) : null}

          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? <Spinner /> : null}
            {pending ? t('submitting') : t('submit')}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {t('noAccount')}{' '}
          <Link href="/signup" className="text-primary hover:underline">
            {t('signupLink')}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
