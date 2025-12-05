'use client';

import { use } from 'react';
import { usePlan } from '@/lib/hooks/usePlan';
import { PlanViewer } from '@/components/therapist/PlanViewer';
import { FullPageSpinner } from '@/components/shared/LoadingSpinner';
import { ErrorFallback } from '@/components/shared/ErrorBoundary';
import { useToast } from '@/hooks/use-toast';

interface PageProps {
  params: Promise<{ planId: string }>;
}

export default function PlanViewPage({ params }: PageProps) {
  const { planId } = use(params);
  const { toast } = useToast();
  const {
    plan,
    isLoading,
    error,
    refresh,
    publish,
    archive,
  } = usePlan(planId);

  const handlePublish = async () => {
    const success = await publish();
    if (success) {
      toast({
        title: 'Plan shared',
        description: 'The treatment plan has been shared with the client.',
      });
    }
  };

  const handleArchive = async () => {
    const success = await archive();
    if (success) {
      toast({
        title: 'Plan archived',
        description: 'The treatment plan has been archived.',
      });
    }
  };

  const handleExport = () => {
    // TODO: Implement PDF export
    toast({
      title: 'Coming soon',
      description: 'PDF export will be available in a future update.',
    });
  };

  if (isLoading) {
    return <FullPageSpinner label="Loading treatment plan..." />;
  }

  if (error || !plan) {
    return (
      <ErrorFallback
        error={new Error(error || 'Treatment plan not found')}
        onReset={refresh}
        title="Failed to load treatment plan"
      />
    );
  }

  // Transform plan data for the viewer
  const therapistView = plan.therapistView as {
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
  };

  // Default empty structure if therapistView is empty
  const defaultTherapistView = {
    header: {
      clientName: plan.clientName,
      planStatus: plan.status,
      lastUpdated: plan.updatedAt,
      version: plan.currentVersion,
    },
    clinicalSummary: {
      presentingProblems: '',
      diagnosticFormulation: '',
      treatmentRationale: '',
    },
    diagnoses: {
      primary: undefined,
      secondary: [],
    },
    treatmentGoals: {
      shortTerm: [],
      longTerm: [],
    },
    interventionPlan: [],
    riskAssessment: {
      currentLevel: 'NONE',
      factors: [],
    },
    progressNotes: {
      summary: '',
      recentChanges: [],
      nextSteps: [],
    },
    homework: [],
    sessionHistory: [],
  };

  const viewData = therapistView && Object.keys(therapistView).length > 0
    ? therapistView
    : defaultTherapistView;

  // Get crisis assessment from canonical plan
  const canonicalPlan = plan.canonicalPlan as {
    crisisAssessment?: {
      severity: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
      lastAssessed: string;
      indicators?: Array<{
        type: string;
        quote: string;
        severity: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
        context?: string;
      }>;
      safetyPlanInPlace: boolean;
      safetyPlanDetails?: string;
    };
  } | null;

  return (
    <PlanViewer
      planId={plan.id}
      clientId={plan.clientId}
      clientName={plan.clientName}
      status={plan.status}
      currentVersion={plan.currentVersion}
      lastGeneratedAt={plan.lastGeneratedAt}
      publishedAt={plan.publishedAt}
      therapistView={viewData}
      crisisAssessment={canonicalPlan?.crisisAssessment}
      onPublish={handlePublish}
      onArchive={handleArchive}
      onExport={handleExport}
    />
  );
}

