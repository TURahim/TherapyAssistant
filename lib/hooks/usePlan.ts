'use client';

import { useState, useCallback, useEffect } from 'react';
import type { PlanStatus } from '@prisma/client';

// =============================================================================
// TYPES
// =============================================================================

interface PlanListItem {
  id: string;
  clientId: string;
  clientName: string;
  status: PlanStatus;
  currentVersion: number;
  lastGeneratedAt: string | null;
  publishedAt: string | null;
  versionCount: number;
  homeworkCount: number;
  updatedAt: string;
}

interface PlanDetail {
  id: string;
  clientId: string;
  clientName: string;
  status: PlanStatus;
  currentVersion: number;
  isLocked: boolean;
  canonicalPlan: unknown;
  therapistView: unknown;
  clientView: unknown;
  lastGeneratedAt: string | null;
  publishedAt: string | null;
  versions: Array<{
    id: string;
    versionNumber: number;
    changeType: string;
    changeSummary: string | null;
    createdAt: string;
    createdBy: string;
  }>;
  homework: Array<{
    id: string;
    title: string;
    description: string;
    status: string;
    dueDate: string | null;
  }>;
  counts: {
    versions: number;
    homework: number;
    edits: number;
  };
  createdAt: string;
  updatedAt: string;
}

interface PlanFilterParams {
  page?: number;
  limit?: number;
  clientId?: string;
  status?: PlanStatus;
}

interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// =============================================================================
// usePlans - List of plans
// =============================================================================

interface UsePlansOptions {
  initialParams?: PlanFilterParams;
  autoFetch?: boolean;
}

interface UsePlansReturn {
  plans: PlanListItem[];
  pagination: PaginatedResponse<PlanListItem>['pagination'] | null;
  isLoading: boolean;
  error: string | null;
  fetchPlans: (params?: PlanFilterParams) => Promise<void>;
  refresh: () => Promise<void>;
}

export function usePlans(options: UsePlansOptions = {}): UsePlansReturn {
  const { initialParams = {}, autoFetch = true } = options;

  const [plans, setPlans] = useState<PlanListItem[]>([]);
  const [pagination, setPagination] = useState<PaginatedResponse<PlanListItem>['pagination'] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentParams, setCurrentParams] = useState<PlanFilterParams>(initialParams);

  const fetchPlans = useCallback(async (params: PlanFilterParams = {}) => {
    setIsLoading(true);
    setError(null);

    try {
      const mergedParams = { ...currentParams, ...params };
      setCurrentParams(mergedParams);

      const searchParams = new URLSearchParams();
      if (mergedParams.page) searchParams.set('page', mergedParams.page.toString());
      if (mergedParams.limit) searchParams.set('limit', mergedParams.limit.toString());
      if (mergedParams.clientId) searchParams.set('clientId', mergedParams.clientId);
      if (mergedParams.status) searchParams.set('status', mergedParams.status);

      const response = await fetch(`/api/plans?${searchParams.toString()}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch plans');
      }

      const data = await response.json();
      setPlans(data.items);
      setPagination(data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setPlans([]);
      setPagination(null);
    } finally {
      setIsLoading(false);
    }
  }, [currentParams]);

  const refresh = useCallback(async () => {
    await fetchPlans(currentParams);
  }, [fetchPlans, currentParams]);

  useEffect(() => {
    if (autoFetch) {
      fetchPlans(initialParams);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    plans,
    pagination,
    isLoading,
    error,
    fetchPlans,
    refresh,
  };
}

// =============================================================================
// usePlan - Single plan
// =============================================================================

interface UsePlanReturn {
  plan: PlanDetail | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  updateStatus: (status: PlanStatus) => Promise<boolean>;
  publish: () => Promise<boolean>;
  archive: () => Promise<boolean>;
  deletePlan: () => Promise<boolean>;
}

export function usePlan(planId: string | null): UsePlanReturn {
  const [plan, setPlan] = useState<PlanDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPlan = useCallback(async () => {
    if (!planId) {
      setPlan(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/plans/${planId}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch plan');
      }

      const data = await response.json();
      setPlan(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setPlan(null);
    } finally {
      setIsLoading(false);
    }
  }, [planId]);

  const updateStatus = useCallback(async (status: PlanStatus): Promise<boolean> => {
    if (!planId) return false;

    try {
      const response = await fetch(`/api/plans/${planId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'updateStatus', status }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update status');
      }

      await fetchPlan();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return false;
    }
  }, [planId, fetchPlan]);

  const publish = useCallback(async (): Promise<boolean> => {
    if (!planId) return false;

    try {
      const response = await fetch(`/api/plans/${planId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'publish' }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to publish plan');
      }

      await fetchPlan();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return false;
    }
  }, [planId, fetchPlan]);

  const archive = useCallback(async (): Promise<boolean> => {
    if (!planId) return false;

    try {
      const response = await fetch(`/api/plans/${planId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'archive' }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to archive plan');
      }

      await fetchPlan();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return false;
    }
  }, [planId, fetchPlan]);

  const deletePlan = useCallback(async (): Promise<boolean> => {
    if (!planId) return false;

    try {
      const response = await fetch(`/api/plans/${planId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete plan');
      }

      setPlan(null);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return false;
    }
  }, [planId]);

  useEffect(() => {
    fetchPlan();
  }, [fetchPlan]);

  return {
    plan,
    isLoading,
    error,
    refresh: fetchPlan,
    updateStatus,
    publish,
    archive,
    deletePlan,
  };
}

// =============================================================================
// useClientPlan - Client's view of their plan
// =============================================================================

interface ClientPlanView {
  id: string;
  clientView: unknown;
  lastUpdated: string;
  publishedAt: string;
}

interface UseClientPlanReturn {
  plan: ClientPlanView | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useClientPlan(): UseClientPlanReturn {
  const [plan, setPlan] = useState<ClientPlanView | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPlan = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // For clients, we use a special endpoint that gets their own plan
      const response = await fetch('/api/plans/my-plan');

      if (!response.ok) {
        if (response.status === 404) {
          // No plan yet - this is okay
          setPlan(null);
          return;
        }
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch plan');
      }

      const data = await response.json();
      setPlan(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setPlan(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlan();
  }, [fetchPlan]);

  return {
    plan,
    isLoading,
    error,
    refresh: fetchPlan,
  };
}

