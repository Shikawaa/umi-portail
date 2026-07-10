'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { LanguageSwitcher } from '@/components/language-switcher';
import { updateProfile, sendMyPasswordReset } from '@/actions/settings';

export function SettingsView({
  firstName,
  lastName,
  email,
  practitionerNumber,
}: {
  firstName: string;
  lastName: string;
  email: string;
  practitionerNumber: number | null;
}) {
  const t = useTranslations('settings');
  const tErrors = useTranslations('errors');
  const [first, setFirst] = useState(firstName);
  const [last, setLast] = useState(lastName);
  const [savingProfile, startSaveProfile] = useTransition();
  const [sendingReset, startReset] = useTransition();

  function onSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    startSaveProfile(async () => {
      const res = await updateProfile({ firstName: first, lastName: last });
      if (res.ok) toast.success(t('profile.saved'));
      else toast.error(tErrors(res.error));
    });
  }

  function onResetPassword() {
    startReset(async () => {
      const res = await sendMyPasswordReset();
      if (res.ok) toast.success(t('account.resetPasswordSent'));
      else toast.error(tErrors(res.error));
    });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">{t('title')}</h2>
        <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('profile.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSaveProfile} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="first">{t('profile.firstNameLabel')}</Label>
                <Input
                  id="first"
                  value={first}
                  onChange={(e) => setFirst(e.target.value)}
                  autoComplete="given-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last">{t('profile.lastNameLabel')}</Label>
                <Input
                  id="last"
                  value={last}
                  onChange={(e) => setLast(e.target.value)}
                  autoComplete="family-name"
                />
              </div>
            </div>
            <Button type="submit" disabled={savingProfile}>
              {savingProfile ? <Spinner /> : null}
              {savingProfile ? t('profile.saving') : t('profile.save')}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('account.title')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">{t('account.emailLabel')}</Label>
            <Input id="email" value={email} readOnly disabled />
          </div>
          <div className="space-y-2">
            <Label htmlFor="practitioner-number">
              {t('account.practitionerNumberLabel')}
            </Label>
            <Input
              id="practitioner-number"
              value={practitionerNumber != null ? `#${practitionerNumber}` : ''}
              readOnly
              disabled
            />
          </div>
          <Button
            variant="outline"
            onClick={onResetPassword}
            disabled={sendingReset}
          >
            {sendingReset ? <Spinner /> : null}
            {sendingReset
              ? t('account.resetPasswordSending')
              : t('account.resetPassword')}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('language.title')}</CardTitle>
          <CardDescription>{t('language.subtitle')}</CardDescription>
        </CardHeader>
        <CardContent>
          <LanguageSwitcher withLabel />
        </CardContent>
      </Card>

      <Card className="opacity-70">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">
              {t('subscription.title')}
            </CardTitle>
            <Badge className="border-border bg-muted text-muted-foreground">
              {t('subscription.badge')}
            </Badge>
          </div>
          <CardDescription>{t('subscription.body')}</CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
