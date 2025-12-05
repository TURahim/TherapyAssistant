'use client';

import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  label?: string;
}

const sizeMap = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
};

export function LoadingSpinner({ size = 'md', className, label }: LoadingSpinnerProps) {
  return (
    <div className="flex items-center gap-2" role="status" aria-label={label || 'Loading'}>
      <Loader2 className={cn('animate-spin text-primary', sizeMap[size], className)} />
      {label && <span className="text-sm text-muted-foreground">{label}</span>}
      <span className="sr-only">{label || 'Loading...'}</span>
    </div>
  );
}

interface FullPageSpinnerProps {
  label?: string;
}

export function FullPageSpinner({ label = 'Loading...' }: FullPageSpinnerProps) {
  return (
    <div className="flex min-h-[400px] w-full items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <LoadingSpinner size="lg" />
        <p className="text-sm text-muted-foreground animate-pulse">{label}</p>
      </div>
    </div>
  );
}

