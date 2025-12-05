'use client';

import { useState } from 'react';
import { Stethoscope, Plus, Trash2, Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlanSection, SectionBadge } from './PlanSection';
import { cn } from '@/lib/utils';

// =============================================================================
// TYPES
// =============================================================================

interface Intervention {
  id: string;
  modality: string;
  name: string;
  description: string;
  frequency: string;
  rationale: string;
}

interface InterventionEditorProps {
  interventions: Intervention[];
  onUpdate?: (interventions: Intervention[]) => void;
  readOnly?: boolean;
  className?: string;
}

// Common modalities
const MODALITIES = [
  'CBT',
  'DBT',
  'ACT',
  'EMDR',
  'Psychodynamic',
  'Humanistic',
  'Solution-Focused',
  'Motivational Interviewing',
  'Mindfulness-Based',
  'Narrative',
  'Family Systems',
  'Other',
];

// =============================================================================
// INTERVENTION CARD (Display Mode)
// =============================================================================

interface InterventionCardProps {
  intervention: Intervention;
  onEdit?: () => void;
  onDelete?: () => void;
  readOnly?: boolean;
}

function InterventionCard({ intervention, onEdit, onDelete, readOnly }: InterventionCardProps) {
  return (
    <div className="p-4 bg-muted/30 rounded-lg border hover:border-primary/30 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
              {intervention.modality}
            </span>
          </div>
          <h4 className="font-medium">{intervention.name}</h4>
          <p className="text-sm text-muted-foreground">{intervention.description}</p>
          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
            <span><strong>Frequency:</strong> {intervention.frequency}</span>
          </div>
          {intervention.rationale && (
            <p className="text-sm text-muted-foreground/80 italic">
              Rationale: {intervention.rationale}
            </p>
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
// INTERVENTION FORM (Edit Mode)
// =============================================================================

interface InterventionFormProps {
  intervention?: Intervention;
  onSave: (intervention: Intervention) => void;
  onCancel: () => void;
}

function InterventionForm({ intervention, onSave, onCancel }: InterventionFormProps) {
  const [formData, setFormData] = useState<Intervention>(
    intervention || {
      id: `intervention-${Date.now()}`,
      modality: '',
      name: '',
      description: '',
      frequency: '',
      rationale: '',
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 bg-muted/30 rounded-lg border">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Modality</label>
          <Select
            value={formData.modality}
            onValueChange={(value) => setFormData({ ...formData, modality: value })}
          >
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Select modality" />
            </SelectTrigger>
            <SelectContent>
              {MODALITIES.map((modality) => (
                <SelectItem key={modality} value={modality}>
                  {modality}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium">Frequency</label>
          <Input
            value={formData.frequency}
            onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
            placeholder="e.g., Weekly, As needed"
            className="mt-1"
          />
        </div>
      </div>

      <div>
        <label className="text-sm font-medium">Intervention Name</label>
        <Input
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Name of the intervention technique"
          className="mt-1"
        />
      </div>

      <div>
        <label className="text-sm font-medium">Description</label>
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Describe how this intervention will be applied..."
          className="mt-1"
          rows={3}
        />
      </div>

      <div>
        <label className="text-sm font-medium">Rationale</label>
        <Textarea
          value={formData.rationale}
          onChange={(e) => setFormData({ ...formData, rationale: e.target.value })}
          placeholder="Why is this intervention appropriate?"
          className="mt-1"
          rows={2}
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={!formData.modality || !formData.name}>
          Save Intervention
        </Button>
      </div>
    </form>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function InterventionEditor({
  interventions,
  onUpdate,
  readOnly = false,
  className,
}: InterventionEditorProps) {
  const [editing, setEditing] = useState(false);
  const [editingIntervention, setEditingIntervention] = useState<Intervention | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);

  // Group interventions by modality
  const groupedInterventions = interventions.reduce((acc, intervention) => {
    const modality = intervention.modality || 'Other';
    if (!acc[modality]) acc[modality] = [];
    acc[modality].push(intervention);
    return acc;
  }, {} as Record<string, Intervention[]>);

  const handleSaveIntervention = (intervention: Intervention) => {
    if (!onUpdate) return;

    const existingIndex = interventions.findIndex((i) => i.id === intervention.id);
    if (existingIndex >= 0) {
      const updated = [...interventions];
      updated[existingIndex] = intervention;
      onUpdate(updated);
    } else {
      onUpdate([...interventions, intervention]);
    }
    setEditingIntervention(null);
    setIsAddingNew(false);
  };

  const handleDeleteIntervention = (interventionId: string) => {
    if (!onUpdate) return;
    onUpdate(interventions.filter((i) => i.id !== interventionId));
  };

  return (
    <PlanSection
      title="Intervention Plan"
      icon={<Stethoscope className="h-5 w-5" />}
      badge={<SectionBadge count={interventions.length} />}
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
            Add Intervention
          </Button>
        )
      }
    >
      {isAddingNew && (
        <InterventionForm
          onSave={handleSaveIntervention}
          onCancel={() => setIsAddingNew(false)}
        />
      )}

      {editingIntervention && (
        <InterventionForm
          intervention={editingIntervention}
          onSave={handleSaveIntervention}
          onCancel={() => setEditingIntervention(null)}
        />
      )}

      {/* Grouped by Modality */}
      <div className={cn("space-y-6", (isAddingNew || editingIntervention) && "mt-4")}>
        {Object.entries(groupedInterventions).map(([modality, items]) => (
          <div key={modality} className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              {modality} ({items.length})
            </h4>
            {items.map((intervention) => (
              <InterventionCard
                key={intervention.id}
                intervention={intervention}
                onEdit={() => setEditingIntervention(intervention)}
                onDelete={() => handleDeleteIntervention(intervention.id)}
                readOnly={readOnly || !editing}
              />
            ))}
          </div>
        ))}
      </div>

      {interventions.length === 0 && !isAddingNew && (
        <p className="text-sm text-muted-foreground italic">No interventions defined yet.</p>
      )}
    </PlanSection>
  );
}

export default InterventionEditor;

