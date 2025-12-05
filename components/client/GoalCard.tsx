'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GoalProgress } from './GoalProgress';

export interface GoalCardProps {
  title: string;
  description?: string;
  progress: number;
  status?: 'on_track' | 'behind' | 'blocked';
  tags?: string[];
}

export function GoalCard({ title, description, progress, status, tags = [] }: GoalCardProps) {
  return (
    <Card className="h-full">
      <CardHeader className="space-y-2">
        <CardTitle className="text-base">{title}</CardTitle>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <GoalProgress label="Progress" value={progress} status={status} />
      </CardContent>
    </Card>
  );
}

export default GoalCard;

