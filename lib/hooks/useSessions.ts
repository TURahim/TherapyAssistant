'use client';

import { useState, useCallback, useEffect } from 'react';
import type { SessionListItem, CreateSessionInput, SessionFilterParams, PaginatedResponse } from '@/types';

interface UseSessionsOptions {
  initialParams?: SessionFilterParams;
  autoFetch?: boolean;
}

interface UseSessionsReturn {
  sessions: SessionListItem[];
  pagination: PaginatedResponse<SessionListItem>['pagination'] | null;
  isLoading: boolean;
  error: string | null;
  fetchSessions: (params?: SessionFilterParams) => Promise<void>;
  createSession: (input: CreateSessionInput) => Promise<{ id: string } | null>;
  deleteSession: (sessionId: string) => Promise<boolean>;
  refresh: () => Promise<void>;
}

export function useSessions(options: UseSessionsOptions = {}): UseSessionsReturn {
  const { initialParams = {}, autoFetch = true } = options;

  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [pagination, setPagination] = useState<PaginatedResponse<SessionListItem>['pagination'] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentParams, setCurrentParams] = useState<SessionFilterParams>(initialParams);

  const fetchSessions = useCallback(async (params: SessionFilterParams = {}) => {
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
      if (mergedParams.fromDate) searchParams.set('fromDate', mergedParams.fromDate);
      if (mergedParams.toDate) searchParams.set('toDate', mergedParams.toDate);
      if (mergedParams.hasCrisis) searchParams.set('hasCrisis', 'true');
      if (mergedParams.sortBy) searchParams.set('sortBy', mergedParams.sortBy);
      if (mergedParams.sortOrder) searchParams.set('sortOrder', mergedParams.sortOrder);

      const response = await fetch(`/api/sessions?${searchParams.toString()}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch sessions');
      }

      const data = await response.json();
      setSessions(data.items);
      setPagination(data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setSessions([]);
      setPagination(null);
    } finally {
      setIsLoading(false);
    }
  }, [currentParams]);

  const createSession = useCallback(async (input: CreateSessionInput): Promise<{ id: string } | null> => {
    setError(null);

    try {
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create session');
      }

      const data = await response.json();
      await fetchSessions();
      
      return { id: data.id };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return null;
    }
  }, [fetchSessions]);

  const deleteSession = useCallback(async (sessionId: string): Promise<boolean> => {
    setError(null);

    try {
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete session');
      }

      await fetchSessions();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return false;
    }
  }, [fetchSessions]);

  const refresh = useCallback(async () => {
    await fetchSessions(currentParams);
  }, [fetchSessions, currentParams]);

  useEffect(() => {
    if (autoFetch) {
      fetchSessions(initialParams);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    sessions,
    pagination,
    isLoading,
    error,
    fetchSessions,
    createSession,
    deleteSession,
    refresh,
  };
}

/**
 * Session detail type
 */
interface SessionDetail {
  id: string;
  sessionNumber: number;
  clientId: string;
  clientName: string;
  clientEmail: string;
  therapistName: string;
  scheduledAt: string;
  startedAt?: string | null;
  endedAt?: string | null;
  status: string;
  durationMinutes?: number | null;
  transcript?: string | null;
  notes?: string | null;
  crisisSeverity: string;
  crisisIndicators?: unknown;
  summary?: {
    id: string;
    therapistSummary: string;
    clientSummary: string;
    keyTopics: string[];
    moodAssessment?: string | null;
  } | null;
  mediaUploads: Array<{
    id: string;
    mediaType: string;
    fileName: string;
    fileSize: number;
  }>;
  hasGeneratedPlan: boolean;
  latestPlanId?: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Hook for fetching a single session
 */
export function useSession(sessionId: string | null) {
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSession = useCallback(async () => {
    if (!sessionId) {
      setSession(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/sessions/${sessionId}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch session');
      }

      const data = await response.json();
      setSession(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setSession(null);
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  const updateSession = useCallback(async (
    action: string,
    data?: Record<string, unknown>
  ): Promise<boolean> => {
    if (!sessionId) return false;

    try {
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...data }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update session');
      }

      await fetchSession();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return false;
    }
  }, [sessionId, fetchSession]);

  const addTranscript = useCallback(async (
    transcript: string,
    source: 'paste' | 'upload' | 'transcription' = 'paste'
  ): Promise<boolean> => {
    return updateSession('addTranscript', { transcript, source });
  }, [updateSession]);

  const startSession = useCallback(async (): Promise<boolean> => {
    return updateSession('start');
  }, [updateSession]);

  const completeSession = useCallback(async (durationMinutes?: number): Promise<boolean> => {
    return updateSession('complete', { durationMinutes });
  }, [updateSession]);

  const cancelSession = useCallback(async (): Promise<boolean> => {
    return updateSession('cancel');
  }, [updateSession]);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  return {
    session,
    isLoading,
    error,
    refresh: fetchSession,
    addTranscript,
    startSession,
    completeSession,
    cancelSession,
  };
}

