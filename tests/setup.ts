import '@testing-library/jest-dom';
import { vi } from 'vitest';
import { prismaMock } from './mocks/prisma';

// Mock environment variables
process.env.OPENAI_API_KEY = 'test-api-key';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.NEXTAUTH_SECRET = 'test-secret';

// Mock Prisma client (singleton)
vi.mock('@/lib/db/prisma', () => ({
  prisma: prismaMock,
}));

// Mock OpenAI
vi.mock('openai', () => ({
  default: vi.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: vi.fn(),
      },
    },
  })),
}));

// Global test utilities
global.console = {
  ...console,
  // Suppress console.log in tests unless DEBUG is set
  log: process.env.DEBUG ? console.log : vi.fn(),
  debug: process.env.DEBUG ? console.debug : vi.fn(),
  info: process.env.DEBUG ? console.info : vi.fn(),
  warn: console.warn,
  error: console.error,
};

