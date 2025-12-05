'use client';

import { use } from 'react';
import Link from 'next/link';
import { useClient } from '@/lib/hooks/useClients';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FullPageSpinner } from '@/components/shared/LoadingSpinner';
import { ErrorFallback } from '@/components/shared/ErrorBoundary';
import { formatDate, getRelativeTime } from '@/lib/utils/dates';
import {
  ChevronLeft,
  Calendar,
  FileText,
  Mail,
  Phone,
  User,
  Users,
  Edit,
  Plus,
  AlertTriangle,
} from 'lucide-react';

interface PageProps {
  params: Promise<{ clientId: string }>;
}

export default function ClientDetailPage({ params }: PageProps) {
  const { clientId } = use(params);
  const { client, isLoading, error, refresh } = useClient(clientId);

  if (isLoading) {
    return <FullPageSpinner label="Loading client..." />;
  }

  if (error || !client) {
    return (
      <ErrorFallback
        error={new Error(error || 'Client not found')}
        onReset={refresh}
        title="Failed to load client"
      />
    );
  }

  const displayName = client.preferredName
    ? `${client.preferredName} (${client.firstName} ${client.lastName})`
    : `${client.firstName} ${client.lastName}`;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/clients">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Clients
          </Link>
        </Button>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <User className="h-7 w-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{displayName}</h1>
              {client.pronouns && (
                <span className="text-sm text-muted-foreground">({client.pronouns})</span>
              )}
              {!client.isActive && (
                <span className="inline-flex items-center rounded-full bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
                  Inactive
                </span>
              )}
            </div>
            <p className="text-muted-foreground">{client.email}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href={`/clients/${clientId}?edit=true`}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Link>
          </Button>
          <Button asChild>
            <Link href={`/clients/${clientId}/sessions/new`}>
              <Plus className="h-4 w-4 mr-2" />
              New Session
            </Link>
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Intake</span>
            </div>
            <p className="text-2xl font-bold mt-1">{formatDate(client.intakeDate)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Sessions</span>
            </div>
            <p className="text-2xl font-bold mt-1">{client.stats?.totalSessions || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Plans</span>
            </div>
            <p className="text-2xl font-bold mt-1">{client.stats?.totalPlans || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Therapist</span>
            </div>
            <p className="text-lg font-medium mt-1 truncate">{client.therapist?.name}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="sessions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
          {client.activePlan && <TabsTrigger value="plan">Treatment Plan</TabsTrigger>}
        </TabsList>

        {/* Sessions Tab */}
        <TabsContent value="sessions" className="space-y-4">
          {client.sessions && client.sessions.length > 0 ? (
            <div className="space-y-3">
              {client.sessions.map((session) => (
                <Card key={session.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Session #{session.sessionNumber}</span>
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                              session.status === 'COMPLETED'
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                : session.status === 'SCHEDULED'
                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                            }`}
                          >
                            {session.status}
                          </span>
                          {session.crisisSeverity !== 'NONE' && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
                              <AlertTriangle className="h-3 w-3" />
                              {session.crisisSeverity}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {formatDate(session.scheduledAt)} · {getRelativeTime(session.scheduledAt)}
                        </p>
                      </div>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/sessions/${session.id}`}>View</Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Calendar className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <h3 className="font-medium">No sessions yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Create a session to start treatment
                </p>
                <Button asChild>
                  <Link href={`/clients/${clientId}/sessions/new`}>
                    <Plus className="h-4 w-4 mr-2" />
                    Schedule First Session
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Details Tab */}
        <TabsContent value="details" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{client.email}</span>
                </div>
                {client.dateOfBirth && (
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>DOB: {formatDate(client.dateOfBirth)}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Emergency Contact</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {client.emergencyContact ? (
                  <>
                    <div className="flex items-center gap-3">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span>{client.emergencyContact}</span>
                    </div>
                    {client.emergencyPhone && (
                      <div className="flex items-center gap-3">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{client.emergencyPhone}</span>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">No emergency contact on file</p>
                )}
              </CardContent>
            </Card>
          </div>

          {client.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Clinical Notes</CardTitle>
                <CardDescription>Private notes visible only to you</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{client.notes}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Plan Tab */}
        {client.activePlan && (
          <TabsContent value="plan">
            <Card>
              <CardHeader>
                <CardTitle>Active Treatment Plan</CardTitle>
                <CardDescription>
                  Last updated {getRelativeTime(client.activePlan.updatedAt)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild>
                  <Link href={`/plans/${client.activePlan.id}`}>
                    View Full Plan
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

