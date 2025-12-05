import type {
  Session as PrismaSession,
  SessionSummary as PrismaSessionSummary,
  MediaUpload as PrismaMediaUpload,
  SessionStatus,
  CrisisSeverity,
  MediaType,
} from '@prisma/client';

// Base session type from Prisma
export type Session = PrismaSession;
export type SessionSummary = PrismaSessionSummary;
export type MediaUpload = PrismaMediaUpload;

// Session with basic relations
export type SessionWithClient = PrismaSession & {
  client: {
    id: string;
    user: {
      firstName: string;
      lastName: string;
    };
    preferredName?: string | null;
  };
};

// Session with all relations
export type SessionWithRelations = PrismaSession & {
  client: {
    id: string;
    user: {
      firstName: string;
      lastName: string;
      email: string;
    };
    preferredName?: string | null;
  };
  therapist: {
    id: string;
    user: {
      firstName: string;
      lastName: string;
    };
  };
  mediaUploads: MediaUpload[];
  summary?: SessionSummary | null;
};

// Session list item (for dashboard)
export interface SessionListItem {
  id: string;
  clientId: string;
  clientName: string;
  sessionNumber: number;
  scheduledAt: Date;
  status: SessionStatus;
  crisisSeverity: CrisisSeverity;
  hasTranscript: boolean;
  hasSummary: boolean;
}

// Session creation input
export interface CreateSessionInput {
  clientId: string;
  scheduledAt: Date;
  durationMinutes?: number;
  notes?: string;
}

// Session update input
export interface UpdateSessionInput {
  scheduledAt?: Date;
  startedAt?: Date;
  endedAt?: Date;
  status?: SessionStatus;
  durationMinutes?: number;
  transcript?: string;
  notes?: string;
}

// Transcript input (for AI processing)
export interface TranscriptInput {
  sessionId: string;
  text: string;
  source: 'paste' | 'upload' | 'transcription';
  mediaUploadId?: string;
}

// Crisis assessment result
export interface CrisisAssessment {
  severity: CrisisSeverity;
  indicators: CrisisIndicator[];
  requiresImmediateAction: boolean;
  recommendations: string[];
}

export interface CrisisIndicator {
  type: string;
  quote: string;
  severity: CrisisSeverity;
  context?: string;
}

// Session summary generation input
export interface GenerateSummaryInput {
  sessionId: string;
  transcript: string;
  previousSummaries?: string[];
}

// Media upload input
export interface CreateMediaUploadInput {
  sessionId: string;
  mediaType: MediaType;
  fileName: string;
  fileSize: number;
  mimeType: string;
  storagePath: string;
  durationSeconds?: number;
}

