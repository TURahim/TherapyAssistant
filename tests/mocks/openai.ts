import { vi } from 'vitest';
import { CrisisSeverity } from '@prisma/client';

/**
 * Mock OpenAI client for testing
 */
export function createMockOpenAI() {
  return {
    chat: {
      completions: {
        create: vi.fn(),
      },
    },
  };
}

/**
 * Create a mock crisis assessment response
 */
export function createMockCrisisResponse(options: {
  severity?: CrisisSeverity;
  indicators?: Array<{
    type: string;
    quote: string;
    severity: CrisisSeverity;
  }>;
  immediateRisk?: boolean;
  confidence?: number;
} = {}) {
  const {
    severity = CrisisSeverity.NONE,
    indicators = [],
    immediateRisk = false,
    confidence = 0.9,
  } = options;

  return {
    choices: [
      {
        message: {
          content: JSON.stringify({
            overallSeverity: severity,
            confidence,
            indicators,
            immediateRisk,
            recommendedActions: [],
            protectiveFactors: [],
            reasoning: 'Mock assessment for testing',
          }),
        },
      },
    ],
    usage: {
      prompt_tokens: 100,
      completion_tokens: 50,
      total_tokens: 150,
    },
  };
}

/**
 * Create a mock extraction response
 */
export function createMockExtractionResponse(options: {
  concerns?: Array<{ id: string; description: string }>;
  goals?: Array<{ id: string; description: string }>;
} = {}) {
  const { concerns = [], goals = [] } = options;

  return {
    choices: [
      {
        message: {
          content: JSON.stringify({
            concerns,
            impressions: [],
            suggestedDiagnoses: [],
            goals,
            interventions: [],
            strengths: [],
            risks: [],
            homework: [],
          }),
        },
      },
    ],
    usage: {
      prompt_tokens: 500,
      completion_tokens: 200,
      total_tokens: 700,
    },
  };
}

/**
 * Create a mock summary response
 */
export function createMockSummaryResponse(options: {
  therapistSummary?: string;
  clientSummary?: string;
  keyTopics?: string[];
} = {}) {
  const {
    therapistSummary = 'Mock therapist summary for testing.',
    clientSummary = 'Mock client summary for testing.',
    keyTopics = ['Test topic 1', 'Test topic 2'],
  } = options;

  return {
    choices: [
      {
        message: {
          content: JSON.stringify({
            therapistSummary,
            clientSummary,
            keyTopics,
          }),
        },
      },
    ],
    usage: {
      prompt_tokens: 300,
      completion_tokens: 150,
      total_tokens: 450,
    },
  };
}

/**
 * Setup OpenAI mock with specific response
 */
export function setupOpenAIMock(
  mockClient: ReturnType<typeof createMockOpenAI>,
  response: ReturnType<typeof createMockCrisisResponse | typeof createMockExtractionResponse>
) {
  mockClient.chat.completions.create.mockResolvedValue(response);
}

/**
 * Setup OpenAI mock to fail
 */
export function setupOpenAIMockFailure(
  mockClient: ReturnType<typeof createMockOpenAI>,
  error: Error | string
) {
  mockClient.chat.completions.create.mockRejectedValue(
    typeof error === 'string' ? new Error(error) : error
  );
}

