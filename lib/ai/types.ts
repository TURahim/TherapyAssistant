import type { CrisisSeverity, TherapeuticModality } from '@prisma/client';

// =============================================================================
// PIPELINE TYPES
// =============================================================================

/**
 * Pipeline stage names
 */
export type PipelineStage =
  | 'transcription'
  | 'preprocessing'
  | 'crisis_check'
  | 'extraction'
  | 'therapist_view'
  | 'client_view'
  | 'summary'
  | 'saving'
  | 'complete';

/**
 * Pipeline execution context
 */
export interface PipelineContext {
  sessionId: string;
  clientId: string;
  therapistId: string;
  userId: string;
  transcript?: string;
  /** Optional audio upload details if transcription is required */
  audioUploadId?: string;
  audioStoragePath?: string;
  audioMimeType?: string;
  existingPlan?: CanonicalPlan | null;
  preferences?: TherapistPreferencesInput;
  startTime: number;
  /** Full client name for therapist view */
  clientName?: string;
  /** First name only for client view (more personal) */
  clientFirstName?: string;
}

/**
 * Pipeline stage result
 */
export interface StageResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  durationMs: number;
  tokenUsage?: TokenUsage;
}

/**
 * Token usage tracking
 */
export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCost: number;
}

/**
 * Pipeline progress update
 */
export interface PipelineProgress {
  stage: PipelineStage;
  progress: number; // 0-100
  message: string;
  estimatedTimeRemaining?: number;
}

/**
 * Complete pipeline result
 */
export interface PipelineResult {
  success: boolean;
  planId?: string;
  versionNumber?: number;
  crisisDetected: boolean;
  crisisSeverity?: CrisisSeverity;
  warnings: string[];
  errors: string[];
  processingTime: number;
  tokenUsage: TokenUsage;
}

// =============================================================================
// THERAPIST PREFERENCES
// =============================================================================

export interface TherapistPreferencesInput {
  preferredModalities: TherapeuticModality[];
  languageLevel: 'professional' | 'conversational' | 'simple';
  includeIcdCodes: boolean;
  customInstructions?: string;
  targetReadingLevel?: number | null;
  includePsychoeducation?: boolean;
}

// =============================================================================
// CANONICAL PLAN TYPES
// =============================================================================

/**
 * The canonical (internal) treatment plan structure
 * This is the source of truth from which views are generated
 */
export interface CanonicalPlan {
  clientId: string;
  createdAt: string;
  updatedAt: string;
  version: number;
  presentingConcerns: PresentingConcern[];
  clinicalImpressions: ClinicalImpression[];
  diagnoses: Diagnosis[];
  goals: Goal[];
  interventions: Intervention[];
  strengths: Strength[];
  riskFactors: RiskFactor[];
  homework: HomeworkItem[];
  crisisAssessment: CrisisAssessment;
  sessionReferences: SessionReference[];
}

export interface PresentingConcern {
  id: string;
  description: string;
  severity: 'mild' | 'moderate' | 'severe';
  duration: string;
  impact: string;
  sourceSessionIds: string[];
}

export interface ClinicalImpression {
  id: string;
  observation: string;
  category: 'Cognitive' | 'Emotional' | 'Behavioral' | 'Interpersonal' | 'Physiological';
  sourceSessionIds: string[];
}

export interface Diagnosis {
  id: string;
  icdCode?: string;
  name: string;
  status: 'provisional' | 'confirmed' | 'rule_out';
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
  modality: string;
  name: string;
  description: string;
  frequency: string;
  rationale: string;
}

export interface Strength {
  id: string;
  category: 'personal' | 'social' | 'environmental' | 'coping';
  description: string;
  sourceSessionIds: string[];
}

export interface RiskFactor {
  id: string;
  type: 'suicidal_ideation' | 'self_harm' | 'substance_use' | 'violence' | 'other';
  description: string;
  severity: CrisisSeverity;
  mitigatingFactors: string[];
  sourceSessionIds: string[];
}

export interface HomeworkItem {
  id: string;
  title: string;
  description: string;
  rationale: string;
  goalIds: string[];
  status: 'assigned' | 'in_progress' | 'completed' | 'skipped';
  dueDate?: string;
}

export interface CrisisAssessment {
  severity: CrisisSeverity;
  lastAssessed: string;
  indicators?: CrisisIndicator[];
  safetyPlanInPlace: boolean;
  safetyPlanDetails?: string;
}

export interface CrisisIndicator {
  type: string;
  quote: string;
  severity: CrisisSeverity;
  context?: string;
}

export interface SessionReference {
  sessionId: string;
  sessionNumber: number;
  date: string;
  keyContributions: string[];
}

// =============================================================================
// VIEW TYPES
// =============================================================================

/**
 * Therapist-facing view of the treatment plan
 */
export interface TherapistView {
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
    shortTerm: TherapistGoal[];
    longTerm: TherapistGoal[];
  };
  interventionPlan: TherapistIntervention[];
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

export interface TherapistGoal {
  id: string;
  goal: string;
  objective: string;
  progress: number;
  status: string;
  interventions: string[];
}

export interface TherapistIntervention {
  modality: string;
  technique: string;
  description: string;
  frequency: string;
  rationale: string;
}

/**
 * Client-facing view of the treatment plan
 */
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
  goals: ClientGoal[];
  nextSteps: Array<{
    step: string;
    why: string;
  }>;
  homework: ClientHomework[];
  encouragement: {
    progressMessage: string;
    celebrationPoints?: string[];
  };
}

export interface ClientGoal {
  id: string;
  title: string;
  description: string;
  progress: number;
  celebration?: string;
}

export interface ClientHomework {
  id: string;
  title: string;
  description: string;
  tip?: string;
  status: string;
}

// =============================================================================
// SUMMARY TYPES
// =============================================================================

export interface SessionSummaryOutput {
  therapistSummary: string;
  clientSummary: string;
  keyTopics: string[];
  progressNotes?: string;
  moodAssessment?: string;
}

// =============================================================================
// AI MODEL TYPES
// =============================================================================

export type AIModel = 'gpt-4o' | 'gpt-4o-mini' | 'gpt-4-turbo' | 'gpt-3.5-turbo';

export interface ModelConfig {
  model: AIModel;
  temperature: number;
  maxTokens: number;
  costPer1kPromptTokens: number;
  costPer1kCompletionTokens: number;
}

// =============================================================================
// EXTRACTION TYPES
// =============================================================================

export interface ExtractionInput {
  transcript: string;
  existingPlan?: CanonicalPlan | null;
  preferences?: TherapistPreferencesInput;
  sessionNumber: number;
  clientContext?: string;
}

export interface ExtractionOutput {
  concerns: PresentingConcern[];
  impressions: ClinicalImpression[];
  suggestedDiagnoses: Diagnosis[];
  goals: Goal[];
  interventions: Intervention[];
  strengths: Strength[];
  risks: RiskFactor[];
  homework: HomeworkItem[];
}

// =============================================================================
// PREPROCESSING TYPES
// =============================================================================

export interface PreprocessedTranscript {
  originalLength: number;
  processedLength: number;
  chunks: TranscriptChunk[];
  speakers: SpeakerInfo[];
  metadata: TranscriptMetadata;
}

export interface TranscriptChunk {
  index: number;
  text: string;
  startOffset: number;
  endOffset: number;
  speakerTurns: number;
}

export interface SpeakerInfo {
  label: 'therapist' | 'client' | 'unknown';
  turnCount: number;
  approximateWordCount: number;
}

export interface TranscriptMetadata {
  estimatedDuration: number; // minutes
  topicDensity: number; // 0-1
  emotionalIntensity: number; // 0-1
  hasCrisisLanguage: boolean;
}

