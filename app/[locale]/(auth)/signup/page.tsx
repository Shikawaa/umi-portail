'use client';

import { useState, useTransition } from 'react';
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { signUp } from '@/actions/auth';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Spinner } from '@/components/ui/spinner';
import type { AppErrorKey } from '@/lib/errors';

export default function SignupPage() {
  const t = useTranslations('signup');
  const tErrors = useTranslations('errors');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<AppErrorKey | null>(null);
  const [termsError, setTermsError] = useState(false);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!accepted) {
      setTermsError(true);
      return;
    }
    setTermsError(false);
    startTransition(async () => {
      const res = await signUp({ email, password, firstName, lastName });
      if (res && !res.ok) setError(res.error);
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
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="firstName">{t('firstNameLabel')}</Label>
              <Input
                id="firstName"
                autoComplete="given-name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">{t('lastNameLabel')}</Label>
              <Input
                id="lastName"
                autoComplete="family-name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
          </div>
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
            <Label htmlFor="password">{t('passwordLabel')}</Label>
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

          <div className="flex items-start gap-2">
            <Checkbox
              id="terms"
              className="mt-0.5"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
            />
            <Label htmlFor="terms" className="text-sm font-normal leading-snug">
              {t('terms')}
            </Label>
          </div>
          {termsError ? (
            <p className="text-sm text-destructive" role="alert">
              {t('termsRequired')}
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

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {t('hasAccount')}{' '}
          <Link href="/login" className="text-primary hover:underline">
            {t('loginLink')}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
