import { useEffect, useState } from 'react';
import type { Car } from '../../types/models';
import {
  DEFAULT_DUPLICATE_OPTIONS,
  type DuplicateOptions,
} from '../../services/duplicateService';
import { carTitle } from '../../services/ratingService';
import { Sheet } from '../ui/Sheet';
import { Button } from '../ui/Button';
import { CheckIcon } from '../layout/Icons';
import './DuplicateSheet.css';

/**
 * The opt-in extras, in the order they are offered.
 *
 * Each `hint` says *why* it is off by default, because "why isn't my mileage
 * here?" is the obvious question and the answer is the whole idea of the
 * feature: a second example of the same model is a different car.
 */
const OPTIONS: { key: keyof DuplicateOptions; label: string; hint: string }[] = [
  { key: 'mileage', label: 'Mileage', hint: 'Usually different on another car' },
  { key: 'price', label: 'Price', hint: 'Usually different on another car' },
  { key: 'photos', label: 'Photos', hint: 'Copied as separate pictures' },
  { key: 'comments', label: 'Comments', hint: 'What you wrote on the day' },
  { key: 'verdict', label: 'Verdict / Dealbreaker', hint: 'Your call on that car' },
];

export interface DuplicateSheetProps {
  open: boolean;
  car: Car;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: (options: DuplicateOptions) => void;
}

export function DuplicateSheet({
  open,
  car,
  busy = false,
  onCancel,
  onConfirm,
}: DuplicateSheetProps) {
  const [options, setOptions] = useState<DuplicateOptions>(DEFAULT_DUPLICATE_OPTIONS);

  // Every opening starts from the defaults — a previous run's toggles should
  // never carry over into a duplicate the user has not thought about yet.
  useEffect(() => {
    if (open) setOptions(DEFAULT_DUPLICATE_OPTIONS);
  }, [open]);

  const toggle = (key: keyof DuplicateOptions) =>
    setOptions((current) => ({ ...current, [key]: !current[key] }));

  return (
    <Sheet open={open} onClose={onCancel} title="Duplicate this car?">
      <div className="duplicate">
        <p className="duplicate__helper">
          Create a new car using this one as a starting point.
        </p>
        <p className="duplicate__source">
          Copies the make, model, year, transmission, ratings and features from{' '}
          <strong>{carTitle(car)}</strong>.
        </p>

        <div
          className="duplicate__options"
          role="group"
          aria-label="Copy these too"
        >
          <p className="duplicate__options-title" aria-hidden="true">
            Copy these too
          </p>
          {OPTIONS.map((option) => {
            const on = options[option.key];
            return (
              <button
                key={option.key}
                type="button"
                className={`duplicate-option${on ? ' is-on' : ''}`}
                aria-pressed={on}
                onClick={() => toggle(option.key)}
                disabled={busy}
              >
                <span className="duplicate-option__tick" aria-hidden="true">
                  {on && <CheckIcon size={15} />}
                </span>
                <span className="duplicate-option__text">
                  <span className="duplicate-option__label">{option.label}</span>
                  <span className="duplicate-option__hint">{option.hint}</span>
                </span>
              </button>
            );
          })}
        </div>

        <div className="duplicate__actions">
          <Button variant="quiet" full onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button full onClick={() => onConfirm(options)} disabled={busy}>
            {busy ? 'Duplicating…' : 'Create Duplicate'}
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
