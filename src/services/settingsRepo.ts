import { db, toFriendlyError } from '../db/database';
import { CAR_FEATURES, CAR_FEATURE_KEYS } from '../constants/features';
import type { AppSettings, CarFeatureKey } from '../types/models';

/**
 * Global app preferences: one keyed row in the `settings` table.
 *
 * Everything here follows the same rule the car repository learned the hard
 * way — a mutation reads the stored value and computes the next one INSIDE the
 * transaction. Nothing takes a whole array from a component snapshot, so two
 * edits landing in the same second cannot undo one another.
 */

const SETTINGS_KEY = 'app' as const;
const KNOWN = new Set<string>(CAR_FEATURE_KEYS);

async function run<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    throw toFriendlyError(error);
  }
}

/**
 * Cleans a stored order: keeps only keys we recognise, drops duplicates, and
 * preserves the stored sequence rather than the canonical one.
 *
 * `undefined` and an empty array mean different things and must stay distinct:
 * undefined is "never customised" (use the defaults), whereas [] is a user who
 * has deliberately removed every feature.
 */
export function sanitiseFeatureOrder(value: unknown): CarFeatureKey[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const seen = new Set<string>();
  const ordered: CarFeatureKey[] = [];
  for (const key of value) {
    if (typeof key !== 'string' || !KNOWN.has(key) || seen.has(key)) continue;
    seen.add(key);
    ordered.push(key as CarFeatureKey);
  }
  return ordered;
}

/**
 * The user's active feature keys, in their order.
 * Falls back to the canonical list when nothing has been customised — which is
 * exactly the state every install upgrading from 1.2 is in.
 */
export function resolveActiveFeatureOrder(
  settings: AppSettings | undefined | null,
): CarFeatureKey[] {
  const stored = sanitiseFeatureOrder(settings?.activeFeatureOrder);
  if (stored === undefined) return [...CAR_FEATURE_KEYS];
  return stored;
}

/** The same list, resolved to full feature definitions. */
export function resolveActiveFeatures(settings: AppSettings | undefined | null) {
  const order = resolveActiveFeatureOrder(settings);
  return order
    .map((key) => CAR_FEATURES.find((f) => f.key === key))
    .filter((f): f is (typeof CAR_FEATURES)[number] => Boolean(f));
}

function write(order: CarFeatureKey[]): AppSettings {
  return { key: SETTINGS_KEY, activeFeatureOrder: order, updatedAt: Date.now() };
}

/** Read-modify-write inside one transaction; `mutate` gets the stored order. */
async function mutateOrder(
  mutate: (current: CarFeatureKey[]) => CarFeatureKey[],
): Promise<CarFeatureKey[]> {
  return run(() =>
    db.transaction('rw', db.settings, async () => {
      const current = await db.settings.get(SETTINGS_KEY);
      const next = mutate(resolveActiveFeatureOrder(current));
      await db.settings.put(write(next));
      return next;
    }),
  );
}

export const settingsRepo = {
  async get(): Promise<AppSettings | undefined> {
    return run(() => db.settings.get(SETTINGS_KEY));
  },

  async activeFeatureOrder(): Promise<CarFeatureKey[]> {
    return resolveActiveFeatureOrder(await settingsRepo.get());
  },

  /**
   * Moves `key` so it sits immediately before `beforeKey`, or to the end when
   * that is null.
   *
   * Deliberately expressed against an anchor rather than an index: if another
   * write removes a different feature while this one is in flight, an index
   * would land in the wrong place but an anchor still means what it meant.
   */
  async moveFeatureBefore(
    key: CarFeatureKey,
    beforeKey: CarFeatureKey | null,
  ): Promise<CarFeatureKey[]> {
    return mutateOrder((current) => {
      if (!current.includes(key) || key === beforeKey) return current;
      const without = current.filter((k) => k !== key);
      const at = beforeKey ? without.indexOf(beforeKey) : -1;
      if (at === -1) return [...without, key];
      return [...without.slice(0, at), key, ...without.slice(at)];
    });
  },

  /** One step up (-1) or down (+1). The neighbour is resolved in-transaction. */
  async nudgeFeature(key: CarFeatureKey, delta: -1 | 1): Promise<CarFeatureKey[]> {
    return mutateOrder((current) => {
      const from = current.indexOf(key);
      const to = from + delta;
      if (from === -1 || to < 0 || to >= current.length) return current;
      const next = [...current];
      next.splice(from, 1);
      next.splice(to, 0, key);
      return next;
    });
  },

  /**
   * Takes a feature off the active checklist.
   *
   * This never touches a car. A feature already recorded on a saved car stays
   * recorded — it simply becomes a "retired" selection that the checklist no
   * longer offers.
   */
  async removeFeature(key: CarFeatureKey): Promise<CarFeatureKey[]> {
    return mutateOrder((current) => current.filter((k) => k !== key));
  },

  /** Back to all nine, in the canonical order. Cars are not touched. */
  async restoreDefaultFeatures(): Promise<CarFeatureKey[]> {
    return mutateOrder(() => [...CAR_FEATURE_KEYS]);
  },

  /** Used by a backup restore. Sanitised the same way as anything else. */
  async setActiveFeatureOrder(value: unknown): Promise<CarFeatureKey[]> {
    const cleaned = sanitiseFeatureOrder(value);
    if (cleaned === undefined) return settingsRepo.activeFeatureOrder();
    return mutateOrder(() => cleaned);
  },

  async clear(): Promise<void> {
    await run(() => db.settings.delete(SETTINGS_KEY));
  },
};
