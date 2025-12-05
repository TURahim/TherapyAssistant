'use client';

import { useState } from 'react';
import { Target, Plus, Trash2, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlanSection, StatusBadge, ProgressBar, SectionBadge } from './PlanSection';
import { cn } from '@/lib/utils';

// =============================================================================
// TYPES
// =============================================================================

interface Goal {
  id: string;
  type: 'short_term' | 'long_term';
  description: string;
  measurableOutcome: string;
  targetDate?: string;
  status: 'not_started' | 'in_progress' | 'achieved' | 'revised';
  progress: number;
  interventionIds: string[];
  sourceSessionIds: string[];
}

interface GoalEditorProps {
  goals: Goal[];
  onUpdate?: (goals: Goal[]) => void;
  interventions?: Array<{ id: string; name: string }>;
  readOnly?: boolean;
  className?: string;
}

// =============================================================================
// GOAL CARD (Display Mode)
// =============================================================================

interface GoalCardProps {
  goal: Goal;
  onEdit?: () => void;
  onDelete?: () => void;
  readOnly?: boolean;
}

function GoalCard({ goal, onEdit, onDelete, readOnly }: GoalCardProps) {
  return (
    <div className="p-4 bg-muted/30 rounded-lg border hover:border-primary/30 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <StatusBadge status={goal.status} />
            <span className="text-xs text-muted-foreground uppercase">
              {goal.type.replace('_', ' ')}
            </span>
          </div>
          <h4 className="font-medium">{goal.description}</h4>
          <p className="text-sm text-muted-foreground">{goal.measurableOutcome}</p>
          <ProgressBar progress={goal.progress} size="sm" />
          {goal.targetDate && (
            <p className="text-xs text-muted-foreground">
              Target: {new Date(goal.targetDate).toLocaleDateString()}
            </p>
          )}
        </div>
        {!readOnly && (
          <div className="flex flex-col gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit}>
              <GripVertical className="h-4 w-4" />
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
// GOAL FORM (Edit Mode)
// =============================================================================

interface GoalFormProps {
  goal?: Goal;
  onSave: (goal: Goal) => void;
  onCancel: () => void;
  interventions?: Array<{ id: string; name: string }>;
}

function GoalForm({ goal, onSave, onCancel, interventions = [] }: GoalFormProps) {
  const [formData, setFormData] = useState<Goal>(
    goal || {
      id: `goal-${Date.now()}`,
      type: 'short_term',
      description: '',
      measurableOutcome: '',
      status: 'not_started',
      progress: 0,
      interventionIds: [],
      sourceSessionIds: [],
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
          <label className="text-sm font-medium">Type</label>
          <Select
            value={formData.type}
            onValueChange={(value) => setFormData({ ...formData, type: value as Goal['type'] })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="short_term">Short Term</SelectItem>
              <SelectItem value="long_term">Long Term</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium">Status</label>
          <Select
            value={formData.status}
            onValueChange={(value) => setFormData({ ...formData, status: value as Goal['status'] })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="not_started">Not Started</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="achieved">Achieved</SelectItem>
              <SelectItem value="revised">Revised</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <label className="text-sm font-medium">Goal Description</label>
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Describe the treatment goal..."
          className="mt-1"
          rows={2}
        />
      </div>

      <div>
        <label className="text-sm font-medium">Measurable Outcome</label>
        <Textarea
          value={formData.measurableOutcome}
          onChange={(e) => setFormData({ ...formData, measurableOutcome: e.target.value })}
          placeholder="How will progress be measured?"
          className="mt-1"
          rows={2}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Progress (%)</label>
          <Input
            type="number"
            min={0}
            max={100}
            value={formData.progress}
            onChange={(e) => setFormData({ ...formData, progress: parseInt(e.target.value) || 0 })}
            className="mt-1"
          />
        </div>
        <div>
          <label className="text-sm font-medium">Target Date</label>
          <Input
            type="date"
            value={formData.targetDate || ''}
            onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })}
            className="mt-1"
          />
        </div>
      </div>

      {interventions.length > 0 && (
        <div>
          <label className="text-sm font-medium">Linked Interventions</label>
          <div className="mt-1 flex flex-wrap gap-2">
            {interventions.map((intervention) => (
              <label key={intervention.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={formData.interventionIds.includes(intervention.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setFormData({
                        ...formData,
                        interventionIds: [...formData.interventionIds, intervention.id],
                      });
                    } else {
                      setFormData({
                        ...formData,
                        interventionIds: formData.interventionIds.filter((id) => id !== intervention.id),
                      });
                    }
                  }}
                  className="rounded"
                />
                {intervention.name}
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">Save Goal</Button>
      </div>
    </form>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function GoalEditor({
  goals,
  onUpdate,
  interventions = [],
  readOnly = false,
  className,
}: GoalEditorProps) {
  const [editing, setEditing] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);

  const shortTermGoals = goals.filter((g) => g.type === 'short_term');
  const longTermGoals = goals.filter((g) => g.type === 'long_term');

  const handleSaveGoal = (goal: Goal) => {
    if (!onUpdate) return;

    const existingIndex = goals.findIndex((g) => g.id === goal.id);
    if (existingIndex >= 0) {
      const updated = [...goals];
      updated[existingIndex] = goal;
      onUpdate(updated);
    } else {
      onUpdate([...goals, goal]);
    }
    setEditingGoal(null);
    setIsAddingNew(false);
  };

  const handleDeleteGoal = (goalId: string) => {
    if (!onUpdate) return;
    onUpdate(goals.filter((g) => g.id !== goalId));
  };

  return (
    <PlanSection
      title="Treatment Goals"
      icon={<Target className="h-5 w-5" />}
      badge={<SectionBadge count={goals.length} />}
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
            Add Goal
          </Button>
        )
      }
    >
      {isAddingNew && (
        <GoalForm
          onSave={handleSaveGoal}
          onCancel={() => setIsAddingNew(false)}
          interventions={interventions}
        />
      )}

      {editingGoal && (
        <GoalForm
          goal={editingGoal}
          onSave={handleSaveGoal}
          onCancel={() => setEditingGoal(null)}
          interventions={interventions}
        />
      )}

      {/* Short Term Goals */}
      {shortTermGoals.length > 0 && (
        <div className={cn("space-y-3", (isAddingNew || editingGoal) && "mt-4")}>
          <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Short Term Goals ({shortTermGoals.length})
          </h4>
          {shortTermGoals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onEdit={() => setEditingGoal(goal)}
              onDelete={() => handleDeleteGoal(goal.id)}
              readOnly={readOnly || !editing}
            />
          ))}
        </div>
      )}

      {/* Long Term Goals */}
      {longTermGoals.length > 0 && (
        <div className={cn("space-y-3", shortTermGoals.length > 0 && "mt-6")}>
          <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Long Term Goals ({longTermGoals.length})
          </h4>
          {longTermGoals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onEdit={() => setEditingGoal(goal)}
              onDelete={() => handleDeleteGoal(goal.id)}
              readOnly={readOnly || !editing}
            />
          ))}
        </div>
      )}

      {goals.length === 0 && !isAddingNew && (
        <p className="text-sm text-muted-foreground italic">No goals defined yet.</p>
      )}
    </PlanSection>
  );
}

export default GoalEditor;

