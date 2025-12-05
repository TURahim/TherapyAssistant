import { z, ZodError, ZodSchema } from 'zod';
import { AIError, ValidationError } from './errors';

// =============================================================================
// VALIDATION RESULT TYPES
// =============================================================================

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: ValidationErrorDetail[];
}

export interface ValidationErrorDetail {
  path: string;
  message: string;
  code: string;
}

// =============================================================================
// CORE VALIDATION FUNCTIONS
// =============================================================================

/**
 * Validate data against a Zod schema
 */
export function validate<T>(
  schema: ZodSchema<T>,
  data: unknown
): ValidationResult<T> {
  try {
    const result = schema.parse(data);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        success: false,
        errors: formatZodErrors(error),
      };
    }
    throw error;
  }
}

/**
 * Validate data and throw if invalid
 */
export function validateOrThrow<T>(
  schema: ZodSchema<T>,
  data: unknown,
  context?: string
): T {
  const result = validate(schema, data);
  
  if (!result.success) {
    const message = result.errors
      ?.map(e => `${e.path}: ${e.message}`)
      .join('; ');
    throw new ValidationError(
      context ? `${context}: ${message}` : message || 'Validation failed'
    );
  }
  
  return result.data as T;
}

/**
 * Safe parse that returns null on failure
 */
export function safeParse<T>(
  schema: ZodSchema<T>,
  data: unknown
): T | null {
  const result = schema.safeParse(data);
  return result.success ? result.data : null;
}

/**
 * Validate AI model output with retry context
 */
export function validateAIOutput<T>(
  schema: ZodSchema<T>,
  output: unknown,
  stageName: string
): T {
  try {
    return schema.parse(output);
  } catch (error) {
    if (error instanceof ZodError) {
      const details = formatZodErrors(error);
      const errorMessage = `AI output validation failed for ${stageName}: ${details.map(d => d.message).join(', ')}`;
      throw new AIError(errorMessage, stageName);
    }
    throw error;
  }
}

// =============================================================================
// ERROR FORMATTING
// =============================================================================

/**
 * Format Zod errors into a consistent structure
 */
export function formatZodErrors(error: ZodError): ValidationErrorDetail[] {
  return error.issues.map(issue => ({
    path: issue.path.join('.'),
    message: issue.message,
    code: issue.code,
  }));
}

/**
 * Get human-readable error messages
 */
export function getErrorMessages(errors: ValidationErrorDetail[]): string[] {
  return errors.map(e => {
    if (e.path) {
      return `${e.path}: ${e.message}`;
    }
    return e.message;
  });
}

// =============================================================================
// SCHEMA UTILITIES
// =============================================================================

/**
 * Create a schema that accepts partial data (for updates)
 */
export function createPartialSchema<T extends z.ZodRawShape>(
  schema: z.ZodObject<T>
): z.ZodObject<{ [K in keyof T]: z.ZodOptional<T[K]> }> {
  return schema.partial();
}

/**
 * Create a schema that requires specific fields
 */
export function requireFields<T extends z.ZodRawShape, K extends keyof T>(
  schema: z.ZodObject<T>,
  keys: K[]
): z.ZodObject<T> {
  const shape = { ...schema.shape };
  
  for (const key of keys) {
    const field = shape[key];
    if (field instanceof z.ZodOptional) {
      shape[key] = field.unwrap() as T[K];
    }
  }
  
  return z.object(shape) as z.ZodObject<T>;
}

/**
 * Merge two schemas
 */
export function mergeSchemas<
  T extends z.ZodRawShape,
  U extends z.ZodRawShape
>(
  schema1: z.ZodObject<T>,
  schema2: z.ZodObject<U>
) {
  return schema1.merge(schema2);
}

// =============================================================================
// CUSTOM VALIDATORS
// =============================================================================

/**
 * Validate that a string is valid JSON
 */
export const jsonString = z.string().refine(
  (val) => {
    try {
      JSON.parse(val);
      return true;
    } catch {
      return false;
    }
  },
  { message: 'Invalid JSON string' }
);

/**
 * Validate ICD-10 code format
 */
export const icdCodeSchema = z.string().regex(
  /^[A-Z]\d{2}(?:\.[A-Z0-9]{1,4})?$/,
  'Invalid ICD-10 code format'
);

/**
 * Validate date string in ISO format
 */
export const isoDateString = z.string().refine(
  (val) => !isNaN(Date.parse(val)),
  { message: 'Invalid ISO date string' }
);

/**
 * Validate percentage (0-100)
 */
export const percentage = z.number().min(0).max(100);

/**
 * Validate non-empty string
 */
export const nonEmptyString = z.string().min(1, 'Cannot be empty');

/**
 * Validate email format
 */
export const emailSchema = z.string().email();

/**
 * Validate phone number (flexible format)
 */
export const phoneSchema = z.string().regex(
  /^[+]?[(]?[0-9]{1,3}[)]?[-\s.]?[(]?[0-9]{1,3}[)]?[-\s.]?[0-9]{3,6}[-\s.]?[0-9]{3,6}$/,
  'Invalid phone number format'
);

// =============================================================================
// ARRAY VALIDATORS
// =============================================================================

/**
 * Validate array has at least N items
 */
export function minItems<T extends z.ZodTypeAny>(schema: z.ZodArray<T>, min: number) {
  return schema.refine(
    arr => arr.length >= min,
    { message: `Array must have at least ${min} items` }
  );
}

/**
 * Validate array has at most N items
 */
export function maxItems<T extends z.ZodTypeAny>(schema: z.ZodArray<T>, max: number) {
  return schema.refine(
    arr => arr.length <= max,
    { message: `Array must have at most ${max} items` }
  );
}

/**
 * Validate array has unique items by key function
 */
export function uniqueItems<T extends z.ZodTypeAny>(
  schema: z.ZodArray<T>,
  keyFn?: (item: z.infer<T>) => unknown
) {
  return schema.refine(
    (arr) => {
      const keys = arr.map(item => keyFn ? keyFn(item) : item);
      return new Set(keys).size === arr.length;
    },
    { message: 'Array must have unique items' }
  );
}

// =============================================================================
// RUNTIME TYPE GUARDS
// =============================================================================

/**
 * Check if value matches schema
 */
export function isValidFor<T>(
  schema: ZodSchema<T>,
  value: unknown
): value is T {
  return schema.safeParse(value).success;
}

/**
 * Type assertion with validation
 */
export function assertType<T>(
  schema: ZodSchema<T>,
  value: unknown,
  message?: string
): asserts value is T {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new TypeError(
      message || `Type assertion failed: ${formatZodErrors(result.error).map(e => e.message).join(', ')}`
    );
  }
}

