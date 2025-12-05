'use client';

import { useState } from 'react';
import { AlertTriangle, Plus, Trash2, Edit2, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlanSection, StatusBadge, SectionBadge } from './PlanSection';
import { cn } from '@/lib/utils';
import type { CrisisSeverity } from '@prisma/client';

// =============================================================================
// TYPES
// =============================================================================

interface RiskFactor {
  id: string;
  type: 'suicidal_ideation' | 'self_harm' | 'substance_use' | 'violence' | 'other';
  description: string;
  severity: CrisisSeverity;
  mitigatingFactors: string[];
  sourceSessionIds: string[];
}

interface RiskEditorProps {
  riskFactors: RiskFactor[];
  onUpdate?: (riskFactors: RiskFactor[]) => void;
  currentRiskLevel?: CrisisSeverity;
  readOnly?: boolean;
  className?: string;
}

// Risk type labels
const RISK_TYPE_LABELS: Record<RiskFactor['type'], string> = {
  suicidal_ideation: 'Suicidal Ideation',
  self_harm: 'Self-Harm',
  substance_use: 'Substance Use',
  violence: 'Violence Risk',
  other: 'Other Risk',
};

// =============================================================================
// RISK CARD (Display Mode)
// =============================================================================

interface RiskCardProps {
  risk: RiskFactor;
  onEdit?: () => void;
  onDelete?: () => void;
  readOnly?: boolean;
}

function RiskCard({ risk, onEdit, onDelete, readOnly }: RiskCardProps) {
  return (
    <div className={cn(
      "p-4 rounded-lg border transition-colors",
      risk.severity === 'CRITICAL' && "bg-red-50 border-red-300 dark:bg-red-950/20 dark:border-red-900",
      risk.severity === 'HIGH' && "bg-red-50/50 border-red-200 dark:bg-red-950/10 dark:border-red-900/50",
      risk.severity === 'MEDIUM' && "bg-orange-50 border-orange-200 dark:bg-orange-950/10 dark:border-orange-900/50",
      risk.severity === 'LOW' && "bg-yellow-50 border-yellow-200 dark:bg-yellow-950/10 dark:border-yellow-900/50",
      risk.severity === 'NONE' && "bg-muted/30 border-muted"
    )}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <StatusBadge status={risk.severity} />
            <span className="text-xs text-muted-foreground font-medium">
              {RISK_TYPE_LABELS[risk.type]}
            </span>
          </div>
          <p className="text-sm">{risk.description}</p>
          {risk.mitigatingFactors.length > 0 && (
            <div className="pt-2">
              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Shield className="h-3 w-3" /> Mitigating Factors:
              </p>
              <ul className="mt-1 space-y-0.5">
                {risk.mitigatingFactors.map((factor, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex items-start gap-1">
                    <span className="text-green-600">•</span> {factor}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        {!readOnly && (
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit}>
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={onDelete}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// RISK FORM (Edit Mode)
// =============================================================================

interface RiskFormProps {
  risk?: RiskFactor;
  onSave: (risk: RiskFactor) => void;
  onCancel: () => void;
}

function RiskForm({ risk, onSave, onCancel }: RiskFormProps) {
  const [formData, setFormData] = useState<RiskFactor>(
    risk || {
      id: `risk-${Date.now()}`,
      type: 'other',
      description: '',
      severity: 'NONE',
      mitigatingFactors: [],
      sourceSessionIds: [],
    }
  );
  const [newMitigatingFactor, setNewMitigatingFactor] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const addMitigatingFactor = () => {
    if (newMitigatingFactor.trim()) {
      setFormData({
        ...formData,
        mitigatingFactors: [...formData.mitigatingFactors, newMitigatingFactor.trim()],
      });
      setNewMitigatingFactor('');
    }
  };

  const removeMitigatingFactor = (index: number) => {
    setFormData({
      ...formData,
      mitigatingFactors: formData.mitigatingFactors.filter((_, i) => i !== index),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 bg-muted/30 rounded-lg border">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Risk Type</label>
          <Select
            value={formData.type}
            onValueChange={(value) => setFormData({ ...formData, type: value as RiskFactor['type'] })}
          >
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="suicidal_ideation">Suicidal Ideation</SelectItem>
              <SelectItem value="self_harm">Self-Harm</SelectItem>
              <SelectItem value="substance_use">Substance Use</SelectItem>
              <SelectItem value="violence">Violence Risk</SelectItem>
              <SelectItem value="other">Other Risk</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium">Severity</label>
          <Select
            value={formData.severity}
            onValueChange={(value) => setFormData({ ...formData, severity: value as CrisisSeverity })}
          >
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="NONE">None</SelectItem>
              <SelectItem value="LOW">Low</SelectItem>
              <SelectItem value="MEDIUM">Medium</SelectItem>
              <SelectItem value="HIGH">High</SelectItem>
              <SelectItem value="CRITICAL">Critical</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <label className="text-sm font-medium">Description</label>
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Describe the risk factor and relevant observations..."
          className="mt-1"
          rows={3}
        />
      </div>

      <div>
        <label className="text-sm font-medium">Mitigating Factors</label>
        <div className="mt-1 space-y-2">
          {formData.mitigatingFactors.map((factor, index) => (
            <div key={index} className="flex items-center gap-2">
              <span className="flex-1 text-sm bg-muted px-3 py-1.5 rounded">{factor}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => removeMitigatingFactor(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <div className="flex gap-2">
            <Input
              value={newMitigatingFactor}
              onChange={(e) => setNewMitigatingFactor(e.target.value)}
              placeholder="Add a mitigating factor..."
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addMitigatingFactor();
                }
              }}
            />
            <Button type="button" variant="outline" onClick={addMitigatingFactor}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={!formData.description}>
          Save Risk Factor
        </Button>
      </div>
    </form>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function RiskEditor({
  riskFactors,
  onUpdate,
  currentRiskLevel = 'NONE',
  readOnly = false,
  className,
}: RiskEditorProps) {
  const [editing, setEditing] = useState(false);
  const [editingRisk, setEditingRisk] = useState<RiskFactor | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);

  // Get badge variant based on overall risk level
  const getBadgeVariant = () => {
    if (currentRiskLevel === 'CRITICAL' || currentRiskLevel === 'HIGH') return 'danger';
    if (currentRiskLevel === 'MEDIUM') return 'warning';
    if (currentRiskLevel === 'LOW') return 'info';
    return 'success';
  };

  const handleSaveRisk = (risk: RiskFactor) => {
    if (!onUpdate) return;

    const existingIndex = riskFactors.findIndex((r) => r.id === risk.id);
    if (existingIndex >= 0) {
      const updated = [...riskFactors];
      updated[existingIndex] = risk;
      onUpdate(updated);
    } else {
      onUpdate([...riskFactors, risk]);
    }
    setEditingRisk(null);
    setIsAddingNew(false);
  };

  const handleDeleteRisk = (riskId: string) => {
    if (!onUpdate) return;
    onUpdate(riskFactors.filter((r) => r.id !== riskId));
  };

  return (
    <PlanSection
      title="Risk Assessment"
      icon={<AlertTriangle className="h-5 w-5" />}
      badge={
        <div className="flex items-center gap-2">
          <SectionBadge count={riskFactors.length} variant={getBadgeVariant()} />
          <StatusBadge status={currentRiskLevel} />
        </div>
      }
      editable={!readOnly}
      editing={editing}
      onEdit={() => setEditing(true)}
      onSave={() => setEditing(false)}
      onCancel={() => setEditing(false)}
      className={className}
      actions={
        !readOnly && editing && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAddingNew(true)}
            className="h-8"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Risk Factor
          </Button>
        )
      }
    >
      {isAddingNew && (
        <RiskForm
          onSave={handleSaveRisk}
          onCancel={() => setIsAddingNew(false)}
        />
      )}

      {editingRisk && (
        <RiskForm
          risk={editingRisk}
          onSave={handleSaveRisk}
          onCancel={() => setEditingRisk(null)}
        />
      )}

      <div className={cn("space-y-3", (isAddingNew || editingRisk) && "mt-4")}>
        {riskFactors.map((risk) => (
          <RiskCard
            key={risk.id}
            risk={risk}
            onEdit={() => setEditingRisk(risk)}
            onDelete={() => handleDeleteRisk(risk.id)}
            readOnly={readOnly || !editing}
          />
        ))}
      </div>

      {riskFactors.length === 0 && !isAddingNew && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg dark:bg-green-950/10 dark:border-green-900/30">
          <p className="text-sm text-green-700 dark:text-green-400 flex items-center gap-2">
            <Shield className="h-4 w-4" />
            No current risk factors identified.
          </p>
        </div>
      )}
    </PlanSection>
  );
}

export default RiskEditor;

