import { describe, expect, it } from 'vitest';
import {
  activeCarFeatures,
  carCustomFeatures,
  carFeatures,
  featureCount,
  formatFeatureCount,
  hasFeature,
  isDuplicateCustomFeature,
  normaliseCustomFeature,
  retiredCarFeatures,
  sanitiseCustomFeatures,
  sanitiseFeatures,
  toggleFeatureKey,
} from './featuresService';
import { CAR_FEATURES, CAR_FEATURE_KEYS, CAR_FEATURE_TOTAL } from '../constants/features';
import { makeCar } from './carsRepo';
import type { Car, CarFeatureKey } from '../types/models';

describe('the built-in feature list', () => {
  it('is exactly the nine agreed features, in order', () => {
    expect(CAR_FEATURES).toHaveLength(9);
    expect(CAR_FEATURE_TOTAL).toBe(9);
    expect(CAR_FEATURES.map((f) => f.key)).toEqual([
      'heatedSeats',
      'carplayAndroidAuto',
      'reversingCamera',
      'parkingSensors',
      'cruiseControl',
      'keylessEntryStart',
      'digitalDash',
      'automaticLightsWipers',
      'climateControl',
    ]);
    expect(CAR_FEATURES.map((f) => f.order)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it('keeps the full meaning alongside the short chip wording', () => {
    const byKey = Object.fromEntries(CAR_FEATURES.map((f) => [f.key, f]));
    expect(byKey.carplayAndroidAuto.label).toBe('Apple CarPlay / Android Auto');
    expect(byKey.carplayAndroidAuto.shortLabel).toBe('CarPlay / Android Auto');
    expect(byKey.automaticLightsWipers.label).toBe('Automatic Lights / Wipers');
    expect(byKey.keylessEntryStart.label).toBe('Keyless Entry / Start');
  });
});

describe('reading features off a car', () => {
  it('treats a car written before features existed as having none', () => {
    const legacy = makeCar();
    delete (legacy as Partial<Car>).features;
    delete (legacy as Partial<Car>).customFeatures;
    expect(carFeatures(legacy)).toEqual([]);
    expect(carCustomFeatures(legacy)).toEqual([]);
    expect(featureCount(legacy)).toBe(0);
    expect(hasFeature(legacy, 'heatedSeats')).toBe(false);
  });

  it('copes with undefined and with junk in the stored array', () => {
    expect(carFeatures(undefined)).toEqual([]);
    expect(carFeatures({ features: undefined })).toEqual([]);
    expect(
      carFeatures({ features: ['heatedSeats', 'notAFeature', 42] as never }),
    ).toEqual(['heatedSeats']);
  });

  it('returns features in config order, not the order they were tapped', () => {
    expect(
      carFeatures({ features: ['climateControl', 'heatedSeats', 'cruiseControl'] }),
    ).toEqual(['heatedSeats', 'cruiseControl', 'climateControl']);
  });

  it('de-duplicates a list that somehow contains the same key twice', () => {
    expect(carFeatures({ features: ['heatedSeats', 'heatedSeats'] })).toEqual([
      'heatedSeats',
    ]);
  });
});

describe('toggleFeatureKey', () => {
  it('adds a key that is missing and removes one that is present', () => {
    expect(toggleFeatureKey([], 'heatedSeats')).toEqual(['heatedSeats']);
    expect(toggleFeatureKey(['heatedSeats'], 'heatedSeats')).toEqual([]);
  });

  it('keeps the canonical order as keys are added', () => {
    let list: CarFeatureKey[] = [];
    list = toggleFeatureKey(list, 'climateControl');
    list = toggleFeatureKey(list, 'heatedSeats');
    list = toggleFeatureKey(list, 'parkingSensors');
    expect(list).toEqual(['heatedSeats', 'parkingSensors', 'climateControl']);
  });

  it('does not mutate the list it was given', () => {
    const original: CarFeatureKey[] = ['heatedSeats'];
    toggleFeatureKey(original, 'cruiseControl');
    expect(original).toEqual(['heatedSeats']);
  });
});

describe('formatFeatureCount', () => {
  it('counts only the built-in features', () => {
    const car = {
      features: ['heatedSeats', 'cruiseControl'] as CarFeatureKey[],
    };
    expect(formatFeatureCount(car, CAR_FEATURE_KEYS)).toBe('2/9 features');
  });

  it('shows nothing rather than a meaningless 0/9', () => {
    expect(formatFeatureCount({ features: [] }, CAR_FEATURE_KEYS)).toBeNull();
    expect(formatFeatureCount({ features: undefined }, CAR_FEATURE_KEYS)).toBeNull();
  });

  it('reaches 9/9', () => {
    expect(
      formatFeatureCount({ features: CAR_FEATURES.map((f) => f.key) }, CAR_FEATURE_KEYS),
    ).toBe('9/9 features');
  });
});

describe('custom feature names', () => {
  it('tidies whitespace and caps the length', () => {
    expect(normaliseCustomFeature('  Panoramic   Roof  ')).toBe('Panoramic Roof');
    expect(normaliseCustomFeature('a'.repeat(60))).toHaveLength(28);
  });

  it('rejects anything that is not usable text', () => {
    expect(normaliseCustomFeature('   ')).toBe('');
    expect(normaliseCustomFeature(undefined)).toBe('');
    expect(normaliseCustomFeature(42)).toBe('');
  });

  it('spots duplicates regardless of case', () => {
    expect(isDuplicateCustomFeature(['Panoramic Roof'], 'panoramic roof')).toBe(true);
    expect(isDuplicateCustomFeature(['Panoramic Roof'], 'Premium Sound')).toBe(false);
  });

  it('lets a rename keep its own name', () => {
    expect(
      isDuplicateCustomFeature(['Panoramic Roof'], 'Panoramic roof', 'Panoramic Roof'),
    ).toBe(false);
  });

  it('drops blanks and duplicates when reading a stored list', () => {
    expect(
      carCustomFeatures({
        customFeatures: ['Panoramic Roof', '  ', 'panoramic roof', 'Premium Sound'],
      }),
    ).toEqual(['Panoramic Roof', 'Premium Sound']);
  });
});

describe('sanitising values coming out of a backup', () => {
  it('returns undefined when the field is absent, as in an old backup', () => {
    expect(sanitiseFeatures(undefined)).toBeUndefined();
    expect(sanitiseCustomFeatures(undefined)).toBeUndefined();
  });

  it('returns undefined rather than an empty array', () => {
    expect(sanitiseFeatures([])).toBeUndefined();
    expect(sanitiseCustomFeatures(['   '])).toBeUndefined();
  });

  it('keeps what it recognises and drops what it does not', () => {
    expect(sanitiseFeatures(['heatedSeats', 'sunroof', null])).toEqual(['heatedSeats']);
    expect(sanitiseCustomFeatures(['Premium Sound', 123])).toEqual(['Premium Sound']);
  });

  it('ignores a value that is not a list at all', () => {
    expect(sanitiseFeatures('heatedSeats')).toBeUndefined();
    expect(sanitiseCustomFeatures({ a: 1 })).toBeUndefined();
  });
});

describe('active vs retired selections', () => {
  /*
   * The user has removed "Digital Dash" and "Climate Control" from the master
   * checklist and moved "Cruise Control" to the top. A car rated before that
   * still has Digital Dash recorded against it.
   */
  const ACTIVE: CarFeatureKey[] = [
    'cruiseControl',
    'heatedSeats',
    'carplayAndroidAuto',
    'reversingCamera',
    'parkingSensors',
    'keylessEntryStart',
    'automaticLightsWipers',
  ];
  const car = {
    features: [
      'heatedSeats',
      'cruiseControl',
      'digitalDash',
      'parkingSensors',
      'climateControl',
    ] as CarFeatureKey[],
  };

  it('lists the still-offered selections in the user’s order, not the shipped one', () => {
    expect(activeCarFeatures(car, ACTIVE)).toEqual([
      'cruiseControl',
      'heatedSeats',
      'parkingSensors',
    ]);
  });

  it('keeps the retired selections rather than dropping them', () => {
    expect(retiredCarFeatures(car, ACTIVE)).toEqual(['digitalDash', 'climateControl']);
  });

  it('counts a retired selection in neither the numerator nor the denominator', () => {
    // 3 of the 7 active features, even though 5 features are recorded.
    expect(formatFeatureCount(car, ACTIVE)).toBe('3/7 features');
  });

  it('shows 5/7 once two more of the active ones are ticked', () => {
    const fuller = {
      features: [...car.features, 'carplayAndroidAuto', 'reversingCamera'] as CarFeatureKey[],
    };
    expect(formatFeatureCount(fuller, ACTIVE)).toBe('5/7 features');
  });

  it('shows nothing at all when the checklist itself is empty', () => {
    expect(formatFeatureCount(car, [])).toBeNull();
    expect(activeCarFeatures(car, [])).toEqual([]);
    // …and everything the car recorded is then retired, never lost.
    expect(retiredCarFeatures(car, [])).toEqual([
      'heatedSeats',
      'parkingSensors',
      'cruiseControl',
      'digitalDash',
      'climateControl',
    ]);
  });

  it('hides the count for a car with only retired selections', () => {
    expect(formatFeatureCount({ features: ['digitalDash'] }, ACTIVE)).toBeNull();
  });

  it('the untouched default checklist still reads as it did in 1.2', () => {
    expect(formatFeatureCount(car, CAR_FEATURE_KEYS)).toBe('5/9 features');
    expect(retiredCarFeatures(car, CAR_FEATURE_KEYS)).toEqual([]);
  });
});
