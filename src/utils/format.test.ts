import { describe, expect, it } from 'vitest';
import {
  carFactLines,
  digitsOnly,
  formatMileage,
  formatPrice,
  formatTransmission,
  formatYear,
  joinFacts,
  parseWholeNumber,
} from './format';
import { makeCar } from '../services/carsRepo';
import type { Car } from '../types/models';

describe('formatMileage', () => {
  it('formats with UK thousands separators and a unit', () => {
    expect(formatMileage(12500)).toBe('12,500 mi');
    expect(formatMileage(42000)).toBe('42,000 mi');
  });

  it('handles small and very large readings', () => {
    expect(formatMileage(0)).toBe('0 mi');
    expect(formatMileage(999)).toBe('999 mi');
    expect(formatMileage(1000)).toBe('1,000 mi');
    expect(formatMileage(1234567)).toBe('1,234,567 mi');
  });

  it('shows nothing when there is no mileage', () => {
    expect(formatMileage(undefined)).toBeNull();
    expect(formatMileage(null)).toBeNull();
  });

  it('refuses to render a negative or non-finite value', () => {
    expect(formatMileage(-1)).toBeNull();
    expect(formatMileage(Number.NaN)).toBeNull();
    expect(formatMileage(Number.POSITIVE_INFINITY)).toBeNull();
  });
});

describe('formatPrice', () => {
  it('formats as GBP with no pence', () => {
    expect(formatPrice(16995)).toBe('£16,995');
    expect(formatPrice(22500)).toBe('£22,500');
  });

  it('handles small and very large amounts', () => {
    expect(formatPrice(0)).toBe('£0');
    expect(formatPrice(950)).toBe('£950');
    expect(formatPrice(1250000)).toBe('£1,250,000');
  });

  it('shows nothing when there is no price', () => {
    expect(formatPrice(undefined)).toBeNull();
    expect(formatPrice(null)).toBeNull();
  });

  it('refuses to render a negative value', () => {
    expect(formatPrice(-500)).toBeNull();
  });
});

describe('formatTransmission', () => {
  it('maps the stored value to its label', () => {
    expect(formatTransmission('automatic')).toBe('Automatic');
    expect(formatTransmission('manual')).toBe('Manual');
  });

  it('shows nothing when unset', () => {
    expect(formatTransmission(undefined)).toBeNull();
    expect(formatTransmission(null)).toBeNull();
  });
});

describe('formatYear', () => {
  it('renders a plain year with no separator', () => {
    expect(formatYear(2024)).toBe('2024');
  });

  it('shows nothing when unset', () => {
    expect(formatYear(null)).toBeNull();
  });
});

describe('joinFacts', () => {
  it('joins only what exists, never leaving a dangling separator', () => {
    expect(joinFacts(['2024', 'Automatic'])).toBe('2024 · Automatic');
    expect(joinFacts(['2024', null])).toBe('2024');
    expect(joinFacts([null, 'Automatic'])).toBe('Automatic');
    expect(joinFacts([null, undefined, ''])).toBe('');
  });
});

describe('carFactLines', () => {
  const build = (patch: Partial<Car>): Car => ({ ...makeCar(), ...patch });

  it('builds both lines when everything is present', () => {
    const lines = carFactLines(
      build({ year: 2024, transmission: 'automatic', mileage: 12500, price: 16995 }),
    );
    expect(lines.primary).toBe('2024 · Automatic');
    expect(lines.secondary).toBe('12,500 mi · £16,995');
  });

  it('shows only the year when that is all there is', () => {
    const lines = carFactLines(build({ year: 2024 }));
    expect(lines.primary).toBe('2024');
    expect(lines.secondary).toBe('');
  });

  it('shows only the price when that is all there is', () => {
    const lines = carFactLines(build({ price: 16995 }));
    expect(lines.primary).toBe('');
    expect(lines.secondary).toBe('£16,995');
  });

  it('returns empty lines for a car with no facts at all', () => {
    const lines = carFactLines(build({}));
    expect(lines.primary).toBe('');
    expect(lines.secondary).toBe('');
  });

  it('adds the powertrain only when asked', () => {
    const car = build({ year: 2024, transmission: 'manual', powertrain: 'hybrid' });
    expect(carFactLines(car).primary).toBe('2024 · Manual');
    expect(
      carFactLines(car, { includePowertrain: true, powertrainLabel: 'Hybrid' }).primary,
    ).toBe('2024 · Manual · Hybrid');
  });
});

describe('parseWholeNumber', () => {
  it('reads a plain number', () => {
    expect(parseWholeNumber('12500')).toBe(12500);
  });

  it('treats an empty field as not set', () => {
    expect(parseWholeNumber('')).toBeUndefined();
    expect(parseWholeNumber('   ')).toBeUndefined();
  });

  it('cannot produce a negative, however it is typed or pasted', () => {
    expect(parseWholeNumber('-500')).toBe(500);
    expect(parseWholeNumber('-')).toBeUndefined();
  });

  it('strips separators and stray characters a paste might carry', () => {
    expect(parseWholeNumber('12,500')).toBe(12500);
    expect(parseWholeNumber('£16,995')).toBe(16995);
    expect(parseWholeNumber('12500 mi')).toBe(12500);
    expect(parseWholeNumber('1e5')).toBe(15);
  });

  it('rounds nothing because decimals cannot be entered', () => {
    expect(parseWholeNumber('12.5')).toBe(125);
  });
});

describe('digitsOnly', () => {
  it('keeps digits and drops everything else', () => {
    expect(digitsOnly('12,500')).toBe('12500');
    expect(digitsOnly('-99')).toBe('99');
    expect(digitsOnly('abc')).toBe('');
  });

  it('respects the maximum length', () => {
    expect(digitsOnly('20255', 4)).toBe('2025');
    expect(digitsOnly('123456789012345', 7)).toBe('1234567');
  });
});
