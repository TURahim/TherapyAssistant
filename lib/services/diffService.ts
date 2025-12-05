/**
 * Diff Service
 * 
 * Provides utilities for comparing treatment plan versions and generating
 * human-readable diff summaries.
 */

// =============================================================================
// TYPES
// =============================================================================

export interface DiffChange {
  type: 'added' | 'removed' | 'modified';
  path: string;
  section: string;
  field?: string;
  oldValue?: unknown;
  newValue?: unknown;
  description: string;
}

export interface DiffResult {
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

export interface SectionDiff {
  section: string;
  changes: DiffChange[];
  hasChanges: boolean;
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
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Deep equality check for two values
 */
function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null) return a === b;
  if (typeof a !== typeof b) return false;
  
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((item, index) => deepEqual(item, b[index]));
  }
  
  if (typeof a === 'object' && typeof b === 'object') {
    const aKeys = Object.keys(a as object);
    const bKeys = Object.keys(b as object);
    if (aKeys.length !== bKeys.length) return false;
    return aKeys.every(key => 
      deepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key])
    );
  }
  
  return false;
}

/**
 * Get a value at a path in an object
 */
function getAtPath(obj: unknown, path: string): unknown {
  const parts = path.split('.');
  let current = obj;
  for (const part of parts) {
    if (current == null) return undefined;
    if (Array.isArray(current)) {
      const index = parseInt(part, 10);
      current = current[index];
    } else if (typeof current === 'object') {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return current;
}

/**
 * Generate a human-readable description for a change
 */
function describeChange(change: Omit<DiffChange, 'description'>): string {
  const sectionLabel = SECTION_LABELS[change.section] || change.section;
  
  switch (change.type) {
    case 'added':
      if (change.field) {
        return `Added ${change.field} to ${sectionLabel}`;
      }
      if (typeof change.newValue === 'object' && change.newValue !== null) {
        const name = (change.newValue as Record<string, unknown>).name || 
                     (change.newValue as Record<string, unknown>).description ||
                     (change.newValue as Record<string, unknown>).title;
        if (name) {
          return `Added "${name}" to ${sectionLabel}`;
        }
      }
      return `Added item to ${sectionLabel}`;
      
    case 'removed':
      if (change.field) {
        return `Removed ${change.field} from ${sectionLabel}`;
      }
      if (typeof change.oldValue === 'object' && change.oldValue !== null) {
        const name = (change.oldValue as Record<string, unknown>).name || 
                     (change.oldValue as Record<string, unknown>).description ||
                     (change.oldValue as Record<string, unknown>).title;
        if (name) {
          return `Removed "${name}" from ${sectionLabel}`;
        }
      }
      return `Removed item from ${sectionLabel}`;
      
    case 'modified':
      if (change.field) {
        return `Updated ${change.field} in ${sectionLabel}`;
      }
      if (typeof change.oldValue === 'object' && change.oldValue !== null) {
        const name = (change.oldValue as Record<string, unknown>).name || 
                     (change.oldValue as Record<string, unknown>).description ||
                     (change.oldValue as Record<string, unknown>).title;
        if (name) {
          return `Modified "${name}" in ${sectionLabel}`;
        }
      }
      return `Modified item in ${sectionLabel}`;
  }
}

// =============================================================================
// ARRAY DIFFING
// =============================================================================

interface ArrayItem {
  id?: string;
  [key: string]: unknown;
}

/**
 * Compare two arrays and identify additions, removals, and modifications
 */
function diffArrays(
  oldArray: ArrayItem[] | undefined,
  newArray: ArrayItem[] | undefined,
  section: string,
  path: string
): DiffChange[] {
  const changes: DiffChange[] = [];
  const oldItems = oldArray || [];
  const newItems = newArray || [];
  
  // Create maps by ID for efficient lookup
  const oldMap = new Map<string, ArrayItem>();
  const newMap = new Map<string, ArrayItem>();
  
  oldItems.forEach((item, index) => {
    const id = item.id || `index-${index}`;
    oldMap.set(id, item);
  });
  
  newItems.forEach((item, index) => {
    const id = item.id || `index-${index}`;
    newMap.set(id, item);
  });
  
  // Find removed items
  Array.from(oldMap.entries()).forEach(([id, oldItem]) => {
    if (!newMap.has(id)) {
      const change: Omit<DiffChange, 'description'> = {
        type: 'removed',
        path: `${path}[${id}]`,
        section,
        oldValue: oldItem,
      };
      changes.push({ ...change, description: describeChange(change) });
    }
  });
  
  // Find added items
  Array.from(newMap.entries()).forEach(([id, newItem]) => {
    if (!oldMap.has(id)) {
      const change: Omit<DiffChange, 'description'> = {
        type: 'added',
        path: `${path}[${id}]`,
        section,
        newValue: newItem,
      };
      changes.push({ ...change, description: describeChange(change) });
    }
  });
  
  // Find modified items
  Array.from(newMap.entries()).forEach(([id, newItem]) => {
    const oldItem = oldMap.get(id);
    if (oldItem && !deepEqual(oldItem, newItem)) {
      const change: Omit<DiffChange, 'description'> = {
        type: 'modified',
        path: `${path}[${id}]`,
        section,
        oldValue: oldItem,
        newValue: newItem,
      };
      changes.push({ ...change, description: describeChange(change) });
    }
  });
  
  return changes;
}

// =============================================================================
// OBJECT DIFFING
// =============================================================================

/**
 * Compare two objects and identify changes
 */
function diffObjects(
  oldObj: Record<string, unknown> | undefined,
  newObj: Record<string, unknown> | undefined,
  section: string,
  path: string
): DiffChange[] {
  const changes: DiffChange[] = [];
  const old = oldObj || {};
  const current = newObj || {};
  
  const allKeys = Array.from(new Set([...Object.keys(old), ...Object.keys(current)]));
  
  for (const key of allKeys) {
    const oldValue = old[key];
    const newValue = current[key];
    const fieldPath = path ? `${path}.${key}` : key;
    
    if (oldValue === undefined && newValue !== undefined) {
      const change: Omit<DiffChange, 'description'> = {
        type: 'added',
        path: fieldPath,
        section,
        field: key,
        newValue,
      };
      changes.push({ ...change, description: describeChange(change) });
    } else if (oldValue !== undefined && newValue === undefined) {
      const change: Omit<DiffChange, 'description'> = {
        type: 'removed',
        path: fieldPath,
        section,
        field: key,
        oldValue,
      };
      changes.push({ ...change, description: describeChange(change) });
    } else if (!deepEqual(oldValue, newValue)) {
      const change: Omit<DiffChange, 'description'> = {
        type: 'modified',
        path: fieldPath,
        section,
        field: key,
        oldValue,
        newValue,
      };
      changes.push({ ...change, description: describeChange(change) });
    }
  }
  
  return changes;
}

// =============================================================================
// MAIN DIFF FUNCTIONS
// =============================================================================

/**
 * Compare two canonical plans and generate a diff
 */
export function diffCanonicalPlans(
  oldPlan: Record<string, unknown> | null,
  newPlan: Record<string, unknown> | null
): DiffResult {
  const changes: DiffChange[] = [];
  
  if (!oldPlan && !newPlan) {
    return {
      hasChanges: false,
      summary: 'No changes',
      changes: [],
      stats: { added: 0, removed: 0, modified: 0, total: 0 },
    };
  }
  
  if (!oldPlan) {
    return {
      hasChanges: true,
      summary: 'Initial plan creation',
      changes: [{
        type: 'added',
        path: '',
        section: 'plan',
        newValue: newPlan,
        description: 'Initial plan created',
      }],
      stats: { added: 1, removed: 0, modified: 0, total: 1 },
    };
  }
  
  if (!newPlan) {
    return {
      hasChanges: true,
      summary: 'Plan deleted',
      changes: [{
        type: 'removed',
        path: '',
        section: 'plan',
        oldValue: oldPlan,
        description: 'Plan removed',
      }],
      stats: { added: 0, removed: 1, modified: 0, total: 1 },
    };
  }
  
  // Compare array sections
  const arraySections = [
    'presentingConcerns',
    'clinicalImpressions',
    'diagnoses',
    'goals',
    'interventions',
    'strengths',
    'riskFactors',
    'homework',
    'sessionReferences',
  ];
  
  for (const section of arraySections) {
    const oldArray = oldPlan[section] as ArrayItem[] | undefined;
    const newArray = newPlan[section] as ArrayItem[] | undefined;
    changes.push(...diffArrays(oldArray, newArray, section, section));
  }
  
  // Compare crisis assessment
  if (!deepEqual(oldPlan.crisisAssessment, newPlan.crisisAssessment)) {
    changes.push(...diffObjects(
      oldPlan.crisisAssessment as Record<string, unknown>,
      newPlan.crisisAssessment as Record<string, unknown>,
      'crisisAssessment',
      'crisisAssessment'
    ));
  }
  
  // Calculate stats
  const stats = {
    added: changes.filter(c => c.type === 'added').length,
    removed: changes.filter(c => c.type === 'removed').length,
    modified: changes.filter(c => c.type === 'modified').length,
    total: changes.length,
  };
  
  // Generate summary
  const summaryParts: string[] = [];
  if (stats.added > 0) summaryParts.push(`${stats.added} added`);
  if (stats.removed > 0) summaryParts.push(`${stats.removed} removed`);
  if (stats.modified > 0) summaryParts.push(`${stats.modified} modified`);
  const summary = summaryParts.length > 0 ? summaryParts.join(', ') : 'No changes';
  
  return {
    hasChanges: changes.length > 0,
    summary,
    changes,
    stats,
  };
}

/**
 * Compare two therapist views and generate a diff
 */
export function diffTherapistViews(
  oldView: Record<string, unknown> | null,
  newView: Record<string, unknown> | null
): DiffResult {
  const changes: DiffChange[] = [];
  
  if (!oldView && !newView) {
    return {
      hasChanges: false,
      summary: 'No changes',
      changes: [],
      stats: { added: 0, removed: 0, modified: 0, total: 0 },
    };
  }
  
  if (!oldView || !newView) {
    return {
      hasChanges: true,
      summary: oldView ? 'View removed' : 'View created',
      changes: [{
        type: oldView ? 'removed' : 'added',
        path: '',
        section: 'therapistView',
        oldValue: oldView,
        newValue: newView,
        description: oldView ? 'Therapist view removed' : 'Therapist view created',
      }],
      stats: { 
        added: oldView ? 0 : 1, 
        removed: oldView ? 1 : 0, 
        modified: 0, 
        total: 1 
      },
    };
  }
  
  // Compare clinical summary
  if (!deepEqual(oldView.clinicalSummary, newView.clinicalSummary)) {
    changes.push(...diffObjects(
      oldView.clinicalSummary as Record<string, unknown>,
      newView.clinicalSummary as Record<string, unknown>,
      'clinicalSummary',
      'clinicalSummary'
    ));
  }
  
  // Compare diagnoses
  const oldDiagnoses = oldView.diagnoses as Record<string, unknown> | undefined;
  const newDiagnoses = newView.diagnoses as Record<string, unknown> | undefined;
  if (!deepEqual(oldDiagnoses, newDiagnoses)) {
    if (oldDiagnoses?.primary || newDiagnoses?.primary) {
      if (!deepEqual(oldDiagnoses?.primary, newDiagnoses?.primary)) {
        const change: Omit<DiffChange, 'description'> = {
          type: 'modified',
          path: 'diagnoses.primary',
          section: 'diagnoses',
          field: 'primary diagnosis',
          oldValue: oldDiagnoses?.primary,
          newValue: newDiagnoses?.primary,
        };
        changes.push({ ...change, description: describeChange(change) });
      }
    }
    changes.push(...diffArrays(
      oldDiagnoses?.secondary as ArrayItem[],
      newDiagnoses?.secondary as ArrayItem[],
      'diagnoses',
      'diagnoses.secondary'
    ));
  }
  
  // Compare treatment goals
  const oldGoals = oldView.treatmentGoals as Record<string, unknown> | undefined;
  const newGoals = newView.treatmentGoals as Record<string, unknown> | undefined;
  if (!deepEqual(oldGoals, newGoals)) {
    changes.push(...diffArrays(
      oldGoals?.shortTerm as ArrayItem[],
      newGoals?.shortTerm as ArrayItem[],
      'treatmentGoals',
      'treatmentGoals.shortTerm'
    ));
    changes.push(...diffArrays(
      oldGoals?.longTerm as ArrayItem[],
      newGoals?.longTerm as ArrayItem[],
      'treatmentGoals',
      'treatmentGoals.longTerm'
    ));
  }
  
  // Compare intervention plan
  changes.push(...diffArrays(
    oldView.interventionPlan as ArrayItem[],
    newView.interventionPlan as ArrayItem[],
    'interventionPlan',
    'interventionPlan'
  ));
  
  // Compare risk assessment
  if (!deepEqual(oldView.riskAssessment, newView.riskAssessment)) {
    changes.push(...diffObjects(
      oldView.riskAssessment as Record<string, unknown>,
      newView.riskAssessment as Record<string, unknown>,
      'riskAssessment',
      'riskAssessment'
    ));
  }
  
  // Compare homework
  changes.push(...diffArrays(
    oldView.homework as ArrayItem[],
    newView.homework as ArrayItem[],
    'homework',
    'homework'
  ));
  
  // Compare progress notes
  if (!deepEqual(oldView.progressNotes, newView.progressNotes)) {
    changes.push(...diffObjects(
      oldView.progressNotes as Record<string, unknown>,
      newView.progressNotes as Record<string, unknown>,
      'progressNotes',
      'progressNotes'
    ));
  }
  
  // Calculate stats
  const stats = {
    added: changes.filter(c => c.type === 'added').length,
    removed: changes.filter(c => c.type === 'removed').length,
    modified: changes.filter(c => c.type === 'modified').length,
    total: changes.length,
  };
  
  // Generate summary
  const summaryParts: string[] = [];
  if (stats.added > 0) summaryParts.push(`${stats.added} added`);
  if (stats.removed > 0) summaryParts.push(`${stats.removed} removed`);
  if (stats.modified > 0) summaryParts.push(`${stats.modified} modified`);
  const summary = summaryParts.length > 0 ? summaryParts.join(', ') : 'No changes';
  
  return {
    hasChanges: changes.length > 0,
    summary,
    changes,
    stats,
  };
}

/**
 * Get section-by-section diff for UI display
 */
export function getSectionDiffs(diff: DiffResult): SectionDiff[] {
  const sectionMap = new Map<string, DiffChange[]>();
  
  for (const change of diff.changes) {
    if (!sectionMap.has(change.section)) {
      sectionMap.set(change.section, []);
    }
    sectionMap.get(change.section)!.push(change);
  }
  
  const sections: SectionDiff[] = [];
  Array.from(sectionMap.entries()).forEach(([section, changes]) => {
    sections.push({
      section: SECTION_LABELS[section] || section,
      changes,
      hasChanges: changes.length > 0,
    });
  });
  
  return sections;
}

/**
 * Generate a human-readable change summary
 */
export function generateChangeSummary(diff: DiffResult): string {
  if (!diff.hasChanges) {
    return 'No changes detected.';
  }
  
  const lines: string[] = [];
  const sections = getSectionDiffs(diff);
  
  for (const section of sections) {
    if (section.hasChanges) {
      lines.push(`**${section.section}:**`);
      for (const change of section.changes.slice(0, 5)) {
        lines.push(`  - ${change.description}`);
      }
      if (section.changes.length > 5) {
        lines.push(`  - ... and ${section.changes.length - 5} more changes`);
      }
    }
  }
  
  return lines.join('\n');
}

// =============================================================================
// EXPORTS
// =============================================================================

export {
  deepEqual,
  getAtPath,
  describeChange,
  diffArrays,
  diffObjects,
  SECTION_LABELS,
};

