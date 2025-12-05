'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { PlanCard } from './PlanCard';
import { GoalList, GoalListItem } from './GoalList';
import { StrengthsList } from './StrengthsList';
import { SessionSummaryCard } from './SessionSummaryCard';
import { CalendarDays, ClipboardList, Sparkles } from 'lucide-react';
import Link from 'next/link';

export interface ClientHomeProps {
  clientName: string;
  activePlan?: {
    id: string;
    title: string;
    status: 'ACTIVE' | 'DRAFT' | 'ARCHIVED';
    summary?: string;
    progress?: number;
    lastUpdated?: string;
  };
  goals?: GoalListItem[];
  strengths?: string[];
  lastSummary?: { sessionNumber: number; summary: string; generatedAt: Date | null };
  nextSession?: { date: string; focus?: string };
}

export function ClientHome({
  clientName,
  activePlan,
  goals = [],
  strengths = [],
  lastSummary,
  nextSession,
}: ClientHomeProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Welcome back, {clientName} 👋</h1>
          <p className="text-muted-foreground">Here’s a quick look at your plan and progress.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline">
            <Link href="/plan">
              <ClipboardList className="h-4 w-4 mr-2" />
              View Plan
            </Link>
          </Button>
          <Button asChild>
            <Link href="/homework">
              <Sparkles className="h-4 w-4 mr-2" />
              Homework
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-[2fr,1.2fr]">
        <div className="space-y-4">
          {activePlan ? (
            <PlanCard
              planId={activePlan.id}
              title={activePlan.title}
              status={activePlan.status}
              summary={activePlan.summary}
              progress={activePlan.progress}
              lastUpdated={activePlan.lastUpdated}
            />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>No active plan</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Once your therapist publishes a plan, it will appear here.
                </p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Your Goals</CardTitle>
            </CardHeader>
            <CardContent>
              <GoalList goals={goals} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Your Strengths</CardTitle>
            </CardHeader>
            <CardContent>
              <StrengthsList strengths={strengths} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarDays className="h-4 w-4" />
                Next Session
              </CardTitle>
            </CardHeader>
            <CardContent>
              {nextSession ? (
                <div className="space-y-1 text-sm">
                  <p className="font-medium">{nextSession.date}</p>
                  {nextSession.focus && <p className="text-muted-foreground">Focus: {nextSession.focus}</p>}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Not scheduled yet</p>
              )}
            </CardContent>
          </Card>

          {lastSummary && (
            <SessionSummaryCard
              sessionNumber={lastSummary.sessionNumber}
              summary={lastSummary.summary}
              generatedAt={lastSummary.generatedAt}
            />
          )}

          <Card>
            <CardHeader>
              <CardTitle>Tips to stay on track</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <ul className="list-disc pl-5 space-y-1">
                <li>Review your action items for the week.</li>
                <li>Log quick notes when you practice skills.</li>
                <li>Bring any questions to your next session.</li>
              </ul>
              <Separator />
              <p>Small steps add up. You’ve got this! 💪</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default ClientHome;

