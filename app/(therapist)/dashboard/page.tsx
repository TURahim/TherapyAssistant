'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { TherapistDashboard } from '@/components/therapist/TherapistDashboard';

interface DashboardData {
  stats: {
    totalClients: number;
    activeClients: number;
    upcomingSessions: number;
    recentSessions: number;
  };
  recentClients: Array<{
    id: string;
    firstName: string;
    lastName: string;
    preferredName?: string | null;
    lastSessionDate?: string | null;
    hasActivePlan: boolean;
  }>;
  upcomingSessions: Array<{
    id: string;
    clientName: string;
    clientId: string;
    scheduledAt: string;
    sessionNumber: number;
  }>;
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        // Fetch clients for recent list
        const clientsResponse = await fetch('/api/clients?limit=5&sortBy=intakeDate&sortOrder=desc');
        const clientsData = await clientsResponse.json();

        // Transform client data
        const recentClients = (clientsData.items || []).map((client: {
          id: string;
          firstName: string;
          lastName: string;
          preferredName?: string | null;
          lastSessionDate?: string | null;
          activePlanId?: string | null;
        }) => ({
          id: client.id,
          firstName: client.firstName,
          lastName: client.lastName,
          preferredName: client.preferredName,
          lastSessionDate: client.lastSessionDate,
          hasActivePlan: !!client.activePlanId,
        }));

        // Extract stats from pagination
        const totalClients = clientsData.pagination?.total || 0;
        
        // Count active clients (filter from the items we have or use a separate count)
        const activeClients = (clientsData.items || []).filter((c: { isActive: boolean }) => c.isActive).length;

        setDashboardData({
          stats: {
            totalClients,
            activeClients,
            upcomingSessions: 0, // Will be populated when sessions API is built
            recentSessions: 0,   // Will be populated when sessions API is built
          },
          recentClients,
          upcomingSessions: [], // Will be populated when sessions API is built
        });
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
        setDashboardData({
          stats: {
            totalClients: 0,
            activeClients: 0,
            upcomingSessions: 0,
            recentSessions: 0,
          },
          recentClients: [],
          upcomingSessions: [],
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

  const therapistName = session?.user?.firstName || 'Therapist';

  return (
    <TherapistDashboard
      stats={dashboardData?.stats || null}
      recentClients={dashboardData?.recentClients || []}
      upcomingSessions={dashboardData?.upcomingSessions || []}
      isLoading={isLoading}
      therapistName={therapistName}
    />
  );
}

