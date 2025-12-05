'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Plus, Minus, RefreshCw, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DiffBadge, ChangeTypeBadge } from './DiffBadge';
import { cn } from '@/lib/utils';

// =============================================================================
// TYPES
// =============================================================================

interface DiffChange {
  type: 'added' | 'removed' | 'modified';
  path: string;
  section: string;
  field?: string;
  oldValue?: unknown;
  newValue?: unknown;
  description: string;
}

interface DiffResult {
  hasChanges: boolean;
  summary: string;
  changes: DiffChange[];
  stats: {
    added: number;
    removed: number;
    modified: number;
    total: number;
  };
}

interface VersionInfo {
  versionNumber: number;
  changeType: string;
  createdAt: string;
}

interface DiffViewerProps {
  oldVersion: VersionInfo;
  newVersion: VersionInfo;
  diff: DiffResult;
  className?: string;
}

// =============================================================================
// SECTION LABELS
// =============================================================================

const SECTION_LABELS: Record<string, string> = {
  presentingConcerns: 'Presenting Concerns',
  clinicalImpressions: 'Clinical Impressions',
  diagnoses: 'Diagnoses',
  goals: 'Treatment Goals',
  interventions: 'Interventions',
  strengths: 'Strengths',
  riskFactors: 'Risk Factors',
  homework: 'Homework',
  crisisAssessment: 'Crisis Assessment',
  sessionReferences: 'Session References',
  clinicalSummary: 'Clinical Summary',
  treatmentGoals: 'Treatment Goals',
  interventionPlan: 'Intervention Plan',
  riskAssessment: 'Risk Assessment',
  progressNotes: 'Progress Notes',
};

// =============================================================================
// CHANGE CARD
// =============================================================================

interface ChangeCardProps {
  change: DiffChange;
  showValues?: boolean;
}

function ChangeCard({ change, showValues = true }: ChangeCardProps) {
  const [expanded, setExpanded] = useState(false);

  const hasValues = change.oldValue !== undefined || change.newValue !== undefined;

  return (
    <div className={cn(
      "p-3 rounded-lg border",
      change.type === 'added' && "bg-green-50/50 border-green-200 dark:bg-green-950/10 dark:border-green-900/30",
      change.type === 'removed' && "bg-red-50/50 border-red-200 dark:bg-red-950/10 dark:border-red-900/30",
      change.type === 'modified' && "bg-amber-50/50 border-amber-200 dark:bg-amber-950/10 dark:border-amber-900/30"
    )}>
      <div
        className="flex items-start justify-between gap-2 cursor-pointer"
        onClick={() => hasValues && showValues && setExpanded(!expanded)}
      >
        <div className="flex items-start gap-2 flex-1">
          {hasValues && showValues && (
            <button className="p-0.5 hover:bg-muted rounded">
              {expanded ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
          )}
          <div className="flex-1">
            <p className="text-sm">{change.description}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {change.path}
            </p>
          </div>
        </div>
        <ChangeTypeBadge type={change.type} />
      </div>

      {expanded && hasValues && showValues && (
        <div className="mt-3 space-y-2 pl-6">
          {change.type !== 'added' && change.oldValue !== undefined && (
            <div className="p-2 bg-red-100/50 rounded dark:bg-red-900/10">
              <p className="text-xs font-medium text-red-700 dark:text-red-400 mb-1">
                Old Value:
              </p>
              <pre className="text-xs text-red-800 dark:text-red-300 whitespace-pre-wrap overflow-x-auto">
                {formatValue(change.oldValue)}
              </pre>
            </div>
          )}
          {change.type !== 'removed' && change.newValue !== undefined && (
            <div className="p-2 bg-green-100/50 rounded dark:bg-green-900/10">
              <p className="text-xs font-medium text-green-700 dark:text-green-400 mb-1">
                New Value:
              </p>
              <pre className="text-xs text-green-800 dark:text-green-300 whitespace-pre-wrap overflow-x-auto">
                {formatValue(change.newValue)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function formatValue(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value, null, 2);
}

// =============================================================================
// SECTION VIEW
// =============================================================================

interface SectionViewProps {
  section: string;
  changes: DiffChange[];
}

function SectionView({ section, changes }: SectionViewProps) {
  const [expanded, setExpanded] = useState(true);
  const sectionLabel = SECTION_LABELS[section] || section;

  const stats = {
    added: changes.filter(c => c.type === 'added').length,
    removed: changes.filter(c => c.type === 'removed').length,
    modified: changes.filter(c => c.type === 'modified').length,
    total: changes.length,
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      <div
        className="flex items-center justify-between p-3 bg-muted/30 cursor-pointer hover:bg-muted/50"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="font-medium">{sectionLabel}</span>
        </div>
        <DiffBadge stats={stats} compact />
      </div>
      {expanded && (
        <div className="p-3 space-y-2">
          {changes.map((change, index) => (
            <ChangeCard key={index} change={change} />
          ))}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function DiffViewer({
  oldVersion,
  newVersion,
  diff,
  className,
}: DiffViewerProps) {
  const [view, setView] = useState<'grouped' | 'all'>('grouped');

  // Group changes by section
  const groupedChanges = diff.changes.reduce((acc, change) => {
    if (!acc[change.section]) {
      acc[change.section] = [];
    }
    acc[change.section].push(change);
    return acc;
  }, {} as Record<string, DiffChange[]>);

  const sections = Object.keys(groupedChanges);

  if (!diff.hasChanges) {
    return (
      <Card className={className}>
        <CardContent className="py-8 text-center">
          <Info className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-muted-foreground">No changes between these versions.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>Version Comparison</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              v{oldVersion.versionNumber} → v{newVersion.versionNumber}
            </p>
          </div>
          <DiffBadge stats={diff.stats} showTotal />
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={view} onValueChange={(v) => setView(v as 'grouped' | 'all')}>
          <TabsList className="mb-4">
            <TabsTrigger value="grouped">By Section</TabsTrigger>
            <TabsTrigger value="all">All Changes</TabsTrigger>
          </TabsList>

          <TabsContent value="grouped" className="space-y-3">
            {sections.map((section) => (
              <SectionView
                key={section}
                section={section}
                changes={groupedChanges[section]}
              />
            ))}
          </TabsContent>

          <TabsContent value="all" className="space-y-2">
            {diff.changes.map((change, index) => (
              <ChangeCard key={index} change={change} />
            ))}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// SIDE BY SIDE VIEW
// =============================================================================

interface SideBySideDiffProps {
  oldVersion: VersionInfo;
  newVersion: VersionInfo;
  oldData: unknown;
  newData: unknown;
  className?: string;
}

export function SideBySideDiff({
  oldVersion,
  newVersion,
  oldData,
  newData,
  className,
}: SideBySideDiffProps) {
  return (
    <div className={cn("grid grid-cols-2 gap-4", className)}>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            Version {oldVersion.versionNumber}
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            {new Date(oldVersion.createdAt).toLocaleString()}
          </p>
        </CardHeader>
        <CardContent>
          <pre className="text-xs bg-muted p-3 rounded overflow-x-auto max-h-96">
            {JSON.stringify(oldData, null, 2)}
          </pre>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            Version {newVersion.versionNumber}
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            {new Date(newVersion.createdAt).toLocaleString()}
          </p>
        </CardHeader>
        <CardContent>
          <pre className="text-xs bg-muted p-3 rounded overflow-x-auto max-h-96">
            {JSON.stringify(newData, null, 2)}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}

export default DiffViewer;

