'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  FileText,
  User,
  Calendar,
  Clock,
  History,
  Share2,
  Download,
  Edit,
  MoreHorizontal,
  Brain,
  Heart,
  MessageSquare,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PlanSection, StatusBadge } from './PlanSection';
import { GoalEditor } from './GoalEditor';
import { InterventionEditor } from './InterventionEditor';
import { HomeworkEditor } from './HomeworkEditor';
import { DiagnosisEditor } from './DiagnosisEditor';
import { RiskEditor } from './RiskEditor';
import { RiskIndicatorList } from './RiskIndicatorList';
import { cn } from '@/lib/utils';
import type { PlanStatus, CrisisSeverity } from '@prisma/client';

// =============================================================================
// TYPES
// =============================================================================

interface TherapistViewData {
  header: {
    clientName: string;
    planStatus: string;
    lastUpdated: string;
    version: number;
  };
  clinicalSummary: {
    presentingProblems: string;
    diagnosticFormulation: string;
    treatmentRationale: string;
  };
  diagnoses: {
    primary?: {
      code?: string;
      name: string;
      status: string;
    };
    secondary: Array<{
      code?: string;
      name: string;
      status: string;
    }>;
  };
  treatmentGoals: {
    shortTerm: Array<{
      id: string;
      goal: string;
      objective: string;
      progress: number;
      status: string;
      interventions: string[];
    }>;
    longTerm: Array<{
      id: string;
      goal: string;
      objective: string;
      progress: number;
      status: string;
      interventions: string[];
    }>;
  };
  interventionPlan: Array<{
    modality: string;
    technique: string;
    description: string;
    frequency: string;
    rationale: string;
  }>;
  riskAssessment: {
    currentLevel: string;
    factors: Array<{
      type: string;
      description: string;
      mitigation: string;
    }>;
  };
  progressNotes: {
    summary: string;
    recentChanges: string[];
    nextSteps: string[];
  };
  homework: Array<{
    id: string;
    task: string;
    purpose: string;
    status: string;
  }>;
  sessionHistory: Array<{
    sessionNumber: number;
    date: string;
    keyPoints: string[];
  }>;
}

interface PlanViewerProps {
  planId: string;
  clientId: string;
  clientName: string;
  status: PlanStatus;
  currentVersion: number;
  lastGeneratedAt?: string | null;
  publishedAt?: string | null;
  therapistView: TherapistViewData;
  crisisAssessment?: {
    severity: CrisisSeverity;
    lastAssessed: string;
    indicators?: Array<{
      type: string;
      quote: string;
      severity: CrisisSeverity;
      context?: string;
    }>;
    safetyPlanInPlace: boolean;
    safetyPlanDetails?: string;
  };
  onPublish?: () => void;
  onArchive?: () => void;
  onExport?: () => void;
  className?: string;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function PlanViewer({
  planId,
  clientId,
  clientName,
  status,
  currentVersion,
  lastGeneratedAt,
  publishedAt,
  therapistView,
  crisisAssessment,
  onPublish,
  onArchive,
  onExport,
  className,
}: PlanViewerProps) {
  const [activeTab, setActiveTab] = useState('overview');

  // Transform data for editors (view mode only)
  const transformedGoals = [
    ...therapistView.treatmentGoals.shortTerm.map((g) => ({
      id: g.id,
      type: 'short_term' as const,
      description: g.goal,
      measurableOutcome: g.objective,
      status: g.status as 'not_started' | 'in_progress' | 'achieved' | 'revised',
      progress: g.progress,
      interventionIds: g.interventions,
      sourceSessionIds: [],
    })),
    ...therapistView.treatmentGoals.longTerm.map((g) => ({
      id: g.id,
      type: 'long_term' as const,
      description: g.goal,
      measurableOutcome: g.objective,
      status: g.status as 'not_started' | 'in_progress' | 'achieved' | 'revised',
      progress: g.progress,
      interventionIds: g.interventions,
      sourceSessionIds: [],
    })),
  ];

  const transformedInterventions = therapistView.interventionPlan.map((i, idx) => ({
    id: `intervention-${idx}`,
    modality: i.modality,
    name: i.technique,
    description: i.description,
    frequency: i.frequency,
    rationale: i.rationale,
  }));

  const transformedHomework = therapistView.homework.map((h) => ({
    id: h.id,
    title: h.task,
    description: h.purpose,
    rationale: '',
    goalIds: [],
    status: h.status as 'assigned' | 'in_progress' | 'completed' | 'skipped',
  }));

  const transformedDiagnoses = [
    ...(therapistView.diagnoses.primary
      ? [{
          id: 'primary',
          icdCode: therapistView.diagnoses.primary.code,
          name: therapistView.diagnoses.primary.name,
          status: therapistView.diagnoses.primary.status as 'provisional' | 'confirmed' | 'rule_out',
        }]
      : []),
    ...therapistView.diagnoses.secondary.map((d, idx) => ({
      id: `secondary-${idx}`,
      icdCode: d.code,
      name: d.name,
      status: d.status as 'provisional' | 'confirmed' | 'rule_out',
    })),
  ];

  const transformedRiskFactors = therapistView.riskAssessment.factors.map((f, idx) => ({
    id: `risk-${idx}`,
    type: 'other' as const,
    description: f.description,
    severity: (therapistView.riskAssessment.currentLevel as CrisisSeverity) || 'NONE',
    mitigatingFactors: f.mitigation ? [f.mitigation] : [],
    sourceSessionIds: [],
  }));

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">Treatment Plan</h1>
            <StatusBadge status={status} />
            <span className="text-sm text-muted-foreground">v{currentVersion}</span>
          </div>
          <Link
            href={`/clients/${clientId}`}
            className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
          >
            <User className="h-4 w-4" />
            {clientName}
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href={`/plans/${planId}/edit`}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Plan
            </Link>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {!publishedAt && status === 'ACTIVE' && onPublish && (
                <DropdownMenuItem onClick={onPublish}>
                  <Share2 className="h-4 w-4 mr-2" />
                  Share with Client
                </DropdownMenuItem>
              )}
              {onExport && (
                <DropdownMenuItem onClick={onExport}>
                  <Download className="h-4 w-4 mr-2" />
                  Export as PDF
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href={`/plans/${planId}/versions`}>
                  <History className="h-4 w-4 mr-2" />
                  Version History
                </Link>
              </DropdownMenuItem>
              {status !== 'ARCHIVED' && onArchive && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onArchive} className="text-destructive">
                    Archive Plan
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Meta Info */}
      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
        {lastGeneratedAt && (
          <span className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            Generated: {new Date(lastGeneratedAt).toLocaleDateString()}
          </span>
        )}
        {publishedAt && (
          <span className="flex items-center gap-1 text-green-600">
            <Share2 className="h-4 w-4" />
            Shared with client: {new Date(publishedAt).toLocaleDateString()}
          </span>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="treatment" className="gap-2">
            <Brain className="h-4 w-4" />
            <span className="hidden sm:inline">Treatment</span>
          </TabsTrigger>
          <TabsTrigger value="risk" className="gap-2">
            <Heart className="h-4 w-4" />
            <span className="hidden sm:inline">Risk & Safety</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            <span className="hidden sm:inline">Sessions</span>
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          {/* Clinical Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Clinical Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Presenting Problems</h4>
                <p className="text-sm">{therapistView.clinicalSummary.presentingProblems}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Diagnostic Formulation</h4>
                <p className="text-sm">{therapistView.clinicalSummary.diagnosticFormulation}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Treatment Rationale</h4>
                <p className="text-sm">{therapistView.clinicalSummary.treatmentRationale}</p>
              </div>
            </CardContent>
          </Card>

          {/* Diagnoses */}
          <DiagnosisEditor
            diagnoses={transformedDiagnoses}
            showIcdCodes={true}
            readOnly
          />

          {/* Progress Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Progress Notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm">{therapistView.progressNotes.summary}</p>
              
              {therapistView.progressNotes.recentChanges.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Recent Changes</h4>
                  <ul className="space-y-1">
                    {therapistView.progressNotes.recentChanges.map((change, i) => (
                      <li key={i} className="text-sm flex items-start gap-2">
                        <span className="text-primary">•</span>
                        {change}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {therapistView.progressNotes.nextSteps.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Next Steps</h4>
                  <ul className="space-y-1">
                    {therapistView.progressNotes.nextSteps.map((step, i) => (
                      <li key={i} className="text-sm flex items-start gap-2">
                        <span className="text-primary">•</span>
                        {step}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Treatment Tab */}
        <TabsContent value="treatment" className="space-y-4 mt-4">
          <GoalEditor
            goals={transformedGoals}
            interventions={transformedInterventions.map((i) => ({ id: i.id, name: i.name }))}
            readOnly
          />

          <InterventionEditor
            interventions={transformedInterventions}
            readOnly
          />

          <HomeworkEditor
            homework={transformedHomework}
            goals={transformedGoals.map((g) => ({ id: g.id, description: g.description }))}
            readOnly
          />
        </TabsContent>

        {/* Risk & Safety Tab */}
        <TabsContent value="risk" className="space-y-4 mt-4">
          {crisisAssessment && (
            <RiskIndicatorList
              indicators={crisisAssessment.indicators || []}
              overallSeverity={crisisAssessment.severity}
              lastAssessed={crisisAssessment.lastAssessed}
              safetyPlanInPlace={crisisAssessment.safetyPlanInPlace}
              safetyPlanDetails={crisisAssessment.safetyPlanDetails}
            />
          )}

          <RiskEditor
            riskFactors={transformedRiskFactors}
            currentRiskLevel={crisisAssessment?.severity || 'NONE'}
            readOnly
          />
        </TabsContent>

        {/* Session History Tab */}
        <TabsContent value="history" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Session History</CardTitle>
              <CardDescription>
                Sessions that contributed to this treatment plan
              </CardDescription>
            </CardHeader>
            <CardContent>
              {therapistView.sessionHistory.length > 0 ? (
                <div className="space-y-4">
                  {therapistView.sessionHistory.map((session, index) => (
                    <div key={index} className="p-4 bg-muted/30 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">Session #{session.sessionNumber}</span>
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {new Date(session.date).toLocaleDateString()}
                        </span>
                      </div>
                      {session.keyPoints.length > 0 && (
                        <ul className="space-y-1">
                          {session.keyPoints.map((point, i) => (
                            <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                              <span className="text-primary">•</span>
                              {point}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  No session history available.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default PlanViewer;

