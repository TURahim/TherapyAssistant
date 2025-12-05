import { describe, it, expect } from 'vitest';
import {
  diffCanonicalPlans,
  diffTherapistViews,
  getSectionDiffs,
  generateChangeSummary,
  deepEqual,
  diffArrays,
  diffObjects,
} from '@/lib/services/diffService';

describe('diffService', () => {
  // ===========================================================================
  // deepEqual tests
  // ===========================================================================
  describe('deepEqual', () => {
    it('should return true for identical primitives', () => {
      expect(deepEqual('hello', 'hello')).toBe(true);
      expect(deepEqual(42, 42)).toBe(true);
      expect(deepEqual(true, true)).toBe(true);
      expect(deepEqual(null, null)).toBe(true);
    });

    it('should return false for different primitives', () => {
      expect(deepEqual('hello', 'world')).toBe(false);
      expect(deepEqual(42, 43)).toBe(false);
      expect(deepEqual(true, false)).toBe(false);
      expect(deepEqual(null, undefined)).toBe(false);
    });

    it('should compare arrays deeply', () => {
      expect(deepEqual([1, 2, 3], [1, 2, 3])).toBe(true);
      expect(deepEqual([1, 2, 3], [1, 2, 4])).toBe(false);
      expect(deepEqual([1, 2, 3], [1, 2])).toBe(false);
    });

    it('should compare objects deeply', () => {
      expect(deepEqual({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true);
      expect(deepEqual({ a: 1, b: 2 }, { a: 1, b: 3 })).toBe(false);
      expect(deepEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
    });

    it('should handle nested structures', () => {
      const obj1 = { a: { b: { c: [1, 2, 3] } } };
      const obj2 = { a: { b: { c: [1, 2, 3] } } };
      const obj3 = { a: { b: { c: [1, 2, 4] } } };

      expect(deepEqual(obj1, obj2)).toBe(true);
      expect(deepEqual(obj1, obj3)).toBe(false);
    });
  });

  // ===========================================================================
  // diffArrays tests
  // ===========================================================================
  describe('diffArrays', () => {
    it('should detect added items', () => {
      const oldArray = [{ id: '1', name: 'Item 1' }];
      const newArray = [
        { id: '1', name: 'Item 1' },
        { id: '2', name: 'Item 2' },
      ];

      const changes = diffArrays(oldArray, newArray, 'goals', 'goals');

      expect(changes).toHaveLength(1);
      expect(changes[0].type).toBe('added');
      expect(changes[0].newValue).toEqual({ id: '2', name: 'Item 2' });
    });

    it('should detect removed items', () => {
      const oldArray = [
        { id: '1', name: 'Item 1' },
        { id: '2', name: 'Item 2' },
      ];
      const newArray = [{ id: '1', name: 'Item 1' }];

      const changes = diffArrays(oldArray, newArray, 'goals', 'goals');

      expect(changes).toHaveLength(1);
      expect(changes[0].type).toBe('removed');
      expect(changes[0].oldValue).toEqual({ id: '2', name: 'Item 2' });
    });

    it('should detect modified items', () => {
      const oldArray = [{ id: '1', name: 'Old Name' }];
      const newArray = [{ id: '1', name: 'New Name' }];

      const changes = diffArrays(oldArray, newArray, 'goals', 'goals');

      expect(changes).toHaveLength(1);
      expect(changes[0].type).toBe('modified');
      expect(changes[0].oldValue).toEqual({ id: '1', name: 'Old Name' });
      expect(changes[0].newValue).toEqual({ id: '1', name: 'New Name' });
    });

    it('should handle empty arrays', () => {
      const changes = diffArrays([], [], 'goals', 'goals');
      expect(changes).toHaveLength(0);
    });

    it('should handle undefined arrays', () => {
      const changes = diffArrays(undefined, undefined, 'goals', 'goals');
      expect(changes).toHaveLength(0);
    });

    it('should detect multiple changes', () => {
      const oldArray = [
        { id: '1', name: 'Item 1' },
        { id: '2', name: 'Item 2' },
      ];
      const newArray = [
        { id: '1', name: 'Updated Item 1' },
        { id: '3', name: 'Item 3' },
      ];

      const changes = diffArrays(oldArray, newArray, 'goals', 'goals');

      expect(changes).toHaveLength(3);
      expect(changes.filter(c => c.type === 'removed')).toHaveLength(1);
      expect(changes.filter(c => c.type === 'added')).toHaveLength(1);
      expect(changes.filter(c => c.type === 'modified')).toHaveLength(1);
    });
  });

  // ===========================================================================
  // diffObjects tests
  // ===========================================================================
  describe('diffObjects', () => {
    it('should detect added fields', () => {
      const oldObj = { a: 1 };
      const newObj = { a: 1, b: 2 };

      const changes = diffObjects(oldObj, newObj, 'test', '');

      expect(changes).toHaveLength(1);
      expect(changes[0].type).toBe('added');
      expect(changes[0].field).toBe('b');
    });

    it('should detect removed fields', () => {
      const oldObj = { a: 1, b: 2 };
      const newObj = { a: 1 };

      const changes = diffObjects(oldObj, newObj, 'test', '');

      expect(changes).toHaveLength(1);
      expect(changes[0].type).toBe('removed');
      expect(changes[0].field).toBe('b');
    });

    it('should detect modified fields', () => {
      const oldObj = { a: 1 };
      const newObj = { a: 2 };

      const changes = diffObjects(oldObj, newObj, 'test', '');

      expect(changes).toHaveLength(1);
      expect(changes[0].type).toBe('modified');
      expect(changes[0].field).toBe('a');
    });

    it('should handle undefined objects', () => {
      const changes = diffObjects(undefined, undefined, 'test', '');
      expect(changes).toHaveLength(0);
    });
  });

  // ===========================================================================
  // diffCanonicalPlans tests
  // ===========================================================================
  describe('diffCanonicalPlans', () => {
    it('should return no changes for identical plans', () => {
      const plan = {
        goals: [{ id: '1', name: 'Goal 1' }],
        interventions: [{ id: '1', name: 'Intervention 1' }],
      };

      const diff = diffCanonicalPlans(plan, plan);

      expect(diff.hasChanges).toBe(false);
      expect(diff.changes).toHaveLength(0);
      expect(diff.summary).toBe('No changes');
    });

    it('should handle null plans', () => {
      const diff1 = diffCanonicalPlans(null, null);
      expect(diff1.hasChanges).toBe(false);

      const diff2 = diffCanonicalPlans(null, { goals: [] });
      expect(diff2.hasChanges).toBe(true);
      expect(diff2.summary).toBe('Initial plan creation');

      const diff3 = diffCanonicalPlans({ goals: [] }, null);
      expect(diff3.hasChanges).toBe(true);
      expect(diff3.summary).toBe('Plan deleted');
    });

    it('should detect changes in goals', () => {
      const oldPlan = {
        goals: [{ id: '1', name: 'Old Goal' }],
      };
      const newPlan = {
        goals: [{ id: '1', name: 'New Goal' }],
      };

      const diff = diffCanonicalPlans(oldPlan, newPlan);

      expect(diff.hasChanges).toBe(true);
      expect(diff.stats.modified).toBe(1);
    });

    it('should calculate correct stats', () => {
      const oldPlan = {
        goals: [
          { id: '1', name: 'Goal 1' },
          { id: '2', name: 'Goal 2' },
        ],
        interventions: [{ id: '1', name: 'Intervention 1' }],
      };
      const newPlan = {
        goals: [
          { id: '1', name: 'Updated Goal 1' },
          { id: '3', name: 'New Goal' },
        ],
        interventions: [{ id: '1', name: 'Intervention 1' }],
      };

      const diff = diffCanonicalPlans(oldPlan, newPlan);

      expect(diff.stats.added).toBe(1);
      expect(diff.stats.removed).toBe(1);
      expect(diff.stats.modified).toBe(1);
      expect(diff.stats.total).toBe(3);
    });

    it('should generate meaningful summary', () => {
      const oldPlan = {
        goals: [{ id: '1', name: 'Goal' }],
      };
      const newPlan = {
        goals: [
          { id: '1', name: 'Goal' },
          { id: '2', name: 'New Goal' },
        ],
      };

      const diff = diffCanonicalPlans(oldPlan, newPlan);

      expect(diff.summary).toContain('added');
    });
  });

  // ===========================================================================
  // diffTherapistViews tests
  // ===========================================================================
  describe('diffTherapistViews', () => {
    it('should compare clinical summary', () => {
      const oldView = {
        clinicalSummary: {
          primaryPresentation: 'Old summary',
        },
      };
      const newView = {
        clinicalSummary: {
          primaryPresentation: 'New summary',
        },
      };

      const diff = diffTherapistViews(oldView, newView);

      expect(diff.hasChanges).toBe(true);
      expect(diff.changes.some(c => c.section === 'clinicalSummary')).toBe(true);
    });

    it('should compare treatment goals', () => {
      const oldView = {
        treatmentGoals: {
          shortTerm: [{ id: '1', name: 'Short term goal' }],
          longTerm: [],
        },
      };
      const newView = {
        treatmentGoals: {
          shortTerm: [{ id: '1', name: 'Updated short term goal' }],
          longTerm: [],
        },
      };

      const diff = diffTherapistViews(oldView, newView);

      expect(diff.hasChanges).toBe(true);
    });

    it('should handle null views', () => {
      const diff1 = diffTherapistViews(null, null);
      expect(diff1.hasChanges).toBe(false);

      const diff2 = diffTherapistViews(null, { clinicalSummary: {} });
      expect(diff2.hasChanges).toBe(true);
    });
  });

  // ===========================================================================
  // getSectionDiffs tests
  // ===========================================================================
  describe('getSectionDiffs', () => {
    it('should group changes by section', () => {
      const diff = diffCanonicalPlans(
        {
          goals: [{ id: '1', name: 'Goal 1' }],
          interventions: [{ id: '1', name: 'Int 1' }],
        },
        {
          goals: [{ id: '1', name: 'Updated Goal' }],
          interventions: [{ id: '2', name: 'Int 2' }],
        }
      );

      const sections = getSectionDiffs(diff);

      expect(sections.length).toBeGreaterThan(0);
      const goalSection = sections.find(s => s.section === 'Treatment Goals');
      const intSection = sections.find(s => s.section === 'Interventions');

      expect(goalSection?.hasChanges).toBe(true);
      expect(intSection?.hasChanges).toBe(true);
    });
  });

  // ===========================================================================
  // generateChangeSummary tests
  // ===========================================================================
  describe('generateChangeSummary', () => {
    it('should return "No changes" for empty diff', () => {
      const diff = diffCanonicalPlans({}, {});
      const summary = generateChangeSummary(diff);
      expect(summary).toBe('No changes detected.');
    });

    it('should generate readable summary', () => {
      const diff = diffCanonicalPlans(
        { goals: [{ id: '1', name: 'Goal' }] },
        { goals: [{ id: '1', name: 'Updated Goal' }] }
      );

      const summary = generateChangeSummary(diff);

      expect(summary).toContain('Treatment Goals');
    });

    it('should truncate long change lists', () => {
      const oldPlan = {
        goals: Array.from({ length: 10 }, (_, i) => ({
          id: `${i}`,
          name: `Goal ${i}`,
        })),
      };
      const newPlan = {
        goals: Array.from({ length: 10 }, (_, i) => ({
          id: `${i}`,
          name: `Updated Goal ${i}`,
        })),
      };

      const diff = diffCanonicalPlans(oldPlan, newPlan);
      const summary = generateChangeSummary(diff);

      expect(summary).toContain('more changes');
    });
  });
});

