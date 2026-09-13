import Dexie, { type EntityTable } from 'dexie';
import type { AppSettings, Car, Photo } from '../types/models';

/**
 * The only module that knows about Dexie/IndexedDB directly.
 * Everything above this goes through the services in `src/services`.
 */
export class CarRaterDB extends Dexie {
  cars!: EntityTable<Car, 'id'>;
  photos!: EntityTable<Photo, 'id'>;
  settings!: EntityTable<AppSettings, 'key'>;

  constructor(name = 'car-rater') {
    super(name);

    /*
     * SCHEMA VERSION HISTORY
     * ----------------------
     * v1 (1.0.0) — cars + photos, as declared below.
     *
     * v1.1 of the app added three optional car fields: `mileage`, `price` and
     * `transmission`. They are deliberately NOT declared here and the version
     * is deliberately NOT bumped.
     *
     * Dexie's store strings declare *indexes*, not the shape of a record — the
     * whole object is stored either way. None of the three new fields is
     * queried, sorted or filtered on at the database level (Compare and My Cars
     * sort in memory over an already-loaded array), so indexing them would cost
     * write throughput and buy nothing.
     *
     * Leaving the version at 1 is also the safest option for people who already
     * have real data: a bump forces every existing browser through an IndexedDB
     * upgrade transaction and can fire `blocked` events when the app is open in
     * more than one tab, all to achieve precisely nothing. Records written by
     * v1.0 simply read back with the new properties `undefined`, which is
     * exactly what the model says they are.
     *
     * v2 (1.3.0) — adds a `settings` table for global app preferences (the
     * customised feature checklist). This one genuinely needs the bump: a new
     * object store cannot exist without one.
     *
     * It is still additive and non-destructive. Dexie carries forward every
     * table a later version does not mention, so `cars` and `photos` keep their
     * exact indexes and every existing record is left untouched; the upgrade
     * only creates the empty new store. Verified against a real 1.2 database.
     */
    this.version(1).stores({
      cars: 'id, createdAt, updatedAt, status, overallScore, verdict, make, model',
      photos: 'id, carId, order, createdAt',
    });

    // `cars` and `photos` are inherited unchanged — deliberately not repeated.
    this.version(2).stores({
      settings: 'key',
    });
  }
}

export const db = new CarRaterDB();

export class StorageUnavailableError extends Error {
  constructor(cause?: unknown) {
    super(
      'Car Rater could not open local storage on this device. Private browsing can block it.',
    );
    this.name = 'StorageUnavailableError';
    this.cause = cause;
  }
}

export class QuotaExceededError extends Error {
  constructor(cause?: unknown) {
    super(
      'There is no room left on this device. Remove a few photos, or export a backup and clear some cars.',
    );
    this.name = 'QuotaExceededError';
    this.cause = cause;
  }
}

export function isQuotaError(error: unknown): boolean {
  if (!error) return false;
  const name = (error as { name?: string }).name ?? '';
  const inner = (error as { inner?: { name?: string } }).inner?.name ?? '';
  return (
    name === 'QuotaExceededError' ||
    inner === 'QuotaExceededError' ||
    name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    /quota/i.test(String((error as Error).message ?? ''))
  );
}

/** Normalises a raw Dexie failure into something the UI can show a human. */
export function toFriendlyError(error: unknown): Error {
  if (isQuotaError(error)) return new QuotaExceededError(error);
  const name = (error as { name?: string })?.name ?? '';
  if (
    name === 'InvalidStateError' ||
    name === 'MissingAPIError' ||
    name === 'DatabaseClosedError' ||
    name === 'UnknownError'
  ) {
    return new StorageUnavailableError(error);
  }
  if (error instanceof Error) return error;
  return new Error('Something went wrong. Please try again.');
}

/** True when IndexedDB looks usable in this browser/context. */
export async function isStorageAvailable(): Promise<boolean> {
  try {
    if (typeof indexedDB === 'undefined') return false;
    await db.open();
    return true;
  } catch {
    return false;
  }
}
