import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ValidationError, NotFoundError } from '@/lib/utils/errors';
import * as planService from '@/lib/services/planService';

vi.mock('@/lib/db/queries/sessions', () => ({
  getSessionById: vi.fn(),
  updateSession: vi.fn(),
}));

vi.mock('@/lib/db/queries/plans', () => ({
  getOrCreatePlan: vi.fn(),
  lockPlan: vi.fn(),
  unlockPlan: vi.fn(),
  getLatestVersionNumber: vi.fn().mockResolvedValue(1),
  createPlanVersion: vi.fn(),
  updatePlan: vi.fn(),
  isPlanOfTherapist: vi.fn().mockResolvedValue(true),
}));

vi.mock('@/lib/services/storageService', () => ({
  getUpload: vi.fn(),
}));

vi.mock('@/lib/ai/pipeline', () => ({
  createPipelineContext: vi.fn((params) => ({ ...params, startTime: 0 })),
  runPipeline: vi.fn(),
}));

vi.mock('@/lib/services/auditService', () => ({
  logAudit: vi.fn(),
  logPlanGenerated: vi.fn(),
}));

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    client: {
      findUnique: vi.fn().mockResolvedValue({
        preferredName: 'Test Client',
        user: { firstName: 'Test', lastName: 'Client' },
      }),
    },
    therapist: {
      findUnique: vi.fn().mockResolvedValue({ id: 'therapist-1' }),
    },
  },
}));

const sessionQueries = await import('@/lib/db/queries/sessions');
const planQueries = await import('@/lib/db/queries/plans');
const storageService = await import('@/lib/services/storageService');
const pipeline = await import('@/lib/ai/pipeline');

describe('planService.generatePlan', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (sessionQueries.getSessionById as any).mockResolvedValue({
      id: 'session-1',
      therapistId: 'therapist-1',
      clientId: 'client-1',
    });
    (planQueries.getOrCreatePlan as any).mockResolvedValue({
      id: 'plan-1',
      canonicalPlan: null,
      isLocked: false,
    });
    (planQueries.updatePlan as any).mockResolvedValue({
      id: 'plan-1',
      currentVersion: 1,
    });
    (pipeline.runPipeline as any).mockResolvedValue({
      success: true,
      planId: 'plan-1',
      versionNumber: 2,
      crisisDetected: false,
      warnings: [],
      errors: [],
      processingTime: 10,
    });
  });

  it('throws when neither transcript nor audio is provided', async () => {
    await expect(
      planService.generatePlan({
        sessionId: 'session-1',
        clientId: 'client-1',
        therapistId: 'therapist-1',
        userId: 'user-1',
        transcript: '',
      })
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('throws when audio upload is missing', async () => {
    (storageService.getUpload as any).mockResolvedValue(null);

    await expect(
      planService.generatePlan({
        sessionId: 'session-1',
        clientId: 'client-1',
        therapistId: 'therapist-1',
        userId: 'user-1',
        audioUploadId: 'missing',
      })
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('runs pipeline when transcript is provided', async () => {
    const result = await planService.generatePlan({
      sessionId: 'session-1',
      clientId: 'client-1',
      therapistId: 'therapist-1',
      userId: 'user-1',
      transcript: 'This is a sufficiently long transcript with more than 100 characters for validation. '.repeat(2),
    });

    expect(pipeline.runPipeline).toHaveBeenCalled();
    expect(result.success).toBe(true);
  });

  it('allows audio workflow when upload exists', async () => {
    (storageService.getUpload as any).mockResolvedValue({
      id: 'upload-1',
      sessionId: 'session-1',
      mediaType: 'AUDIO',
      mimeType: 'audio/mp3',
      storagePath: '/tmp/audio.mp3',
      expiresAt: new Date(Date.now() + 60_000),
    });

    const result = await planService.generatePlan({
      sessionId: 'session-1',
      clientId: 'client-1',
      therapistId: 'therapist-1',
      userId: 'user-1',
      audioUploadId: 'upload-1',
    });

    expect(storageService.getUpload).toHaveBeenCalledWith('upload-1');
    expect(pipeline.runPipeline).toHaveBeenCalled();
    expect(result.success).toBe(true);
  });
});


