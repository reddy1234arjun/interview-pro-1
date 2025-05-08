'use client';

import { Slider } from './ui/slider';

interface SettingsPanelProps {
  totalQuestions: number;
  setTotalQuestions: (value: number) => void;
  disabled?: boolean;
}

export default function SettingsPanel({ 
  totalQuestions, 
  setTotalQuestions,
  disabled = false 
}: SettingsPanelProps) {
  return (
    <div className="space-y-4 py-2">
      <div className="space-y-2">
        <div className="flex justify-between">
          <label className="text-sm font-medium">Number of Questions</label>
          <span className="text-sm font-medium">{totalQuestions}</span>
        </div>
        <Slider
          value={[totalQuestions]}
          min={3}
          max={10}
          step={1}
          onValueChange={(value) => setTotalQuestions(value[0])}
          disabled={disabled}
          className="py-2"
        />
      </div>
    </div>
  );
}
