'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ChevronLeft,
  History,
  Loader2,
  AlertCircle,
  RefreshCw,
  ArrowLeftRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { VersionHistory } from '@/components/therapist/VersionHistory';
import { DiffViewer } from '@/components/therapist/DiffViewer';
import { usePlanVersions, useVersionComparison } from '@/lib/hooks/usePlanVersions';
import { usePlan } from '@/lib/hooks/usePlan';
import { useToast } from '@/hooks/use-toast';

// =============================================================================
// PAGE COMPONENT
// =============================================================================

interface PlanHistoryPageProps {
  params: Promise<{ planId: string }>;
}

export default function PlanHistoryPage({ params }: PlanHistoryPageProps) {
  const { planId } = use(params);
  const router = useRouter();
  const { toast } = useToast();

  const { plan, isLoading: isPlanLoading, refresh: refreshPlan } = usePlan(planId);
  const {
    versions,
    total,
    hasMore,
    isLoading: isVersionsLoading,
    error: versionsError,
    loadMore,
    refresh: refreshVersions,
  } = usePlanVersions(planId);

  const { comparison, isLoading: isComparing, compare } = useVersionComparison(planId);

  const [compareMode, setCompareMode] = useState(false);
  const [oldVersionNum, setOldVersionNum] = useState<number | null>(null);
  const [newVersionNum, setNewVersionNum] = useState<number | null>(null);

  // Handle version selection for comparison
  useEffect(() => {
    if (compareMode && oldVersionNum !== null && newVersionNum !== null) {
      compare(oldVersionNum, newVersionNum);
    }
  }, [compareMode, oldVersionNum, newVersionNum, compare]);

  // Handle restore
  const handleRestore = useCallback(async (versionNumber: number): Promise<boolean> => {
    try {
      const response = await fetch(`/api/plans/${planId}/versions/${versionNumber}/restore`, {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to restore');
      }

      await refreshPlan();
      await refreshVersions();
      return true;
    } catch (err) {
      toast({
        title: 'Restore failed',
        description: err instanceof Error ? err.message : 'An error occurred',
        variant: 'destructive',
      });
      return false;
    }
  }, [planId, refreshPlan, refreshVersions, toast]);

  // Loading state
  if (isPlanLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Error state
  if (!plan) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <AlertCircle className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Plan not found</h2>
        <Button variant="outline" onClick={() => router.push('/plans')}>
          Back to Plans
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/plans/${planId}`}>
              <ChevronLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <History className="h-6 w-6" />
              Version History
            </h1>
            <p className="text-muted-foreground">
              {plan.clientName || 'Unknown Client'} • {total} versions
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={compareMode ? 'default' : 'outline'}
            onClick={() => {
              setCompareMode(!compareMode);
              if (!compareMode) {
                setOldVersionNum(versions.length > 1 ? versions[1].versionNumber : null);
                setNewVersionNum(versions[0]?.versionNumber || null);
              }
            }}
          >
            <ArrowLeftRight className="h-4 w-4 mr-2" />
            {compareMode ? 'Exit Compare' : 'Compare'}
          </Button>
          <Button variant="outline" onClick={refreshVersions}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Compare Mode */}
      {compareMode && (
        <Card>
          <CardHeader>
            <CardTitle>Compare Versions</CardTitle>
            <CardDescription>
              Select two versions to compare their differences
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-6">
              <div className="flex-1">
                <label className="text-sm font-medium mb-1 block">
                  From Version
                </label>
                <Select
                  value={oldVersionNum?.toString() || ''}
                  onValueChange={(v) => setOldVersionNum(parseInt(v))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select version" />
                  </SelectTrigger>
                  <SelectContent>
                    {versions.map((v) => (
                      <SelectItem
                        key={v.id}
                        value={v.versionNumber.toString()}
                        disabled={v.versionNumber === newVersionNum}
                      >
                        v{v.versionNumber} - {v.changeType}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <ArrowLeftRight className="h-5 w-5 text-muted-foreground mt-6" />
              <div className="flex-1">
                <label className="text-sm font-medium mb-1 block">
                  To Version
                </label>
                <Select
                  value={newVersionNum?.toString() || ''}
                  onValueChange={(v) => setNewVersionNum(parseInt(v))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select version" />
                  </SelectTrigger>
                  <SelectContent>
                    {versions.map((v) => (
                      <SelectItem
                        key={v.id}
                        value={v.versionNumber.toString()}
                        disabled={v.versionNumber === oldVersionNum}
                      >
                        v{v.versionNumber} - {v.changeType}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {isComparing && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            )}

            {comparison && !isComparing && (
              <DiffViewer
                oldVersion={comparison.oldVersion}
                newVersion={comparison.newVersion}
                diff={comparison.canonicalDiff}
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* Version List */}
      {!compareMode && (
        <VersionHistory
          planId={planId}
          currentVersion={plan.currentVersion}
          versions={versions}
          isLoading={isVersionsLoading}
          hasMore={hasMore}
          error={versionsError}
          onLoadMore={loadMore}
          onRestore={handleRestore}
          onCompare={(versionNum) => {
            setCompareMode(true);
            setNewVersionNum(plan.currentVersion);
            setOldVersionNum(versionNum);
          }}
        />
      )}

      {/* Error Display */}
      {versionsError && (
        <div className="flex items-center gap-2 p-4 bg-destructive/10 text-destructive rounded-lg">
          <AlertCircle className="h-5 w-5" />
          <span>{versionsError}</span>
        </div>
      )}
    </div>
  );
}

