'use client';

import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import {
  History,
  Clock,
  FileText,
  RefreshCw,
  Edit,
  Sparkles,
  RotateCcw,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DiffBadge } from './DiffBadge';
import { cn } from '@/lib/utils';

// =============================================================================
// TYPES
// =============================================================================

interface VersionInfo {
  id: string;
  versionNumber: number;
  changeType: string;
  changeSummary: string | null;
  createdAt: string;
  createdBy: string;
  sessionId?: string | null;
  session?: {
    id: string;
    sessionNumber: number;
    scheduledAt: string;
  } | null;
}

interface DiffStats {
  added: number;
  removed: number;
  modified: number;
  total: number;
}

interface VersionCardProps {
  version: VersionInfo;
  planId: string;
  isCurrent?: boolean;
  diffStats?: DiffStats;
  onRestore?: () => void;
  onCompare?: () => void;
  showActions?: boolean;
  compact?: boolean;
  className?: string;
}

// =============================================================================
// CHANGE TYPE CONFIG
// =============================================================================

const CHANGE_TYPE_CONFIG: Record<string, {
  label: string;
  icon: React.ElementType;
  color: string;
}> = {
  initial: {
    label: 'Initial',
    icon: Sparkles,
    color: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400',
  },
  session_update: {
    label: 'Session Update',
    icon: FileText,
    color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400',
  },
  manual_edit: {
    label: 'Manual Edit',
    icon: Edit,
    color: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400',
  },
  restore: {
    label: 'Restored',
    icon: RotateCcw,
    color: 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400',
  },
  ai_generation: {
    label: 'AI Generated',
    icon: Sparkles,
    color: 'text-indigo-600 bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400',
  },
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function VersionCard({
  version,
  planId,
  isCurrent = false,
  diffStats,
  onRestore,
  onCompare,
  showActions = true,
  compact = false,
  className,
}: VersionCardProps) {
  const config = CHANGE_TYPE_CONFIG[version.changeType] || {
    label: version.changeType,
    icon: History,
    color: 'text-gray-600 bg-gray-100 dark:bg-gray-800 dark:text-gray-400',
  };
  const Icon = config.icon;

  const formattedDate = formatDistanceToNow(new Date(version.createdAt), {
    addSuffix: true,
  });

  if (compact) {
    return (
      <div
        className={cn(
          "flex items-center justify-between p-3 rounded-lg border",
          isCurrent && "bg-primary/5 border-primary/30",
          !isCurrent && "bg-card hover:bg-muted/50",
          className
        )}
      >
        <div className="flex items-center gap-3">
          <div className={cn("p-1.5 rounded", config.color)}>
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium">v{version.versionNumber}</span>
              {isCurrent && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-primary/20 text-primary">
                  Current
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{formattedDate}</p>
          </div>
        </div>
        {diffStats && <DiffBadge stats={diffStats} compact />}
        {showActions && !isCurrent && onRestore && (
          <Button variant="ghost" size="sm" onClick={onRestore}>
            <RotateCcw className="h-4 w-4" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <Card className={cn(
      "overflow-hidden",
      isCurrent && "ring-2 ring-primary/50",
      className
    )}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={cn("p-2 rounded-lg", config.color)}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold">Version {version.versionNumber}</span>
                {isCurrent && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary font-medium">
                    Current
                  </span>
                )}
                <span className={cn("text-xs px-2 py-0.5 rounded-full", config.color)}>
                  {config.label}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>{formattedDate}</span>
              </div>
              {version.changeSummary && (
                <p className="text-sm text-muted-foreground mt-2">
                  {version.changeSummary}
                </p>
              )}
              {version.session && (
                <Link
                  href={`/sessions/${version.session.id}`}
                  className="flex items-center gap-1 text-sm text-primary hover:underline mt-2"
                >
                  <FileText className="h-4 w-4" />
                  Session #{version.session.sessionNumber}
                  <ExternalLink className="h-3 w-3" />
                </Link>
              )}
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            {diffStats && (
              <DiffBadge stats={diffStats} />
            )}
            {showActions && (
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                >
                  <Link href={`/plans/${planId}/versions/${version.versionNumber}`}>
                    View
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Link>
                </Button>
                {onCompare && (
                  <Button variant="ghost" size="sm" onClick={onCompare}>
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Compare
                  </Button>
                )}
                {!isCurrent && onRestore && (
                  <Button variant="outline" size="sm" onClick={onRestore}>
                    <RotateCcw className="h-4 w-4 mr-1" />
                    Restore
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default VersionCard;

