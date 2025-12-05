'use client';

import { AlertTriangle, Quote, Shield, Info } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from './PlanSection';
import { cn } from '@/lib/utils';
import type { CrisisSeverity } from '@prisma/client';

// =============================================================================
// TYPES
// =============================================================================

interface CrisisIndicator {
  type: string;
  quote: string;
  severity: CrisisSeverity;
  context?: string;
}

interface RiskIndicatorListProps {
  indicators: CrisisIndicator[];
  overallSeverity: CrisisSeverity;
  lastAssessed?: string;
  safetyPlanInPlace?: boolean;
  safetyPlanDetails?: string;
  protectiveFactors?: string[];
  className?: string;
}

// Indicator type descriptions
const INDICATOR_DESCRIPTIONS: Record<string, string> = {
  suicidal_ideation: 'Suicidal Ideation',
  self_harm: 'Self-Harm',
  hopelessness: 'Hopelessness',
  passive_death_wish: 'Passive Death Wish',
  plan_or_intent: 'Plan or Intent',
  means_access: 'Access to Means',
  previous_attempts: 'Previous Attempts',
  substance_use: 'Substance Use',
  social_isolation: 'Social Isolation',
  recent_loss: 'Recent Loss',
  command_hallucinations: 'Command Hallucinations',
  violence_risk: 'Violence Risk',
};

// =============================================================================
// INDICATOR CARD
// =============================================================================

interface IndicatorCardProps {
  indicator: CrisisIndicator;
}

function IndicatorCard({ indicator }: IndicatorCardProps) {
  const getSeverityBg = (severity: CrisisSeverity) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900/50';
      case 'HIGH':
        return 'bg-red-50/50 border-red-100 dark:bg-red-950/10 dark:border-red-900/30';
      case 'MEDIUM':
        return 'bg-orange-50 border-orange-100 dark:bg-orange-950/10 dark:border-orange-900/30';
      case 'LOW':
        return 'bg-yellow-50 border-yellow-100 dark:bg-yellow-950/10 dark:border-yellow-900/30';
      default:
        return 'bg-muted/50 border-muted';
    }
  };

  return (
    <div className={cn("p-4 rounded-lg border", getSeverityBg(indicator.severity))}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-sm font-medium">
          {INDICATOR_DESCRIPTIONS[indicator.type] || indicator.type}
        </span>
        <StatusBadge status={indicator.severity} />
      </div>
      <blockquote className="flex items-start gap-2 text-sm text-muted-foreground italic">
        <Quote className="h-4 w-4 shrink-0 mt-0.5" />
        <span>&ldquo;{indicator.quote}&rdquo;</span>
      </blockquote>
      {indicator.context && (
        <p className="mt-2 text-xs text-muted-foreground flex items-start gap-1">
          <Info className="h-3 w-3 shrink-0 mt-0.5" />
          {indicator.context}
        </p>
      )}
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function RiskIndicatorList({
  indicators,
  overallSeverity,
  lastAssessed,
  safetyPlanInPlace,
  safetyPlanDetails,
  protectiveFactors = [],
  className,
}: RiskIndicatorListProps) {
  const getSeverityColor = (severity: CrisisSeverity) => {
    switch (severity) {
      case 'CRITICAL':
        return 'text-red-700 dark:text-red-400';
      case 'HIGH':
        return 'text-red-600 dark:text-red-400';
      case 'MEDIUM':
        return 'text-orange-600 dark:text-orange-400';
      case 'LOW':
        return 'text-yellow-600 dark:text-yellow-400';
      default:
        return 'text-green-600 dark:text-green-400';
    }
  };

  const getSeverityBorderColor = (severity: CrisisSeverity) => {
    switch (severity) {
      case 'CRITICAL':
        return 'border-red-500';
      case 'HIGH':
        return 'border-red-400';
      case 'MEDIUM':
        return 'border-orange-400';
      case 'LOW':
        return 'border-yellow-400';
      default:
        return 'border-green-400';
    }
  };

  return (
    <Card className={cn("overflow-hidden", getSeverityBorderColor(overallSeverity), "border-l-4", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className={cn("h-5 w-5", getSeverityColor(overallSeverity))} />
            <CardTitle className="text-lg">Crisis Assessment</CardTitle>
          </div>
          <StatusBadge status={overallSeverity} />
        </div>
        {lastAssessed && (
          <CardDescription>
            Last assessed: {new Date(lastAssessed).toLocaleDateString()}
          </CardDescription>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Safety Plan Status */}
        <div className={cn(
          "p-3 rounded-lg flex items-start gap-3",
          safetyPlanInPlace
            ? "bg-green-50 border border-green-200 dark:bg-green-950/10 dark:border-green-900/30"
            : "bg-amber-50 border border-amber-200 dark:bg-amber-950/10 dark:border-amber-900/30"
        )}>
          <Shield className={cn(
            "h-5 w-5 shrink-0",
            safetyPlanInPlace ? "text-green-600" : "text-amber-600"
          )} />
          <div>
            <p className={cn(
              "text-sm font-medium",
              safetyPlanInPlace ? "text-green-700 dark:text-green-400" : "text-amber-700 dark:text-amber-400"
            )}>
              Safety Plan: {safetyPlanInPlace ? 'In Place' : 'Not Established'}
            </p>
            {safetyPlanDetails && (
              <p className="text-xs text-muted-foreground mt-1">{safetyPlanDetails}</p>
            )}
          </div>
        </div>

        {/* Indicators */}
        {indicators.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Detected Indicators ({indicators.length})
            </h4>
            {indicators.map((indicator, index) => (
              <IndicatorCard key={index} indicator={indicator} />
            ))}
          </div>
        )}

        {indicators.length === 0 && overallSeverity === 'NONE' && (
          <p className="text-sm text-muted-foreground italic">
            No crisis indicators detected in recent sessions.
          </p>
        )}

        {/* Protective Factors */}
        {protectiveFactors.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              <Shield className="h-4 w-4 text-green-600" />
              Protective Factors
            </h4>
            <ul className="space-y-1">
              {protectiveFactors.map((factor, index) => (
                <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-green-600">•</span>
                  {factor}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default RiskIndicatorList;

