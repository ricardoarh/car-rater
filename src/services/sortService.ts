import { RATING_CATEGORIES } from '../constants/ratings';
import type { Car, RatingKey, Verdict } from '../types/models';
import { carTitle } from './ratingService';

export type SortKey = 'overall' | 'recent' | 'verdict' | RatingKey;

export interface SortOption {
  key: SortKey;
  label: string;
}

export const SORT_OPTIONS: SortOption[] = [
  { key: 'overall', label: 'Overall score' },
  { key: 'recent', label: 'Recently added' },
  ...RATING_CATEGORIES.map((c) => ({ key: c.key as SortKey, label: c.shortLabel })),
  { key: 'verdict', label: 'Verdict' },
];

export const SORT_LABEL: Record<string, string> = Object.fromEntries(
  SORT_OPTIONS.map((o) => [o.key, o.label]),
);

const VERDICT_RANK: Record<Verdict | 'none', number> = {
  yes: 0,
  maybe: 1,
  no: 2,
  none: 3,
};

export type VerdictFilter = 'all' | Verdict;

export const VERDICT_FILTERS: { key: VerdictFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'yes', label: 'YES' },
  { key: 'maybe', label: 'MAYBE' },
  { key: 'no', label: 'NO' },
];

export function filterCars(cars: Car[], filter: VerdictFilter): Car[] {
  if (filter === 'all') return cars;
  return cars.filter((c) => c.verdict === filter);
}

/** Sorts a copy; never mutates the input. Ties break on title for stability. */
export function sortCars(cars: Car[], key: SortKey): Car[] {
  const list = [...cars];
  const byTitle = (a: Car, b: Car) => carTitle(a).localeCompare(carTitle(b));

  switch (key) {
    case 'recent':
      return list.sort((a, b) => b.createdAt - a.createdAt || byTitle(a, b));
    case 'verdict':
      return list.sort(
        (a, b) =>
          VERDICT_RANK[a.verdict ?? 'none'] - VERDICT_RANK[b.verdict ?? 'none'] ||
          (b.overallScore ?? -1) - (a.overallScore ?? -1) ||
          byTitle(a, b),
      );
    case 'overall':
      return list.sort(
        (a, b) => (b.overallScore ?? -1) - (a.overallScore ?? -1) || byTitle(a, b),
      );
    default:
      return list.sort(
        (a, b) => (b.ratings[key] ?? -1) - (a.ratings[key] ?? -1) || byTitle(a, b),
      );
  }
}
