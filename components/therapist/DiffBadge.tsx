'use client';

import { Plus, Minus, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

// =============================================================================
// TYPES
// =============================================================================

interface DiffStats {
  added: number;
  removed: number;
  modified: number;
  total: number;
}

interface DiffBadgeProps {
  stats: DiffStats;
  compact?: boolean;
  showTotal?: boolean;
  className?: string;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function DiffBadge({
  stats,
  compact = false,
  showTotal = false,
  className,
}: DiffBadgeProps) {
  const hasChanges = stats.total > 0;

  if (!hasChanges) {
    return (
      <span className={cn(
        "text-xs text-muted-foreground px-2 py-0.5 rounded bg-muted",
        className
      )}>
        No changes
      </span>
    );
  }

  if (compact) {
    return (
      <div className={cn("flex items-center gap-1 text-xs", className)}>
        {stats.added > 0 && (
          <span className="text-green-600 font-medium">+{stats.added}</span>
        )}
        {stats.removed > 0 && (
          <span className="text-red-600 font-medium">−{stats.removed}</span>
        )}
        {stats.modified > 0 && (
          <span className="text-amber-600 font-medium">~{stats.modified}</span>
        )}
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {stats.added > 0 && (
        <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
          <Plus className="h-3 w-3" />
          {stats.added} added
        </span>
      )}
      {stats.removed > 0 && (
        <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
          <Minus className="h-3 w-3" />
          {stats.removed} removed
        </span>
      )}
      {stats.modified > 0 && (
        <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
          <RefreshCw className="h-3 w-3" />
          {stats.modified} modified
        </span>
      )}
      {showTotal && (
        <span className="text-xs text-muted-foreground">
          ({stats.total} total)
        </span>
      )}
    </div>
  );
}

// =============================================================================
// CHANGE TYPE BADGE
// =============================================================================

interface ChangeTypeBadgeProps {
  type: 'added' | 'removed' | 'modified';
  className?: string;
}

export function ChangeTypeBadge({ type, className }: ChangeTypeBadgeProps) {
  const config = {
    added: {
      label: 'Added',
      icon: Plus,
      className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    },
    removed: {
      label: 'Removed',
      icon: Minus,
      className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    },
    modified: {
      label: 'Modified',
      icon: RefreshCw,
      className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    },
  };

  const { label, icon: Icon, className: typeClassName } = config[type];

  return (
    <span className={cn(
      "inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded font-medium",
      typeClassName,
      className
    )}>
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}

export default DiffBadge;

