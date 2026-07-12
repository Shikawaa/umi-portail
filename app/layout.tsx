import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages, getTranslations } from 'next-intl/server';
import { Toaster } from 'sonner';
import { EnvBadge } from '@/components/env-badge';
import { getAppEnv } from '@/lib/env';
import './globals.css';

// The whole portal is session-driven (cookies) — render dynamically so the
// build never tries to statically evaluate Supabase env vars.
export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('metadata');
  const env = getAppEnv();
  const title = t('title');
  return {
    title: env ? `${env.toUpperCase()} · ${title}` : title,
    description: t('description'),
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
          <Toaster position="top-right" />
        </NextIntlClientProvider>
        <EnvBadge />
      </body>
    </html>
  );
}
