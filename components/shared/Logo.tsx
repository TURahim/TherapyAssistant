'use client';

import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  href?: string;
  className?: string;
}

const sizeMap = {
  sm: { icon: 24, text: 'text-lg' },
  md: { icon: 32, text: 'text-xl' },
  lg: { icon: 48, text: 'text-2xl' },
};

export function Logo({ size = 'md', showText = true, href = '/', className }: LogoProps) {
  const { icon, text } = sizeMap[size];

  const content = (
    <div className={cn('flex items-center gap-2', className)}>
      <Image
        src="/logo.svg"
        alt="Tava Health"
        width={icon}
        height={icon}
        className="flex-shrink-0"
        priority
      />
      {showText && (
        <span className={cn('font-semibold tracking-tight text-foreground', text)}>
          Tava<span className="text-primary">Health</span>
        </span>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md">
        {content}
      </Link>
    );
  }

  return content;
}

