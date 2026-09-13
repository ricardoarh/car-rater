import { describe, expect, it } from 'vitest';
import { SORT_OPTIONS, filterCars, sortCars } from './sortService';
import { makeCar } from './carsRepo';
import { emptyRatings, withDerivedScore } from './ratingService';
import type { Car, StarValue, Verdict } from '../types/models';
import { RATING_KEYS } from '../constants/ratings';

function car(
  model: string,
  values: (StarValue | null)[],
  verdict: Verdict | null = null,
  createdAt = Date.now(),
): Car {
  const ratings = emptyRatings();
  RATING_KEYS.forEach((key, index) => {
    ratings[key] = values[index] ?? null;
  });
  return withDerivedScore({
    ...makeCar({ make: 'Test', model }, 'saved'),
    ratings,
    verdict,
    createdAt,
  });
}

describe('sortCars', () => {
  const lbx = car('LBX', [5, 5, 4, 3, 5, 4, 4], 'yes', 1_000);
  const cooper = car('Cooper', [5, 4, 4, 5, 2, 4, 3], 'maybe', 3_000);
  const q2 = car('Q2', [3, 4, 3, 4, 3, 3, 4], 'no', 2_000);
  const cars = [q2, lbx, cooper];

  it('sorts by overall score, highest first (the default)', () => {
    expect(sortCars(cars, 'overall').map((c) => c.model)).toEqual(['LBX', 'Cooper', 'Q2']);
  });

  it('sorts by recency', () => {
    expect(sortCars(cars, 'recent').map((c) => c.model)).toEqual(['Cooper', 'Q2', 'LBX']);
  });

  it('sorts by an individual category', () => {
    expect(sortCars(cars, 'rioApproved').map((c) => c.model)).toEqual([
      'LBX',
      'Q2',
      'Cooper',
    ]);
    expect(sortCars(cars, 'vroomFactor')[0].model).toBe('Cooper');
  });

  it('sorts by verdict, YES first', () => {
    expect(sortCars(cars, 'verdict').map((c) => c.verdict)).toEqual(['yes', 'maybe', 'no']);
  });

  it('puts unrated cars last rather than first', () => {
    const blank = car('Blank', []);
    expect(sortCars([blank, lbx], 'overall').map((c) => c.model)).toEqual(['LBX', 'Blank']);
  });

  it('does not mutate the input array', () => {
    const input = [...cars];
    sortCars(input, 'overall');
    expect(input.map((c) => c.model)).toEqual(cars.map((c) => c.model));
  });

  it('offers a sort option for every rating category plus overall, recent and verdict', () => {
    expect(SORT_OPTIONS).toHaveLength(RATING_KEYS.length + 3);
  });
});

describe('filterCars', () => {
  const cars = [
    car('A', [5, 5, 5, 5, 5, 5, 5], 'yes'),
    car('B', [4, 4, 4, 4, 4, 4, 4], 'maybe'),
    car('C', [3, 3, 3, 3, 3, 3, 3], 'no'),
    car('D', [2, 2, 2, 2, 2, 2, 2], null),
  ];

  it('returns everything for "all"', () => {
    expect(filterCars(cars, 'all')).toHaveLength(4);
  });

  it('filters to a single verdict', () => {
    expect(filterCars(cars, 'yes').map((c) => c.model)).toEqual(['A']);
    expect(filterCars(cars, 'maybe').map((c) => c.model)).toEqual(['B']);
    expect(filterCars(cars, 'no').map((c) => c.model)).toEqual(['C']);
  });
});
