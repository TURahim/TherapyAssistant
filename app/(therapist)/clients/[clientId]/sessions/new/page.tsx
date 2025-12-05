'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useClient } from '@/lib/hooks/useClients';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { FullPageSpinner } from '@/components/shared/LoadingSpinner';
import { ErrorFallback } from '@/components/shared/ErrorBoundary';
import { useToast } from '@/hooks/use-toast';
import { ChevronLeft, Calendar, Loader2, User } from 'lucide-react';
import { toDateTimeInputValue } from '@/lib/utils/dates';

interface PageProps {
  params: Promise<{ clientId: string }>;
}

const sessionFormSchema = z.object({
  scheduledAt: z.string().min(1, 'Date and time is required'),
  durationMinutes: z.number().min(15).max(180).optional(),
  notes: z.string().optional(),
});

type SessionFormValues = z.infer<typeof sessionFormSchema>;

export default function NewSessionPage({ params }: PageProps) {
  const { clientId } = use(params);
  const router = useRouter();
  const { toast } = useToast();
  const { client, isLoading, error } = useClient(clientId);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Default to tomorrow at 10 AM
  const defaultDate = new Date();
  defaultDate.setDate(defaultDate.getDate() + 1);
  defaultDate.setHours(10, 0, 0, 0);

  const form = useForm<SessionFormValues>({
    resolver: zodResolver(sessionFormSchema),
    defaultValues: {
      scheduledAt: toDateTimeInputValue(defaultDate),
      durationMinutes: 50,
      notes: '',
    },
  });

  const onSubmit = async (values: SessionFormValues) => {
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          scheduledAt: new Date(values.scheduledAt).toISOString(),
          durationMinutes: values.durationMinutes,
          notes: values.notes || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create session');
      }

      const data = await response.json();

      toast({
        title: 'Session scheduled',
        description: `Session #${data.sessionNumber} has been scheduled.`,
      });

      router.push(`/sessions/${data.id}`);
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to create session',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <FullPageSpinner label="Loading client..." />;
  }

  if (error || !client) {
    return (
      <ErrorFallback
        error={new Error(error || 'Client not found')}
        title="Failed to load client"
      />
    );
  }

  const clientName = client.preferredName ||
    `${client.firstName} ${client.lastName}`;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/clients/${clientId}`}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to {clientName}
          </Link>
        </Button>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Schedule New Session</h1>
        <p className="text-muted-foreground">
          Create a new therapy session with {clientName}
        </p>
      </div>

      {/* Client Info Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <User className="h-5 w-5" />
            </div>
            <div>
              <p className="font-medium">{clientName}</p>
              <p className="text-sm text-muted-foreground">{client.email}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Session Form */}
      <Card>
        <CardHeader>
          <CardTitle>Session Details</CardTitle>
          <CardDescription>
            Set the date, time, and optional notes for this session
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="scheduledAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date & Time *</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="datetime-local"
                          className="pl-10"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormDescription>
                      When should this session be scheduled?
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="durationMinutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration (minutes)</FormLabel>
                    <FormControl>
<Input
                          type="number"
                          min={15}
                          max={180}
                          step={5}
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                        />
                    </FormControl>
                    <FormDescription>
                      Expected session length (15-180 minutes)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pre-Session Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Any notes or goals for this session..."
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Optional notes visible only to you
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Schedule Session
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

