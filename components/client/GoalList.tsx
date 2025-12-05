'use client';

import { GoalCard } from './GoalCard';

export interface GoalListItem {
  id: string;
  title: string;
  description?: string;
  progress: number;
  status?: 'on_track' | 'behind' | 'blocked';
  tags?: string[];
}

export interface GoalListProps {
  goals: GoalListItem[];
}

export function GoalList({ goals }: GoalListProps) {
  if (!goals.length) {
    return <p className="text-sm text-muted-foreground">No goals added yet.</p>;
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {goals.map((goal) => (
        <GoalCard key={goal.id} {...goal} />
      ))}
    </div>
  );
}

export default GoalList;

