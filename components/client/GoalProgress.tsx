'use client';

import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

export interface GoalProgressProps {
  label: string;
  value: number; // 0 - 100
  status?: 'on_track' | 'behind' | 'blocked';
}

const statusConfig: Record<NonNullable<GoalProgressProps['status']>, { label: string; className: string }> = {
  on_track: { label: 'On Track', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  behind: { label: 'Behind', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  blocked: { label: 'Blocked', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
};

export function GoalProgress({ label, value, status }: GoalProgressProps) {
  const badge = status ? statusConfig[status] : null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="font-medium">{label}</span>
        <div className="flex items-center gap-2">
          {badge && (
            <Badge variant="outline" className={badge.className}>
              {badge.label}
            </Badge>
          )}
          <span className="text-muted-foreground">{value}%</span>
        </div>
      </div>
      <Progress value={value} className="h-2" />
    </div>
  );
}

export default GoalProgress;

