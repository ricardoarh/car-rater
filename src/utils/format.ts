import type { Car, Transmission } from '../types/models';

/**
 * The single home for UK display formatting. Screens call these rather than
 * building strings themselves, so "12,500 mi" and "£16,995" are produced in
 * exactly one place.
 *
 * Nothing here is ever persisted — the database stores raw numbers (12500,
 * 16995) and these functions only exist to render them.
 */

const LOCALE = 'en-GB';

// Intl formatters are expensive to construct, so build each one once.
const numberFormatter = new Intl.NumberFormat(LOCALE, {
  maximumFractionDigits: 0,
});

const currencyFormatter = new Intl.NumberFormat(LOCALE, {
  style: 'currency',
  currency: 'GBP',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export const TRANSMISSION_LABEL: Record<Transmission, string> = {
  automatic: 'Automatic',
  manual: 'Manual',
};

/** 12500 -> "12,500 mi". Returns null when there is nothing to show. */
export function formatMileage(miles: number | null | undefined): string | null {
  if (!isDisplayableNumber(miles)) return null;
  return `${numberFormatter.format(miles)} mi`;
}

/** 16995 -> "£16,995". Returns null when there is nothing to show. */
export function formatPrice(pounds: number | null | undefined): string | null {
  if (!isDisplayableNumber(pounds)) return null;
  return currencyFormatter.format(pounds);
}

/** 'automatic' -> "Automatic". */
export function formatTransmission(
  transmission: Transmission | null | undefined,
): string | null {
  return transmission ? TRANSMISSION_LABEL[transmission] : null;
}

export function formatYear(year: number | null | undefined): string | null {
  return isDisplayableNumber(year) ? String(year) : null;
}

function isDisplayableNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

/** Joins the parts that exist, so a missing value never leaves a dangling "·". */
export function joinFacts(parts: (string | null | undefined)[]): string {
  return parts.filter((part): part is string => Boolean(part)).join(' · ');
}

export interface CarFactLines {
  /** "2024 · Automatic" */
  primary: string;
  /** "12,500 mi · £16,995" */
  secondary: string;
}

/**
 * The two compact metadata lines shown under a car's name.
 * Only values that exist appear; both lines can legitimately be empty.
 */
export function carFactLines(
  car: Pick<Car, 'year' | 'transmission' | 'mileage' | 'price' | 'powertrain'>,
  options: { includePowertrain?: boolean; powertrainLabel?: string | null } = {},
): CarFactLines {
  return {
    primary: joinFacts([
      formatYear(car.year),
      formatTransmission(car.transmission),
      options.includePowertrain ? options.powertrainLabel : null,
    ]),
    secondary: joinFacts([formatMileage(car.mileage), formatPrice(car.price)]),
  };
}

/**
 * Reads a whole non-negative number out of a text input.
 *
 * Returns `undefined` for an empty field — which is what an optional field
 * with nothing in it means — and clamps at zero so a negative can never be
 * stored, however the value was typed or pasted.
 */
export function parseWholeNumber(raw: string): number | undefined {
  const digits = raw.replace(/[^0-9]/g, '');
  if (digits === '') return undefined;
  const value = Number.parseInt(digits, 10);
  if (!Number.isFinite(value) || value < 0) return undefined;
  return value;
}

/** Strips anything that is not a digit, for use as an input's onChange guard. */
export function digitsOnly(raw: string, maxLength = 12): string {
  return raw.replace(/[^0-9]/g, '').slice(0, maxLength);
}
