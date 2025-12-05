import type {
  Client as PrismaClient,
  User,
  Therapist,
  Session,
  TreatmentPlan,
} from '@prisma/client';

// Base client type from Prisma
export type Client = PrismaClient;

// Client with user data
export type ClientWithUser = PrismaClient & {
  user: Pick<User, 'id' | 'email' | 'firstName' | 'lastName' | 'image'>;
};

// Client with all relations
export type ClientWithRelations = PrismaClient & {
  user: Pick<User, 'id' | 'email' | 'firstName' | 'lastName' | 'image'>;
  therapist: Pick<Therapist, 'id'> & {
    user: Pick<User, 'firstName' | 'lastName'>;
  };
  sessions?: Session[];
  treatmentPlans?: TreatmentPlan[];
};

// Client list item (for therapist dashboard)
export interface ClientListItem {
  id: string;
  firstName: string;
  lastName: string;
  preferredName?: string | null;
  pronouns?: string | null;
  email: string;
  intakeDate: Date;
  isActive: boolean;
  lastSessionDate?: Date | null;
  activePlanId?: string | null;
  sessionCount: number;
}

// Client creation input
export interface CreateClientInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  therapistId: string;
  preferredName?: string;
  dateOfBirth?: Date;
  pronouns?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  notes?: string;
}

// Client update input
export interface UpdateClientInput {
  preferredName?: string;
  dateOfBirth?: Date;
  pronouns?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  notes?: string;
  isActive?: boolean;
}

// Client summary (for client's own view)
export interface ClientSummary {
  id: string;
  firstName: string;
  lastName: string;
  preferredName?: string | null;
  therapistName: string;
  intakeDate: Date;
  upcomingSessions: number;
  activePlanExists: boolean;
  pendingHomework: number;
}

