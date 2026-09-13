import type { CarFeatureKey } from '../types/models';

/**
 * THE single source of truth for the built-in feature list.
 *
 * Every screen — Add/Edit, Detail, My Cars, Compare — reads this array, so the
 * wording and the order can never drift apart. Stored records hold the `key`,
 * never the label, which is why the wording can be changed later without
 * touching a single row in the database.
 *
 * Deliberately nine, and deliberately short. This is a make/model shortlisting
 * tool, not a spec sheet; do not add more.
 */
export interface CarFeature {
  key: CarFeatureKey;
  /** Full, unambiguous wording. Used as the chip's tooltip. */
  label: string;
  /** What actually appears on a chip or a narrow Compare row. */
  shortLabel: string;
  order: number;
}

export const CAR_FEATURES: readonly CarFeature[] = [
  {
    key: 'heatedSeats',
    label: 'Heated Seats',
    shortLabel: 'Heated Seats',
    order: 1,
  },
  {
    key: 'carplayAndroidAuto',
    label: 'Apple CarPlay / Android Auto',
    shortLabel: 'CarPlay / Android Auto',
    order: 2,
  },
  {
    key: 'reversingCamera',
    label: 'Reversing Camera',
    shortLabel: 'Reversing Camera',
    order: 3,
  },
  {
    key: 'parkingSensors',
    label: 'Parking Sensors',
    shortLabel: 'Parking Sensors',
    order: 4,
  },
  {
    key: 'cruiseControl',
    label: 'Cruise Control',
    shortLabel: 'Cruise Control',
    order: 5,
  },
  {
    key: 'keylessEntryStart',
    label: 'Keyless Entry / Start',
    shortLabel: 'Keyless Entry',
    order: 6,
  },
  {
    key: 'digitalDash',
    label: 'Digital Dash',
    shortLabel: 'Digital Dash',
    order: 7,
  },
  {
    key: 'automaticLightsWipers',
    label: 'Automatic Lights / Wipers',
    shortLabel: 'Auto Lights / Wipers',
    order: 8,
  },
  {
    key: 'climateControl',
    label: 'Climate Control',
    shortLabel: 'Climate Control',
    order: 9,
  },
] as const;

export const CAR_FEATURE_KEYS: readonly CarFeatureKey[] = CAR_FEATURES.map((f) => f.key);

/** The denominator in "6/9 features". Custom features never count towards it. */
export const CAR_FEATURE_TOTAL = CAR_FEATURES.length;

export const CAR_FEATURE_BY_KEY: Record<CarFeatureKey, CarFeature> = Object.fromEntries(
  CAR_FEATURES.map((f) => [f.key, f]),
) as Record<CarFeatureKey, CarFeature>;

/** Custom feature names are short by design — they are chips, not notes. */
export const CUSTOM_FEATURE_MAX_LENGTH = 28;
export const MAX_CUSTOM_FEATURES = 8;
