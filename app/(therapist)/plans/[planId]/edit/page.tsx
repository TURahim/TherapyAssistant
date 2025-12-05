'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { usePlan } from '@/lib/hooks/usePlan';
import { PlanEditor } from '@/components/therapist/PlanEditor';
import { FullPageSpinner } from '@/components/shared/LoadingSpinner';
import { ErrorFallback } from '@/components/shared/ErrorBoundary';
import { useToast } from '@/hooks/use-toast';
import type { CrisisSeverity } from '@prisma/client';

interface PageProps {
  params: Promise<{ planId: string }>;
}

// Types for plan data
interface Goal {
  id: string;
  type: 'short_term' | 'long_term';
  description: string;
  measurableOutcome: string;
  targetDate?: string;
  status: 'not_started' | 'in_progress' | 'achieved' | 'revised';
  progress: number;
  interventionIds: string[];
  sourceSessionIds: string[];
}

interface Intervention {
  id: string;
  modality: string;
  name: string;
  description: string;
  frequency: string;
  rationale: string;
}

interface HomeworkItem {
  id: string;
  title: string;
  description: string;
  rationale: string;
  goalIds: string[];
  status: 'assigned' | 'in_progress' | 'completed' | 'skipped';
  dueDate?: string;
}

interface Diagnosis {
  id: string;
  icdCode?: string;
  name: string;
  status: 'provisional' | 'confirmed' | 'rule_out';
  notes?: string;
}

interface RiskFactor {
  id: string;
  type: 'suicidal_ideation' | 'self_harm' | 'substance_use' | 'violence' | 'other';
  description: string;
  severity: CrisisSeverity;
  mitigatingFactors: string[];
  sourceSessionIds: string[];
}

interface ClinicalSummary {
  presentingProblems: string;
  diagnosticFormulation: string;
  treatmentRationale: string;
}

interface PlanData {
  goals: Goal[];
  interventions: Intervention[];
  homework: HomeworkItem[];
  diagnoses: Diagnosis[];
  riskFactors: RiskFactor[];
  clinicalSummary: ClinicalSummary;
  currentRiskLevel: CrisisSeverity;
}

export default function PlanEditPage({ params }: PageProps) {
  const { planId } = use(params);
  const router = useRouter();
  const { toast } = useToast();
  const {
    plan,
    isLoading,
    error,
    refresh,
  } = usePlan(planId);

  const handleSave = async (data: PlanData) => {
    // TODO: Implement save API call
    // This would call an API endpoint to update the plan
    try {
      const response = await fetch(`/api/plans/${planId}/update`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save plan');
      }

      await refresh();
      router.push(`/plans/${planId}`);
    } catch (err) {
      throw err;
    }
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

  // Transform stored data back to editable format
  const therapistView = plan.therapistView as {
    clinicalSummary?: {
      presentingProblems: string;
      diagnosticFormulation: string;
      treatmentRationale: string;
    };
    diagnoses?: {
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
    treatmentGoals?: {
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
    interventionPlan?: Array<{
      modality: string;
      technique: string;
      description: string;
      frequency: string;
      rationale: string;
    }>;
    riskAssessment?: {
      currentLevel: string;
      factors: Array<{
        type: string;
        description: string;
        mitigation: string;
      }>;
    };
    homework?: Array<{
      id: string;
      task: string;
      purpose: string;
      status: string;
    }>;
  } | null;

  // Transform goals
  const goals: Goal[] = [
    ...(therapistView?.treatmentGoals?.shortTerm || []).map((g) => ({
      id: g.id,
      type: 'short_term' as const,
      description: g.goal,
      measurableOutcome: g.objective,
      status: g.status as Goal['status'],
      progress: g.progress,
      interventionIds: g.interventions,
      sourceSessionIds: [],
    })),
    ...(therapistView?.treatmentGoals?.longTerm || []).map((g) => ({
      id: g.id,
      type: 'long_term' as const,
      description: g.goal,
      measurableOutcome: g.objective,
      status: g.status as Goal['status'],
      progress: g.progress,
      interventionIds: g.interventions,
      sourceSessionIds: [],
    })),
  ];

  // Transform interventions
  const interventions: Intervention[] = (therapistView?.interventionPlan || []).map((i, idx) => ({
    id: `intervention-${idx}`,
    modality: i.modality,
    name: i.technique,
    description: i.description,
    frequency: i.frequency,
    rationale: i.rationale,
  }));

  // Transform homework
  const homework: HomeworkItem[] = (therapistView?.homework || []).map((h) => ({
    id: h.id,
    title: h.task,
    description: h.purpose,
    rationale: '',
    goalIds: [],
    status: h.status as HomeworkItem['status'],
  }));

  // Transform diagnoses
  const diagnoses: Diagnosis[] = [
    ...(therapistView?.diagnoses?.primary
      ? [{
          id: 'primary',
          icdCode: therapistView.diagnoses.primary.code,
          name: therapistView.diagnoses.primary.name,
          status: therapistView.diagnoses.primary.status as Diagnosis['status'],
        }]
      : []),
    ...(therapistView?.diagnoses?.secondary || []).map((d, idx) => ({
      id: `secondary-${idx}`,
      icdCode: d.code,
      name: d.name,
      status: d.status as Diagnosis['status'],
    })),
  ];

  // Transform risk factors
  const riskFactors: RiskFactor[] = (therapistView?.riskAssessment?.factors || []).map((f, idx) => ({
    id: `risk-${idx}`,
    type: 'other' as const,
    description: f.description,
    severity: (therapistView?.riskAssessment?.currentLevel || 'NONE') as CrisisSeverity,
    mitigatingFactors: f.mitigation ? [f.mitigation] : [],
    sourceSessionIds: [],
  }));

  // Clinical summary
  const clinicalSummary: ClinicalSummary = {
    presentingProblems: therapistView?.clinicalSummary?.presentingProblems || '',
    diagnosticFormulation: therapistView?.clinicalSummary?.diagnosticFormulation || '',
    treatmentRationale: therapistView?.clinicalSummary?.treatmentRationale || '',
  };

  // Current risk level
  const currentRiskLevel = (therapistView?.riskAssessment?.currentLevel || 'NONE') as CrisisSeverity;

  const initialData: PlanData = {
    goals,
    interventions,
    homework,
    diagnoses,
    riskFactors,
    clinicalSummary,
    currentRiskLevel,
  };

  return (
    <PlanEditor
      planId={plan.id}
      clientId={plan.clientId}
      clientName={plan.clientName}
      status={plan.status}
      currentVersion={plan.currentVersion}
      isLocked={plan.isLocked}
      initialData={initialData}
      showIcdCodes={true}
      onSave={handleSave}
    />
  );
}

