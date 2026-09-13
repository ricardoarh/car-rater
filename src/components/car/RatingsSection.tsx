import { useState } from 'react';
import { RATING_CATEGORIES, type RatingCategory } from '../../constants/ratings';
import type { Car, RatingKey, StarValue } from '../../types/models';
import { StarRating } from '../ui/StarRating';
import { Sheet } from '../ui/Sheet';
import { InfoIcon } from '../layout/Icons';
import { RatingIcon } from './RatingIcons';
import { formatScore } from '../../services/ratingService';
import './RatingsSection.css';

export interface RatingsSectionProps {
  car: Car;
  onRate: (key: RatingKey, value: StarValue | null) => void;
}

export function RatingsSection({ car, onRate }: RatingsSectionProps) {
  const [info, setInfo] = useState<RatingCategory | null>(null);

  return (
    <section className="ratings" aria-label="Ratings">
      <ul className="ratings__list">
        {RATING_CATEGORIES.map((category) => (
          <li className="rating-row" key={category.key}>
            <span className="rating-row__icon" aria-hidden="true">
              <RatingIcon category={category.key} />
            </span>
            <button
              type="button"
              className="rating-row__label"
              onClick={() => setInfo(category)}
              aria-label={`What ${category.shortLabel} means`}
            >
              {category.label}
              <InfoIcon size={13} className="rating-row__info" />
            </button>
            <span className="rating-row__stars">
              <StarRating
                label={category.label}
                value={car.ratings[category.key]}
                onChange={(value) => onRate(category.key, value)}
              />
            </span>
          </li>
        ))}
      </ul>

      <p className="ratings__summary" aria-live="polite">
        {car.overallScore === null ? (
          <span className="muted">Tap the stars to start rating.</span>
        ) : (
          <>
            <span className="ratings__summary-score num">{formatScore(car.overallScore)}</span>
            <span className="ratings__summary-label">
              {car.ratingIncomplete ? 'so far — some categories not rated yet' : 'overall'}
            </span>
          </>
        )}
      </p>

      <Sheet open={info !== null} onClose={() => setInfo(null)} title={info?.label}>
        {info && (
          <div className="rating-info">
            <p className="rating-info__helper">{info.helper}</p>
            <ul className="rating-info__list">
              {info.detail.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
        )}
      </Sheet>
    </section>
  );
}
