'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { HomeworkCheckbox } from './HomeworkCheckbox';
import { Calendar, Info } from 'lucide-react';

export interface HomeworkCardProps {
  id: string;
  title: string;
  description: string;
  dueDate?: string | null;
  status: 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED';
  onToggleComplete?: (id: string, completed: boolean) => void;
}

const statusConfig: Record<HomeworkCardProps['status'], { label: string; className: string }> = {
  ASSIGNED: { label: 'Assigned', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  IN_PROGRESS: { label: 'In Progress', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  COMPLETED: { label: 'Completed', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' },
  SKIPPED: { label: 'Skipped', className: 'bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
};

export function HomeworkCard({ id, title, description, dueDate, status, onToggleComplete }: HomeworkCardProps) {
  const completed = status === 'COMPLETED';
  const badge = statusConfig[status];

  return (
    <Card className="h-full">
      <CardHeader className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">{title}</CardTitle>
          <Badge variant="outline" className={badge.className}>
            {badge.label}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {dueDate && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>Due {dueDate}</span>
          </div>
        )}
        <HomeworkCheckbox
          checked={completed}
          onChange={(checked) => onToggleComplete?.(id, checked)}
          label={completed ? 'Completed' : 'Mark as done'}
        />
        <div className="flex items-start gap-2 text-xs text-muted-foreground">
          <Info className="h-3.5 w-3.5 mt-0.5" />
          <span>
            If you can’t complete this item, that’s okay—chat with your therapist next session to adjust the plan.
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

export default HomeworkCard;

