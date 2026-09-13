import { describe, expect, it } from 'vitest';
import { db } from '../db/database';
import { CAR_FEATURE_KEYS } from '../constants/features';
import {
  resolveActiveFeatureOrder,
  sanitiseFeatureOrder,
  settingsRepo,
} from './settingsRepo';
import type { CarFeatureKey } from '../types/models';

const [first, second, third] = CAR_FEATURE_KEYS;

describe('a device that has never opened Manage Features', () => {
  it('has no settings row at all', async () => {
    expect(await settingsRepo.get()).toBeUndefined();
  });

  it('still reports the full default checklist, in the shipped order', async () => {
    expect(await settingsRepo.activeFeatureOrder()).toEqual([...CAR_FEATURE_KEYS]);
  });
});

describe('sanitiseFeatureOrder', () => {
  it('tells "never customised" apart from "removed everything"', () => {
    expect(sanitiseFeatureOrder(undefined)).toBeUndefined();
    expect(sanitiseFeatureOrder('nonsense')).toBeUndefined();
    expect(sanitiseFeatureOrder([])).toEqual([]);
    // …and the two resolve to opposite lists.
    expect(resolveActiveFeatureOrder(undefined)).toEqual([...CAR_FEATURE_KEYS]);
    expect(
      resolveActiveFeatureOrder({ key: 'app', activeFeatureOrder: [], updatedAt: 0 }),
    ).toEqual([]);
  });

  it('drops unknown keys, duplicates and junk, keeping the stored sequence', () => {
    const cleaned = sanitiseFeatureOrder([
      third,
      'sunroofOfTheGods',
      first,
      third,
      42,
      null,
    ]);
    expect(cleaned).toEqual([third, first]);
  });
});

describe('reordering', () => {
  it('moves a feature in front of a named neighbour', async () => {
    const next = await settingsRepo.moveFeatureBefore(third, first);
    expect(next.slice(0, 3)).toEqual([third, first, second]);
    expect(next).toHaveLength(CAR_FEATURE_KEYS.length);
  });

  it('a null anchor means "to the end"', async () => {
    const next = await settingsRepo.moveFeatureBefore(first, null);
    expect(next[next.length - 1]).toBe(first);
  });

  it('nudges one step at a time and refuses to fall off either end', async () => {
    expect((await settingsRepo.nudgeFeature(second, -1)).slice(0, 2)).toEqual([
      second,
      first,
    ]);
    // `second` is now at the top, so up again is a no-op rather than an error.
    expect((await settingsRepo.nudgeFeature(second, -1)).slice(0, 2)).toEqual([
      second,
      first,
    ]);
    expect((await settingsRepo.nudgeFeature(second, 1)).slice(0, 2)).toEqual([
      first,
      second,
    ]);
  });

  it('survives a reload — the order is in the database, not in a component', async () => {
    await settingsRepo.moveFeatureBefore(third, first);
    db.close();
    await db.open();
    expect((await settingsRepo.activeFeatureOrder())[0]).toBe(third);
  });
});

describe('removing a feature from the master checklist', () => {
  it('takes it off the active list and leaves the rest in order', async () => {
    const next = await settingsRepo.removeFeature(second);
    expect(next).not.toContain(second);
    expect(next).toHaveLength(CAR_FEATURE_KEYS.length - 1);
    expect(next[0]).toBe(first);
  });

  it('NEVER touches a car that already recorded it', async () => {
    const car = {
      id: 'car-1',
      features: [first, second] as CarFeatureKey[],
    };
    await db.cars.put(car as never);

    await settingsRepo.removeFeature(second);

    const stored = await db.cars.get('car-1');
    expect(stored!.features).toEqual([first, second]);
  });

  it('can be taken all the way down to nothing, and back', async () => {
    for (const key of CAR_FEATURE_KEYS) await settingsRepo.removeFeature(key);
    expect(await settingsRepo.activeFeatureOrder()).toEqual([]);

    // An empty list must stay empty across a reload rather than silently
    // springing back to the defaults.
    db.close();
    await db.open();
    expect(await settingsRepo.activeFeatureOrder()).toEqual([]);

    await settingsRepo.restoreDefaultFeatures();
    expect(await settingsRepo.activeFeatureOrder()).toEqual([...CAR_FEATURE_KEYS]);
  });
});

describe('restoring defaults', () => {
  it('puts back every feature, in the shipped order, without touching cars', async () => {
    await db.cars.put({ id: 'car-1', features: [first] } as never);
    await settingsRepo.removeFeature(first);
    await settingsRepo.moveFeatureBefore(third, second);

    expect(await settingsRepo.restoreDefaultFeatures()).toEqual([...CAR_FEATURE_KEYS]);
    expect((await db.cars.get('car-1'))!.features).toEqual([first]);
  });
});

describe('concurrency', () => {
  /*
   * The screen fires one write per tap and does not wait. Each of these reads
   * the stored order inside its own transaction, so the last write cannot be
   * built on a stale snapshot taken before the others landed.
   */
  it('applies rapid-fire changes cumulatively rather than last-one-wins', async () => {
    await Promise.all([
      settingsRepo.removeFeature(first),
      settingsRepo.removeFeature(second),
      settingsRepo.removeFeature(third),
    ]);

    const order = await settingsRepo.activeFeatureOrder();
    expect(order).not.toContain(first);
    expect(order).not.toContain(second);
    expect(order).not.toContain(third);
    expect(order).toHaveLength(CAR_FEATURE_KEYS.length - 3);
  });

  it('a move issued at the same instant as a removal still lands correctly', async () => {
    const fifth = CAR_FEATURE_KEYS[4];
    await Promise.all([
      settingsRepo.removeFeature(second),
      settingsRepo.moveFeatureBefore(fifth, first),
    ]);

    const order = await settingsRepo.activeFeatureOrder();
    expect(order).not.toContain(second);
    // The anchor still means what it meant, whichever write went first.
    expect(order.indexOf(fifth)).toBe(order.indexOf(first) - 1);
  });
});

describe('setActiveFeatureOrder (used by a backup restore)', () => {
  it('applies a sanitised list', async () => {
    expect(await settingsRepo.setActiveFeatureOrder([third, 'nope', first, third])).toEqual([
      third,
      first,
    ]);
  });

  it('leaves the device alone when the backup carries nothing usable', async () => {
    await settingsRepo.moveFeatureBefore(third, first);
    const before = await settingsRepo.activeFeatureOrder();
    expect(await settingsRepo.setActiveFeatureOrder(undefined)).toEqual(before);
  });
});
