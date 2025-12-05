'use client';

import { HomeworkCard } from './HomeworkCard';

export interface HomeworkListItem {
  id: string;
  title: string;
  description: string;
  dueDate?: string | null;
  status: 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED';
}

export interface HomeworkListProps {
  items: HomeworkListItem[];
  onToggleComplete?: (id: string, completed: boolean) => void;
}

export function HomeworkList({ items, onToggleComplete }: HomeworkListProps) {
  if (!items.length) {
    return <p className="text-sm text-muted-foreground">No homework assigned yet.</p>;
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {items.map((item) => (
        <HomeworkCard key={item.id} {...item} onToggleComplete={onToggleComplete} />
      ))}
    </div>
  );
}

export default HomeworkList;

