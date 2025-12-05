'use client';

import { useState } from 'react';
import { FileHeart, Plus, Trash2, Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlanSection, StatusBadge, SectionBadge } from './PlanSection';
import { cn } from '@/lib/utils';

// =============================================================================
// TYPES
// =============================================================================

interface Diagnosis {
  id: string;
  icdCode?: string;
  name: string;
  status: 'provisional' | 'confirmed' | 'rule_out';
  notes?: string;
}

interface DiagnosisEditorProps {
  diagnoses: Diagnosis[];
  onUpdate?: (diagnoses: Diagnosis[]) => void;
  showIcdCodes?: boolean;
  readOnly?: boolean;
  className?: string;
}

// =============================================================================
// DIAGNOSIS CARD (Display Mode)
// =============================================================================

interface DiagnosisCardProps {
  diagnosis: Diagnosis;
  isPrimary?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  showIcdCode?: boolean;
  readOnly?: boolean;
}

function DiagnosisCard({
  diagnosis,
  isPrimary,
  onEdit,
  onDelete,
  showIcdCode = true,
  readOnly,
}: DiagnosisCardProps) {
  return (
    <div className={cn(
      "p-4 rounded-lg border transition-colors",
      isPrimary ? "bg-primary/5 border-primary/30" : "bg-muted/30 hover:border-primary/30"
    )}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
            {isPrimary && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/20 text-primary">
                Primary
              </span>
            )}
            <StatusBadge status={diagnosis.status} />
          </div>
          <h4 className="font-medium">
            {showIcdCode && diagnosis.icdCode && (
              <span className="text-muted-foreground mr-2">{diagnosis.icdCode}</span>
            )}
            {diagnosis.name}
          </h4>
          {diagnosis.notes && (
            <p className="text-sm text-muted-foreground">{diagnosis.notes}</p>
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
// DIAGNOSIS FORM (Edit Mode)
// =============================================================================

interface DiagnosisFormProps {
  diagnosis?: Diagnosis;
  onSave: (diagnosis: Diagnosis) => void;
  onCancel: () => void;
  showIcdCode?: boolean;
}

function DiagnosisForm({ diagnosis, onSave, onCancel, showIcdCode = true }: DiagnosisFormProps) {
  const [formData, setFormData] = useState<Diagnosis>(
    diagnosis || {
      id: `diagnosis-${Date.now()}`,
      icdCode: '',
      name: '',
      status: 'provisional',
      notes: '',
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 bg-muted/30 rounded-lg border">
      <div className="grid grid-cols-2 gap-4">
        {showIcdCode && (
          <div>
            <label className="text-sm font-medium">ICD-10 Code</label>
            <Input
              value={formData.icdCode || ''}
              onChange={(e) => setFormData({ ...formData, icdCode: e.target.value })}
              placeholder="e.g., F41.1"
              className="mt-1"
            />
          </div>
        )}
        <div className={showIcdCode ? '' : 'col-span-2'}>
          <label className="text-sm font-medium">Status</label>
          <Select
            value={formData.status}
            onValueChange={(value) => setFormData({ ...formData, status: value as Diagnosis['status'] })}
          >
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="provisional">Provisional</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="rule_out">Rule Out</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <label className="text-sm font-medium">Diagnosis Name</label>
        <Input
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Full diagnostic name"
          className="mt-1"
        />
      </div>

      <div>
        <label className="text-sm font-medium">Clinical Notes</label>
        <Textarea
          value={formData.notes || ''}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Supporting observations and clinical reasoning..."
          className="mt-1"
          rows={2}
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={!formData.name}>
          Save Diagnosis
        </Button>
      </div>
    </form>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function DiagnosisEditor({
  diagnoses,
  onUpdate,
  showIcdCodes = true,
  readOnly = false,
  className,
}: DiagnosisEditorProps) {
  const [editing, setEditing] = useState(false);
  const [editingDiagnosis, setEditingDiagnosis] = useState<Diagnosis | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);

  // First diagnosis is primary
  const primaryDiagnosis = diagnoses[0];
  const secondaryDiagnoses = diagnoses.slice(1);

  const handleSaveDiagnosis = (diagnosis: Diagnosis) => {
    if (!onUpdate) return;

    const existingIndex = diagnoses.findIndex((d) => d.id === diagnosis.id);
    if (existingIndex >= 0) {
      const updated = [...diagnoses];
      updated[existingIndex] = diagnosis;
      onUpdate(updated);
    } else {
      onUpdate([...diagnoses, diagnosis]);
    }
    setEditingDiagnosis(null);
    setIsAddingNew(false);
  };

  const handleDeleteDiagnosis = (diagnosisId: string) => {
    if (!onUpdate) return;
    onUpdate(diagnoses.filter((d) => d.id !== diagnosisId));
  };

  return (
    <PlanSection
      title="Diagnoses"
      icon={<FileHeart className="h-5 w-5" />}
      badge={<SectionBadge count={diagnoses.length} />}
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
            Add Diagnosis
          </Button>
        )
      }
    >
      {isAddingNew && (
        <DiagnosisForm
          onSave={handleSaveDiagnosis}
          onCancel={() => setIsAddingNew(false)}
          showIcdCode={showIcdCodes}
        />
      )}

      {editingDiagnosis && (
        <DiagnosisForm
          diagnosis={editingDiagnosis}
          onSave={handleSaveDiagnosis}
          onCancel={() => setEditingDiagnosis(null)}
          showIcdCode={showIcdCodes}
        />
      )}

      <div className={cn("space-y-3", (isAddingNew || editingDiagnosis) && "mt-4")}>
        {/* Primary Diagnosis */}
        {primaryDiagnosis && (
          <DiagnosisCard
            diagnosis={primaryDiagnosis}
            isPrimary
            onEdit={() => setEditingDiagnosis(primaryDiagnosis)}
            onDelete={() => handleDeleteDiagnosis(primaryDiagnosis.id)}
            showIcdCode={showIcdCodes}
            readOnly={readOnly || !editing}
          />
        )}

        {/* Secondary Diagnoses */}
        {secondaryDiagnoses.length > 0 && (
          <div className="space-y-3 mt-4">
            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Secondary ({secondaryDiagnoses.length})
            </h4>
            {secondaryDiagnoses.map((diagnosis) => (
              <DiagnosisCard
                key={diagnosis.id}
                diagnosis={diagnosis}
                onEdit={() => setEditingDiagnosis(diagnosis)}
                onDelete={() => handleDeleteDiagnosis(diagnosis.id)}
                showIcdCode={showIcdCodes}
                readOnly={readOnly || !editing}
              />
            ))}
          </div>
        )}
      </div>

      {diagnoses.length === 0 && !isAddingNew && (
        <p className="text-sm text-muted-foreground italic">No diagnoses recorded yet.</p>
      )}
    </PlanSection>
  );
}

export default DiagnosisEditor;

