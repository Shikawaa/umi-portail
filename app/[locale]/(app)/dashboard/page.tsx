import { Link } from '@/i18n/navigation';
import { Activity, ChevronRight, Hourglass, Moon, UserPlus, Users } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { createClient, getCachedUser, getCachedPractitioner } from '@/lib/supabase/server';
import { SummaryTile } from '@/components/summary-tile';
import { InviteDialog } from '@/components/invite-dialog';
import { LineSparkline } from '@/components/line-sparkline';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { buildDailyBuckets } from '@/lib/activity';
import { formatRelativeDay } from '@/lib/format';
import type { PatientUsage } from '@/lib/types';

const RECENT_WINDOW_DAYS = 7;

/** Non-nominative initials from a seat label (labels are already anonymised). */
function initialsOf(label: string | null): string {
  const s = (label ?? '').trim();
  if (!s) return '?';
  const parts = s.split(/\s+/).filter(Boolean);
  const chars =
    parts.length >= 2
      ? parts[0][0] + parts[1][0]
      : s.replace(/[^A-Za-z0-9]/g, '').slice(0, 2) || s.slice(0, 2);
  return chars.toUpperCase();
}

export default async function DashboardPage({ params: { locale } }: { params: { locale: string } }) {
  setRequestLocale(locale);
  const t = await getTranslations('dashboard');
  const tPatients = await getTranslations('patients');
  const supabase = createClient();

  const [practitioner, { data: usageData, error }] = await Promise.all([
    getCachedPractitioner(),
    supabase.from('v_patient_usage').select('*'),
  ]);
  if (error) throw new Error(error.message);

  const usage = (usageData ?? []) as PatientUsage[];
  const attached = usage.filter((u) => u.status === 'active');
  const activeCount = attached.filter((u) => u.assiduity === 'active').length;
  const idleCount = attached.filter((u) => u.assiduity === 'idle').length;
  const pendingCount = usage.filter((u) => u.status === 'invited').length;

  const recent = attached
    .filter((u) => u.completions_7d > 0)
    .sort((a, b) =>
      (b.last_completed_at ?? '').localeCompare(a.last_completed_at ?? ''),
    )
    .slice(0, 5);

  const hasAny = usage.length > 0;
  const firstName = practitioner?.first_name?.trim();
  const noLabel = tPatients('row.noLabel');

  // Per-patient daily completions over the recent window, for the mini charts.
  const recentIds = recent
    .map((u) => u.patient_user_id)
    .filter((id): id is string => Boolean(id));

  const completionsByPatient = new Map<string, string[]>();
  if (recentIds.length > 0) {
    const since = new Date(
      Date.now() - RECENT_WINDOW_DAYS * 24 * 60 * 60 * 1000,
    ).toISOString();
    const { data: comps } = await supabase
      .from('exercise_completions')
      .select('patient_user_id, completed_at')
      .in('patient_user_id', recentIds)
      .gte('completed_at', since);
    for (const id of recentIds) completionsByPatient.set(id, []);
    for (const c of (comps ?? []) as {
      patient_user_id: string;
      completed_at: string;
    }[]) {
      completionsByPatient.get(c.patient_user_id)?.push(c.completed_at);
    }
  }

  const recentRows = recent.map((u) => {
    const buckets = buildDailyBuckets(
      u.patient_user_id
        ? (completionsByPatient.get(u.patient_user_id) ?? [])
        : [],
      RECENT_WINDOW_DAYS,
      locale,
      (dateLabel, count) =>
        `${dateLabel} : ${t('recentActivity.completions', { count })}`,
    );
    return {
      seatId: u.seat_id,
      label: u.label || noLabel,
      initials: initialsOf(u.label),
      lastActivity: formatRelativeDay(u.last_completed_at, locale),
      count: u.completions_7d,
      values: buckets.map((b) => b.count),
      titles: buckets.map((b) => b.title),
    };
  });

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            {firstName ? t('greeting', { name: firstName }) : t('greetingNoName')}
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">{t('subtitle')}</p>
        </div>
        <InviteDialog
          trigger={
            <Button className="h-11 px-5 text-sm gap-2 rounded-xl shadow-xs">
              <UserPlus className="h-4 w-4" />
              {t('invite')}
            </Button>
          }
        />
      </div>

      {!hasAny ? (
        <EmptyState
          icon={UserPlus}
          title={t('empty.title')}
          description={t('empty.body')}
          action={
            <InviteDialog
              trigger={
                <Button className="h-11 px-5 text-sm gap-2 rounded-xl shadow-xs">
                  <UserPlus className="h-4 w-4" />
                  {t('empty.cta')}
                </Button>
              }
            />
          }
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryTile
              icon={Users}
              label={t('tiles.attached')}
              value={attached.length}
            />
            <SummaryTile
              icon={Activity}
              label={t('tiles.active')}
              value={activeCount}
            />
            <SummaryTile icon={Moon} label={t('tiles.idle')} value={idleCount} />
            <SummaryTile
              icon={Hourglass}
              label={t('tiles.pending')}
              value={pendingCount}
            />
          </div>

          <Card className="rounded-2xl border border-border/80 shadow-2xs overflow-hidden">
            <CardHeader className="p-6 pb-4">
              <CardTitle className="text-lg font-bold text-foreground">
                {t('recentActivity.title')}
              </CardTitle>
              <CardDescription className="text-sm text-muted-foreground">{t('recentActivity.subtitle')}</CardDescription>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              {recentRows.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">
                  {t('recentActivity.empty')}
                </p>
              ) : (
                <ul className="divide-y divide-border/70">
                  {recentRows.map((r) => (
                    <li key={r.seatId}>
                      <Link
                        href={`/patients/${r.seatId}`}
                        className="-mx-3 flex items-center gap-4 rounded-xl px-4 py-4 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
                      >
                        <span
                          aria-hidden="true"
                          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary"
                        >
                          {r.initials}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-base font-semibold text-foreground">
                            {r.label}
                          </span>
                          {r.lastActivity ? (
                            <span className="block truncate text-xs text-muted-foreground mt-0.5">
                              {r.lastActivity}
                            </span>
                          ) : null}
                        </span>
                        <div className="hidden w-32 shrink-0 sm:block">
                          <LineSparkline
                            values={r.values}
                            titles={r.titles}
                            ariaLabel={t('recentActivity.ariaLabel')}
                          />
                        </div>
                        <span className="w-20 shrink-0 text-right">
                          <span className="block text-xl font-bold tabular-nums text-foreground">
                            {r.count}
                          </span>
                          <span className="block text-xs text-muted-foreground">
                            {t('recentActivity.unit')}
                          </span>
                        </span>
                        <ChevronRight
                          aria-hidden="true"
                          className="h-5 w-5 shrink-0 text-muted-foreground/60"
                        />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
