import { Link } from '@/i18n/navigation';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { buttonVariants } from '@/components/ui/button';
import { SeatStatusBadge } from '@/components/seat-status-badge';
import { AssiduityBadge } from '@/components/assiduity-badge';
import { EndFollowUpButton } from '@/components/end-followup-button';
import {
  ExerciseCompletionList,
  type ExerciseItem,
} from '@/components/exercise-completion-list';
import { DayActivity } from '@/components/day-activity';
import { PatientStats } from '@/components/patient-stats';
import { RecommendationsCard } from '@/components/recommendations-card';
import { SeatCode } from '@/components/seat-code';
import { buildDailyBuckets } from '@/lib/activity';
import { formatDate, formatRelativeDay } from '@/lib/format';
import type {
  Assiduity,
  PatientSeat,
  PatientUsage,
  Recommendation,
} from '@/lib/types';

const ACTIVITY_DAYS = 14;

export default async function PatientFollowUpPage({
  params: { seatId, locale },
}: {
  params: { seatId: string; locale: string };
}) {
  setRequestLocale(locale);
  const t = await getTranslations('patientDetail');
  const tPatients = await getTranslations('patients');
  const supabase = createClient();

  const [
    { data: seatData },
    { data: { user } },
    { data: usageData },
    { data: exData }
  ] = await Promise.all([
    supabase.from('patient_seats').select('*').eq('id', seatId).maybeSingle(),
    supabase.auth.getUser(),
    supabase.from('v_patient_usage').select('*').eq('seat_id', seatId).maybeSingle(),
    supabase.from('exercises').select('id, titre, titre_en').order('id', { ascending: true })
  ]);

  if (!user || !seatData) notFound();
  const seat = seatData as PatientSeat;
  const usage = usageData as PatientUsage | null;
  const exercises = (exData ?? []) as {
    id: number;
    titre: string | null;
    titre_en: string | null;
  }[];

  // Pick the exercise title in the portal locale, falling back to French when
  // a row has no English translation yet.
  const isEnglish = locale === 'en';
  const exerciseTitle = (e: { titre: string | null; titre_en: string | null }) =>
    (isEnglish ? e.titre_en || e.titre : e.titre)?.trim() || null;

  let completions: { exercise_id: number; completed_at: string }[] = [];
  let recommendations: Recommendation[] = [];
  if (seat.patient_user_id) {
    let compQuery = null;
    if (seat.redeemed_at) {
      // Scope to this seat's follow-up period [redeemed_at, end). RLS enforces
      // the same bound, but scoping here keeps the fiche exact if the patient
      // had several periods with this practitioner.
      const periodEnd = seat.released_at ?? seat.revoked_at;
      let query = supabase
        .from('exercise_completions')
        .select('exercise_id, completed_at')
        .eq('patient_user_id', seat.patient_user_id)
        .gte('completed_at', seat.redeemed_at);
      if (periodEnd) query = query.lt('completed_at', periodEnd);
      compQuery = query.order('completed_at', { ascending: false });
    }
    const [compRes, recRes] = await Promise.all([
      compQuery,
      supabase
        .from('recommendations')
        .select('*')
        .eq('patient_seat_id', seat.id)
        .order('created_at', { ascending: false }),
    ]);
    completions = (compRes?.data ?? []) as {
      exercise_id: number;
      completed_at: string;
    }[];
    recommendations = (recRes.data ?? []) as Recommendation[];
  }

  const byExercise = new Map<number, { count: number; last: string | null }>();
  for (const c of completions) {
    const cur = byExercise.get(c.exercise_id) ?? { count: 0, last: null };
    cur.count += 1;
    if (!cur.last || c.completed_at > cur.last) cur.last = c.completed_at;
    byExercise.set(c.exercise_id, cur);
  }

  const items: ExerciseItem[] = exercises.map((e) => {
    const agg = byExercise.get(e.id);
    return {
      id: e.id,
      title: exerciseTitle(e) ?? `#${e.id}`,
      count: agg?.count ?? 0,
      last: agg?.last ?? null,
    };
  });

  // Recommendations: `exercise_id` is stored as text (mobile convention),
  // resolve titles against the library. Already-recommended exercises are
  // hidden from the picker (unique per patient/practitioner in DB).
  const exerciseById = new Map(exercises.map((e) => [e.id, e]));
  const recommendedItems = recommendations.map((r) => {
    const exercise = exerciseById.get(Number(r.exercise_id));
    return {
      id: r.id,
      title: exercise ? exerciseTitle(exercise) ?? `#${r.exercise_id}` : `#${r.exercise_id}`,
      note: (isEnglish ? r.note_en || r.note : r.note || r.note_en) || null,
      createdAt: r.created_at,
    };
  });
  const recommendedExerciseIds = new Set(
    recommendations.map((r) => Number(r.exercise_id)),
  );
  const recommendableExercises = exercises
    .filter((e) => !recommendedExerciseIds.has(e.id))
    .map((e) => ({ id: e.id, title: exerciseTitle(e) ?? `#${e.id}` }));

  const activityBuckets = buildDailyBuckets(
    completions.map((c) => c.completed_at),
    ACTIVITY_DAYS,
    locale,
    (dateLabel, count) =>
      `${dateLabel} : ${t('activity.completions', { count })}`,
  );
  const activityTotal = activityBuckets.reduce((sum, b) => sum + b.count, 0);

  const label = seat.label || tPatients('row.noLabel');
  const isActive = seat.status === 'active';
  const isEnded =
    seat.status === 'revoked' ||
    seat.status === 'released' ||
    seat.status === 'expired';
  const resumable =
    (seat.status === 'released' || seat.status === 'revoked') &&
    seat.resume_until != null &&
    new Date(seat.resume_until).getTime() > Date.now();
  const totalCompletions = usage?.completions_total ?? 0;
  const assiduity: Assiduity = usage?.assiduity ?? 'never';
  const exploredCount = byExercise.size;
  const activeDays = activityBuckets.filter((b) => b.count > 0).length;
  const lastActivityLabel =
    formatRelativeDay(usage?.last_completed_at, locale) ?? t('stats.none');

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link
        href="/patients"
        className={buttonVariants({
          variant: 'ghost',
          size: 'sm',
          className: '-ml-2',
        })}
      >
        <ArrowLeft className="h-4 w-4" />
        {t('back')}
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-foreground">{label}</h2>
          <div className="flex flex-wrap items-center gap-2">
            <SeatStatusBadge status={seat.status} />
            <AssiduityBadge assiduity={assiduity} />
          </div>
          <p className="text-sm text-muted-foreground">
            {seat.redeemed_at
              ? t('attachedSince', {
                  date: formatDate(seat.redeemed_at, locale) ?? '',
                })
              : t('notAttached')}
          </p>
          {seat.invite_code ? (
            <SeatCode code={seat.invite_code} label={t('code.label')} />
          ) : null}
        </div>
        {isActive ? <EndFollowUpButton seatId={seat.id} /> : null}
      </div>

      {isEnded ? (
        <div className="rounded-lg border border-border bg-muted px-4 py-3 text-sm text-muted-foreground">
          {resumable
            ? t('resumeBanner', {
                date: formatDate(seat.resume_until, locale) ?? '',
              })
            : t('endedBanner')}
        </div>
      ) : null}

      <PatientStats
        done={totalCompletions}
        explored={exploredCount}
        libraryTotal={exercises.length}
        activeDays={activeDays}
        lastActivity={lastActivityLabel}
        labels={{
          done: t('stats.done'),
          explored: t('stats.explored'),
          exploredOf: t('stats.exploredOf', { total: exercises.length }),
          activeDays: t('stats.activeDays'),
          lastActivity: t('stats.lastActivity'),
        }}
      />

      {seat.patient_user_id ? (
        <RecommendationsCard
          seatId={seat.id}
          items={recommendedItems}
          available={recommendableExercises}
        />
      ) : null}

      {isActive && totalCompletions === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card px-4 py-6 text-center text-sm text-muted-foreground">
          {t('neverStarted', { label })}
        </div>
      ) : null}

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('activity.title')}</CardTitle>
            <CardDescription>{t('activity.subtitle')}</CardDescription>
          </CardHeader>
          <CardContent>
            <DayActivity
              buckets={activityBuckets}
              ariaLabel={t('activity.title')}
              showLabels
              emptyLabel={t('activity.empty')}
            />
            {activityTotal > 0 ? (
              <p className="mt-4 border-t border-border pt-3 text-sm text-muted-foreground">
                {t('activity.total', { count: activityTotal })}
              </p>
            ) : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('exercises.title')}</CardTitle>
            <CardDescription>{t('exercises.subtitle')}</CardDescription>
          </CardHeader>
          <CardContent>
            <ExerciseCompletionList items={items} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
