'use client';

import { STAGE_CONFIG, STAGE_ORDER, type PipelineStage } from '@/lib/hooks/useGeneration';
import { cn } from '@/lib/utils';
import { 
  CheckCircle2, 
  Circle, 
  Loader2,
  FileText,
  Shield,
  Brain,
  Users,
  Heart,
  FileOutput,
  Save,
  AlertTriangle,
} from 'lucide-react';

interface PipelineStageIndicatorProps {
  currentStage: PipelineStage;
  stageProgress?: number;
  vertical?: boolean;
}

const STAGE_ICONS: Record<PipelineStage, React.ElementType> = {
  idle: Circle,
  preprocessing: FileText,
  crisis_check: Shield,
  extraction: Brain,
  therapist_view: Users,
  client_view: Heart,
  summary: FileOutput,
  saving: Save,
  complete: CheckCircle2,
  error: AlertTriangle,
  crisis_halt: AlertTriangle,
};

const DISPLAY_STAGES: PipelineStage[] = [
  'preprocessing',
  'crisis_check',
  'extraction',
  'therapist_view',
  'client_view',
  'summary',
  'saving',
];

export function PipelineStageIndicator({
  currentStage,
  stageProgress = 0,
  vertical = false,
}: PipelineStageIndicatorProps) {
  const currentIndex = STAGE_ORDER.indexOf(currentStage);
  const isError = currentStage === 'error';
  const isCrisis = currentStage === 'crisis_halt';
  const isComplete = currentStage === 'complete';

  const getStageStatus = (stage: PipelineStage): 'complete' | 'current' | 'pending' | 'error' => {
    const stageIndex = STAGE_ORDER.indexOf(stage);
    
    if (isError || isCrisis) {
      if (stageIndex < currentIndex || (stageIndex === currentIndex && stage === 'crisis_check' && isCrisis)) {
        if (stage === 'crisis_check' && isCrisis) return 'error';
        return stageIndex < currentIndex ? 'complete' : 'error';
      }
      return 'pending';
    }
    
    if (isComplete) return 'complete';
    if (stageIndex < currentIndex) return 'complete';
    if (stageIndex === currentIndex) return 'current';
    return 'pending';
  };

  const getStageIcon = (stage: PipelineStage, status: string) => {
    const IconComponent = STAGE_ICONS[stage];
    
    if (status === 'complete') {
      return <CheckCircle2 className="h-5 w-5 text-green-600" />;
    }
    if (status === 'current') {
      return <Loader2 className="h-5 w-5 animate-spin text-blue-600" />;
    }
    if (status === 'error') {
      return <AlertTriangle className="h-5 w-5 text-amber-600" />;
    }
    return <IconComponent className="h-5 w-5 text-gray-400" />;
  };

  if (vertical) {
    return (
      <div className="space-y-3">
        {DISPLAY_STAGES.map((stage, index) => {
          const status = getStageStatus(stage);
          const config = STAGE_CONFIG[stage];
          
          return (
            <div key={stage} className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <div className={cn(
                  "flex items-center justify-center w-8 h-8 rounded-full border-2",
                  status === 'complete' && "bg-green-50 border-green-600",
                  status === 'current' && "bg-blue-50 border-blue-600",
                  status === 'error' && "bg-amber-50 border-amber-600",
                  status === 'pending' && "bg-gray-50 border-gray-300",
                )}>
                  {getStageIcon(stage, status)}
                </div>
                {index < DISPLAY_STAGES.length - 1 && (
                  <div className={cn(
                    "w-0.5 h-6 mt-1",
                    status === 'complete' ? "bg-green-600" : "bg-gray-300",
                  )} />
                )}
              </div>
              <div className="flex-1 pt-1">
                <p className={cn(
                  "text-sm font-medium",
                  status === 'complete' && "text-green-700",
                  status === 'current' && "text-blue-700",
                  status === 'error' && "text-amber-700",
                  status === 'pending' && "text-gray-500",
                )}>
                  {config.label.replace('...', '')}
                </p>
                {status === 'current' && stageProgress > 0 && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    {stageProgress}% complete
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Horizontal layout
  return (
    <div className="flex items-center justify-between">
      {DISPLAY_STAGES.map((stage, index) => {
        const status = getStageStatus(stage);
        const config = STAGE_CONFIG[stage];
        
        return (
          <div key={stage} className="flex items-center flex-1">
            <div className="flex flex-col items-center">
              <div className={cn(
                "flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors",
                status === 'complete' && "bg-green-50 border-green-600",
                status === 'current' && "bg-blue-50 border-blue-600",
                status === 'error' && "bg-amber-50 border-amber-600",
                status === 'pending' && "bg-gray-50 border-gray-300",
              )}>
                {getStageIcon(stage, status)}
              </div>
              <span className={cn(
                "text-xs mt-1 text-center max-w-[60px] leading-tight",
                status === 'complete' && "text-green-700",
                status === 'current' && "text-blue-700",
                status === 'error' && "text-amber-700",
                status === 'pending' && "text-gray-400",
              )}>
                {config.label.replace('...', '').replace('Generating ', '').replace('Creating ', '').replace('Checking for ', '')}
              </span>
            </div>
            {index < DISPLAY_STAGES.length - 1 && (
              <div className={cn(
                "flex-1 h-0.5 mx-2",
                status === 'complete' ? "bg-green-600" : "bg-gray-300",
              )} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default PipelineStageIndicator;

