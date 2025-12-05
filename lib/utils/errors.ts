/**
 * Custom error classes for consistent error handling across the application
 */

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly code?: string;

  constructor(
    message: string,
    statusCode: number = 500,
    code?: string,
    isOperational: boolean = true
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;

    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace(this, this.constructor);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

// 400 - Bad Request
export class BadRequestError extends AppError {
  constructor(message: string = 'Bad request', code?: string) {
    super(message, 400, code);
  }
}

// 401 - Unauthorized
export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized', code?: string) {
    super(message, 401, code);
  }
}

// 403 - Forbidden
export class ForbiddenError extends AppError {
  constructor(message: string = 'Access forbidden', code?: string) {
    super(message, 403, code);
  }
}

// 404 - Not Found
export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found', code?: string) {
    super(message, 404, code);
  }
}

// 409 - Conflict
export class ConflictError extends AppError {
  constructor(message: string = 'Resource conflict', code?: string) {
    super(message, 409, code);
  }
}

// 422 - Validation Error
export class ValidationError extends AppError {
  public readonly errors?: Record<string, string[]>;

  constructor(
    message: string = 'Validation failed',
    errors?: Record<string, string[]>,
    code?: string
  ) {
    super(message, 422, code);
    this.errors = errors;
  }
}

// 429 - Rate Limit
export class RateLimitError extends AppError {
  public readonly retryAfter?: number;

  constructor(message: string = 'Too many requests', retryAfter?: number) {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
    this.retryAfter = retryAfter;
  }
}

// 500 - Internal Server Error
export class InternalError extends AppError {
  constructor(message: string = 'Internal server error', code?: string) {
    super(message, 500, code, false);
  }
}

// AI-specific errors
export class AIError extends AppError {
  public readonly stage?: string;

  constructor(message: string, stage?: string, code?: string) {
    super(message, 500, code || 'AI_ERROR');
    this.stage = stage;
  }
}

export class AIParsingError extends AIError {
  constructor(message: string = 'Failed to parse AI response', stage?: string) {
    super(message, stage, 'AI_PARSING_ERROR');
  }
}

export class AITimeoutError extends AIError {
  constructor(message: string = 'AI request timed out', stage?: string) {
    super(message, stage, 'AI_TIMEOUT');
  }
}

// Helper to check if error is an AppError
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

// Convert unknown error to AppError
export function toAppError(error: unknown): AppError {
  if (isAppError(error)) {
    return error;
  }

  if (error instanceof Error) {
    return new AppError(error.message, 500);
  }

  return new AppError('An unexpected error occurred', 500);
}

// Format error for API response
export function formatErrorResponse(error: unknown) {
  const appError = toAppError(error);

  const response: {
    error: string;
    code?: string;
    errors?: Record<string, string[]>;
  } = {
    error: appError.message,
  };

  if (appError.code) {
    response.code = appError.code;
  }

  if (appError instanceof ValidationError && appError.errors) {
    response.errors = appError.errors;
  }

  return {
    body: response,
    status: appError.statusCode,
  };
}

