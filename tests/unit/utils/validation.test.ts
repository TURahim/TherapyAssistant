import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  validate,
  validateOrThrow,
  safeParse,
  formatZodErrors,
  jsonString,
  icdCodeSchema,
} from '@/lib/utils/validation';
import { ValidationError } from '@/lib/utils/errors';

describe('validation utils', () => {
  const schema = z.object({
    name: z.string(),
    age: z.number().int().min(0),
  });

  it('validate returns success with parsed data', () => {
    const result = validate(schema, { name: 'Alex', age: 30 });
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ name: 'Alex', age: 30 });
  });

  it('validate returns errors on failure', () => {
    const result = validate(schema, { name: 'Alex', age: -1 });
    expect(result.success).toBe(false);
    expect(result.errors?.[0]?.path).toBe('age');
  });

  it('validateOrThrow throws ValidationError with context', () => {
    expect(() => validateOrThrow(schema, { name: 'Alex' }, 'user')).toThrow(ValidationError);
    try {
      validateOrThrow(schema, { name: 'Alex' }, 'user');
    } catch (err) {
      const msg = (err as Error).message;
      expect(msg).toContain('user');
      expect(msg).toContain('age');
    }
  });

  it('safeParse returns null on invalid input', () => {
    expect(safeParse(schema, { name: 'Alex', age: 'bad' })).toBeNull();
  });

  it('formatZodErrors maps issues to simple objects', () => {
    const parsed = schema.safeParse({ name: 'Alex', age: -2 });
    if (parsed.success) throw new Error('Expected failure');
    const formatted = formatZodErrors(parsed.error);
    expect(formatted[0]).toMatchObject({ path: 'age', code: 'too_small' });
  });

  it('jsonString validator accepts valid JSON strings', () => {
    expect(() => jsonString.parse('{"ok":true}')).not.toThrow();
    expect(() => jsonString.parse('not json')).toThrow();
  });

  it('icdCodeSchema validates ICD-10 patterns', () => {
    expect(() => icdCodeSchema.parse('F32.0')).not.toThrow();
    expect(() => icdCodeSchema.parse('1234')).toThrow();
  });
});


