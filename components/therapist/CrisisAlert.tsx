'use client';

import { useState } from 'react';
import { CrisisSeverity } from '@prisma/client';
import { AlertTriangle, X, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { SEVERITY_DESCRIPTIONS } from '@/lib/ai/prompts/crisis';

interface CrisisAlertProps {
  severity: CrisisSeverity;
  message?: string;
  indicators?: Array<{ type: string; quote: string }>;
  onDismiss?: () => void;
  onViewDetails?: () => void;
  className?: string;
  dismissible?: boolean;
  expandable?: boolean;
}

export function CrisisAlert({
  severity,
  message,
  indicators = [],
  onDismiss,
  onViewDetails,
  className = '',
  dismissible = true,
  expandable = true,
}: CrisisAlertProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed || severity === 'NONE') return null;

  const severityInfo = SEVERITY_DESCRIPTIONS[severity];

  const getStyles = () => {
    switch (severity) {
      case 'CRITICAL':
        return {
          container: 'bg-red-100 border-red-500 text-red-900',
          icon: 'text-red-600',
          button: 'text-red-600 hover:text-red-800',
          badge: 'bg-red-200 text-red-800',
        };
      case 'HIGH':
        return {
          container: 'bg-red-50 border-red-400 text-red-800',
          icon: 'text-red-500',
          button: 'text-red-500 hover:text-red-700',
          badge: 'bg-red-100 text-red-700',
        };
      case 'MEDIUM':
        return {
          container: 'bg-orange-50 border-orange-400 text-orange-800',
          icon: 'text-orange-500',
          button: 'text-orange-500 hover:text-orange-700',
          badge: 'bg-orange-100 text-orange-700',
        };
      case 'LOW':
        return {
          container: 'bg-yellow-50 border-yellow-400 text-yellow-800',
          icon: 'text-yellow-600',
          button: 'text-yellow-600 hover:text-yellow-800',
          badge: 'bg-yellow-100 text-yellow-700',
        };
      default:
        return {
          container: 'bg-gray-50 border-gray-300 text-gray-700',
          icon: 'text-gray-500',
          button: 'text-gray-500 hover:text-gray-700',
          badge: 'bg-gray-100 text-gray-600',
        };
    }
  };

  const styles = getStyles();

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.();
  };

  return (
    <div
      className={`border-l-4 rounded-r-lg p-4 ${styles.container} ${className}`}
      role="alert"
      aria-live={severity === 'CRITICAL' || severity === 'HIGH' ? 'assertive' : 'polite'}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <AlertTriangle 
            className={`h-5 w-5 mt-0.5 flex-shrink-0 ${styles.icon} ${
              severity === 'CRITICAL' ? 'animate-pulse' : ''
            }`} 
          />
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold">
                {severityInfo.label}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${styles.badge}`}>
                {severity}
              </span>
            </div>
            <p className="mt-1 text-sm">
              {message || severityInfo.description}
            </p>
            
            {/* Expandable indicators */}
            {expandable && indicators.length > 0 && (
              <div className="mt-2">
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className={`flex items-center gap-1 text-sm font-medium ${styles.button}`}
                >
                  {isExpanded ? (
                    <>
                      <ChevronUp className="h-4 w-4" />
                      Hide details
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4" />
                      View {indicators.length} indicator{indicators.length > 1 ? 's' : ''}
                    </>
                  )}
                </button>
                
                {isExpanded && (
                  <div className="mt-2 space-y-2">
                    {indicators.map((indicator, index) => (
                      <div 
                        key={index} 
                        className="text-sm pl-3 border-l-2 border-current/30"
                      >
                        <span className="font-medium">{indicator.type}:</span>
                        <span className="ml-1 italic">&ldquo;{indicator.quote}&rdquo;</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-start gap-2">
          {onViewDetails && (
            <button
              onClick={onViewDetails}
              className={`p-1 rounded transition-colors ${styles.button}`}
              title="View full details"
            >
              <ExternalLink className="h-4 w-4" />
            </button>
          )}
          {dismissible && onDismiss && (
            <button
              onClick={handleDismiss}
              className={`p-1 rounded transition-colors ${styles.button}`}
              title="Dismiss alert"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
      
      {/* Action recommendation */}
      {(severity === 'HIGH' || severity === 'CRITICAL') && (
        <div className="mt-3 pt-3 border-t border-current/20">
          <p className="text-sm font-medium">
            Recommended: {severityInfo.action}
          </p>
        </div>
      )}
    </div>
  );
}

// Compact inline version
export function CrisisAlertInline({
  severity,
  onClick,
}: {
  severity: CrisisSeverity;
  onClick?: () => void;
}) {
  if (severity === 'NONE') return null;

  const severityInfo = SEVERITY_DESCRIPTIONS[severity];

  const getColor = () => {
    switch (severity) {
      case 'CRITICAL':
      case 'HIGH':
        return 'text-red-600 bg-red-50';
      case 'MEDIUM':
        return 'text-orange-600 bg-orange-50';
      case 'LOW':
        return 'text-yellow-600 bg-yellow-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${getColor()} hover:opacity-80 transition-opacity`}
    >
      <AlertTriangle className={`h-3 w-3 ${severity === 'CRITICAL' ? 'animate-pulse' : ''}`} />
      {severityInfo.label}
    </button>
  );
}

export default CrisisAlert;

