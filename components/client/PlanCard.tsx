'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Calendar, FileText, TrendingUp } from 'lucide-react';

export interface PlanCardProps {
  planId: string;
  title: string;
  status: 'ACTIVE' | 'DRAFT' | 'ARCHIVED';
  lastUpdated?: string;
  progress?: number;
  summary?: string;
  showActions?: boolean;
}

const statusConfig: Record<PlanCardProps['status'], { label: string; className: string }> = {
  ACTIVE: { label: 'Active', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  DRAFT: { label: 'Draft', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  ARCHIVED: { label: 'Archived', className: 'bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
};

export function PlanCard({
  planId,
  title,
  status,
  lastUpdated,
  progress,
  summary,
  showActions = true,
}: PlanCardProps) {
  const statusBadge = statusConfig[status];

  return (
    <Card className="h-full">
      <CardHeader className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">{title}</CardTitle>
          <Badge variant="outline" className={statusBadge.className}>
            {statusBadge.label}
          </Badge>
        </div>
        {summary && <p className="text-sm text-muted-foreground line-clamp-3">{summary}</p>}
      </CardHeader>
      <CardContent className="space-y-3">
        {progress !== undefined && (
          <div className="flex items-center gap-2 text-sm">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <span>Progress: {progress}%</span>
          </div>
        )}
        {lastUpdated && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>Updated {lastUpdated}</span>
          </div>
        )}
        {showActions && (
          <div className="flex items-center gap-2">
            <Button asChild size="sm">
              <Link href={`/plan`}>View Plan</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href={`/plan`}>Details</Link>
            </Button>
          </div>
        )}
        {!showActions && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FileText className="h-4 w-4" />
            <span>View details in plan page</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default PlanCard;

