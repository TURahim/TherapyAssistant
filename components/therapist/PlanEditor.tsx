'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Save,
  Loader2,
  AlertTriangle,
  Lock,
  User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GoalEditor } from './GoalEditor';
import { InterventionEditor } from './InterventionEditor';
import { HomeworkEditor } from './HomeworkEditor';
import { DiagnosisEditor } from './DiagnosisEditor';
import { RiskEditor } from './RiskEditor';
import { StatusBadge } from './PlanSection';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { PlanStatus, CrisisSeverity } from '@prisma/client';

// =============================================================================
// TYPES
// =============================================================================

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

interface PlanEditorProps {
  planId: string;
  clientId: string;
  clientName: string;
  status: PlanStatus;
  currentVersion: number;
  isLocked: boolean;
  initialData: PlanData;
  showIcdCodes?: boolean;
  onSave: (data: PlanData) => Promise<void>;
  className?: string;
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function PlanEditor({
  planId,
  clientId,
  clientName,
  status,
  currentVersion,
  isLocked,
  initialData,
  showIcdCodes = true,
  onSave,
  className,
}: PlanEditorProps) {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [activeTab, setActiveTab] = useState('summary');

  // Editable state
  const [goals, setGoals] = useState<Goal[]>(initialData.goals);
  const [interventions, setInterventions] = useState<Intervention[]>(initialData.interventions);
  const [homework, setHomework] = useState<HomeworkItem[]>(initialData.homework);
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>(initialData.diagnoses);
  const [riskFactors, setRiskFactors] = useState<RiskFactor[]>(initialData.riskFactors);
  const [clinicalSummary, setClinicalSummary] = useState<ClinicalSummary>(initialData.clinicalSummary);
  const [currentRiskLevel, setCurrentRiskLevel] = useState<CrisisSeverity>(initialData.currentRiskLevel);

  const markChanged = useCallback(() => {
    setHasChanges(true);
  }, []);

  const handleGoalsUpdate = useCallback((updated: Goal[]) => {
    setGoals(updated);
    markChanged();
  }, [markChanged]);

  const handleInterventionsUpdate = useCallback((updated: Intervention[]) => {
    setInterventions(updated);
    markChanged();
  }, [markChanged]);

  const handleHomeworkUpdate = useCallback((updated: HomeworkItem[]) => {
    setHomework(updated);
    markChanged();
  }, [markChanged]);

  const handleDiagnosesUpdate = useCallback((updated: Diagnosis[]) => {
    setDiagnoses(updated);
    markChanged();
  }, [markChanged]);

  const handleRiskFactorsUpdate = useCallback((updated: RiskFactor[]) => {
    setRiskFactors(updated);
    markChanged();
    // Update overall risk level based on highest risk factor
    const severityOrder: CrisisSeverity[] = ['NONE', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
    const maxSeverity = updated.reduce((max, rf) => {
      const currentIndex = severityOrder.indexOf(rf.severity);
      const maxIndex = severityOrder.indexOf(max);
      return currentIndex > maxIndex ? rf.severity : max;
    }, 'NONE' as CrisisSeverity);
    setCurrentRiskLevel(maxSeverity);
  }, [markChanged]);

  const handleSummaryChange = useCallback((field: keyof ClinicalSummary, value: string) => {
    setClinicalSummary(prev => ({ ...prev, [field]: value }));
    markChanged();
  }, [markChanged]);

  const handleSave = async () => {
    if (isLocked) {
      toast({
        title: 'Plan is locked',
        description: 'This plan is currently being updated. Please wait.',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        goals,
        interventions,
        homework,
        diagnoses,
        riskFactors,
        clinicalSummary,
        currentRiskLevel,
      });
      setHasChanges(false);
      toast({
        title: 'Plan saved',
        description: 'Your changes have been saved successfully.',
      });
    } catch (error) {
      toast({
        title: 'Save failed',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/plans/${planId}`}>
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to Plan
              </Link>
            </Button>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">Edit Treatment Plan</h1>
            <StatusBadge status={status} />
            <span className="text-sm text-muted-foreground">v{currentVersion}</span>
            {isLocked && (
              <span className="flex items-center gap-1 text-amber-600 text-sm">
                <Lock className="h-4 w-4" />
                Locked
              </span>
            )}
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
            <Link href={`/plans/${planId}`}>Cancel</Link>
          </Button>
          <Button
            onClick={handleSave}
            disabled={!hasChanges || isSaving || isLocked}
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Locked Warning */}
      {isLocked && (
        <Alert variant="destructive">
          <Lock className="h-4 w-4" />
          <AlertTitle>Plan is locked</AlertTitle>
          <AlertDescription>
            This treatment plan is currently being updated by the AI pipeline.
            Please wait until processing is complete before making changes.
          </AlertDescription>
        </Alert>
      )}

      {/* Unsaved Changes Warning */}
      {hasChanges && !isLocked && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Unsaved changes</AlertTitle>
          <AlertDescription>
            You have unsaved changes. Click &ldquo;Save Changes&rdquo; to persist your edits.
          </AlertDescription>
        </Alert>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="diagnoses">Diagnoses</TabsTrigger>
          <TabsTrigger value="goals">Goals</TabsTrigger>
          <TabsTrigger value="treatment">Treatment</TabsTrigger>
          <TabsTrigger value="risk">Risk</TabsTrigger>
        </TabsList>

        {/* Clinical Summary Tab */}
        <TabsContent value="summary" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Clinical Summary</CardTitle>
              <CardDescription>
                Overview of the client&apos;s presentation and treatment approach
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Presenting Problems</label>
                <Textarea
                  value={clinicalSummary.presentingProblems}
                  onChange={(e) => handleSummaryChange('presentingProblems', e.target.value)}
                  placeholder="Describe the client's presenting problems..."
                  className="mt-1"
                  rows={4}
                  disabled={isLocked}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Diagnostic Formulation</label>
                <Textarea
                  value={clinicalSummary.diagnosticFormulation}
                  onChange={(e) => handleSummaryChange('diagnosticFormulation', e.target.value)}
                  placeholder="Clinical understanding and diagnostic considerations..."
                  className="mt-1"
                  rows={4}
                  disabled={isLocked}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Treatment Rationale</label>
                <Textarea
                  value={clinicalSummary.treatmentRationale}
                  onChange={(e) => handleSummaryChange('treatmentRationale', e.target.value)}
                  placeholder="Rationale for the chosen treatment approach..."
                  className="mt-1"
                  rows={4}
                  disabled={isLocked}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Diagnoses Tab */}
        <TabsContent value="diagnoses" className="mt-4">
          <DiagnosisEditor
            diagnoses={diagnoses}
            onUpdate={isLocked ? undefined : handleDiagnosesUpdate}
            showIcdCodes={showIcdCodes}
            readOnly={isLocked}
          />
        </TabsContent>

        {/* Goals Tab */}
        <TabsContent value="goals" className="mt-4">
          <GoalEditor
            goals={goals}
            onUpdate={isLocked ? undefined : handleGoalsUpdate}
            interventions={interventions.map((i) => ({ id: i.id, name: i.name }))}
            readOnly={isLocked}
          />
        </TabsContent>

        {/* Treatment Tab */}
        <TabsContent value="treatment" className="space-y-4 mt-4">
          <InterventionEditor
            interventions={interventions}
            onUpdate={isLocked ? undefined : handleInterventionsUpdate}
            readOnly={isLocked}
          />

          <HomeworkEditor
            homework={homework}
            onUpdate={isLocked ? undefined : handleHomeworkUpdate}
            goals={goals.map((g) => ({ id: g.id, description: g.description }))}
            readOnly={isLocked}
          />
        </TabsContent>

        {/* Risk Tab */}
        <TabsContent value="risk" className="mt-4">
          <RiskEditor
            riskFactors={riskFactors}
            onUpdate={isLocked ? undefined : handleRiskFactorsUpdate}
            currentRiskLevel={currentRiskLevel}
            readOnly={isLocked}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default PlanEditor;

