'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { GoalList, GoalListItem } from './GoalList';
import { StrengthsList } from './StrengthsList';
import { SessionSummaryCard as ClientSummaryCard } from './SessionSummaryCard';

export interface PlanOverviewProps {
  planTitle: string;
  status: 'ACTIVE' | 'DRAFT' | 'ARCHIVED';
  goals: GoalListItem[];
  strengths?: string[];
  lastSessionSummary?: string;
  nextSession?: { date: string; focus?: string };
}

const statusConfig: Record<PlanOverviewProps['status'], { label: string; className: string }> = {
  ACTIVE: { label: 'Active Plan', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  DRAFT: { label: 'Draft', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  ARCHIVED: { label: 'Archived', className: 'bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
};

export function PlanOverview({
  planTitle,
  status,
  goals,
  strengths = [],
  lastSessionSummary,
  nextSession,
}: PlanOverviewProps) {
  const statusBadge = statusConfig[status];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <CardTitle className="text-xl">{planTitle}</CardTitle>
            <p className="text-sm text-muted-foreground">Your personalized plan</p>
          </div>
          <Badge variant="outline" className={statusBadge.className}>
            {statusBadge.label}
          </Badge>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-sm text-muted-foreground mb-2">Upcoming session</p>
            {nextSession ? (
              <div className="rounded-lg border p-3">
                <p className="font-medium">{nextSession.date}</p>
                {nextSession.focus && <p className="text-sm text-muted-foreground">Focus: {nextSession.focus}</p>}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No session scheduled</p>
            )}
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-2">Plan at a glance</p>
            <div className="rounded-lg border p-3 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Active goals</span>
                <span className="font-medium">{goals.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Strengths</span>
                <span className="font-medium">{strengths.length || '—'}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Goals</CardTitle>
        </CardHeader>
        <CardContent>
          <GoalList goals={goals} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Strengths</CardTitle>
        </CardHeader>
        <CardContent>
          <StrengthsList strengths={strengths} />
        </CardContent>
      </Card>

      {lastSessionSummary && (
        <Card>
          <CardHeader>
            <CardTitle>Last Session Recap</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ClientSummaryCard
              summary={lastSessionSummary}
              sessionNumber={0}
              generatedAt={null}
              showMeta={false}
            />
            <Separator />
            <p className="text-sm text-muted-foreground">
              Keep building on these insights before your next session.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default PlanOverview;

