'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Sparkles } from 'lucide-react';

export interface SessionSummaryCardProps {
  sessionNumber: number;
  summary: string;
  generatedAt: Date | null;
  showMeta?: boolean;
}

export function SessionSummaryCard({ sessionNumber, summary, generatedAt, showMeta = true }: SessionSummaryCardProps) {
  return (
    <Card>
      <CardHeader className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Session {sessionNumber} Recap
          </CardTitle>
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
            Client View
          </Badge>
        </div>
        {showMeta && generatedAt && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>Generated {generatedAt.toLocaleDateString()}</span>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <p className="text-sm whitespace-pre-wrap leading-relaxed">{summary}</p>
      </CardContent>
    </Card>
  );
}

export default SessionSummaryCard;

