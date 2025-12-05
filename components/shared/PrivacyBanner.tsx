'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PrivacyBannerProps {
  className?: string;
}

const BANNER_STORAGE_KEY = 'tava-privacy-banner-dismissed';

export function PrivacyBanner({ className }: PrivacyBannerProps) {
  const [isDismissed, setIsDismissed] = useState(true); // Start hidden to avoid flash

  useEffect(() => {
    const dismissed = localStorage.getItem(BANNER_STORAGE_KEY);
    setIsDismissed(dismissed === 'true');
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem(BANNER_STORAGE_KEY, 'true');
  };

  if (isDismissed) return null;

  return (
    <div
      className={cn(
        'relative bg-amber-500 text-amber-950 px-4 py-2',
        className
      )}
      role="banner"
    >
      <div className="container mx-auto flex items-center justify-center gap-2 text-sm font-medium pr-8">
        <AlertTriangle className="h-4 w-4 flex-shrink-0" />
        <p>
          <strong>Demo Environment:</strong> Do not enter real patient data. 
          This application is for demonstration purposes only.
        </p>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleDismiss}
        className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 p-0 text-amber-950 hover:bg-amber-600 hover:text-amber-950"
        aria-label="Dismiss banner"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}

