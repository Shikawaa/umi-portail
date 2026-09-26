'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Link, usePathname } from '@/i18n/navigation';
import { LayoutDashboard, Menu, Settings, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { LanguageSwitcher } from '@/components/language-switcher';
import { AccountMenu } from '@/components/account-menu';
import type { Practitioner } from '@/lib/types';

type NavKey = 'dashboard' | 'patients' | 'settings';

const NAV: { href: string; key: NavKey; icon: typeof Users }[] = [
  { href: '/dashboard', key: 'dashboard', icon: LayoutDashboard },
  { href: '/patients', key: 'patients', icon: Users },
  { href: '/settings', key: 'settings', icon: Settings },
];

function activeKeyFor(pathname: string): NavKey {
  if (pathname.startsWith('/patients')) return 'patients';
  if (pathname.startsWith('/settings')) return 'settings';
  return 'dashboard';
}

export function AppShell({
  practitioner,
  email,
  children,
}: {
  practitioner: Practitioner;
  email: string;
  children: React.ReactNode;
}) {
  const t = useTranslations('nav');
  const tCommon = useTranslations('common');
  const pathname = usePathname();
  const activeKey = activeKeyFor(pathname);
  const [mobileOpen, setMobileOpen] = useState(false);

  const fullName = [practitioner.first_name, practitioner.last_name]
    .filter(Boolean)
    .join(' ');

  const sidebarInner = (
    <div className="flex h-full flex-col">
      <div className="flex h-[72px] shrink-0 items-center px-6 border-b border-border/80">
        <Link href="/dashboard" className="flex items-center gap-3 hover:opacity-85 transition-opacity">
          <Image src="/logo.png" alt={tCommon('appName')} width={40} height={40} />
          <span className="font-bold text-lg tracking-tight text-foreground">{tCommon('appName')}</span>
        </Link>
      </div>
      <nav className="flex flex-1 flex-col gap-1.5 px-4 py-6">
        {NAV.map((item) => {
          const Icon = item.icon;
          const active = activeKey === item.key;
          return (
            <Link
              key={item.key}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex items-center gap-3.5 rounded-xl px-4 py-3 text-sm font-semibold transition-all',
                active
                  ? 'bg-primary/10 text-primary shadow-2xs font-bold'
                  : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground',
              )}
            >
              <Icon className="h-5 w-5" />
              {t(item.key)}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-border/80 p-4">
        <AccountMenu
          name={fullName}
          email={email}
          practitionerNumber={practitioner.practitioner_number}
        />
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <aside className="hidden w-[280px] shrink-0 border-r border-border/80 bg-card lg:block">
        {sidebarInner}
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <aside className="absolute left-0 top-0 h-full w-[280px] border-r border-border bg-card">
            {sidebarInner}
          </aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-[72px] shrink-0 items-center justify-between gap-4 border-b border-border/80 bg-background px-6 lg:px-10">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label={tCommon('openMenu')}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold text-foreground">
              {t(activeKey)}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto bg-muted/20 px-6 py-8 lg:px-10 lg:py-10">
          {children}
        </main>
      </div>
    </div>
  );
}
