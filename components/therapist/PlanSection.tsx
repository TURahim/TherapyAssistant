'use client';

import { useState, type ReactNode } from 'react';
import { ChevronDown, ChevronRight, Edit2, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PlanSectionProps {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  badge?: ReactNode;
  actions?: ReactNode;
  editable?: boolean;
  editing?: boolean;
  onEdit?: () => void;
  onSave?: () => void;
  onCancel?: () => void;
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
}

export function PlanSection({
  title,
  icon,
  children,
  defaultOpen = true,
  badge,
  actions,
  editable = false,
  editing = false,
  onEdit,
  onSave,
  onCancel,
  className,
  headerClassName,
  contentClassName,
}: PlanSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={cn(
      "border rounded-lg bg-card overflow-hidden",
      editing && "ring-2 ring-primary/50",
      className
    )}>
      {/* Header */}
      <div
        className={cn(
          "flex items-center justify-between px-4 py-3 bg-muted/30",
          "cursor-pointer select-none hover:bg-muted/50 transition-colors",
          headerClassName
        )}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-3">
          <button
            className="p-0.5 hover:bg-muted rounded transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(!isOpen);
            }}
          >
            {isOpen ? (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            )}
          </button>
          {icon && <span className="text-muted-foreground">{icon}</span>}
          <h3 className="font-semibold text-foreground">{title}</h3>
          {badge}
        </div>

        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          {actions}
          {editable && !editing && onEdit && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onEdit}
              className="h-8 px-2"
            >
              <Edit2 className="h-4 w-4" />
            </Button>
          )}
          {editing && (
            <>
              {onCancel && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onCancel}
                  className="h-8 px-2"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
              {onSave && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={onSave}
                  className="h-8"
                >
                  <Save className="h-4 w-4 mr-1" />
                  Save
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Content */}
      {isOpen && (
        <div className={cn("px-4 py-4", contentClassName)}>
          {children}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// BADGE COMPONENTS
// =============================================================================

interface SectionBadgeProps {
  count: number;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
}

export function SectionBadge({ count, variant = 'default' }: SectionBadgeProps) {
  const variantStyles = {
    default: 'bg-muted text-muted-foreground',
    success: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    danger: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    info: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  };

  return (
    <span className={cn(
      "inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-medium",
      variantStyles[variant]
    )}>
      {count}
    </span>
  );
}

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const statusStyles: Record<string, string> = {
    // Goal/Homework statuses
    not_started: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    achieved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    revised: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    assigned: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    skipped: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    // Diagnosis statuses
    provisional: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    confirmed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    rule_out: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    // Crisis severities
    NONE: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    LOW: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    MEDIUM: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    HIGH: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    CRITICAL: 'bg-red-200 text-red-800 dark:bg-red-900/50 dark:text-red-300',
  };

  const displayStatus = status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

  return (
    <span className={cn(
      "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
      statusStyles[status] || 'bg-gray-100 text-gray-700',
      className
    )}>
      {displayStatus}
    </span>
  );
}

// =============================================================================
// PROGRESS BAR
// =============================================================================

interface ProgressBarProps {
  progress: number;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function ProgressBar({ progress, showLabel = true, size = 'md', className }: ProgressBarProps) {
  const sizeStyles = {
    sm: 'h-1.5',
    md: 'h-2',
    lg: 'h-3',
  };

  const getProgressColor = (value: number) => {
    if (value >= 80) return 'bg-green-500';
    if (value >= 50) return 'bg-blue-500';
    if (value >= 25) return 'bg-amber-500';
    return 'bg-gray-400';
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className={cn("flex-1 rounded-full bg-muted overflow-hidden", sizeStyles[size])}>
        <div
          className={cn("h-full rounded-full transition-all duration-300", getProgressColor(progress))}
          style={{ width: `${progress}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-sm text-muted-foreground w-10 text-right">
          {progress}%
        </span>
      )}
    </div>
  );
}

export default PlanSection;

