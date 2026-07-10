'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
      <div className="flex h-16 items-center px-6 text-lg font-semibold text-primary">
        {tCommon('appName')}
      </div>
      <nav className="flex flex-1 flex-col gap-1 px-3">
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
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                active
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              <Icon className="h-4 w-4" />
              {t(item.key)}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-border p-3">
        <AccountMenu
          name={fullName}
          email={email}
          practitionerNumber={practitioner.practitioner_number}
        />
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="hidden w-64 shrink-0 border-r border-border bg-card lg:block">
        {sidebarInner}
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <aside className="absolute left-0 top-0 h-full w-64 border-r border-border bg-card">
            {sidebarInner}
          </aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border bg-background px-4 lg:px-6">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label={tCommon('openMenu')}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <h1 className="text-base font-semibold text-foreground">
              {t(activeKey)}
            </h1>
          </div>
          <div className="flex items-center gap-1">
            <LanguageSwitcher />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto bg-muted/30 px-4 py-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
