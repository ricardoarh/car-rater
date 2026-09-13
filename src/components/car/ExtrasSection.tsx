import { useState } from 'react';
import type {
  Car,
  DealbreakerReason,
  HeadachePotential,
  Verdict,
} from '../../types/models';
import { DEALBREAKER_REASONS, HEADACHE_OPTIONS } from '../../constants/app';
import { SegmentedControl } from '../ui/SegmentedControl';
import { StarRating } from '../ui/StarRating';
import { Sheet } from '../ui/Sheet';
import { InfoIcon } from '../layout/Icons';
import './ExtrasSection.css';

export interface ExtrasPatch {
  headachePotential?: HeadachePotential;
  euroNcapStars?: number | null;
  euroNcapYear?: number | null;
  dealbreaker?: boolean;
  dealbreakerReasons?: DealbreakerReason[];
  dealbreakerComment?: string;
  verdict?: Verdict | null;
}

export interface ExtrasSectionProps {
  car: Car;
  onChange: (patch: ExtrasPatch) => void;
}

const INFO = {
  headache: {
    title: '🔧 Headache Potential',
    body: [
      'Your own judgement about how much hassle this model might be to own.',
      'Reliability expectations, known model issues, maintenance hassle, expensive common faults, servicing cost.',
      'This is not part of the overall star score, and Car Rater never guesses it for you.',
    ],
  },
  ncap: {
    title: '🛡️ Euro NCAP',
    body: [
      'The official Euro NCAP crash-test result, if you know it.',
      'Reference information only — it does not affect the Car Rater overall score.',
    ],
  },
  dealbreaker: {
    title: '🚩 Any dealbreaker?',
    body: [
      'Something that rules this car out no matter how well it scores.',
      'A dealbreaker never changes the maths. It just flags the car wherever it appears.',
    ],
  },
};

export function ExtrasSection({ car, onChange }: ExtrasSectionProps) {
  const [info, setInfo] = useState<keyof typeof INFO | null>(null);

  const toggleReason = (reason: DealbreakerReason) => {
    const current = car.dealbreakerReasons;
    const next = current.includes(reason)
      ? current.filter((r) => r !== reason)
      : [...current, reason];
    onChange({ dealbreakerReasons: next });
  };

  const thisYear = new Date().getFullYear();

  return (
    <div className="extras">
      <section className="extras__card" aria-labelledby="headache-heading">
        <h2 className="extras__heading" id="headache-heading">
          <span aria-hidden="true">🔧</span> Headache Potential
          <InfoButton onClick={() => setInfo('headache')} label="About Headache Potential" />
        </h2>
        <SegmentedControl<HeadachePotential>
          label="Headache Potential"
          options={HEADACHE_OPTIONS.map((option) => ({
            value: option.value,
            label: option.label,
            tone:
              option.value === 'low'
                ? 'yes'
                : option.value === 'medium'
                  ? 'maybe'
                  : option.value === 'high'
                    ? 'no'
                    : 'neutral',
            icon: option.dot,
          }))}
          value={car.headachePotential}
          onChange={(value) => onChange({ headachePotential: value })}
          variant="compact"
          columns={2}
        />
        <p className="extras__note">Your own judgement — Car Rater never guesses this.</p>
      </section>

      <section className="extras__card" aria-labelledby="ncap-heading">
        <h2 className="extras__heading" id="ncap-heading">
          <span aria-hidden="true">🛡️</span> Euro NCAP
          <InfoButton onClick={() => setInfo('ncap')} label="About Euro NCAP" />
        </h2>
        <div className="extras__ncap">
          <StarRating
            label="Euro NCAP safety rating"
            value={(car.euroNcapStars as 1 | 2 | 3 | 4 | 5 | null) ?? null}
            onChange={(value) => onChange({ euroNcapStars: value })}
            size="sm"
          />
          <label className="extras__year">
            <span>Tested</span>
            <input
              type="number"
              inputMode="numeric"
              min={1997}
              max={thisYear + 1}
              placeholder="Year"
              value={car.euroNcapYear ?? ''}
              onChange={(event) =>
                onChange({
                  euroNcapYear: event.target.value ? Number(event.target.value) : null,
                })
              }
            />
          </label>
        </div>
        {car.euroNcapStars === null && (
          <p className="extras__note">Not entered — leave it blank if you don’t know.</p>
        )}
      </section>

      <section className="extras__card" aria-labelledby="dealbreaker-heading">
        <h2 className="extras__heading" id="dealbreaker-heading">
          <span aria-hidden="true">🚩</span> Any dealbreaker?
          <InfoButton onClick={() => setInfo('dealbreaker')} label="About dealbreakers" />
        </h2>
        <SegmentedControl<'no' | 'yes'>
          label="Any dealbreaker?"
          options={[
            { value: 'no', label: 'NO', tone: 'yes' },
            { value: 'yes', label: 'YES', tone: 'no' },
          ]}
          value={car.dealbreaker ? 'yes' : 'no'}
          onChange={(value) => onChange({ dealbreaker: value === 'yes' })}
        />
        {car.dealbreaker && (
          <div className="extras__reasons">
            <p className="extras__reasons-label">What’s the problem? (pick any)</p>
            <div className="chips" role="group" aria-label="Dealbreaker reasons">
              {DEALBREAKER_REASONS.map((reason) => {
                const on = car.dealbreakerReasons.includes(reason.value);
                return (
                  <button
                    key={reason.value}
                    type="button"
                    className={`chip chip--danger${on ? ' is-on' : ''}`}
                    aria-pressed={on}
                    onClick={() => toggleReason(reason.value)}
                  >
                    {reason.label}
                  </button>
                );
              })}
            </div>
            {car.dealbreakerReasons.includes('other') && (
              <label className="extras__other">
                <span className="visually-hidden">Describe the dealbreaker</span>
                <input
                  className="field__input"
                  placeholder="What was it?"
                  maxLength={120}
                  value={car.dealbreakerComment}
                  onChange={(event) => onChange({ dealbreakerComment: event.target.value })}
                />
              </label>
            )}
          </div>
        )}
      </section>

      <section className="extras__card" aria-labelledby="verdict-heading">
        <h2 className="extras__heading" id="verdict-heading">
          <span aria-hidden="true">🏁</span> Final verdict
        </h2>
        <SegmentedControl<Verdict>
          label="Final verdict"
          options={[
            { value: 'yes', label: 'YES', tone: 'yes' },
            { value: 'maybe', label: 'MAYBE', tone: 'maybe' },
            { value: 'no', label: 'NO', tone: 'no' },
          ]}
          value={car.verdict}
          onChange={(value) => onChange({ verdict: value })}
        />
        <p className="extras__note">Separate from the star score — this is the gut call.</p>
      </section>

      <Sheet open={info !== null} onClose={() => setInfo(null)} title={info ? INFO[info].title : ''}>
        {info && (
          <div className="rating-info">
            {INFO[info].body.map((line, i) => (
              <p key={line} className={i === 0 ? 'rating-info__helper' : 'extras__info-line'}>
                {line}
              </p>
            ))}
          </div>
        )}
      </Sheet>
    </div>
  );
}

function InfoButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button type="button" className="extras__info-btn" onClick={onClick} aria-label={label}>
      <InfoIcon size={16} />
    </button>
  );
}
