import * as React from 'react';
import { CalendarDays, CheckCircle2, Clock, Compass } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { ProgressRing } from '@/components/progress-ring';

function Tile({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <Card className="p-6 rounded-2xl border border-border/80 shadow-2xs hover:shadow-xs hover:border-gray-300 transition-all">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        <div className="w-9 h-9 rounded-xl bg-muted/60 flex items-center justify-center text-muted-foreground shrink-0">
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="mt-3">{children}</div>
    </Card>
  );
}

/**
 * Stat tiles of the patient fiche. Deliberately white: the engagement color is
 * carried by the summary card above them, not by the tiles. One tile uses a
 * progress ring to show library coverage (distinct exercises explored / total)
 * — the ring itself follows the engagement color.
 * No score, no clinical content — engagement metadata only.
 */
export function PatientStats({
  done,
  explored,
  libraryTotal,
  activeDays,
  lastActivity,
  labels,
}: {
  done: number;
  explored: number;
  libraryTotal: number;
  activeDays: number;
  lastActivity: string;
  labels: {
    done: string;
    explored: string;
    exploredOf: string;
    activeDays: string;
    lastActivity: string;
  };
}) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <Tile label={labels.done} icon={CheckCircle2}>
        <p className="text-3xl font-bold tabular-nums text-foreground tracking-tight">
          {done}
        </p>
      </Tile>

      <Card className="p-6 rounded-2xl border border-border/80 shadow-2xs hover:shadow-xs hover:border-gray-300 transition-all">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium text-muted-foreground">
            {labels.explored}
          </span>
          <div className="w-9 h-9 rounded-xl bg-muted/60 flex items-center justify-center text-muted-foreground shrink-0">
            <Compass className="h-5 w-5" />
          </div>
        </div>
        <div className="mt-3 flex items-center gap-3.5">
          <ProgressRing value={explored} total={libraryTotal} />
          <span className="text-sm font-medium text-muted-foreground">
            {labels.exploredOf}
          </span>
        </div>
      </Card>

      <Tile label={labels.activeDays} icon={CalendarDays}>
        <p className="text-3xl font-bold tabular-nums text-foreground tracking-tight">
          {activeDays}
        </p>
      </Tile>

      <Tile label={labels.lastActivity} icon={Clock}>
        <p className="text-xl font-bold text-foreground">{lastActivity}</p>
      </Tile>
    </div>
  );
}
