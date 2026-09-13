import { useEffect, useState } from 'react';
import {
  CAR_FEATURE_BY_KEY,
  CUSTOM_FEATURE_MAX_LENGTH,
  MAX_CUSTOM_FEATURES,
} from '../../constants/features';
import type { Car, CarFeatureKey } from '../../types/models';
import {
  activeCarFeatures,
  carCustomFeatures,
  carFeatures,
  retiredCarFeatures,
} from '../../services/featuresService';
import {
  useActiveFeatureOrder,
  useActiveFeatures,
} from '../../hooks/feature-preferences-context';
import { Button } from '../ui/Button';
import { Sheet } from '../ui/Sheet';
import { CheckIcon, CloseIcon, PlusIcon } from '../layout/Icons';
import './FeaturesSection.css';

export interface FeaturesSectionProps {
  car: Car;
  onToggle: (key: CarFeatureKey) => void;
  onAddCustom: (name: string) => void;
  onRenameCustom: (from: string, to: string) => void;
  onRemoveCustom: (name: string) => void;
}

export function FeaturesSection({
  car,
  onToggle,
  onAddCustom,
  onRenameCustom,
  onRemoveCustom,
}: FeaturesSectionProps) {
  const activeFeatures = useActiveFeatures();
  const selected = new Set(carFeatures(car));
  const customs = carCustomFeatures(car);
  /** null = closed, '' = adding, otherwise the name being renamed. */
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    if (editing !== null) setDraft(editing);
  }, [editing]);

  const close = () => {
    setEditing(null);
    setDraft('');
  };

  const commit = () => {
    const value = draft.trim();
    if (value) {
      if (editing) onRenameCustom(editing, value);
      else onAddCustom(value);
    }
    close();
  };

  const full = customs.length >= MAX_CUSTOM_FEATURES;

  return (
    <section className="features" aria-label="Features">
      {activeFeatures.length === 0 && (
        <p className="features__empty muted">
          Your feature checklist is empty. Add features back under More → Manage
          Features, or add a custom one below.
        </p>
      )}
      <ul className="features__grid">
        {activeFeatures.map((feature) => {
          const on = selected.has(feature.key);
          return (
            <li key={feature.key}>
              <button
                type="button"
                className={`feature-chip${on ? ' is-on' : ''}`}
                aria-pressed={on}
                title={feature.label}
                onClick={() => onToggle(feature.key)}
              >
                <span className="feature-chip__tick" aria-hidden="true">
                  {on && <CheckIcon size={15} />}
                </span>
                <span className="feature-chip__label">{feature.shortLabel}</span>
              </button>
            </li>
          );
        })}
      </ul>

      {customs.length > 0 && (
        <ul className="features__grid features__grid--custom" aria-label="Custom features">
          {customs.map((name) => (
            <li key={name}>
              <span className="feature-chip feature-chip--custom is-on">
                <span className="feature-chip__tick" aria-hidden="true">
                  <CheckIcon size={15} />
                </span>
                <button
                  type="button"
                  className="feature-chip__label feature-chip__rename"
                  onClick={() => setEditing(name)}
                >
                  {name}
                  <span className="visually-hidden"> — rename</span>
                </button>
                <button
                  type="button"
                  className="feature-chip__remove"
                  onClick={() => onRemoveCustom(name)}
                  aria-label={`Remove ${name}`}
                >
                  <CloseIcon size={15} />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        className="features__add"
        onClick={() => setEditing('')}
        disabled={full}
      >
        <PlusIcon size={16} />
        {full ? `That's ${MAX_CUSTOM_FEATURES} — plenty` : 'Add custom feature'}
      </button>

      <Sheet
        open={editing !== null}
        onClose={close}
        title={editing ? 'Rename feature' : 'Add a feature'}
      >
        <div className="features__form">
          <label className="field">
            <span className="field__label">What does it have?</span>
            <input
              className="field__input"
              value={draft}
              maxLength={CUSTOM_FEATURE_MAX_LENGTH}
              placeholder="e.g. Panoramic Roof"
              autoCapitalize="words"
              autoComplete="off"
              enterKeyHint="done"
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  commit();
                }
              }}
            />
          </label>
          <div className="features__form-actions">
            <Button variant="quiet" full onClick={close}>
              Cancel
            </Button>
            <Button full onClick={commit} disabled={draft.trim().length === 0}>
              {editing ? 'Rename' : 'Add'}
            </Button>
          </div>
        </div>
      </Sheet>
    </section>
  );
}

/** Read-only chips for the car profile and anywhere else features are shown. */
export function FeatureChips({ car }: { car: Car }) {
  const activeOrder = useActiveFeatureOrder();
  /*
   * Two lists, deliberately. `active` is what the checklist still offers, shown
   * in the user's own order. `retired` is what this car recorded before the
   * feature was taken off the checklist — removing a feature changes what is
   * offered, never what was observed, so those stay on the car's profile.
   */
  const active = activeCarFeatures(car, activeOrder);
  const retired = retiredCarFeatures(car, activeOrder);
  const customs = carCustomFeatures(car);

  if (active.length === 0 && retired.length === 0 && customs.length === 0) {
    return <p className="features__empty muted">No features recorded.</p>;
  }

  return (
    <ul className="features__list">
      {active.map((key) => {
        const feature = CAR_FEATURE_BY_KEY[key];
        return (
          <li key={key} className="feature-tag" title={feature.label}>
            <CheckIcon size={14} />
            {feature.shortLabel}
          </li>
        );
      })}
      {retired.map((key) => {
        const feature = CAR_FEATURE_BY_KEY[key];
        return (
          <li key={key} className="feature-tag feature-tag--retired" title={feature.label}>
            <CheckIcon size={14} />
            {feature.shortLabel}
            <span className="visually-hidden"> — no longer on your checklist</span>
          </li>
        );
      })}
      {customs.map((name) => (
        <li key={name} className="feature-tag feature-tag--custom">
          <CheckIcon size={14} />
          {name}
        </li>
      ))}
    </ul>
  );
}
