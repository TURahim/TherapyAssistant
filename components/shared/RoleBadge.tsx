'use client';

import { cn } from '@/lib/utils';
import { UserRole } from '@prisma/client';
import { Stethoscope, User } from 'lucide-react';

interface RoleBadgeProps {
  role: UserRole;
  size?: 'sm' | 'md';
  showIcon?: boolean;
  className?: string;
}

const roleConfig = {
  THERAPIST: {
    label: 'Therapist',
    icon: Stethoscope,
    className: 'bg-primary/10 text-primary border-primary/20',
  },
  CLIENT: {
    label: 'Client',
    icon: User,
    className: 'bg-accent text-accent-foreground border-accent-foreground/20',
  },
  ADMIN: {
    label: 'Admin',
    icon: User,
    className: 'bg-destructive/10 text-destructive border-destructive/20',
  },
};

const sizeClasses = {
  sm: 'text-xs px-2 py-0.5 gap-1',
  md: 'text-sm px-2.5 py-1 gap-1.5',
};

const iconSizes = {
  sm: 'h-3 w-3',
  md: 'h-4 w-4',
};

export function RoleBadge({ role, size = 'sm', showIcon = true, className }: RoleBadgeProps) {
  const config = roleConfig[role];
  const Icon = config.icon;

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border font-medium',
        sizeClasses[size],
        config.className,
        className
      )}
    >
      {showIcon && <Icon className={iconSizes[size]} />}
      {config.label}
    </span>
  );
}

