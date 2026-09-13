import type { ReactNode } from 'react';
import './SegmentedControl.css';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  /** Optional tone so YES/MAYBE/NO keep their concept colours when chosen. */
  tone?: 'yes' | 'maybe' | 'no' | 'neutral';
  icon?: ReactNode;
}

export interface SegmentedControlProps<T extends string> {
  label: string;
  options: SegmentOption<T>[];
  value: T | null;
  onChange: (value: T) => void;
  /**
   * For optional settings: tapping the selected option clears it again, the
   * same way tapping a selected star clears a rating. Requires `onClear`.
   */
  clearable?: boolean;
  onClear?: () => void;
  /** 'chunky' matches the big verdict buttons in the concept. */
  variant?: 'chunky' | 'compact';
  columns?: number;
}

export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
  clearable = false,
  onClear,
  variant = 'chunky',
  columns,
}: SegmentedControlProps<T>) {
  const canClear = clearable && Boolean(onClear);
  return (
    <div
      className={`segmented segmented--${variant}${columns ? ' segmented--wrap' : ''}`}
      role="radiogroup"
      aria-label={label}
      style={columns ? { gridTemplateColumns: `repeat(${columns}, 1fr)` } : undefined}
    >
      {options.map((option) => {
        const selected = value === option.value;
        const tone = option.tone ?? 'neutral';
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            className={`segmented__item segmented__item--${tone}${selected ? ' is-selected' : ''}`}
            onClick={() => {
              if (selected && canClear) onClear?.();
              else onChange(option.value);
            }}
          >
            {option.icon && (
              <span className="segmented__icon" aria-hidden="true">
                {option.icon}
              </span>
            )}
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
