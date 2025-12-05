'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Loader2, Save } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Preferences {
  modality: string | null;
  tone: string | null;
  styleNotes: string | null;
  languageLevel: 'professional' | 'conversational' | 'simple';
  includeIcdCodes: boolean;
}

interface PreferencesFormProps {
  className?: string;
}

export function PreferencesForm({ className }: PreferencesFormProps) {
  const [prefs, setPrefs] = useState<Preferences>({
    modality: '',
    tone: '',
    styleNotes: '',
    languageLevel: 'professional',
    includeIcdCodes: true,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/preferences');
        if (!res.ok) throw new Error('Failed to load preferences');
        const data = await res.json();
        if (mounted) {
          setPrefs({
            modality: data.modality || '',
            tone: data.tone || '',
            styleNotes: data.styleNotes || '',
            languageLevel: data.languageLevel || 'professional',
            includeIcdCodes: data.includeIcdCodes ?? true,
          });
        }
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : 'Failed to load preferences');
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch('/api/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modality: prefs.modality || undefined,
          tone: prefs.tone || undefined,
          styleNotes: prefs.styleNotes || undefined,
          languageLevel: prefs.languageLevel,
          includeIcdCodes: prefs.includeIcdCodes,
        }),
      });
      if (!res.ok) throw new Error('Failed to save preferences');
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save preferences');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className={cn('max-w-3xl', className)}>
      <CardHeader>
        <CardTitle>Therapist Preferences</CardTitle>
        <CardDescription>Guide AI outputs with your modality, tone, and style.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Preferred Modality</Label>
            <Input
              placeholder="e.g., CBT, ACT, DBT"
              value={prefs.modality ?? ''}
              onChange={(e) => setPrefs((p) => ({ ...p, modality: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground">This will be mentioned in prompts as your default approach.</p>
          </div>
          <div className="space-y-2">
            <Label>Preferred Tone / Style</Label>
            <Input
              placeholder="e.g., collaborative, strengths-based"
              value={prefs.tone ?? ''}
              onChange={(e) => setPrefs((p) => ({ ...p, tone: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground">Used to shape wording and stance in generated content.</p>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Narrative Voice Notes</Label>
          <Textarea
            placeholder="Any phrasing, phrasing to avoid, or style notes you want the AI to use."
            value={prefs.styleNotes ?? ''}
            onChange={(e) => setPrefs((p) => ({ ...p, styleNotes: e.target.value }))}
          />
          <p className="text-xs text-muted-foreground">Example: “Keep language concise; avoid jargon; emphasize validation.”</p>
        </div>

        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Language Level (for therapist content)</Label>
            <div className="flex gap-2">
              {(['professional', 'conversational', 'simple'] as const).map((lvl) => (
                <Button
                  key={lvl}
                  type="button"
                  variant={prefs.languageLevel === lvl ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPrefs((p) => ({ ...p, languageLevel: lvl }))}
                >
                  {lvl.charAt(0).toUpperCase() + lvl.slice(1)}
                </Button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Adjusts therapist-facing language to your preferred level of formality.
            </p>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-1">
              <Label>Include ICD Codes</Label>
              <p className="text-xs text-muted-foreground">
                Keep diagnosis codes in therapist outputs when available.
              </p>
            </div>
            <Switch
              checked={prefs.includeIcdCodes}
              onCheckedChange={(checked) => setPrefs((p) => ({ ...p, includeIcdCodes: !!checked }))}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2">
          {saved && <span className="text-sm text-green-600">Saved</span>}
          <Button onClick={handleSave} disabled={isSaving || isLoading}>
            {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save Preferences
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default PreferencesForm;

