import { db, toFriendlyError } from '../db/database';
import type {
  Car,
  CarFeatureKey,
  CarStatus,
  RatingKey,
  Ratings,
  StarValue,
} from '../types/models';
import {
  carCustomFeatures,
  carFeatures,
  isDuplicateCustomFeature,
  normaliseCustomFeature,
  toggleFeatureKey,
} from './featuresService';
import { MAX_CUSTOM_FEATURES } from '../constants/features';
import { emptyRatings, withDerivedScore } from './ratingService';
import { deletePhotosForCar } from './photoService';
import { newId } from '../utils/id';

export type NewCarInput = Partial<
  Pick<Car, 'make' | 'model' | 'trim' | 'year' | 'powertrain' | 'notes'>
>;

export function makeCar(input: NewCarInput = {}, status: CarStatus = 'draft'): Car {
  const now = Date.now();
  return {
    id: newId(),
    createdAt: now,
    updatedAt: now,
    make: input.make?.trim() ?? '',
    model: input.model?.trim() ?? '',
    trim: input.trim?.trim() ?? '',
    year: input.year ?? null,
    powertrain: input.powertrain ?? null,
    notes: input.notes ?? '',
    ratings: emptyRatings(),
    overallScore: null,
    ratingIncomplete: true,
    headachePotential: 'unknown',
    euroNcapStars: null,
    euroNcapYear: null,
    dealbreaker: false,
    dealbreakerReasons: [],
    dealbreakerComment: '',
    verdict: null,
    comments: '',
    coverPhotoId: null,
    status,
  };
}

async function run<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    throw toFriendlyError(error);
  }
}

export const carsRepo = {
  async all(): Promise<Car[]> {
    return run(() => db.cars.toArray());
  },

  async saved(): Promise<Car[]> {
    return run(() => db.cars.where('status').equals('saved').toArray());
  },

  async get(id: string): Promise<Car | undefined> {
    return run(() => db.cars.get(id));
  },

  async create(input: NewCarInput, status: CarStatus = 'draft'): Promise<Car> {
    const car = makeCar(input, status);
    await run(() => db.cars.add(car));
    return car;
  },

  /**
   * Read-modify-write inside a transaction. Autosave fires from several
   * controls at once (tap a star, then immediately type in a field), and
   * without this the second write could be built on a stale read and silently
   * drop the first one.
   */
  async update(id: string, patch: Partial<Car>): Promise<Car | undefined> {
    return run(() =>
      db.transaction('rw', db.cars, async () => {
        const current = await db.cars.get(id);
        if (!current) return undefined;
        const merged: Car = { ...current, ...patch, id, updatedAt: Date.now() };
        const next = withDerivedScore(merged);
        await db.cars.put(next);
        return next;
      }),
    );
  },

  async setRating(
    id: string,
    key: RatingKey,
    value: StarValue | null,
  ): Promise<Car | undefined> {
    return run(() =>
      db.transaction('rw', db.cars, async () => {
        const current = await db.cars.get(id);
        if (!current) return undefined;
        const ratings: Ratings = { ...current.ratings, [key]: value };
        const next = withDerivedScore({ ...current, ratings, updatedAt: Date.now() });
        await db.cars.put(next);
        return next;
      }),
    );
  },

  /*
   * Feature edits read the current list from the database INSIDE the
   * transaction and compute the next one there. Computing it from React state
   * and sending the whole array would let two quick taps both build on the same
   * stale snapshot, and the second would silently undo the first — the same
   * class of bug that `update` was hardened against.
   */
  async toggleFeature(id: string, key: CarFeatureKey): Promise<Car | undefined> {
    return run(() =>
      db.transaction('rw', db.cars, async () => {
        const current = await db.cars.get(id);
        if (!current) return undefined;
        const next: Car = {
          ...current,
          features: toggleFeatureKey(carFeatures(current), key),
          updatedAt: Date.now(),
        };
        await db.cars.put(next);
        return next;
      }),
    );
  },

  async addCustomFeature(id: string, rawName: string): Promise<Car | undefined> {
    const name = normaliseCustomFeature(rawName);
    if (!name) return carsRepo.get(id);
    return run(() =>
      db.transaction('rw', db.cars, async () => {
        const current = await db.cars.get(id);
        if (!current) return undefined;
        const existing = carCustomFeatures(current);
        if (
          isDuplicateCustomFeature(existing, name) ||
          existing.length >= MAX_CUSTOM_FEATURES
        ) {
          return current;
        }
        const next: Car = {
          ...current,
          customFeatures: [...existing, name],
          updatedAt: Date.now(),
        };
        await db.cars.put(next);
        return next;
      }),
    );
  },

  async renameCustomFeature(
    id: string,
    from: string,
    rawTo: string,
  ): Promise<Car | undefined> {
    const to = normaliseCustomFeature(rawTo);
    if (!to) return carsRepo.get(id);
    return run(() =>
      db.transaction('rw', db.cars, async () => {
        const current = await db.cars.get(id);
        if (!current) return undefined;
        const existing = carCustomFeatures(current);
        if (isDuplicateCustomFeature(existing, to, from)) return current;
        const next: Car = {
          ...current,
          customFeatures: existing.map((name) => (name === from ? to : name)),
          updatedAt: Date.now(),
        };
        await db.cars.put(next);
        return next;
      }),
    );
  },

  async removeCustomFeature(id: string, name: string): Promise<Car | undefined> {
    return run(() =>
      db.transaction('rw', db.cars, async () => {
        const current = await db.cars.get(id);
        if (!current) return undefined;
        const next: Car = {
          ...current,
          customFeatures: carCustomFeatures(current).filter((item) => item !== name),
          updatedAt: Date.now(),
        };
        await db.cars.put(next);
        return next;
      }),
    );
  },

  async finalise(id: string): Promise<Car | undefined> {
    return carsRepo.update(id, { status: 'saved' });
  },

  async remove(id: string): Promise<void> {
    await run(async () => {
      await deletePhotosForCar(id);
      await db.cars.delete(id);
    });
  },

  /** The most recent unfinished draft, if there is one. */
  async latestDraft(): Promise<Car | undefined> {
    return run(async () => {
      const drafts = await db.cars.where('status').equals('draft').toArray();
      if (drafts.length === 0) return undefined;
      return drafts.sort((a, b) => b.updatedAt - a.updatedAt)[0];
    });
  },

  /**
   * Housekeeping: drop drafts that were abandoned with nothing in them, so we
   * never accumulate empty duplicate records.
   */
  async pruneEmptyDrafts(keepId?: string): Promise<number> {
    return run(async () => {
      const drafts = await db.cars.where('status').equals('draft').toArray();
      const doomed: string[] = [];
      for (const draft of drafts) {
        if (draft.id === keepId) continue;
        const photoCount = await db.photos.where('carId').equals(draft.id).count();
        const isEmpty =
          !draft.make.trim() &&
          !draft.model.trim() &&
          !draft.comments.trim() &&
          draft.overallScore === null &&
          draft.verdict === null &&
          photoCount === 0;
        if (isEmpty) doomed.push(draft.id);
      }
      for (const id of doomed) {
        await deletePhotosForCar(id);
        await db.cars.delete(id);
      }
      return doomed.length;
    });
  },

  /**
   * "Clear all data" in More. Cars and photos only — the settings row is
   * deliberately left alone, because the confirmation the user agreed to says
   * cars and photos, and their feature checklist is a preference about how the
   * app works rather than data about a car. A backup restore that genuinely
   * should replace it does so explicitly, through settingsRepo.
   */
  async clearAll(): Promise<void> {
    await run(async () => {
      await db.photos.clear();
      await db.cars.clear();
    });
  },

  async count(): Promise<number> {
    return run(() => db.cars.where('status').equals('saved').count());
  },
};
