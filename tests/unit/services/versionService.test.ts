import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mergePlans } from '@/lib/services/versionService';

// Mock the dependencies
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    treatmentPlan: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    treatmentPlanVersion: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
    },
    therapist: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('@/lib/db/queries/plans', () => ({
  isPlanOfTherapist: vi.fn(),
  getPlanVersions: vi.fn(),
  getPlanVersion: vi.fn(),
  getPlanById: vi.fn(),
  getLatestVersionNumber: vi.fn(),
  updatePlan: vi.fn(),
  createPlanVersion: vi.fn(),
}));

vi.mock('@/lib/services/auditService', () => ({
  logAudit: vi.fn(),
}));

describe('versionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================================================
  // mergePlans tests
  // ===========================================================================
  describe('mergePlans', () => {
    it('should merge without conflicts when no changes overlap', () => {
      const basePlan = {
        goals: [{ id: '1', name: 'Original Goal' }],
        interventions: [{ id: '1', name: 'Original Intervention' }],
      };

      const currentPlan = {
        goals: [
          { id: '1', name: 'Original Goal' },
          { id: '2', name: 'New Goal from current' },
        ],
        interventions: [{ id: '1', name: 'Original Intervention' }],
      };

      const incomingChanges = {
        goals: [{ id: '1', name: 'Original Goal' }],
        interventions: [
          { id: '1', name: 'Original Intervention' },
          { id: '2', name: 'New Intervention from incoming' },
        ],
      };

      const result = mergePlans(basePlan, currentPlan, incomingChanges);

      expect(result.success).toBe(true);
      expect(result.conflicts).toHaveLength(0);
      expect(result.mergedPlan.goals).toHaveLength(2);
      expect(result.mergedPlan.interventions).toHaveLength(2);
    });

    it('should detect conflicts when both modify same item', () => {
      const basePlan = {
        goals: [{ id: '1', name: 'Original Goal' }],
      };

      const currentPlan = {
        goals: [{ id: '1', name: 'Modified by current' }],
      };

      const incomingChanges = {
        goals: [{ id: '1', name: 'Modified by incoming' }],
      };

      const result = mergePlans(basePlan, currentPlan, incomingChanges);

      expect(result.success).toBe(false);
      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0].section).toBe('goals');
    });

    it('should accept incoming changes when current matches base', () => {
      const basePlan = {
        goals: [{ id: '1', name: 'Original Goal' }],
      };

      const currentPlan = {
        goals: [{ id: '1', name: 'Original Goal' }], // No change from base
      };

      const incomingChanges = {
        goals: [{ id: '1', name: 'Updated by incoming' }],
      };

      const result = mergePlans(basePlan, currentPlan, incomingChanges);

      expect(result.success).toBe(true);
      expect(result.conflicts).toHaveLength(0);
      const mergedGoal = (result.mergedPlan.goals as { id: string; name: string }[])[0];
      expect(mergedGoal.name).toBe('Updated by incoming');
    });

    it('should keep current changes when incoming matches base', () => {
      const basePlan = {
        goals: [{ id: '1', name: 'Original Goal' }],
      };

      const currentPlan = {
        goals: [{ id: '1', name: 'Updated by current' }],
      };

      const incomingChanges = {
        goals: [{ id: '1', name: 'Original Goal' }], // No change from base
      };

      const result = mergePlans(basePlan, currentPlan, incomingChanges);

      expect(result.success).toBe(true);
      expect(result.conflicts).toHaveLength(0);
      const mergedGoal = (result.mergedPlan.goals as { id: string; name: string }[])[0];
      expect(mergedGoal.name).toBe('Updated by current');
    });

    it('should handle items deleted in current', () => {
      const basePlan = {
        goals: [
          { id: '1', name: 'Goal 1' },
          { id: '2', name: 'Goal 2' },
        ],
      };

      const currentPlan = {
        goals: [{ id: '1', name: 'Goal 1' }], // Goal 2 deleted
      };

      const incomingChanges = {
        goals: [
          { id: '1', name: 'Goal 1' },
          { id: '2', name: 'Goal 2' },
        ],
      };

      const result = mergePlans(basePlan, currentPlan, incomingChanges);

      // Goal 2 should still be in merged since it wasn't deleted in incoming
      expect(result.mergedPlan.goals).toHaveLength(2);
    });

    it('should merge new session references', () => {
      const basePlan = {
        goals: [],
        sessionReferences: [{ sessionId: 'session-1' }],
      };

      const currentPlan = {
        goals: [],
        sessionReferences: [{ sessionId: 'session-1' }],
      };

      const incomingChanges = {
        goals: [],
        sessionReferences: [
          { sessionId: 'session-1' },
          { sessionId: 'session-2' },
        ],
      };

      const result = mergePlans(basePlan, currentPlan, incomingChanges);

      expect((result.mergedPlan.sessionReferences as { sessionId: string }[]).length).toBe(2);
    });

    it('should not duplicate session references', () => {
      const basePlan = {
        goals: [],
        sessionReferences: [{ sessionId: 'session-1' }],
      };

      const currentPlan = {
        goals: [],
        sessionReferences: [{ sessionId: 'session-1' }],
      };

      const incomingChanges = {
        goals: [],
        sessionReferences: [{ sessionId: 'session-1' }],
      };

      const result = mergePlans(basePlan, currentPlan, incomingChanges);

      expect((result.mergedPlan.sessionReferences as { sessionId: string }[]).length).toBe(1);
    });

    it('should handle scalar section conflicts', () => {
      const basePlan = {
        crisisAssessment: { severity: 'low' },
        goals: [],
      };

      const currentPlan = {
        crisisAssessment: { severity: 'medium' }, // Modified
        goals: [],
      };

      const incomingChanges = {
        crisisAssessment: { severity: 'high' }, // Also modified
        goals: [],
      };

      const result = mergePlans(basePlan, currentPlan, incomingChanges);

      expect(result.conflicts.some(c => c.section === 'crisisAssessment')).toBe(true);
      // Should keep current value by default
      expect((result.mergedPlan.crisisAssessment as { severity: string }).severity).toBe('medium');
    });

    it('should accept scalar changes when current matches base', () => {
      const basePlan = {
        crisisAssessment: { severity: 'low' },
        goals: [],
      };

      const currentPlan = {
        crisisAssessment: { severity: 'low' }, // Unchanged
        goals: [],
      };

      const incomingChanges = {
        crisisAssessment: { severity: 'medium' }, // Modified
        goals: [],
      };

      const result = mergePlans(basePlan, currentPlan, incomingChanges);

      expect(result.conflicts.length).toBe(0);
      expect((result.mergedPlan.crisisAssessment as { severity: string }).severity).toBe('medium');
    });

    it('should update version metadata', () => {
      const basePlan = {
        goals: [],
        version: 1,
      };

      const currentPlan = {
        goals: [],
        version: 1,
      };

      const incomingChanges = {
        goals: [],
      };

      const result = mergePlans(basePlan, currentPlan, incomingChanges);

      expect(result.mergedPlan.version).toBe(2);
      expect(result.mergedPlan.updatedAt).toBeDefined();
    });

    it('should generate appropriate summary message', () => {
      const basePlan = { goals: [] };
      const currentPlan = { goals: [] };
      const incomingChanges = { goals: [] };

      const result = mergePlans(basePlan, currentPlan, incomingChanges);

      expect(result.summary).toContain('successfully');
    });

    it('should mention conflicts in summary when present', () => {
      const basePlan = {
        goals: [{ id: '1', name: 'Goal' }],
      };

      const currentPlan = {
        goals: [{ id: '1', name: 'Modified A' }],
      };

      const incomingChanges = {
        goals: [{ id: '1', name: 'Modified B' }],
      };

      const result = mergePlans(basePlan, currentPlan, incomingChanges);

      expect(result.summary).toContain('conflict');
    });
  });
});

