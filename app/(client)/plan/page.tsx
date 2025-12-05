'use client';

import { PlanOverview } from '@/components/client/PlanOverview';

const mockGoals = [
  {
    id: 'g1',
    title: 'Reduce anxiety in social situations',
    description: 'Practice exposure hierarchy and thought challenging.',
    progress: 45,
    status: 'on_track' as const,
    tags: ['CBT', 'Exposure'],
  },
  {
    id: 'g2',
    title: 'Improve sleep hygiene',
    description: 'Create consistent bedtime routine and reduce screen time.',
    progress: 30,
    status: 'behind' as const,
    tags: ['Sleep'],
  },
  {
    id: 'g3',
    title: 'Increase daily movement',
    description: 'Add short walks 3x/week to support mood.',
    progress: 20,
    status: 'on_track' as const,
    tags: ['Wellness'],
  },
];

const mockStrengths = ['Resilient', 'Insightful', 'Curious', 'Thoughtful'];

export default function ClientPlanPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
      <PlanOverview
        planTitle="Anxiety Management Plan"
        status="ACTIVE"
        goals={mockGoals}
        strengths={mockStrengths}
        nextSession={{ date: 'Mon, Aug 18 • 3:00 PM', focus: 'Review exposure homework' }}
        lastSessionSummary="You explored recent social situations and practiced a short breathing exercise. You noted progress in catching negative thoughts sooner."
      />
    </div>
  );
}

