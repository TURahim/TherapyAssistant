'use client';

import { CrisisSeverity } from '@prisma/client';
import { AlertTriangle, Shield, ShieldAlert, ShieldCheck, ShieldX } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RiskBadgeProps {
  severity: CrisisSeverity;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  showIcon?: boolean;
  variant?: 'filled' | 'outline' | 'subtle';
  className?: string;
  onClick?: () => void;
}

export function RiskBadge({
  severity,
  size = 'md',
  showLabel = true,
  showIcon = true,
  variant = 'filled',
  className,
  onClick,
}: RiskBadgeProps) {
  const getLabel = () => {
    switch (severity) {
      case 'CRITICAL':
        return 'Critical';
      case 'HIGH':
        return 'High Risk';
      case 'MEDIUM':
        return 'Medium Risk';
      case 'LOW':
        return 'Low Risk';
      case 'NONE':
      default:
        return 'Safe';
    }
  };

  const getIcon = () => {
    const iconSize = size === 'sm' ? 'h-3 w-3' : size === 'lg' ? 'h-5 w-5' : 'h-4 w-4';
    const iconClass = cn(iconSize, severity === 'CRITICAL' && 'animate-pulse');

    switch (severity) {
      case 'CRITICAL':
        return <AlertTriangle className={iconClass} />;
      case 'HIGH':
        return <ShieldX className={iconClass} />;
      case 'MEDIUM':
        return <ShieldAlert className={iconClass} />;
      case 'LOW':
        return <Shield className={iconClass} />;
      case 'NONE':
      default:
        return <ShieldCheck className={iconClass} />;
    }
  };

  const getStyles = () => {
    const baseStyles: Record<CrisisSeverity, { filled: string; outline: string; subtle: string }> = {
      CRITICAL: {
        filled: 'bg-red-600 text-white border-red-600',
        outline: 'border-red-500 text-red-600 bg-transparent',
        subtle: 'bg-red-100 text-red-700 border-transparent',
      },
      HIGH: {
        filled: 'bg-red-500 text-white border-red-500',
        outline: 'border-red-400 text-red-500 bg-transparent',
        subtle: 'bg-red-50 text-red-600 border-transparent',
      },
      MEDIUM: {
        filled: 'bg-orange-500 text-white border-orange-500',
        outline: 'border-orange-400 text-orange-600 bg-transparent',
        subtle: 'bg-orange-50 text-orange-600 border-transparent',
      },
      LOW: {
        filled: 'bg-yellow-500 text-white border-yellow-500',
        outline: 'border-yellow-400 text-yellow-600 bg-transparent',
        subtle: 'bg-yellow-50 text-yellow-700 border-transparent',
      },
      NONE: {
        filled: 'bg-green-500 text-white border-green-500',
        outline: 'border-green-400 text-green-600 bg-transparent',
        subtle: 'bg-green-50 text-green-600 border-transparent',
      },
    };

    return baseStyles[severity][variant];
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return 'text-xs px-1.5 py-0.5 gap-1';
      case 'lg':
        return 'text-base px-3 py-1.5 gap-2';
      case 'md':
      default:
        return 'text-sm px-2 py-1 gap-1.5';
    }
  };

  const Component = onClick ? 'button' : 'span';

  return (
    <Component
      className={cn(
        'inline-flex items-center font-medium rounded-full border transition-colors',
        getSizeStyles(),
        getStyles(),
        onClick && 'cursor-pointer hover:opacity-90',
        className
      )}
      onClick={onClick}
      title={`Risk Level: ${getLabel()}`}
    >
      {showIcon && getIcon()}
      {showLabel && <span>{getLabel()}</span>}
    </Component>
  );
}

// Minimal dot indicator
export function RiskDot({
  severity,
  size = 'md',
  pulse = false,
  className,
}: {
  severity: CrisisSeverity;
  size?: 'sm' | 'md' | 'lg';
  pulse?: boolean;
  className?: string;
}) {
  const getColor = () => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-red-600';
      case 'HIGH':
        return 'bg-red-500';
      case 'MEDIUM':
        return 'bg-orange-500';
      case 'LOW':
        return 'bg-yellow-500';
      case 'NONE':
      default:
        return 'bg-green-500';
    }
  };

  const getSize = () => {
    switch (size) {
      case 'sm':
        return 'h-2 w-2';
      case 'lg':
        return 'h-4 w-4';
      case 'md':
      default:
        return 'h-3 w-3';
    }
  };

  const shouldPulse = pulse || severity === 'CRITICAL' || severity === 'HIGH';

  return (
    <span
      className={cn(
        'inline-block rounded-full',
        getSize(),
        getColor(),
        shouldPulse && 'animate-pulse',
        className
      )}
      title={`Risk Level: ${severity}`}
    />
  );
}

// Risk level bar visualization
export function RiskLevelBar({
  severity,
  showLabel = true,
  className,
}: {
  severity: CrisisSeverity;
  showLabel?: boolean;
  className?: string;
}) {
  const getLevelIndex = () => {
    const levels: CrisisSeverity[] = ['NONE', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
    return levels.indexOf(severity);
  };

  const levelIndex = getLevelIndex();
  const totalLevels = 5;

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {showLabel && (
        <div className="flex justify-between text-xs">
          <span className="text-gray-500">Risk Level</span>
          <span className="font-medium">{severity}</span>
        </div>
      )}
      <div className="flex gap-1">
        {Array.from({ length: totalLevels }).map((_, index) => {
          const isActive = index <= levelIndex;
          const getBarColor = () => {
            if (!isActive) return 'bg-gray-200';
            if (index >= 3) return 'bg-red-500';
            if (index === 2) return 'bg-orange-500';
            if (index === 1) return 'bg-yellow-500';
            return 'bg-green-500';
          };

          return (
            <div
              key={index}
              className={cn(
                'h-2 flex-1 rounded-full transition-colors',
                getBarColor(),
                isActive && index >= 3 && 'animate-pulse'
              )}
            />
          );
        })}
      </div>
    </div>
  );
}

// Risk summary card
export function RiskSummaryCard({
  severity,
  indicatorCount = 0,
  lastAssessed,
  onViewDetails,
  className,
}: {
  severity: CrisisSeverity;
  indicatorCount?: number;
  lastAssessed?: string;
  onViewDetails?: () => void;
  className?: string;
}) {
  const getBgColor = () => {
    switch (severity) {
      case 'CRITICAL':
      case 'HIGH':
        return 'bg-red-50 border-red-200';
      case 'MEDIUM':
        return 'bg-orange-50 border-orange-200';
      case 'LOW':
        return 'bg-yellow-50 border-yellow-200';
      case 'NONE':
      default:
        return 'bg-green-50 border-green-200';
    }
  };

  return (
    <div className={cn('rounded-lg border p-4', getBgColor(), className)}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-gray-600">Risk Assessment</span>
        <RiskBadge severity={severity} size="sm" />
      </div>
      
      <RiskLevelBar severity={severity} showLabel={false} className="mb-3" />
      
      <div className="flex justify-between text-sm">
        <div>
          <span className="text-gray-500">Indicators: </span>
          <span className="font-medium">{indicatorCount}</span>
        </div>
        {lastAssessed && (
          <span className="text-gray-400 text-xs">
            Assessed: {lastAssessed}
          </span>
        )}
      </div>
      
      {onViewDetails && (
        <button
          onClick={onViewDetails}
          className="mt-3 w-full text-center text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          View Full Assessment
        </button>
      )}
    </div>
  );
}

export default RiskBadge;

