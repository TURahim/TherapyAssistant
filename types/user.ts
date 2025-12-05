import type { User as PrismaUser, Therapist, Client, UserRole } from '@prisma/client';

// Base user type from Prisma
export type User = PrismaUser;

// User with relations
export type UserWithRelations = PrismaUser & {
  therapist?: TherapistProfile | null;
  client?: ClientProfile | null;
};

// Therapist profile (subset of Therapist model)
export type TherapistProfile = Pick<
  Therapist,
  'id' | 'licenseNumber' | 'licenseState' | 'specializations' | 'bio'
>;

// Client profile (subset of Client model)
export type ClientProfile = Pick<
  Client,
  'id' | 'therapistId' | 'preferredName' | 'pronouns'
>;

// User creation input
export interface CreateUserInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
}

// User update input
export interface UpdateUserInput {
  firstName?: string;
  lastName?: string;
  image?: string;
  isActive?: boolean;
}

// Session user (for auth context)
export interface SessionUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  image?: string | null;
}

// Safe user (without sensitive fields)
export type SafeUser = Omit<User, 'passwordHash'>;

