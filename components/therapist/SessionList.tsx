'use client';

import { useState } from 'react';
import { SessionCard } from './SessionCard';
import { ListSkeleton } from '@/components/shared/LoadingStates';
import { ErrorFallback } from '@/components/shared/ErrorBoundary';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
} from 'lucide-react';
import type { SessionListItem, PaginatedResponse } from '@/types';

interface SessionListProps {
  sessions: SessionListItem[];
  pagination: PaginatedResponse<SessionListItem>['pagination'] | null;
  isLoading: boolean;
  error: string | null;
  onFilterChange: (key: string, value: string | undefined) => void;
  onPageChange: (page: number) => void;
  onStart?: (sessionId: string) => Promise<boolean>;
  onComplete?: (sessionId: string) => Promise<boolean>;
  onCancel?: (sessionId: string) => Promise<boolean>;
  onRefresh: () => void;
  showClientName?: boolean;
}

export function SessionList({
  sessions,
  pagination,
  isLoading,
  error,
  onFilterChange,
  onPageChange,
  onStart,
  onComplete,
  onCancel,
  onRefresh,
  showClientName = true,
}: SessionListProps) {
  const [sessionToCancel, setSessionToCancel] = useState<SessionListItem | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  const handleCancel = async () => {
    if (!sessionToCancel || !onCancel) return;

    setIsCancelling(true);
    const success = await onCancel(sessionToCancel.id);
    setIsCancelling(false);

    if (success) {
      setSessionToCancel(null);
    }
  };

  if (error) {
    return (
      <ErrorFallback
        error={new Error(error)}
        onReset={onRefresh}
        title="Failed to load sessions"
        description={error}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Status Filter */}
        <Select
          defaultValue="all"
          onValueChange={(value) => {
            onFilterChange('status', value === 'all' ? undefined : value);
          }}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sessions</SelectItem>
            <SelectItem value="SCHEDULED">Scheduled</SelectItem>
            <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>

        {/* Crisis Filter */}
        <Select
          defaultValue="all"
          onValueChange={(value) => {
            onFilterChange('hasCrisis', value === 'crisis' ? 'true' : undefined);
          }}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Crisis" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sessions</SelectItem>
            <SelectItem value="crisis">With Crisis</SelectItem>
          </SelectContent>
        </Select>

        {/* Sort */}
        <Select
          defaultValue="scheduledAt-desc"
          onValueChange={(value) => {
            const [sortBy, sortOrder] = value.split('-');
            onFilterChange('sortBy', sortBy);
            onFilterChange('sortOrder', sortOrder);
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="scheduledAt-desc">Newest First</SelectItem>
            <SelectItem value="scheduledAt-asc">Oldest First</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Session List */}
      {isLoading ? (
        <ListSkeleton count={5} />
      ) : sessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="rounded-full bg-muted p-3 mb-4">
            <Calendar className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium">No sessions found</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Try adjusting your filters or create a new session
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              showClientName={showClientName}
              onStart={onStart ? async (id) => { await onStart(id); } : undefined}
              onComplete={onComplete ? async (id) => { await onComplete(id); } : undefined}
              onCancel={onCancel ? () => setSessionToCancel(session) : undefined}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between pt-4">
          <p className="text-sm text-muted-foreground">
            Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
            {pagination.total} sessions
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={!pagination.hasPrev}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <span className="text-sm text-muted-foreground px-2">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={!pagination.hasNext}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Dialog */}
      <Dialog open={!!sessionToCancel} onOpenChange={() => setSessionToCancel(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Session</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel Session #{sessionToCancel?.sessionNumber} with{' '}
              <strong>{sessionToCancel?.clientName}</strong>?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSessionToCancel(null)}
              disabled={isCancelling}
            >
              Keep Session
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancel}
              disabled={isCancelling}
            >
              {isCancelling ? 'Cancelling...' : 'Cancel Session'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

