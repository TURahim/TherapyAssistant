'use client';

import { Checkbox } from '@/components/ui/checkbox';

export interface HomeworkCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}

export function HomeworkCheckbox({ checked, onChange, label }: HomeworkCheckboxProps) {
  return (
    <label className="flex items-start gap-2 cursor-pointer">
      <Checkbox checked={checked} onCheckedChange={(v) => onChange(!!v)} />
      <span className="text-sm leading-5">{label}</span>
    </label>
  );
}

export default HomeworkCheckbox;

