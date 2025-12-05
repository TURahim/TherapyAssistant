'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import { formatDate, formatTime, getRelativeTime } from '@/lib/utils/dates';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Calendar,
  Clock,
  FileText,
  MoreVertical,
  AlertTriangle,
  Eye,
  Play,
  CheckCircle,
  X,
  MessageSquare,
} from 'lucide-react';
import type { SessionListItem } from '@/types';

interface SessionCardProps {
  session: SessionListItem;
  onStart?: (sessionId: string) => void;
  onComplete?: (sessionId: string) => void;
  onCancel?: (sessionId: string) => void;
  showClientName?: boolean;
  className?: string;
}

const statusConfig = {
  SCHEDULED: {
    label: 'Scheduled',
    className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    icon: Calendar,
  },
  IN_PROGRESS: {
    label: 'In Progress',
    className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    icon: Play,
  },
  COMPLETED: {
    label: 'Completed',
    className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    icon: CheckCircle,
  },
  CANCELLED: {
    label: 'Cancelled',
    className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
    icon: X,
  },
};

const crisisConfig = {
  NONE: null,
  LOW: {
    label: 'Low Risk',
    className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  },
  MEDIUM: {
    label: 'Medium Risk',
    className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  },
  HIGH: {
    label: 'High Risk',
    className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  },
  CRITICAL: {
    label: 'Critical',
    className: 'bg-red-200 text-red-800 dark:bg-red-900/50 dark:text-red-300',
  },
};

export function SessionCard({
  session,
  onStart,
  onComplete,
  onCancel,
  showClientName = true,
  className,
}: SessionCardProps) {
  const status = statusConfig[session.status];
  const StatusIcon = status.icon;
  const crisis = crisisConfig[session.crisisSeverity];

  const isUpcoming = session.status === 'SCHEDULED' && new Date(session.scheduledAt) > new Date();
  const isPast = session.status === 'SCHEDULED' && new Date(session.scheduledAt) < new Date();

  return (
    <Card className={cn('transition-shadow hover:shadow-md', className)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          {/* Session Info */}
          <div className="flex items-start gap-3 min-w-0">
            {/* Icon */}
            <div className={cn(
              'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full',
              session.status === 'COMPLETED' ? 'bg-green-100 dark:bg-green-900/30' :
              session.status === 'IN_PROGRESS' ? 'bg-amber-100 dark:bg-amber-900/30' :
              'bg-blue-100 dark:bg-blue-900/30'
            )}>
              <StatusIcon className={cn(
                'h-5 w-5',
                session.status === 'COMPLETED' ? 'text-green-600 dark:text-green-400' :
                session.status === 'IN_PROGRESS' ? 'text-amber-600 dark:text-amber-400' :
                'text-blue-600 dark:text-blue-400'
              )} />
            </div>

            {/* Details */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Link
                  href={`/sessions/${session.id}`}
                  className="font-medium text-foreground hover:text-primary transition-colors"
                >
                  Session #{session.sessionNumber}
                </Link>
                <span className={cn(
                  'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                  status.className
                )}>
                  {status.label}
                </span>
                {crisis && (
                  <span className={cn(
                    'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
                    crisis.className
                  )}>
                    <AlertTriangle className="h-3 w-3" />
                    {crisis.label}
                  </span>
                )}
              </div>

              {showClientName && (
                <Link
                  href={`/clients/${session.clientId}`}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {session.clientName}
                </Link>
              )}

              {/* Time Info */}
              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>{formatDate(session.scheduledAt)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>{formatTime(session.scheduledAt)}</span>
                </div>
                {isUpcoming && (
                  <span className="text-blue-600 dark:text-blue-400">
                    {getRelativeTime(session.scheduledAt)}
                  </span>
                )}
                {isPast && (
                  <span className="text-amber-600 dark:text-amber-400">
                    Past due
                  </span>
                )}
              </div>

              {/* Indicators */}
              <div className="mt-2 flex items-center gap-3 text-xs">
                {session.hasTranscript && (
                  <span className="flex items-center gap-1 text-primary">
                    <MessageSquare className="h-3 w-3" />
                    Transcript
                  </span>
                )}
                {session.hasSummary && (
                  <span className="flex items-center gap-1 text-primary">
                    <FileText className="h-3 w-3" />
                    Summary
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {session.status === 'SCHEDULED' && onStart && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onStart(session.id)}
              >
                <Play className="h-4 w-4 mr-1" />
                Start
              </Button>
            )}
            
            {session.status === 'IN_PROGRESS' && onComplete && (
              <Button
                variant="default"
                size="sm"
                onClick={() => onComplete(session.id)}
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Complete
              </Button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="h-4 w-4" />
                  <span className="sr-only">More actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href={`/sessions/${session.id}`} className="flex items-center cursor-pointer">
                    <Eye className="mr-2 h-4 w-4" />
                    View Details
                  </Link>
                </DropdownMenuItem>
                {session.status !== 'COMPLETED' && session.status !== 'CANCELLED' && (
                  <>
                    <DropdownMenuSeparator />
                    {onCancel && (
                      <DropdownMenuItem
                        onClick={() => onCancel(session.id)}
                        className="text-destructive focus:text-destructive cursor-pointer"
                      >
                        <X className="mr-2 h-4 w-4" />
                        Cancel Session
                      </DropdownMenuItem>
                    )}
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

