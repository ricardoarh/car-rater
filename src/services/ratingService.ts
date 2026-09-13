import { RATING_KEYS } from '../constants/ratings';
import type { Car, Ratings, StarValue } from '../types/models';

export function emptyRatings(): Ratings {
  return {
    cuteness: null,
    comfyness: null,
    techonologia: null,
    vroomFactor: null,
    rioApproved: null,
    unexpectedFactor: null,
    value: null,
  };
}

export function ratedValues(ratings: Ratings): StarValue[] {
  return RATING_KEYS.map((k) => ratings[k]).filter(
    (v): v is StarValue => typeof v === 'number',
  );
}

export function ratedCount(ratings: Ratings): number {
  return ratedValues(ratings).length;
}

export function isRatingComplete(ratings: Ratings): boolean {
  return ratedCount(ratings) === RATING_KEYS.length;
}

/**
 * Mean of the completed categories, rounded to 1 decimal place.
 * All seven categories carry equal weight. Returns null when nothing is rated.
 *
 * When only some categories are filled in this is a *provisional* average —
 * callers should pair it with `isRatingComplete` and say so in the UI.
 */
export function calculateOverallScore(ratings: Ratings): number | null {
  const values = ratedValues(ratings);
  if (values.length === 0) return null;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return roundToOneDecimal(mean);
}

/** Round-half-up to one decimal, immune to binary float drift (4.25 -> 4.3). */
export function roundToOneDecimal(value: number): number {
  const scaled = value * 10;
  // Nudge past representation error such as 42.499999999999996.
  const corrected = Math.round((scaled + Number.EPSILON * Math.abs(scaled) * 8) * 1e6) / 1e6;
  return Math.round(corrected) / 10;
}

/** "4.4" — always one decimal place. "—" when there is nothing to show. */
export function formatScore(score: number | null | undefined): string {
  if (score === null || score === undefined || Number.isNaN(score)) return '—';
  return score.toFixed(1);
}

/** Recomputes the derived score fields on a car. */
export function withDerivedScore<T extends { ratings: Ratings }>(
  car: T,
): T & { overallScore: number | null; ratingIncomplete: boolean } {
  return {
    ...car,
    overallScore: calculateOverallScore(car.ratings),
    ratingIncomplete: !isRatingComplete(car.ratings),
  };
}

/** The car we call the favourite: highest score, preferring a YES verdict. */
export function pickFavourite(cars: Car[]): Car | null {
  const candidates = cars.filter(
    (c) => c.status === 'saved' && c.overallScore !== null && !c.dealbreaker,
  );
  if (candidates.length === 0) return null;
  const yeses = candidates.filter((c) => c.verdict === 'yes');
  const pool = yeses.length > 0 ? yeses : candidates;
  return pool.reduce((best, car) =>
    (car.overallScore ?? 0) > (best.overallScore ?? 0) ? car : best,
  );
}

export function carTitle(car: Pick<Car, 'make' | 'model'>): string {
  return [car.make, car.model].filter(Boolean).join(' ').trim() || 'Untitled car';
}
