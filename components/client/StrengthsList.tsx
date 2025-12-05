'use client';

import { Badge } from '@/components/ui/badge';

export interface StrengthsListProps {
  strengths: string[];
}

export function StrengthsList({ strengths }: StrengthsListProps) {
  if (!strengths.length) {
    return <p className="text-sm text-muted-foreground">Your strengths will appear here as we progress.</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {strengths.map((strength) => (
        <Badge key={strength} variant="success">
          {strength}
        </Badge>
      ))}
    </div>
  );
}

export default StrengthsList;

