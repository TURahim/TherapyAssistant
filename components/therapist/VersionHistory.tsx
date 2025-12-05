'use client';

import { useState } from 'react';
import { History, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { VersionCard } from './VersionCard';
import { useToast } from '@/hooks/use-toast';
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

interface VersionHistoryProps {
  planId: string;
  currentVersion: number;
  versions: VersionInfo[];
  diffStats?: Map<number, DiffStats>;
  isLoading?: boolean;
  hasMore?: boolean;
  error?: string | null;
  onLoadMore?: () => void;
  onRestore?: (versionNumber: number) => Promise<boolean>;
  onCompare?: (versionNumber: number) => void;
  compact?: boolean;
  className?: string;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function VersionHistory({
  planId,
  currentVersion,
  versions,
  diffStats,
  isLoading = false,
  hasMore = false,
  error,
  onLoadMore,
  onRestore,
  onCompare,
  compact = false,
  className,
}: VersionHistoryProps) {
  const { toast } = useToast();
  const [restoringVersion, setRestoringVersion] = useState<number | null>(null);

  const handleRestore = async (versionNumber: number) => {
    if (!onRestore) return;

    setRestoringVersion(versionNumber);
    try {
      const success = await onRestore(versionNumber);
      if (success) {
        toast({
          title: 'Version restored',
          description: `Successfully restored to version ${versionNumber}`,
        });
      } else {
        toast({
          title: 'Restore failed',
          description: 'Failed to restore version',
          variant: 'destructive',
        });
      }
    } catch (err) {
      toast({
        title: 'Restore failed',
        description: err instanceof Error ? err.message : 'An error occurred',
        variant: 'destructive',
      });
    } finally {
      setRestoringVersion(null);
    }
  };

  if (compact) {
    return (
      <div className={cn("space-y-2", className)}>
        {versions.map((version) => (
          <VersionCard
            key={version.id}
            version={version}
            planId={planId}
            isCurrent={version.versionNumber === currentVersion}
            diffStats={diffStats?.get(version.versionNumber)}
            onRestore={
              version.versionNumber !== currentVersion && onRestore
                ? () => handleRestore(version.versionNumber)
                : undefined
            }
            showActions={version.versionNumber !== currentVersion}
            compact
          />
        ))}
        {hasMore && onLoadMore && (
          <Button
            variant="ghost"
            className="w-full"
            onClick={onLoadMore}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Loading...
              </>
            ) : (
              'Load more'
            )}
          </Button>
        )}
      </div>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-muted-foreground" />
          <CardTitle>Version History</CardTitle>
        </div>
        <CardDescription>
          {versions.length} version{versions.length !== 1 ? 's' : ''} recorded
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {error && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg">
            <AlertCircle className="h-5 w-5" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {versions.length === 0 && !isLoading && (
          <p className="text-sm text-muted-foreground text-center py-6">
            No version history available.
          </p>
        )}

        {versions.map((version) => (
          <VersionCard
            key={version.id}
            version={version}
            planId={planId}
            isCurrent={version.versionNumber === currentVersion}
            diffStats={diffStats?.get(version.versionNumber)}
            onRestore={
              version.versionNumber !== currentVersion && onRestore
                ? () => handleRestore(version.versionNumber)
                : undefined
            }
            onCompare={
              onCompare
                ? () => onCompare(version.versionNumber)
                : undefined
            }
          />
        ))}

        {isLoading && (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {hasMore && onLoadMore && !isLoading && (
          <Button
            variant="outline"
            className="w-full"
            onClick={onLoadMore}
          >
            Load more versions
          </Button>
        )}

        {restoringVersion !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span>Restoring version {restoringVersion}...</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default VersionHistory;

