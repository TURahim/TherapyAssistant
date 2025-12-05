// =============================================================================
// API RESPONSE TYPES
// =============================================================================

// Standard API response wrapper
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: ApiMeta;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ApiMeta {
  page?: number;
  limit?: number;
  total?: number;
  hasMore?: boolean;
}

// Paginated response
export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// =============================================================================
// API REQUEST TYPES
// =============================================================================

// Pagination params
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Filter params for clients
export interface ClientFilterParams extends PaginationParams {
  search?: string;
  isActive?: boolean;
  therapistId?: string;
}

// Filter params for sessions
export interface SessionFilterParams extends PaginationParams {
  clientId?: string;
  therapistId?: string;
  status?: string;
  fromDate?: string;
  toDate?: string;
  hasCrisis?: boolean;
}

// Filter params for plans
export interface PlanFilterParams extends PaginationParams {
  clientId?: string;
  status?: string;
}

// =============================================================================
// GENERATION API TYPES
// =============================================================================

// Plan generation request
export interface GeneratePlanRequest {
  sessionId: string;
  options?: {
    includeExistingPlan?: boolean;
    forceRegenerate?: boolean;
  };
}

// Plan generation response
export interface GeneratePlanResponse {
  planId: string;
  versionNumber: number;
  status: 'success' | 'partial' | 'failed';
  crisisDetected: boolean;
  crisisSeverity?: string;
  processingTime: number;
  warnings?: string[];
}

// Generation progress (for streaming updates)
export interface GenerationProgress {
  stage: GenerationStage;
  progress: number; // 0-100
  message: string;
  estimatedTimeRemaining?: number;
}

export type GenerationStage =
  | 'preprocessing'
  | 'crisis_check'
  | 'extraction'
  | 'therapist_view'
  | 'client_view'
  | 'saving'
  | 'complete';

// Summary generation request
export interface GenerateSummaryRequest {
  sessionId: string;
  regenerate?: boolean;
}

// =============================================================================
// UPLOAD API TYPES
// =============================================================================

// File upload request
export interface FileUploadRequest {
  sessionId: string;
  file: File;
  mediaType: 'audio' | 'video' | 'transcript';
}

// File upload response
export interface FileUploadResponse {
  uploadId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  status: 'uploaded' | 'processing' | 'ready' | 'failed';
}

// Transcription request
export interface TranscribeRequest {
  uploadId: string;
  language?: string;
}

// Transcription response
export interface TranscribeResponse {
  uploadId: string;
  transcript: string;
  language: string;
  confidence: number;
  duration: number;
}

// =============================================================================
// AUTH API TYPES
// =============================================================================

// Login request
export interface LoginRequest {
  email: string;
  password: string;
}

// Signup request
export interface SignupRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'THERAPIST' | 'CLIENT';
  // Therapist-specific
  licenseNumber?: string;
  licenseState?: string;
  // Client-specific (requires therapist invitation)
  inviteCode?: string;
}

// Auth response
export interface AuthResponse {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
  };
  token?: string;
}

// =============================================================================
// ERROR CODES
// =============================================================================

export const API_ERROR_CODES = {
  // Authentication errors
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  SESSION_EXPIRED: 'SESSION_EXPIRED',

  // Validation errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',

  // Resource errors
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  CONFLICT: 'CONFLICT',

  // Business logic errors
  PLAN_LOCKED: 'PLAN_LOCKED',
  CRISIS_DETECTED: 'CRISIS_DETECTED',
  GENERATION_FAILED: 'GENERATION_FAILED',
  TRANSCRIPT_REQUIRED: 'TRANSCRIPT_REQUIRED',

  // System errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  RATE_LIMITED: 'RATE_LIMITED',
} as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[keyof typeof API_ERROR_CODES];

