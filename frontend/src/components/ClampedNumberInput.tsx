import { useState } from 'react';

interface ClampedNumberInputProps {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  className?: string;
}

/**
 * Number input that stays editable while the user retypes.
 *
 * Clamping on every keystroke makes the field impossible to change: clearing it
 * snaps the box back to min and the next digit appends to that. So the typed
 * text is held as-is while editing, the model only updates on an in-range
 * value, and anything out of range is clamped on blur.
 */
export default function ClampedNumberInput({
  value,
  min,
  max,
  onChange,
  className,
}: ClampedNumberInputProps) {
  const [draft, setDraft] = useState<string | null>(null);

  const handleChange = (raw: string) => {
    setDraft(raw);
    const parsed = parseInt(raw, 10);
    if (!Number.isNaN(parsed) && parsed >= min && parsed <= max) {
      onChange(parsed);
    }
  };

  const handleBlur = () => {
    if (draft !== null) {
      const parsed = parseInt(draft, 10);
      if (!Number.isNaN(parsed)) {
        onChange(Math.max(min, Math.min(max, parsed)));
      }
    }
    setDraft(null);
  };

  return (
    <input
      type="number"
      inputMode="numeric"
      min={min}
      max={max}
      value={draft ?? String(value)}
      onChange={(e) => handleChange(e.target.value)}
      onFocus={(e) => e.target.select()}
      onBlur={handleBlur}
      className={className}
    />
  );
}
