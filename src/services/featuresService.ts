import {
  CAR_FEATURE_KEYS,
  CAR_FEATURE_TOTAL,
  CUSTOM_FEATURE_MAX_LENGTH,
  MAX_CUSTOM_FEATURES,
} from '../constants/features';
import type { Car, CarFeatureKey } from '../types/models';

/**
 * Pure helpers for the feature lists. Everything here is total: a car that has
 * never been edited (no `features` property at all) behaves exactly like a car
 * with an empty list.
 */

const KEY_SET = new Set<string>(CAR_FEATURE_KEYS);

/**
 * The car's built-in features, de-duplicated, stripped of anything we no longer
 * recognise, and returned in the canonical config order rather than tap order.
 */
export function carFeatures(car: Pick<Car, 'features'> | undefined): CarFeatureKey[] {
  const stored = car?.features;
  if (!Array.isArray(stored)) return [];
  const present = new Set(stored.filter((key): key is CarFeatureKey => KEY_SET.has(key)));
  return CAR_FEATURE_KEYS.filter((key) => present.has(key));
}

export function carCustomFeatures(
  car: Pick<Car, 'customFeatures'> | undefined,
): string[] {
  const stored = car?.customFeatures;
  if (!Array.isArray(stored)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of stored) {
    const name = normaliseCustomFeature(raw);
    if (!name) continue;
    const fingerprint = name.toLowerCase();
    if (seen.has(fingerprint)) continue;
    seen.add(fingerprint);
    out.push(name);
  }
  return out.slice(0, MAX_CUSTOM_FEATURES);
}

export function hasFeature(
  car: Pick<Car, 'features'> | undefined,
  key: CarFeatureKey,
): boolean {
  return carFeatures(car).includes(key);
}

/*
 * "Active" vs "retired"
 * --------------------
 * The user can take a feature off the master checklist in Manage Features.
 * That removes it from what is *offered*, never from what was *recorded*: a car
 * that already had it keeps it. These helpers split a car's stored selections
 * against the active list so each screen can show the right half.
 */

/** The car's selections that are still on the master list, in the user's order. */
export function activeCarFeatures(
  car: Pick<Car, 'features'> | undefined,
  activeOrder: readonly CarFeatureKey[],
): CarFeatureKey[] {
  const selected = new Set(carFeatures(car));
  return activeOrder.filter((key) => selected.has(key));
}

/**
 * Selections the master list no longer offers. Still real, still shown on the
 * car's profile — a fact recorded once should not vanish because a checklist
 * changed. Returned in canonical order so it is stable.
 */
export function retiredCarFeatures(
  car: Pick<Car, 'features'> | undefined,
  activeOrder: readonly CarFeatureKey[],
): CarFeatureKey[] {
  const active = new Set(activeOrder);
  return carFeatures(car).filter((key) => !active.has(key));
}

/** How many built-in features are recorded, ignoring the active list. */
export function featureCount(car: Pick<Car, 'features'> | undefined): number {
  return carFeatures(car).length;
}

export { CAR_FEATURE_TOTAL };

/**
 * "5/7 features" — numerator and denominator both come from the ACTIVE list.
 * A retired selection counts towards neither, and custom features never count.
 * Returns null when there is nothing worth showing, which keeps the existing
 * behaviour of hiding a meaningless zero.
 */
export function formatFeatureCount(
  car: Pick<Car, 'features'> | undefined,
  activeOrder: readonly CarFeatureKey[],
): string | null {
  const total = activeOrder.length;
  if (total === 0) return null;
  const count = activeCarFeatures(car, activeOrder).length;
  return count > 0 ? `${count}/${total} features` : null;
}

/** Pure toggle over a key list; the repository applies it inside a transaction. */
export function toggleFeatureKey(
  current: CarFeatureKey[],
  key: CarFeatureKey,
): CarFeatureKey[] {
  const present = new Set(current);
  if (present.has(key)) present.delete(key);
  else present.add(key);
  return CAR_FEATURE_KEYS.filter((k) => present.has(k));
}

/**
 * Tidies a typed custom feature name: collapses whitespace, trims, and caps the
 * length so a chip can never become a paragraph. Returns '' when there is
 * nothing usable, which callers treat as "don't add it".
 */
export function normaliseCustomFeature(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  return raw.replace(/\s+/g, ' ').trim().slice(0, CUSTOM_FEATURE_MAX_LENGTH);
}

/** Case-insensitive duplicate check against both lists' display names. */
export function isDuplicateCustomFeature(
  existing: string[],
  candidate: string,
  ignore?: string,
): boolean {
  const target = candidate.toLowerCase();
  return existing.some(
    (name) => name.toLowerCase() === target && name.toLowerCase() !== ignore?.toLowerCase(),
  );
}

/**
 * Coerces whatever a backup happens to contain into a valid feature list.
 * An absent field means an older backup and yields `undefined`, never an error.
 */
export function sanitiseFeatures(value: unknown): CarFeatureKey[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const cleaned = carFeatures({ features: value as CarFeatureKey[] });
  return cleaned.length > 0 ? cleaned : undefined;
}

export function sanitiseCustomFeatures(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const cleaned = carCustomFeatures({ customFeatures: value as string[] });
  return cleaned.length > 0 ? cleaned : undefined;
}
