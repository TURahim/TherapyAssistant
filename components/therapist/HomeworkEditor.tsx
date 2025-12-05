'use client';

import { useState } from 'react';
import { ClipboardList, Plus, Trash2, Edit2, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlanSection, StatusBadge, SectionBadge } from './PlanSection';
import { cn } from '@/lib/utils';

// =============================================================================
// TYPES
// =============================================================================

interface HomeworkItem {
  id: string;
  title: string;
  description: string;
  rationale: string;
  goalIds: string[];
  status: 'assigned' | 'in_progress' | 'completed' | 'skipped';
  dueDate?: string;
}

interface HomeworkEditorProps {
  homework: HomeworkItem[];
  onUpdate?: (homework: HomeworkItem[]) => void;
  goals?: Array<{ id: string; description: string }>;
  readOnly?: boolean;
  className?: string;
}

// =============================================================================
// HOMEWORK CARD (Display Mode)
// =============================================================================

interface HomeworkCardProps {
  item: HomeworkItem;
  onEdit?: () => void;
  onDelete?: () => void;
  onStatusChange?: (status: HomeworkItem['status']) => void;
  readOnly?: boolean;
}

function HomeworkCard({ item, onEdit, onDelete, onStatusChange, readOnly }: HomeworkCardProps) {
  return (
    <div className="p-4 bg-muted/30 rounded-lg border hover:border-primary/30 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <StatusBadge status={item.status} />
            {item.dueDate && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                {new Date(item.dueDate).toLocaleDateString()}
              </span>
            )}
          </div>
          <h4 className="font-medium">{item.title}</h4>
          <p className="text-sm text-muted-foreground">{item.description}</p>
          {item.rationale && (
            <p className="text-sm text-muted-foreground/80 italic">
              Purpose: {item.rationale}
            </p>
          )}
        </div>
        {!readOnly && (
          <div className="flex flex-col gap-1">
            {onStatusChange && (
              <Select
                value={item.status}
                onValueChange={(value) => onStatusChange(value as HomeworkItem['status'])}
              >
                <SelectTrigger className="h-8 w-28 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="assigned">Assigned</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="skipped">Skipped</SelectItem>
                </SelectContent>
              </Select>
            )}
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
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// HOMEWORK FORM (Edit Mode)
// =============================================================================

interface HomeworkFormProps {
  item?: HomeworkItem;
  onSave: (item: HomeworkItem) => void;
  onCancel: () => void;
  goals?: Array<{ id: string; description: string }>;
}

function HomeworkForm({ item, onSave, onCancel, goals = [] }: HomeworkFormProps) {
  const [formData, setFormData] = useState<HomeworkItem>(
    item || {
      id: `homework-${Date.now()}`,
      title: '',
      description: '',
      rationale: '',
      goalIds: [],
      status: 'assigned',
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
          <label className="text-sm font-medium">Status</label>
          <Select
            value={formData.status}
            onValueChange={(value) => setFormData({ ...formData, status: value as HomeworkItem['status'] })}
          >
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="assigned">Assigned</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="skipped">Skipped</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium">Due Date</label>
          <Input
            type="date"
            value={formData.dueDate || ''}
            onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
            className="mt-1"
          />
        </div>
      </div>

      <div>
        <label className="text-sm font-medium">Title</label>
        <Input
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="Brief title for the homework"
          className="mt-1"
        />
      </div>

      <div>
        <label className="text-sm font-medium">Description</label>
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Detailed instructions for the client..."
          className="mt-1"
          rows={3}
        />
      </div>

      <div>
        <label className="text-sm font-medium">Rationale/Purpose</label>
        <Textarea
          value={formData.rationale}
          onChange={(e) => setFormData({ ...formData, rationale: e.target.value })}
          placeholder="Why is this homework helpful?"
          className="mt-1"
          rows={2}
        />
      </div>

      {goals.length > 0 && (
        <div>
          <label className="text-sm font-medium">Linked Goals</label>
          <div className="mt-1 space-y-2">
            {goals.map((goal) => (
              <label key={goal.id} className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={formData.goalIds.includes(goal.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setFormData({
                        ...formData,
                        goalIds: [...formData.goalIds, goal.id],
                      });
                    } else {
                      setFormData({
                        ...formData,
                        goalIds: formData.goalIds.filter((id) => id !== goal.id),
                      });
                    }
                  }}
                  className="rounded mt-0.5"
                />
                <span className="line-clamp-2">{goal.description}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={!formData.title}>
          Save Homework
        </Button>
      </div>
    </form>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function HomeworkEditor({
  homework,
  onUpdate,
  goals = [],
  readOnly = false,
  className,
}: HomeworkEditorProps) {
  const [editing, setEditing] = useState(false);
  const [editingItem, setEditingItem] = useState<HomeworkItem | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);

  // Group homework by status
  const activeHomework = homework.filter((h) => h.status === 'assigned' || h.status === 'in_progress');
  const completedHomework = homework.filter((h) => h.status === 'completed' || h.status === 'skipped');

  const handleSaveItem = (item: HomeworkItem) => {
    if (!onUpdate) return;

    const existingIndex = homework.findIndex((h) => h.id === item.id);
    if (existingIndex >= 0) {
      const updated = [...homework];
      updated[existingIndex] = item;
      onUpdate(updated);
    } else {
      onUpdate([...homework, item]);
    }
    setEditingItem(null);
    setIsAddingNew(false);
  };

  const handleDeleteItem = (itemId: string) => {
    if (!onUpdate) return;
    onUpdate(homework.filter((h) => h.id !== itemId));
  };

  const handleStatusChange = (itemId: string, status: HomeworkItem['status']) => {
    if (!onUpdate) return;
    const updated = homework.map((h) =>
      h.id === itemId ? { ...h, status } : h
    );
    onUpdate(updated);
  };

  return (
    <PlanSection
      title="Homework & Assignments"
      icon={<ClipboardList className="h-5 w-5" />}
      badge={<SectionBadge count={activeHomework.length} variant="info" />}
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
            Add Homework
          </Button>
        )
      }
    >
      {isAddingNew && (
        <HomeworkForm
          onSave={handleSaveItem}
          onCancel={() => setIsAddingNew(false)}
          goals={goals}
        />
      )}

      {editingItem && (
        <HomeworkForm
          item={editingItem}
          onSave={handleSaveItem}
          onCancel={() => setEditingItem(null)}
          goals={goals}
        />
      )}

      {/* Active Homework */}
      {activeHomework.length > 0 && (
        <div className={cn("space-y-3", (isAddingNew || editingItem) && "mt-4")}>
          <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Active ({activeHomework.length})
          </h4>
          {activeHomework.map((item) => (
            <HomeworkCard
              key={item.id}
              item={item}
              onEdit={() => setEditingItem(item)}
              onDelete={() => handleDeleteItem(item.id)}
              onStatusChange={(status) => handleStatusChange(item.id, status)}
              readOnly={readOnly || !editing}
            />
          ))}
        </div>
      )}

      {/* Completed Homework */}
      {completedHomework.length > 0 && (
        <div className={cn("space-y-3", activeHomework.length > 0 && "mt-6")}>
          <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Completed ({completedHomework.length})
          </h4>
          {completedHomework.map((item) => (
            <HomeworkCard
              key={item.id}
              item={item}
              onEdit={() => setEditingItem(item)}
              onDelete={() => handleDeleteItem(item.id)}
              onStatusChange={(status) => handleStatusChange(item.id, status)}
              readOnly={readOnly || !editing}
            />
          ))}
        </div>
      )}

      {homework.length === 0 && !isAddingNew && (
        <p className="text-sm text-muted-foreground italic">No homework assigned yet.</p>
      )}
    </PlanSection>
  );
}

export default HomeworkEditor;

