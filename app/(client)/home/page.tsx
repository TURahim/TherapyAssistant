'use client';

import { ClientHome } from '@/components/client/ClientHome';

// This page uses mock data for now. In a real client portal, fetch the
// authenticated client's plan and summaries.
const mockGoals = [
  {
    id: 'g1',
    title: 'Reduce anxiety in social situations',
    description: 'Practice exposure steps and cognitive reframing.',
    progress: 45,
    status: 'on_track' as const,
    tags: ['CBT', 'Exposure'],
  },
  {
    id: 'g2',
    title: 'Improve sleep hygiene',
    description: 'Establish a consistent wind-down routine.',
    progress: 30,
    status: 'behind' as const,
    tags: ['Sleep', 'Routine'],
  },
];

const mockStrengths = ['Resilient', 'Insightful', 'Curious'];

export default function ClientHomePage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <ClientHome
        clientName="Alex"
        activePlan={{
          id: 'plan-1',
          title: 'Anxiety Management Plan',
          status: 'ACTIVE',
          summary: 'Focus on cognitive restructuring, exposure steps, and weekly practice logs.',
          progress: 40,
          lastUpdated: '2 days ago',
        }}
        goals={mockGoals}
        strengths={mockStrengths}
        lastSummary={{
          sessionNumber: 4,
          summary:
            'You explored recent social situations and practiced a short breathing exercise. You noted progress in catching negative thoughts sooner.',
          generatedAt: new Date(),
        }}
        nextSession={{ date: 'Mon, Aug 18 • 3:00 PM', focus: 'Review exposure homework' }}
      />
    </div>
  );
}

