'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { requestPasswordReset } from '@/actions/auth';
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

export default function ForgotPasswordPage() {
  const t = useTranslations('forgotPassword');
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      await requestPasswordReset({ email });
      setSent(true);
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('title')}</CardTitle>
        <CardDescription>{t('subtitle')}</CardDescription>
      </CardHeader>
      <CardContent>
        {sent ? (
          <p className="text-sm text-muted-foreground">{t('sent')}</p>
        ) : (
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
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? <Spinner /> : null}
              {pending ? t('submitting') : t('submit')}
            </Button>
          </form>
        )}
        <Link
          href="/login"
          className="mt-6 block text-center text-sm text-primary hover:underline"
        >
          {t('backToLogin')}
        </Link>
      </CardContent>
    </Card>
  );
}
