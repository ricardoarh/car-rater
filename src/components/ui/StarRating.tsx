import { useId, useRef } from 'react';
import type { StarValue } from '../../types/models';
import './StarRating.css';

export interface StarRatingProps {
  value: StarValue | null;
  onChange?: (value: StarValue | null) => void;
  /** Accessible name, e.g. "Cuteness". */
  label: string;
  size?: 'sm' | 'md' | 'lg';
  readOnly?: boolean;
  /** Allows half stars when displaying an averaged value. */
  displayValue?: number | null;
}

function StarShape({ fill }: { fill: 'full' | 'half' | 'empty' }) {
  const gradientId = useId();
  const path =
    'M12 2.6l2.72 5.86 6.28.79-4.63 4.4 1.2 6.35L12 16.9l-5.57 3.1 1.2-6.35-4.63-4.4 6.28-.79z';
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {fill === 'half' && (
        <defs>
          <linearGradient id={gradientId} x1="0" x2="1" y1="0" y2="0">
            <stop offset="50%" stopColor="var(--gold)" />
            <stop offset="50%" stopColor="transparent" />
          </linearGradient>
        </defs>
      )}
      <path
        d={path}
        fill={
          fill === 'full'
            ? 'var(--gold)'
            : fill === 'half'
              ? `url(#${gradientId})`
              : 'transparent'
        }
        stroke={fill === 'empty' ? 'var(--gold-empty)' : 'var(--gold-strong)'}
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function StarRating({
  value,
  onChange,
  label,
  size = 'md',
  readOnly = false,
  displayValue,
}: StarRatingProps) {
  const groupRef = useRef<HTMLDivElement>(null);
  const shown = displayValue ?? value ?? 0;

  const fillFor = (star: number): 'full' | 'half' | 'empty' => {
    if (shown >= star) return 'full';
    if (shown >= star - 0.5) return 'half';
    return 'empty';
  };

  if (readOnly || !onChange) {
    return (
      <div
        className={`stars stars--${size} stars--readonly`}
        role="img"
        aria-label={`${label}: ${shown ? `${shown} out of 5` : 'not rated'}`}
      >
        {[1, 2, 3, 4, 5].map((star) => (
          <span className="stars__star" key={star}>
            <StarShape fill={fillFor(star)} />
          </span>
        ))}
      </div>
    );
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const current = value ?? 0;
    let next: number | null = null;
    if (event.key === 'ArrowRight' || event.key === 'ArrowUp') next = Math.min(5, current + 1);
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown')
      next = Math.max(0, current - 1);
    else if (event.key === 'Home') next = 1;
    else if (event.key === 'End') next = 5;
    else if (/^[1-5]$/.test(event.key)) next = Number(event.key);
    else if (event.key === 'Backspace' || event.key === 'Delete' || event.key === '0') next = 0;
    else return;

    event.preventDefault();
    onChange(next === 0 ? null : (next as StarValue));
    const buttons = groupRef.current?.querySelectorAll('button');
    buttons?.[Math.max(0, (next || 1) - 1)]?.focus();
  };

  return (
    <div
      className={`stars stars--${size}`}
      role="radiogroup"
      aria-label={label}
      ref={groupRef}
      onKeyDown={handleKeyDown}
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const selected = value === star;
        return (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={`${star} ${star === 1 ? 'star' : 'stars'}`}
            tabIndex={selected || (!value && star === 1) ? 0 : -1}
            className={`stars__star${(value ?? 0) >= star ? ' is-on' : ''}`}
            onClick={() => onChange(value === star ? null : (star as StarValue))}
          >
            <StarShape fill={fillFor(star)} />
          </button>
        );
      })}
    </div>
  );
}
