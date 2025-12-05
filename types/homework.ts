import type {
  Homework as PrismaHomework,
  ProgressEntry as PrismaProgressEntry,
  HomeworkStatus,
} from '@prisma/client';

// Base types from Prisma
export type Homework = PrismaHomework;
export type ProgressEntry = PrismaProgressEntry;

// Homework with plan info
export type HomeworkWithPlan = PrismaHomework & {
  plan: {
    id: string;
    client: {
      id: string;
      user: {
        firstName: string;
        lastName: string;
      };
    };
  };
};

// Homework list item (for client view)
export interface HomeworkListItem {
  id: string;
  title: string;
  description: string;
  dueDate?: Date | null;
  status: HomeworkStatus;
  isOverdue: boolean;
  completedAt?: Date | null;
}

// Homework list item (for therapist view)
export interface TherapistHomeworkItem {
  id: string;
  clientId: string;
  clientName: string;
  title: string;
  status: HomeworkStatus;
  dueDate?: Date | null;
  assignedAt: Date;
  completedAt?: Date | null;
  clientNotes?: string | null;
}

// Create homework input
export interface CreateHomeworkInput {
  planId: string;
  title: string;
  description: string;
  instructions?: string;
  dueDate?: Date;
}

// Update homework input
export interface UpdateHomeworkInput {
  title?: string;
  description?: string;
  instructions?: string;
  dueDate?: Date;
  status?: HomeworkStatus;
  clientNotes?: string;
  therapistNotes?: string;
}

// Complete homework input (from client)
export interface CompleteHomeworkInput {
  homeworkId: string;
  clientNotes?: string;
}

// Progress entry input
export interface CreateProgressInput {
  planId: string;
  goalId: string;
  rating?: number;
  notes?: string;
  recordedBy: 'client' | 'therapist';
}

// Progress summary
export interface ProgressSummary {
  goalId: string;
  goalDescription: string;
  currentProgress: number;
  entries: ProgressEntryDisplay[];
  trend: 'improving' | 'stable' | 'declining';
}

export interface ProgressEntryDisplay {
  id: string;
  rating?: number | null;
  notes?: string | null;
  recordedBy: string;
  recordedAt: Date;
}

