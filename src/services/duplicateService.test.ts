import { describe, expect, it, vi } from 'vitest';

/*
 * A switch for simulating an unreadable photo. The stored Blob itself cannot be
 * sabotaged — IndexedDB refuses to clone anything that is not a real Blob — so
 * the failure is injected at the one place that actually reads the bytes.
 */
const blobFail = vi.hoisted(() => ({ on: false }));
vi.mock('../utils/blob', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../utils/blob')>();
  return {
    ...actual,
    blobToUint8Array: (blob: Blob) =>
      blobFail.on
        ? Promise.reject(new Error('read failed'))
        : actual.blobToUint8Array(blob),
  };
});

import { db } from '../db/database';
import { carsRepo } from './carsRepo';
import {
  DEFAULT_DUPLICATE_OPTIONS,
  DuplicateFailedError,
  SourceCarMissingError,
  buildDuplicate,
  duplicateCar,
  type DuplicateOptions,
} from './duplicateService';
import { removePhoto } from './photoService';
import { listPhotos } from './photoService';
import { blobToUint8Array } from '../utils/blob';
import type { Car, CarFeatureKey, Photo } from '../types/models';

const ALL_ON: DuplicateOptions = {
  mileage: true,
  price: true,
  photos: true,
  comments: true,
  verdict: true,
};

/** A realistic saved car: the Lexus LBX from the acceptance scenario. */
async function seedLexus(): Promise<Car> {
  const car = await carsRepo.create({ make: 'Lexus', model: 'LBX' }, 'saved');
  await carsRepo.setRating(car.id, 'cuteness', 5);
  await carsRepo.setRating(car.id, 'comfyness', 5);
  await carsRepo.setRating(car.id, 'techonologia', 4);
  await carsRepo.setRating(car.id, 'vroomFactor', 3);
  await carsRepo.setRating(car.id, 'rioApproved', 5);
  await carsRepo.setRating(car.id, 'unexpectedFactor', 4);
  await carsRepo.setRating(car.id, 'value', 4);
  await carsRepo.toggleFeature(car.id, 'heatedSeats');
  await carsRepo.toggleFeature(car.id, 'parkingSensors');
  await carsRepo.addCustomFeature(car.id, 'Mark Levinson');
  return (await carsRepo.update(car.id, {
    year: 2024,
    transmission: 'automatic',
    powertrain: 'hybrid',
    mileage: 12_500,
    price: 16_995,
    headachePotential: 'low',
    euroNcapStars: 5,
    euroNcapYear: 2024,
    verdict: 'yes',
    comments: 'Way nicer inside than expected.',
    notes: 'Seen at the Reading dealership',
  }))!;
}

async function addPhoto(
  carId: string,
  id: string,
  order: number,
  caption: string,
  bytes: number[],
): Promise<Photo> {
  const photo: Photo = {
    id,
    carId,
    blob: new Blob([new Uint8Array(bytes)], { type: 'image/webp' }),
    thumb: new Blob([new Uint8Array(bytes.slice(0, 2))], { type: 'image/webp' }),
    width: 1600,
    height: 1200,
    caption,
    order,
    createdAt: Date.now(),
  };
  await db.photos.add(photo);
  return photo;
}

describe('buildDuplicate — what copies and what does not', () => {
  const source: Car = {
    id: 'source-id',
    createdAt: 1_700_000_000_000,
    updatedAt: 1_700_000_000_000,
    make: 'Lexus',
    model: 'LBX',
    trim: 'Premium Plus',
    year: 2024,
    powertrain: 'hybrid',
    notes: 'Seen at the Reading dealership',
    mileage: 12_500,
    price: 16_995,
    transmission: 'automatic',
    features: ['heatedSeats', 'digitalDash'],
    customFeatures: ['Mark Levinson'],
    ratings: {
      cuteness: 5,
      comfyness: 5,
      techonologia: 4,
      vroomFactor: 3,
      rioApproved: 5,
      unexpectedFactor: 4,
      value: 4,
    },
    overallScore: 4.3,
    ratingIncomplete: false,
    headachePotential: 'low',
    euroNcapStars: 5,
    euroNcapYear: 2024,
    dealbreaker: true,
    dealbreakerReasons: ['price'],
    dealbreakerComment: 'Over budget',
    verdict: 'yes',
    comments: 'Way nicer inside than expected.',
    coverPhotoId: 'photo-1',
    status: 'saved',
  };

  it('copies the model and its spec', () => {
    const copy = buildDuplicate(source, DEFAULT_DUPLICATE_OPTIONS, 1_800_000_000_000);
    expect(copy.make).toBe('Lexus');
    expect(copy.model).toBe('LBX');
    expect(copy.year).toBe(2024);
    expect(copy.transmission).toBe('automatic');
    expect(copy.powertrain).toBe('hybrid');
    expect(copy.headachePotential).toBe('low');
    expect(copy.euroNcapStars).toBe(5);
    expect(copy.euroNcapYear).toBe(2024);
  });

  it('copies the ratings and re-derives the score rather than transcribing it', () => {
    const copy = buildDuplicate(source);
    expect(copy.ratings).toEqual(source.ratings);
    expect(copy.overallScore).toBe(4.3);
    expect(copy.ratingIncomplete).toBe(false);

    // A stale stored score on the source must not survive into the copy.
    const stale = buildDuplicate({ ...source, overallScore: 1.1 });
    expect(stale.overallScore).toBe(4.3);
  });

  it('copies the features, including one the checklist has since retired', () => {
    const copy = buildDuplicate(source);
    expect(copy.features).toEqual(['heatedSeats', 'digitalDash']);
    expect(copy.customFeatures).toEqual(['Mark Levinson']);
  });

  it('leaves the per-car facts and judgements clean by default', () => {
    const copy = buildDuplicate(source);
    expect(copy.mileage).toBeUndefined();
    expect(copy.price).toBeUndefined();
    expect(copy.comments).toBe('');
    expect(copy.notes).toBe('');
    expect(copy.verdict).toBeNull();
    expect(copy.dealbreaker).toBe(false);
    expect(copy.dealbreakerReasons).toEqual([]);
    expect(copy.dealbreakerComment).toBe('');
    expect(copy.coverPhotoId).toBeNull();
  });

  it('copies the opt-in extras when they are asked for', () => {
    const copy = buildDuplicate(source, ALL_ON);
    expect(copy.mileage).toBe(12_500);
    expect(copy.price).toBe(16_995);
    expect(copy.comments).toBe('Way nicer inside than expected.');
    expect(copy.notes).toBe('Seen at the Reading dealership');
    expect(copy.verdict).toBe('yes');
    expect(copy.dealbreaker).toBe(true);
    expect(copy.dealbreakerReasons).toEqual(['price']);
    expect(copy.dealbreakerComment).toBe('Over budget');
  });

  it('is a brand new record, not a re-pointed one', () => {
    const copy = buildDuplicate(source, DEFAULT_DUPLICATE_OPTIONS, 1_800_000_000_000);
    expect(copy.id).not.toBe(source.id);
    expect(copy.createdAt).toBe(1_800_000_000_000);
    expect(copy.updatedAt).toBe(1_800_000_000_000);
    expect(copy.status).toBe('saved');
  });

  it('shares no nested value with the source', () => {
    const copy = buildDuplicate(source, ALL_ON);
    expect(copy.ratings).not.toBe(source.ratings);
    expect(copy.features).not.toBe(source.features);
    expect(copy.customFeatures).not.toBe(source.customFeatures);
    expect(copy.dealbreakerReasons).not.toBe(source.dealbreakerReasons);

    // Mutating the copy must be invisible to the source.
    copy.features!.push('cruiseControl');
    copy.customFeatures!.push('Tow Bar');
    copy.ratings.cuteness = 1;
    expect(source.features).toEqual(['heatedSeats', 'digitalDash']);
    expect(source.customFeatures).toEqual(['Mark Levinson']);
    expect(source.ratings.cuteness).toBe(5);
  });

  it('carries the legacy trim through without exposing it', () => {
    expect(buildDuplicate(source).trim).toBe('Premium Plus');
  });

  it('keeps a pre-1.2 car looking like a pre-1.2 car', () => {
    const legacy: Car = { ...source, features: undefined, customFeatures: undefined };
    const copy = buildDuplicate(legacy);
    expect(copy.features).toBeUndefined();
    expect(copy.customFeatures).toBeUndefined();
  });
});

describe('duplicateCar — the stored result', () => {
  it('writes an independent second car and never touches the first', async () => {
    const source = await seedLexus();
    const before = await db.cars.get(source.id);

    const copy = await duplicateCar(source.id);

    expect(copy.id).not.toBe(source.id);
    expect(await db.cars.count()).toBe(2);
    // The source is byte-for-byte what it was.
    expect(await db.cars.get(source.id)).toEqual(before);

    const stored = (await db.cars.get(copy.id))!;
    expect(stored.make).toBe('Lexus');
    expect(stored.model).toBe('LBX');
    expect(stored.year).toBe(2024);
    expect(stored.transmission).toBe('automatic');
    expect(stored.overallScore).toBe(4.3);
    expect(stored.features).toEqual(['heatedSeats', 'parkingSensors']);
    expect(stored.customFeatures).toEqual(['Mark Levinson']);
    expect(stored.mileage).toBeUndefined();
    expect(stored.price).toBeUndefined();
    expect(stored.comments).toBe('');
    expect(stored.verdict).toBeNull();
  });

  it('gets a fresh createdAt, so Recent floats it to the top', async () => {
    const source = await seedLexus();
    await db.cars.update(source.id, { createdAt: 1_600_000_000_000 });

    const copy = await duplicateCar(source.id);
    expect(copy.createdAt).toBeGreaterThan(1_600_000_000_000);
    expect((await db.cars.get(source.id))!.createdAt).toBe(1_600_000_000_000);
  });

  it('copies no photos by default, and no cover', async () => {
    const source = await seedLexus();
    await addPhoto(source.id, 'p1', 0, 'Front', [1, 2, 3, 4, 5]);
    await carsRepo.update(source.id, { coverPhotoId: 'p1' });

    const copy = await duplicateCar(source.id);
    expect(await listPhotos(copy.id)).toHaveLength(0);
    expect(copy.coverPhotoId).toBeNull();
    // The source keeps its own.
    expect(await listPhotos(source.id)).toHaveLength(1);
  });

  it('refuses to copy a car that is no longer there', async () => {
    await expect(duplicateCar('does-not-exist')).rejects.toBeInstanceOf(
      SourceCarMissingError,
    );
  });
});

describe('duplicateCar — photos', () => {
  async function seedWithPhotos() {
    const source = await seedLexus();
    await addPhoto(source.id, 'p1', 0, 'Front', [1, 2, 3, 4, 5]);
    await addPhoto(source.id, 'p2', 1, 'Boot for Rio', [6, 7, 8]);
    await addPhoto(source.id, 'p3', 2, 'Dash', [9, 9, 9, 9]);
    await carsRepo.update(source.id, { coverPhotoId: 'p2' });
    return (await carsRepo.get(source.id))!;
  }

  it('creates new photo records owned by the new car', async () => {
    const source = await seedWithPhotos();
    const copy = await duplicateCar(source.id, ALL_ON);

    const copied = await listPhotos(copy.id);
    expect(copied).toHaveLength(3);
    expect(copied.every((p) => p.carId === copy.id)).toBe(true);
    // Not one id is shared with the original.
    const originalIds = new Set(['p1', 'p2', 'p3']);
    expect(copied.every((p) => !originalIds.has(p.id))).toBe(true);
    expect(await db.photos.count()).toBe(6);
  });

  it('copies the bytes, the captions and the order', async () => {
    const source = await seedWithPhotos();
    const copy = await duplicateCar(source.id, ALL_ON);

    const copied = await listPhotos(copy.id);
    expect(copied.map((p) => p.caption)).toEqual(['Front', 'Boot for Rio', 'Dash']);
    expect(copied.map((p) => p.order)).toEqual([0, 1, 2]);
    expect([...(await blobToUint8Array(copied[0].blob))]).toEqual([1, 2, 3, 4, 5]);
    expect([...(await blobToUint8Array(copied[1].blob))]).toEqual([6, 7, 8]);
    expect([...(await blobToUint8Array(copied[1].thumb))]).toEqual([6, 7]);
    expect(copied[0].width).toBe(1600);
  });

  it('maps the cover photo to the copy of the right picture', async () => {
    const source = await seedWithPhotos();
    const copy = await duplicateCar(source.id, ALL_ON);

    const copied = await listPhotos(copy.id);
    const cover = copied.find((p) => p.id === copy.coverPhotoId);
    // The source's cover was the second photo; so is the duplicate's.
    expect(cover?.caption).toBe('Boot for Rio');
    expect(copy.coverPhotoId).not.toBe('p2');
    expect((await db.cars.get(source.id))!.coverPhotoId).toBe('p2');
  });

  it('falls back to the first photo when the source cover is dangling', async () => {
    const source = await seedWithPhotos();
    await db.cars.update(source.id, { coverPhotoId: 'gone' });

    const copy = await duplicateCar(source.id, ALL_ON);
    const copied = await listPhotos(copy.id);
    expect(copy.coverPhotoId).toBe(copied[0].id);
  });

  it('deleting a duplicated photo leaves the original alone', async () => {
    const source = await seedWithPhotos();
    const copy = await duplicateCar(source.id, ALL_ON);
    const copied = await listPhotos(copy.id);

    await removePhoto(copied[1].id);

    expect(await listPhotos(copy.id)).toHaveLength(2);
    expect(await listPhotos(source.id)).toHaveLength(3);
    expect((await db.cars.get(source.id))!.coverPhotoId).toBe('p2');
  });

  it('deleting the original car leaves the duplicate intact', async () => {
    const source = await seedWithPhotos();
    const copy = await duplicateCar(source.id, ALL_ON);

    await carsRepo.remove(source.id);

    expect(await db.cars.get(copy.id)).toBeDefined();
    expect(await listPhotos(copy.id)).toHaveLength(3);
  });
});

describe('duplicateCar — failure leaves nothing behind', () => {
  it('a photo that cannot be read fails the whole duplication cleanly', async () => {
    const source = await seedLexus();
    await addPhoto(source.id, 'p1', 0, 'Front', [1, 2, 3]);
    await addPhoto(source.id, 'p2', 1, 'Boot', [4, 5, 6]);
    const before = await db.cars.get(source.id);

    blobFail.on = true;
    try {
      await expect(duplicateCar(source.id, ALL_ON)).rejects.toBeInstanceOf(
        DuplicateFailedError,
      );
    } finally {
      blobFail.on = false;
    }

    // No half-made car, no orphan photos, and the original is untouched.
    expect(await db.cars.count()).toBe(1);
    expect(await db.photos.count()).toBe(2);
    expect(await db.cars.get(source.id)).toEqual(before);
  });

  it('an unreadable photo does not stop a duplication that did not want photos', async () => {
    const source = await seedLexus();
    await addPhoto(source.id, 'p1', 0, 'Front', [1, 2, 3]);

    blobFail.on = true;
    try {
      const copy = await duplicateCar(source.id);
      expect(copy.id).toBeTruthy();
      expect(await listPhotos(copy.id)).toHaveLength(0);
    } finally {
      blobFail.on = false;
    }
  });

  it('a failed write leaves neither the car nor its photos behind', async () => {
    const source = await seedLexus();
    await addPhoto(source.id, 'p1', 0, 'Front', [1, 2, 3]);

    const spy = vi
      .spyOn(db.photos, 'bulkAdd')
      .mockRejectedValueOnce(new Error('disk went away'));

    await expect(duplicateCar(source.id, ALL_ON)).rejects.toBeInstanceOf(
      DuplicateFailedError,
    );
    spy.mockRestore();

    // The transaction rolled the car back with the photos.
    expect(await db.cars.count()).toBe(1);
    expect(await db.photos.count()).toBe(1);
  });

  it('reports something a person can act on, not a raw error', async () => {
    const error = new DuplicateFailedError(new Error('IDBRequest failed'));
    expect(error.message).toBe('Couldn’t duplicate this car. Please try again.');
  });
});

describe('the duplicate behaves like any other car', () => {
  it('appears in the saved list and can be edited independently', async () => {
    const source = await seedLexus();
    const copy = await duplicateCar(source.id);

    const saved = await carsRepo.saved();
    expect(saved).toHaveLength(2);

    await carsRepo.update(copy.id, { mileage: 21_000, year: 2023 });
    await carsRepo.toggleFeature(copy.id, 'cruiseControl');

    const updatedCopy = (await carsRepo.get(copy.id))!;
    const untouchedSource = (await carsRepo.get(source.id))!;
    expect(updatedCopy.mileage).toBe(21_000);
    expect(updatedCopy.year).toBe(2023);
    expect(updatedCopy.features).toContain('cruiseControl');

    expect(untouchedSource.mileage).toBe(12_500);
    expect(untouchedSource.year).toBe(2024);
    expect(untouchedSource.features).toEqual(['heatedSeats', 'parkingSensors']);
  });

  it('a retired feature key survives duplication and later editing', async () => {
    const source = await seedLexus();
    await carsRepo.toggleFeature(source.id, 'digitalDash');

    const copy = await duplicateCar(source.id);
    expect(copy.features).toContain('digitalDash');

    await carsRepo.toggleFeature(copy.id, 'cruiseControl');
    expect((await carsRepo.get(copy.id))!.features).toContain('digitalDash');
  });
});

describe('feature keys', () => {
  it('never writes back into the global feature configuration', async () => {
    const source = await seedLexus();
    const keys: CarFeatureKey[] = ['heatedSeats', 'parkingSensors'];
    await duplicateCar(source.id);
    // The source's list is still exactly what it was — duplication reads only.
    expect((await carsRepo.get(source.id))!.features).toEqual(keys);
  });
});
