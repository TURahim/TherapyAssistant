'use client';

import { useState, useCallback, useEffect } from 'react';
import type { ClientListItem, CreateClientInput, UpdateClientInput, ClientFilterParams, PaginatedResponse } from '@/types';

interface UseClientsOptions {
  initialParams?: ClientFilterParams;
  autoFetch?: boolean;
}

interface UseClientsReturn {
  clients: ClientListItem[];
  pagination: PaginatedResponse<ClientListItem>['pagination'] | null;
  isLoading: boolean;
  error: string | null;
  fetchClients: (params?: ClientFilterParams) => Promise<void>;
  createClient: (input: CreateClientInput) => Promise<{ id: string } | null>;
  updateClient: (clientId: string, input: UpdateClientInput) => Promise<boolean>;
  deleteClient: (clientId: string, permanent?: boolean) => Promise<boolean>;
  refresh: () => Promise<void>;
}

export function useClients(options: UseClientsOptions = {}): UseClientsReturn {
  const { initialParams = {}, autoFetch = true } = options;

  const [clients, setClients] = useState<ClientListItem[]>([]);
  const [pagination, setPagination] = useState<PaginatedResponse<ClientListItem>['pagination'] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentParams, setCurrentParams] = useState<ClientFilterParams>(initialParams);

  const fetchClients = useCallback(async (params: ClientFilterParams = {}) => {
    setIsLoading(true);
    setError(null);

    try {
      const mergedParams = { ...currentParams, ...params };
      setCurrentParams(mergedParams);

      const searchParams = new URLSearchParams();
      if (mergedParams.page) searchParams.set('page', mergedParams.page.toString());
      if (mergedParams.limit) searchParams.set('limit', mergedParams.limit.toString());
      if (mergedParams.search) searchParams.set('search', mergedParams.search);
      if (mergedParams.isActive !== undefined) searchParams.set('isActive', mergedParams.isActive.toString());
      if (mergedParams.sortBy) searchParams.set('sortBy', mergedParams.sortBy);
      if (mergedParams.sortOrder) searchParams.set('sortOrder', mergedParams.sortOrder);

      const response = await fetch(`/api/clients?${searchParams.toString()}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch clients');
      }

      const data = await response.json();
      setClients(data.items);
      setPagination(data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setClients([]);
      setPagination(null);
    } finally {
      setIsLoading(false);
    }
  }, [currentParams]);

  const createClient = useCallback(async (input: CreateClientInput): Promise<{ id: string } | null> => {
    setError(null);

    try {
      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create client');
      }

      const data = await response.json();
      
      // Refresh the list
      await fetchClients();
      
      return { id: data.id };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return null;
    }
  }, [fetchClients]);

  const updateClient = useCallback(async (
    clientId: string,
    input: UpdateClientInput
  ): Promise<boolean> => {
    setError(null);

    try {
      const response = await fetch(`/api/clients/${clientId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update client');
      }

      // Refresh the list
      await fetchClients();
      
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return false;
    }
  }, [fetchClients]);

  const deleteClient = useCallback(async (
    clientId: string,
    permanent: boolean = false
  ): Promise<boolean> => {
    setError(null);

    try {
      const url = permanent 
        ? `/api/clients/${clientId}?permanent=true`
        : `/api/clients/${clientId}`;
      
      const response = await fetch(url, { method: 'DELETE' });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete client');
      }

      // Refresh the list
      await fetchClients();
      
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return false;
    }
  }, [fetchClients]);

  const refresh = useCallback(async () => {
    await fetchClients(currentParams);
  }, [fetchClients, currentParams]);

  // Auto-fetch on mount
  useEffect(() => {
    if (autoFetch) {
      fetchClients(initialParams);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    clients,
    pagination,
    isLoading,
    error,
    fetchClients,
    createClient,
    updateClient,
    deleteClient,
    refresh,
  };
}

/**
 * Client detail response type
 */
interface ClientDetail {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  image?: string | null;
  preferredName?: string | null;
  pronouns?: string | null;
  dateOfBirth?: string | null;
  emergencyContact?: string | null;
  emergencyPhone?: string | null;
  intakeDate: string;
  isActive: boolean;
  notes?: string | null;
  therapist: {
    id: string;
    name: string;
  };
  sessions: Array<{
    id: string;
    sessionNumber: number;
    scheduledAt: string;
    status: string;
    crisisSeverity: string;
    hasSummary: boolean;
  }>;
  activePlan?: {
    id: string;
    updatedAt: string;
  } | null;
  stats: {
    totalSessions: number;
    totalPlans: number;
  };
  createdAt: string;
}

/**
 * Hook for fetching a single client
 */
export function useClient(clientId: string | null) {
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchClient = useCallback(async () => {
    if (!clientId) {
      setClient(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/clients/${clientId}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch client');
      }

      const data = await response.json();
      setClient(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setClient(null);
    } finally {
      setIsLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    fetchClient();
  }, [fetchClient]);

  return {
    client,
    isLoading,
    error,
    refresh: fetchClient,
  };
}

