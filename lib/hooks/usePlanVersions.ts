'use client';

import { useState, useCallback, useEffect } from 'react';

// =============================================================================
// TYPES
// =============================================================================

export interface VersionInfo {
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

export interface VersionDetail extends VersionInfo {
  canonicalPlan: unknown;
  therapistView: unknown;
  clientView: unknown;
  diffFromPrevious?: DiffResult;
}

export interface DiffChange {
  type: 'added' | 'removed' | 'modified';
  path: string;
  section: string;
  field?: string;
  oldValue?: unknown;
  newValue?: unknown;
  description: string;
}

export interface DiffResult {
  hasChanges: boolean;
  summary: string;
  changes: DiffChange[];
  stats: {
    added: number;
    removed: number;
    modified: number;
    total: number;
  };
}

export interface VersionComparison {
  oldVersion: VersionInfo;
  newVersion: VersionInfo;
  canonicalDiff: DiffResult;
  therapistViewDiff: DiffResult;
  summary: string;
}

// =============================================================================
// usePlanVersions - List versions
// =============================================================================

interface UsePlanVersionsOptions {
  autoFetch?: boolean;
}

interface UsePlanVersionsReturn {
  versions: VersionInfo[];
  total: number;
  hasMore: boolean;
  isLoading: boolean;
  error: string | null;
  fetchVersions: (page?: number) => Promise<void>;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
}

export function usePlanVersions(
  planId: string | null,
  options: UsePlanVersionsOptions = {}
): UsePlanVersionsReturn {
  const { autoFetch = true } = options;

  const [versions, setVersions] = useState<VersionInfo[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchVersions = useCallback(async (page: number = 1) => {
    if (!planId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/plans/${planId}/versions?page=${page}&limit=20`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch versions');
      }

      const data = await response.json();

      if (page === 1) {
        setVersions(data.versions);
      } else {
        setVersions(prev => [...prev, ...data.versions]);
      }

      setTotal(data.total);
      setHasMore(data.hasMore);
      setCurrentPage(page);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [planId]);

  const loadMore = useCallback(async () => {
    if (hasMore && !isLoading) {
      await fetchVersions(currentPage + 1);
    }
  }, [hasMore, isLoading, currentPage, fetchVersions]);

  const refresh = useCallback(async () => {
    setVersions([]);
    setCurrentPage(1);
    await fetchVersions(1);
  }, [fetchVersions]);

  useEffect(() => {
    if (autoFetch && planId) {
      fetchVersions(1);
    }
  }, [autoFetch, planId, fetchVersions]);

  return {
    versions,
    total,
    hasMore,
    isLoading,
    error,
    fetchVersions,
    loadMore,
    refresh,
  };
}

// =============================================================================
// usePlanVersion - Single version
// =============================================================================

interface UsePlanVersionReturn {
  version: VersionDetail | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  restore: () => Promise<{ success: boolean; newVersionNumber?: number }>;
}

export function usePlanVersion(
  planId: string | null,
  versionNumber: number | null,
  includeDiff: boolean = false
): UsePlanVersionReturn {
  const [version, setVersion] = useState<VersionDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchVersion = useCallback(async () => {
    if (!planId || versionNumber === null) {
      setVersion(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const url = `/api/plans/${planId}/versions/${versionNumber}${
        includeDiff ? '?includeDiff=true' : ''
      }`;
      const response = await fetch(url);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch version');
      }

      const data = await response.json();
      setVersion(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setVersion(null);
    } finally {
      setIsLoading(false);
    }
  }, [planId, versionNumber, includeDiff]);

  const restore = useCallback(async (): Promise<{ success: boolean; newVersionNumber?: number }> => {
    if (!planId || versionNumber === null) {
      return { success: false };
    }

    try {
      const response = await fetch(
        `/api/plans/${planId}/versions/${versionNumber}/restore`,
        { method: 'POST' }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to restore version');
      }

      const data = await response.json();
      return { success: true, newVersionNumber: data.newVersionNumber };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return { success: false };
    }
  }, [planId, versionNumber]);

  useEffect(() => {
    fetchVersion();
  }, [fetchVersion]);

  return {
    version,
    isLoading,
    error,
    refresh: fetchVersion,
    restore,
  };
}

// =============================================================================
// useVersionComparison - Compare two versions
// =============================================================================

interface UseVersionComparisonReturn {
  comparison: VersionComparison | null;
  isLoading: boolean;
  error: string | null;
  compare: (oldVersion: number, newVersion: number) => Promise<void>;
}

export function useVersionComparison(planId: string | null): UseVersionComparisonReturn {
  const [comparison, setComparison] = useState<VersionComparison | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const compare = useCallback(async (oldVersion: number, newVersion: number) => {
    if (!planId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/plans/${planId}/versions/${newVersion}?compare=${oldVersion}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to compare versions');
      }

      const data = await response.json();
      setComparison(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setComparison(null);
    } finally {
      setIsLoading(false);
    }
  }, [planId]);

  return {
    comparison,
    isLoading,
    error,
    compare,
  };
}

