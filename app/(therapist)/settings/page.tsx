'use client';

import PreferencesForm from '@/components/therapist/PreferencesForm';

export default function SettingsPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-muted-foreground">Set your preferences to guide AI-generated content.</p>
      </div>
      <PreferencesForm />
    </div>
  );
}

