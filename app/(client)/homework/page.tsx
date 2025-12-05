'use client';

import { HomeworkList } from '@/components/client/HomeworkList';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const mockHomework = [
  {
    id: 'h1',
    title: 'Thought record (3 entries)',
    description: 'Capture automatic thoughts and challenge them with evidence.',
    dueDate: 'Fri, Aug 15',
    status: 'IN_PROGRESS' as const,
  },
  {
    id: 'h2',
    title: 'Exposure step: coffee chat',
    description: 'Schedule a 20-minute coffee chat with a teammate.',
    dueDate: 'Sun, Aug 17',
    status: 'ASSIGNED' as const,
  },
  {
    id: 'h3',
    title: 'Sleep routine log',
    description: 'Track bedtime routine for 3 nights.',
    dueDate: 'Mon, Aug 18',
    status: 'COMPLETED' as const,
  },
];

export default function HomeworkPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Homework</h1>
        <p className="text-muted-foreground">Keep track of your action items between sessions.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Current Homework</CardTitle>
        </CardHeader>
        <CardContent>
          <HomeworkList items={mockHomework} />
        </CardContent>
      </Card>
    </div>
  );
}

