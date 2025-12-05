import type {
  TreatmentPlan as PrismaTreatmentPlan,
  PlanStatus,
  CrisisSeverity,
  TherapeuticModality,
} from '@prisma/client';

// Base plan type from Prisma
export type TreatmentPlan = PrismaTreatmentPlan;

// =============================================================================
// CANONICAL PLAN STRUCTURE
// =============================================================================

export interface CanonicalPlan {
  // Identifying information
  clientId: string;
  createdAt: string;
  updatedAt: string;
  version: number;

  // Presenting concerns
  presentingConcerns: PresentingConcern[];

  // Clinical impressions
  clinicalImpressions: ClinicalImpression[];

  // Diagnoses (optional)
  diagnoses: Diagnosis[];

  // Goals
  goals: Goal[];

  // Interventions
  interventions: Intervention[];

  // Strengths and protective factors
  strengths: Strength[];

  // Risk factors
  riskFactors: RiskFactor[];

  // Homework/between-session actions
  homework: HomeworkItem[];

  // Crisis assessment
  crisisAssessment: {
    severity: CrisisSeverity;
    lastAssessed: string;
    safetyPlanInPlace: boolean;
  };

  // Session references
  sessionReferences: SessionReference[];
}

export interface PresentingConcern {
  id: string;
  description: string;
  severity: 'mild' | 'moderate' | 'severe';
  duration?: string;
  impact?: string;
  sourceSessionIds: string[];
}

export interface ClinicalImpression {
  id: string;
  observation: string;
  category: string;
  sourceSessionIds: string[];
}

export interface Diagnosis {
  id: string;
  icdCode?: string;
  name: string;
  specifier?: string;
  status: 'provisional' | 'confirmed' | 'resolved';
  notes?: string;
}

export interface Goal {
  id: string;
  type: 'short_term' | 'long_term';
  description: string;
  measurableOutcome: string;
  targetDate?: string;
  status: 'not_started' | 'in_progress' | 'achieved' | 'revised';
  progress: number; // 0-100
  interventionIds: string[];
  sourceSessionIds: string[];
}

export interface Intervention {
  id: string;
  modality: TherapeuticModality;
  name: string;
  description: string;
  frequency?: string;
  rationale?: string;
  evidenceBase?: string;
}

export interface Strength {
  id: string;
  category: 'personal' | 'social' | 'environmental' | 'coping';
  description: string;
  howToLeverage?: string;
  sourceSessionIds: string[];
}

export interface RiskFactor {
  id: string;
  type: 'static' | 'dynamic';
  description: string;
  severity: CrisisSeverity;
  mitigationStrategy?: string;
  monitoringPlan?: string;
  sourceSessionIds: string[];
}

export interface HomeworkItem {
  id: string;
  title: string;
  description: string;
  rationale?: string;
  goalIds: string[];
  dueDate?: string;
  status: 'assigned' | 'in_progress' | 'completed' | 'skipped';
}

export interface SessionReference {
  sessionId: string;
  sessionNumber: number;
  date: string;
  keyContributions: string[];
}

// =============================================================================
// THERAPIST VIEW
// =============================================================================

export interface TherapistView {
  header: {
    clientName: string;
    planStatus: PlanStatus;
    lastUpdated: string;
    version: number;
  };

  clinicalSummary: {
    presentingProblems: string;
    diagnosticFormulation: string;
    treatmentRationale: string;
  };

  diagnoses: {
    primary?: DiagnosisDisplay;
    secondary: DiagnosisDisplay[];
  };

  treatmentGoals: {
    shortTerm: GoalDisplay[];
    longTerm: GoalDisplay[];
  };

  interventionPlan: InterventionDisplay[];

  riskAssessment: {
    currentLevel: CrisisSeverity;
    factors: RiskFactorDisplay[];
    safetyPlan?: string;
    emergencyContacts?: string[];
  };

  progressNotes: {
    summary: string;
    recentChanges: string[];
    nextSteps: string[];
  };

  homework: HomeworkDisplay[];

  sessionHistory: SessionHistoryItem[];
}

export interface DiagnosisDisplay {
  code: string;
  name: string;
  specifier?: string;
  status: string;
}

export interface GoalDisplay {
  id: string;
  goal: string;
  objective: string;
  progress: number;
  status: string;
  targetDate?: string;
  interventions: string[];
}

export interface InterventionDisplay {
  modality: string;
  technique: string;
  description: string;
  frequency: string;
  rationale: string;
}

export interface RiskFactorDisplay {
  factor: string;
  severity: string;
  mitigation: string;
}

export interface HomeworkDisplay {
  id: string;
  task: string;
  purpose: string;
  status: string;
  dueDate?: string;
}

export interface SessionHistoryItem {
  sessionNumber: number;
  date: string;
  keyPoints: string[];
}

// =============================================================================
// CLIENT VIEW
// =============================================================================

export interface ClientView {
  header: {
    greeting: string;
    lastUpdated: string;
  };

  overview: {
    whatWeAreWorkingOn: string;
    whyThisMatters: string;
    yourStrengths: string[];
  };

  goals: ClientGoalDisplay[];

  nextSteps: ClientNextStep[];

  homework: ClientHomeworkDisplay[];

  encouragement: {
    progressMessage: string;
    motivationalQuote?: string;
  };

  resources?: ClientResource[];
}

export interface ClientGoalDisplay {
  id: string;
  title: string;
  description: string;
  progress: number;
  celebration?: string; // Encouragement for progress
}

export interface ClientNextStep {
  step: string;
  why: string;
}

export interface ClientHomeworkDisplay {
  id: string;
  title: string;
  description: string;
  tip?: string;
  status: string;
}

export interface ClientResource {
  title: string;
  description: string;
  link?: string;
}

// =============================================================================
// PLAN OPERATIONS
// =============================================================================

// Plan with basic relations
export type PlanWithClient = PrismaTreatmentPlan & {
  client: {
    id: string;
    user: {
      firstName: string;
      lastName: string;
    };
    preferredName?: string | null;
  };
};

// Plan list item
export interface PlanListItem {
  id: string;
  clientId: string;
  clientName: string;
  status: PlanStatus;
  currentVersion: number;
  lastUpdated: Date;
  isLocked: boolean;
}

// Plan generation input
export interface GeneratePlanInput {
  clientId: string;
  sessionId: string;
  transcript: string;
  existingPlanId?: string; // For updates
  therapistPreferences?: TherapistPlanPreferences;
}

export interface TherapistPlanPreferences {
  preferredModalities: TherapeuticModality[];
  languageLevel: string;
  includeIcdCodes: boolean;
  customInstructions?: string;
}

// Plan update input
export interface UpdatePlanInput {
  planId: string;
  sessionId: string;
  transcript: string;
  mergeStrategy: 'replace' | 'merge' | 'append';
}

