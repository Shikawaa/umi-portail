import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { buttonVariants } from '@/components/ui/button';
import { ResetPasswordForm } from '@/components/auth/reset-password-form';

export default async function ResetPasswordPage() {
  const t = await getTranslations('resetPassword');
  const tForgot = await getTranslations('forgotPassword');
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('title')}</CardTitle>
        <CardDescription>{t('subtitle')}</CardDescription>
      </CardHeader>
      <CardContent>
        {user ? (
          <ResetPasswordForm />
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-destructive">{t('invalidLink')}</p>
            <Link
              href="/forgot-password"
              className={buttonVariants({
                variant: 'outline',
                className: 'w-full',
              })}
            >
              {tForgot('title')}
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
