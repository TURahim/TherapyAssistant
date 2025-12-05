'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CardSkeleton } from '@/components/shared/LoadingStates';
import { formatDate, getRelativeTime } from '@/lib/utils/dates';
import {
  Users,
  Calendar,
  FileText,
  Plus,
  ArrowRight,
  TrendingUp,
  Clock,
  AlertTriangle,
} from 'lucide-react';

interface DashboardStats {
  totalClients: number;
  activeClients: number;
  upcomingSessions: number;
  recentSessions: number;
}

interface RecentClient {
  id: string;
  firstName: string;
  lastName: string;
  preferredName?: string | null;
  lastSessionDate?: string | null;
  hasActivePlan: boolean;
}

interface UpcomingSession {
  id: string;
  clientName: string;
  clientId: string;
  scheduledAt: string;
  sessionNumber: number;
}

interface TherapistDashboardProps {
  stats: DashboardStats | null;
  recentClients: RecentClient[];
  upcomingSessions: UpcomingSession[];
  isLoading: boolean;
  therapistName: string;
}

export function TherapistDashboard({
  stats,
  recentClients,
  upcomingSessions,
  isLoading,
  therapistName,
}: TherapistDashboardProps) {
  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {getGreeting()}, {therapistName}
        </h1>
        <p className="text-muted-foreground">
          Here&apos;s an overview of your practice today
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Clients</p>
                <p className="text-3xl font-bold">{stats?.activeClients || 0}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="h-6 w-6 text-primary" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {stats?.totalClients || 0} total clients
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Upcoming Sessions</p>
                <p className="text-3xl font-bold">{stats?.upcomingSessions || 0}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-blue-500" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Next 7 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">This Week</p>
                <p className="text-3xl font-bold">{stats?.recentSessions || 0}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-green-500" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Sessions completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Quick Actions</p>
              </div>
            </div>
            <div className="flex gap-2 mt-2">
              <Button size="sm" asChild className="flex-1">
                <Link href="/clients/new">
                  <Plus className="h-4 w-4 mr-1" />
                  Client
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Sessions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg">Upcoming Sessions</CardTitle>
              <CardDescription>Your schedule for the next few days</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/clients">
                View all
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {upcomingSessions.length > 0 ? (
              <div className="space-y-3">
                {upcomingSessions.map((session) => (
                  <div
                    key={session.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/10">
                        <Clock className="h-5 w-5 text-blue-500" />
                      </div>
                      <div>
                        <p className="font-medium">{session.clientName}</p>
                        <p className="text-sm text-muted-foreground">
                          Session #{session.sessionNumber} · {formatDate(session.scheduledAt)}
                        </p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/clients/${session.clientId}`}>
                        View
                      </Link>
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Calendar className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No upcoming sessions</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Clients */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-lg">Recent Clients</CardTitle>
              <CardDescription>Clients you&apos;ve seen recently</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/clients">
                View all
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentClients.length > 0 ? (
              <div className="space-y-3">
                {recentClients.map((client) => (
                  <div
                    key={client.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">
                          {client.preferredName || `${client.firstName} ${client.lastName}`}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {client.lastSessionDate
                            ? `Last session ${getRelativeTime(client.lastSessionDate)}`
                            : 'No sessions yet'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {client.hasActivePlan && (
                        <FileText className="h-4 w-4 text-primary" />
                      )}
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/clients/${client.id}`}>
                          View
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground mb-4">No clients yet</p>
                <Button asChild>
                  <Link href="/clients/new">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Client
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Demo Notice */}
      <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
            <div>
              <p className="font-medium text-amber-900 dark:text-amber-200">Demo Environment</p>
              <p className="text-sm text-amber-800 dark:text-amber-300 mt-1">
                This is a demonstration environment. All data is synthetic and should not be used for
                real clinical purposes. AI-generated content requires professional review.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

