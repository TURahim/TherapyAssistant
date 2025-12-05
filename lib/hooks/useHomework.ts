'use client';

import { useCallback, useEffect, useState } from 'react';
import type { HomeworkStatus } from '@prisma/client';

export interface HomeworkItem {
  id: string;
  planId: string;
  title: string;
  description: string;
  instructions?: string | null;
  dueDate?: string | null;
  status: HomeworkStatus;
  completedAt?: string | null;
  clientNotes?: string | null;
  therapistNotes?: string | null;
  order: number;
}

interface UseHomeworkReturn {
  homework: HomeworkItem[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  updateStatus: (id: string, data: { status?: HomeworkStatus; completed?: boolean; clientNotes?: string }) => Promise<void>;
}

export function useHomework(planId: string | null): UseHomeworkReturn {
  const [homework, setHomework] = useState<HomeworkItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHomework = useCallback(async () => {
    if (!planId) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/plans/${planId}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to load homework');
      }
      const data = await res.json();
      setHomework(data.homework || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load homework');
    } finally {
      setIsLoading(false);
    }
  }, [planId]);

  const updateStatus = useCallback(
    async (id: string, data: { status?: HomeworkStatus; completed?: boolean; clientNotes?: string }) => {
      try {
        const res = await fetch(`/api/homework/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || 'Failed to update homework');
        }
        await fetchHomework();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update homework');
        throw err;
      }
    },
    [fetchHomework]
  );

  useEffect(() => {
    fetchHomework();
  }, [fetchHomework]);

  return {
    homework,
    isLoading,
    error,
    refresh: fetchHomework,
    updateStatus,
  };
}

