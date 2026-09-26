import * as React from 'react';
import { Card } from '@/components/ui/card';

export function SummaryTile({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
}) {
  return (
    <Card className="p-6 rounded-2xl border border-border/80 shadow-2xs hover:shadow-xs hover:border-gray-300 transition-all">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
          <Icon className="h-5 w-5 stroke-[2]" />
        </div>
      </div>
      <p className="mt-3 text-3xl font-bold tabular-nums text-foreground tracking-tight">
        {value}
      </p>
    </Card>
  );
}
