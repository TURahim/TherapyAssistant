import type {
  TreatmentPlanVersion as PrismaVersion,
  PlanEdit as PrismaPlanEdit,
} from '@prisma/client';

// Base types from Prisma
export type TreatmentPlanVersion = PrismaVersion;
export type PlanEdit = PrismaPlanEdit;

// Version with session info
export type VersionWithSession = PrismaVersion & {
  session?: {
    id: string;
    sessionNumber: number;
    scheduledAt: Date;
  } | null;
};

// Version list item
export interface VersionListItem {
  id: string;
  versionNumber: number;
  changeType: string;
  changeSummary?: string | null;
  sessionNumber?: number | null;
  createdAt: Date;
  createdByName: string;
}

// Diff types
export interface PlanDiff {
  added: DiffSection[];
  removed: DiffSection[];
  modified: DiffSection[];
  unchanged: string[];
}

export interface DiffSection {
  section: string;
  path: string;
  oldValue?: unknown;
  newValue?: unknown;
  description: string;
}

// Version comparison
export interface VersionComparison {
  fromVersion: number;
  toVersion: number;
  diff: PlanDiff;
  summary: string;
}

// Restore version input
export interface RestoreVersionInput {
  planId: string;
  versionId: string;
  reason?: string;
}

// Create version input (internal)
export interface CreateVersionInput {
  planId: string;
  sessionId?: string;
  canonicalPlan: unknown;
  therapistView: unknown;
  clientView: unknown;
  changeType: 'initial' | 'session_update' | 'manual_edit' | 'restore';
  changeSummary?: string;
  createdBy: string;
}

