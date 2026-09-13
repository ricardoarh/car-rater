import { describe, expect, it } from 'vitest';
import {
  calculateOverallScore,
  emptyRatings,
  formatScore,
  isRatingComplete,
  pickFavourite,
  ratedCount,
  roundToOneDecimal,
} from './ratingService';
import { RATING_CATEGORIES, RATING_KEYS } from '../constants/ratings';
import type { Car, Ratings, StarValue } from '../types/models';
import { makeCar } from './carsRepo';
import { withDerivedScore } from './ratingService';

function ratingsOf(values: (StarValue | null)[]): Ratings {
  const ratings = emptyRatings();
  RATING_KEYS.forEach((key, index) => {
    ratings[key] = values[index] ?? null;
  });
  return ratings;
}

describe('rating category config', () => {
  it('defines exactly seven categories in the specified order', () => {
    expect(RATING_CATEGORIES).toHaveLength(7);
    expect(RATING_CATEGORIES.map((c) => c.label)).toEqual([
      'Cuteness',
      'Comfyness',
      'Techonologia',
      'Vroom Factor',
      'Rio Approved 🐶',
      'Uuhhh, I didn’t expect that',
      '$$',
    ]);
    expect(RATING_CATEGORIES.map((c) => c.order)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });
});

describe('calculateOverallScore', () => {
  it('returns null when nothing has been rated', () => {
    expect(calculateOverallScore(emptyRatings())).toBeNull();
    expect(formatScore(null)).toBe('—');
  });

  it('averages seven completed ratings to one decimal place', () => {
    // The validation scenario from the brief: 5,5,4,3,5,4,4 -> 30/7 = 4.285… -> 4.3
    const ratings = ratingsOf([5, 5, 4, 3, 5, 4, 4]);
    expect(isRatingComplete(ratings)).toBe(true);
    expect(calculateOverallScore(ratings)).toBe(4.3);
    expect(formatScore(calculateOverallScore(ratings))).toBe('4.3');
  });

  it('handles all ones and all fives', () => {
    expect(calculateOverallScore(ratingsOf([1, 1, 1, 1, 1, 1, 1]))).toBe(1);
    expect(calculateOverallScore(ratingsOf([5, 5, 5, 5, 5, 5, 5]))).toBe(5);
    expect(formatScore(calculateOverallScore(ratingsOf([5, 5, 5, 5, 5, 5, 5])))).toBe('5.0');
  });

  it('averages only the completed categories when a rating is partial', () => {
    const ratings = ratingsOf([4, 5, null, null, null, null, null]);
    expect(ratedCount(ratings)).toBe(2);
    expect(isRatingComplete(ratings)).toBe(false);
    expect(calculateOverallScore(ratings)).toBe(4.5);
  });

  it('marks a partial rating as incomplete on the derived car', () => {
    const car = withDerivedScore({
      ...makeCar({ make: 'Lexus', model: 'LBX' }),
      ratings: ratingsOf([4, 4, 4, 4, 4, 4, null]),
    });
    expect(car.overallScore).toBe(4);
    expect(car.ratingIncomplete).toBe(true);
  });

  it('rounds half up, immune to float drift', () => {
    expect(roundToOneDecimal(4.25)).toBe(4.3);
    expect(roundToOneDecimal(4.24999)).toBe(4.2);
    expect(roundToOneDecimal(1.05)).toBe(1.1);
    // 4+4+4+4+5+5+5 = 31/7 = 4.4285…
    expect(calculateOverallScore(ratingsOf([4, 4, 4, 4, 5, 5, 5]))).toBe(4.4);
    // 3+4+4+4+4+4+4 = 27/7 = 3.857…
    expect(calculateOverallScore(ratingsOf([3, 4, 4, 4, 4, 4, 4]))).toBe(3.9);
  });

  it('is unaffected by a dealbreaker', () => {
    const ratings = ratingsOf([5, 5, 4, 3, 5, 4, 4]);
    const clean = withDerivedScore({ ...makeCar(), ratings, dealbreaker: false });
    const flagged = withDerivedScore({ ...makeCar(), ratings, dealbreaker: true });
    expect(flagged.overallScore).toBe(clean.overallScore);
  });
});

describe('pickFavourite', () => {
  const build = (
    over: Partial<Car> & { ratings: Ratings },
  ): Car => withDerivedScore({ ...makeCar({}, 'saved'), ...over });

  it('returns null when there is nothing to choose from', () => {
    expect(pickFavourite([])).toBeNull();
  });

  it('prefers the highest-scoring YES', () => {
    const cars = [
      build({ make: 'Audi', model: 'A1', ratings: ratingsOf([5, 5, 5, 5, 5, 5, 5]), verdict: 'maybe' }),
      build({ make: 'Lexus', model: 'LBX', ratings: ratingsOf([4, 4, 4, 4, 4, 4, 4]), verdict: 'yes' }),
      build({ make: 'Mini', model: 'Cooper', ratings: ratingsOf([3, 3, 3, 3, 3, 3, 3]), verdict: 'yes' }),
    ];
    expect(pickFavourite(cars)?.model).toBe('LBX');
  });

  it('falls back to the highest score when nothing is a YES', () => {
    const cars = [
      build({ model: 'A', ratings: ratingsOf([4, 4, 4, 4, 4, 4, 4]), verdict: 'maybe' }),
      build({ model: 'B', ratings: ratingsOf([5, 5, 5, 5, 5, 5, 5]), verdict: null }),
    ];
    expect(pickFavourite(cars)?.model).toBe('B');
  });

  it('never picks a car with a dealbreaker', () => {
    const cars = [
      build({ model: 'Flagged', ratings: ratingsOf([5, 5, 5, 5, 5, 5, 5]), verdict: 'yes', dealbreaker: true }),
      build({ model: 'Clean', ratings: ratingsOf([3, 3, 3, 3, 3, 3, 3]), verdict: 'yes' }),
    ];
    expect(pickFavourite(cars)?.model).toBe('Clean');
  });

  it('ignores drafts', () => {
    const draft = withDerivedScore({
      ...makeCar({ model: 'Draft' }, 'draft'),
      ratings: ratingsOf([5, 5, 5, 5, 5, 5, 5]),
      verdict: 'yes' as const,
    });
    expect(pickFavourite([draft])).toBeNull();
  });
});
