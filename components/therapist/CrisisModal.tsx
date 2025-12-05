'use client';

import { useState } from 'react';
import { CrisisSeverity } from '@prisma/client';
import { AlertTriangle, X, Phone, FileText, Clock, Shield, CheckCircle2 } from 'lucide-react';
import { SEVERITY_DESCRIPTIONS, RECOMMENDED_ACTIONS, INDICATOR_DESCRIPTIONS } from '@/lib/ai/prompts/crisis';

interface CrisisIndicator {
  type: string;
  quote: string;
  severity: CrisisSeverity;
  context?: string;
}

interface CrisisModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAcknowledge: (notes: string) => void;
  severity: CrisisSeverity;
  indicators: CrisisIndicator[];
  recommendedActions: string[];
  protectiveFactors?: string[];
  reasoning?: string;
  clientName?: string;
  sessionDate?: string;
}

export function CrisisModal({
  isOpen,
  onClose,
  onAcknowledge,
  severity,
  indicators,
  recommendedActions,
  protectiveFactors,
  reasoning,
  clientName = 'Client',
  sessionDate,
}: CrisisModalProps) {
  const [acknowledgmentNotes, setAcknowledgmentNotes] = useState('');
  const [checkedActions, setCheckedActions] = useState<Set<string>>(new Set());

  if (!isOpen) return null;

  const severityInfo = SEVERITY_DESCRIPTIONS[severity];
  const allActions = recommendedActions.length > 0 
    ? recommendedActions 
    : RECOMMENDED_ACTIONS[severity];

  const handleActionToggle = (action: string) => {
    const newChecked = new Set(checkedActions);
    if (newChecked.has(action)) {
      newChecked.delete(action);
    } else {
      newChecked.add(action);
    }
    setCheckedActions(newChecked);
  };

  const handleAcknowledge = () => {
    const notes = [
      `Crisis acknowledged at ${new Date().toISOString()}`,
      `Severity: ${severity}`,
      `Actions checked: ${Array.from(checkedActions).join(', ') || 'None'}`,
      acknowledgmentNotes ? `Notes: ${acknowledgmentNotes}` : '',
    ].filter(Boolean).join('\n');
    
    onAcknowledge(notes);
  };

  const getSeverityStyles = () => {
    switch (severity) {
      case 'CRITICAL':
        return {
          bg: 'bg-red-50',
          border: 'border-red-500',
          header: 'bg-red-600',
          text: 'text-red-800',
          badge: 'bg-red-100 text-red-800',
        };
      case 'HIGH':
        return {
          bg: 'bg-red-50',
          border: 'border-red-400',
          header: 'bg-red-500',
          text: 'text-red-700',
          badge: 'bg-red-100 text-red-700',
        };
      case 'MEDIUM':
        return {
          bg: 'bg-orange-50',
          border: 'border-orange-400',
          header: 'bg-orange-500',
          text: 'text-orange-700',
          badge: 'bg-orange-100 text-orange-700',
        };
      case 'LOW':
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-400',
          header: 'bg-yellow-500',
          text: 'text-yellow-700',
          badge: 'bg-yellow-100 text-yellow-700',
        };
      default:
        return {
          bg: 'bg-gray-50',
          border: 'border-gray-300',
          header: 'bg-gray-500',
          text: 'text-gray-700',
          badge: 'bg-gray-100 text-gray-700',
        };
    }
  };

  const styles = getSeverityStyles();

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={severity === 'CRITICAL' ? undefined : onClose}
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className={`relative w-full max-w-2xl rounded-xl ${styles.bg} ${styles.border} border-2 shadow-2xl`}>
          {/* Header */}
          <div className={`${styles.header} px-6 py-4 rounded-t-lg`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-8 w-8 text-white animate-pulse" />
                <div>
                  <h2 className="text-xl font-bold text-white">
                    {severityInfo.label} Alert
                  </h2>
                  <p className="text-white/90 text-sm">
                    {clientName} {sessionDate && `• ${sessionDate}`}
                  </p>
                </div>
              </div>
              {severity !== 'CRITICAL' && (
                <button
                  onClick={onClose}
                  className="text-white/80 hover:text-white transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
            {/* Description */}
            <div className={`p-4 rounded-lg ${styles.badge}`}>
              <p className="font-medium">{severityInfo.description}</p>
              <p className="text-sm mt-1 opacity-80">{severityInfo.action}</p>
            </div>

            {/* Indicators */}
            {indicators.length > 0 && (
              <div>
                <h3 className={`font-semibold mb-3 flex items-center gap-2 ${styles.text}`}>
                  <FileText className="h-5 w-5" />
                  Detected Indicators
                </h3>
                <div className="space-y-3">
                  {indicators.map((indicator, index) => (
                    <div key={index} className="bg-white rounded-lg p-4 shadow-sm border">
                      <div className="flex items-start justify-between">
                        <span className="font-medium text-gray-900">
                          {INDICATOR_DESCRIPTIONS[indicator.type] || indicator.type}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded ${styles.badge}`}>
                          {indicator.severity}
                        </span>
                      </div>
                      <blockquote className="mt-2 pl-3 border-l-2 border-gray-300 italic text-gray-600">
                        &ldquo;{indicator.quote}&rdquo;
                      </blockquote>
                      {indicator.context && (
                        <p className="mt-2 text-sm text-gray-500">{indicator.context}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommended Actions */}
            <div>
              <h3 className={`font-semibold mb-3 flex items-center gap-2 ${styles.text}`}>
                <Shield className="h-5 w-5" />
                Recommended Actions
              </h3>
              <div className="space-y-2">
                {allActions.map((action, index) => (
                  <label
                    key={index}
                    className="flex items-start gap-3 p-3 bg-white rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={checkedActions.has(action)}
                      onChange={() => handleActionToggle(action)}
                      className="mt-0.5 h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-gray-700">{action}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Protective Factors */}
            {protectiveFactors && protectiveFactors.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2 text-green-700">
                  <CheckCircle2 className="h-5 w-5" />
                  Protective Factors
                </h3>
                <ul className="space-y-1">
                  {protectiveFactors.map((factor, index) => (
                    <li key={index} className="flex items-start gap-2 text-gray-600">
                      <span className="text-green-500">•</span>
                      {factor}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* AI Reasoning */}
            {reasoning && (
              <div>
                <h3 className="font-semibold mb-2 text-gray-700">Assessment Reasoning</h3>
                <p className="text-sm text-gray-600 bg-gray-100 rounded-lg p-3">
                  {reasoning}
                </p>
              </div>
            )}

            {/* Acknowledgment Notes */}
            <div>
              <h3 className="font-semibold mb-2 text-gray-700">Clinical Notes</h3>
              <textarea
                value={acknowledgmentNotes}
                onChange={(e) => setAcknowledgmentNotes(e.target.value)}
                placeholder="Document your assessment and any actions taken..."
                className="w-full h-24 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 rounded-b-xl border-t flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Clock className="h-4 w-4" />
              <span>Timestamp will be recorded on acknowledgment</span>
            </div>
            <div className="flex gap-3">
              {severity === 'CRITICAL' && (
                <a
                  href="tel:911"
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                >
                  <Phone className="h-4 w-4" />
                  Call 911
                </a>
              )}
              <button
                onClick={handleAcknowledge}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Acknowledge & Continue
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CrisisModal;

