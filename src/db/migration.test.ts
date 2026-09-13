import Dexie from 'dexie';
import { describe, expect, it } from 'vitest';
import { CarRaterDB, db } from './database';
import { carsRepo } from '../services/carsRepo';
import { emptyRatings } from '../services/ratingService';
import {
  activeCarFeatures,
  carCustomFeatures,
  carFeatures,
  featureCount,
  formatFeatureCount,
  retiredCarFeatures,
} from '../services/featuresService';
import { settingsRepo } from '../services/settingsRepo';
import { CAR_FEATURE_KEYS } from '../constants/features';
import type { Car, Photo } from '../types/models';

/**
 * The exact stores string shipped by v1.0.0, kept here verbatim so this test
 * keeps meaning something even if the live schema later changes.
 */
const V1_STORES = {
  cars: 'id, createdAt, updatedAt, status, overallScore, verdict, make, model',
  photos: 'id, carId, order, createdAt',
};

/** A car record exactly as v1.0.0 wrote it: no mileage, price or transmission. */
function legacyCarRecord(): Record<string, unknown> {
  return {
    id: 'legacy-lexus',
    createdAt: 1_700_000_000_000,
    updatedAt: 1_700_000_000_000,
    make: 'Lexus',
    model: 'LBX',
    trim: 'Premium Plus',
    year: 2024,
    powertrain: 'hybrid',
    notes: 'Seen at the Reading dealership',
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
    dealbreaker: false,
    dealbreakerReasons: [],
    dealbreakerComment: '',
    verdict: 'yes',
    comments: 'Way nicer inside than expected.\nRio should fit easily in the back.',
    coverPhotoId: 'legacy-photo',
    status: 'saved',
  };
}

function legacyPhotoRecord(): Record<string, unknown> {
  return {
    id: 'legacy-photo',
    carId: 'legacy-lexus',
    blob: new Blob([new Uint8Array([1, 2, 3, 4, 5])], { type: 'image/webp' }),
    thumb: new Blob([new Uint8Array([1, 2])], { type: 'image/webp' }),
    width: 1800,
    height: 1200,
    caption: 'Boot for Rio',
    order: 0,
    createdAt: 1_700_000_000_000,
  };
}

/**
 * Writes the records through a *separate* Dexie instance declaring only the
 * v1 schema — i.e. genuinely as the previous release would have — then closes
 * it so the current app has to open the same database afresh.
 */
async function seedLegacyDatabase() {
  const legacy = new Dexie('car-rater');
  legacy.version(1).stores(V1_STORES);
  await legacy.open();
  await legacy.table('cars').put(legacyCarRecord());
  await legacy.table('photos').put(legacyPhotoRecord());
  legacy.close();
}

describe('upgrading a database written by v1.0.0', () => {
  it('is at schema version 2 — only the new settings store needed one', () => {
    const fresh = new CarRaterDB('schema-probe');
    expect(fresh.verno).toBe(2);
    // v2 adds a table; it must not have disturbed the two that were there.
    expect(fresh.tables.map((t) => t.name).sort()).toEqual(['cars', 'photos', 'settings']);
    const carsIndexes = fresh.table('cars').schema.indexes.map((i) => i.name).sort();
    expect(carsIndexes).toEqual(
      ['createdAt', 'make', 'model', 'overallScore', 'status', 'updatedAt', 'verdict'].sort(),
    );
    // Nothing added for mileage/price/transmission.
    expect(carsIndexes).not.toContain('mileage');
    expect(carsIndexes).not.toContain('price');
    expect(carsIndexes).not.toContain('transmission');
    // Nor for the v1.2 feature lists — nothing queries them.
    expect(carsIndexes).not.toContain('features');
    expect(carsIndexes).not.toContain('customFeatures');
    // The cars store keeps its exact v1 primary key through the v2 upgrade.
    expect(fresh.table('cars').schema.primKey.keyPath).toBe('id');
    expect(fresh.table('photos').schema.indexes.map((i) => i.name).sort()).toEqual(
      ['carId', 'createdAt', 'order'].sort(),
    );
    fresh.close();
  });

  it('reads a legacy car back intact, with the new fields undefined', async () => {
    db.close();
    await seedLegacyDatabase();
    await db.open();

    const car = await carsRepo.get('legacy-lexus');
    expect(car).toBeDefined();

    // Everything the user had before is still there, byte for byte.
    expect(car!.make).toBe('Lexus');
    expect(car!.model).toBe('LBX');
    expect(car!.year).toBe(2024);
    expect(car!.powertrain).toBe('hybrid');
    expect(car!.ratings).toEqual({
      cuteness: 5,
      comfyness: 5,
      techonologia: 4,
      vroomFactor: 3,
      rioApproved: 5,
      unexpectedFactor: 4,
      value: 4,
    });
    expect(car!.overallScore).toBe(4.3);
    expect(car!.verdict).toBe('yes');
    expect(car!.comments).toContain('Rio should fit easily in the back.');
    expect(car!.headachePotential).toBe('low');
    expect(car!.euroNcapStars).toBe(5);
    expect(car!.euroNcapYear).toBe(2024);
    expect(car!.status).toBe('saved');
    expect(car!.createdAt).toBe(1_700_000_000_000);

    // The retired field is preserved, not wiped.
    expect(car!.trim).toBe('Premium Plus');

    // And the fields introduced afterwards are simply absent.
    expect(car!.mileage).toBeUndefined();
    expect(car!.price).toBeUndefined();
    expect(car!.transmission).toBeUndefined();
    expect(car!.features).toBeUndefined();
    expect(car!.customFeatures).toBeUndefined();
  });

  it('a legacy car reads as having no features rather than crashing', async () => {
    db.close();
    await seedLegacyDatabase();
    await db.open();

    const car = (await carsRepo.get('legacy-lexus'))!;
    expect(carFeatures(car)).toEqual([]);
    expect(carCustomFeatures(car)).toEqual([]);
    expect(featureCount(car)).toBe(0);
    expect(formatFeatureCount(car, CAR_FEATURE_KEYS)).toBeNull();
  });

  it('keeps legacy photos, including the blobs and the cover link', async () => {
    db.close();
    await seedLegacyDatabase();
    await db.open();

    const photos = await db.photos.where('carId').equals('legacy-lexus').toArray();
    expect(photos).toHaveLength(1);
    expect(photos[0].caption).toBe('Boot for Rio');
    expect(photos[0].blob.size).toBe(5);
    expect(photos[0].thumb.size).toBe(2);

    const car = await carsRepo.get('legacy-lexus');
    expect(car!.coverPhotoId).toBe('legacy-photo');
  });

  it('survives a legacy draft', async () => {
    db.close();
    const legacy = new Dexie('car-rater');
    legacy.version(1).stores(V1_STORES);
    await legacy.open();
    await legacy.table('cars').put({
      ...legacyCarRecord(),
      id: 'legacy-draft',
      status: 'draft',
      coverPhotoId: null,
    });
    legacy.close();
    await db.open();

    const draft = await carsRepo.latestDraft();
    expect(draft?.id).toBe('legacy-draft');
    expect(draft?.comments).toContain('Way nicer inside');
    expect(draft?.mileage).toBeUndefined();
  });

  it('lets a legacy car take on the new fields without losing anything', async () => {
    db.close();
    await seedLegacyDatabase();
    await db.open();

    await carsRepo.update('legacy-lexus', {
      mileage: 12500,
      price: 16995,
      transmission: 'automatic',
    });

    await carsRepo.toggleFeature('legacy-lexus', 'heatedSeats');
    await carsRepo.addCustomFeature('legacy-lexus', 'Panoramic Roof');

    const car = (await carsRepo.get('legacy-lexus')) as Car;
    expect(car.mileage).toBe(12500);
    expect(car.price).toBe(16995);
    expect(car.transmission).toBe('automatic');
    expect(car.features).toEqual(['heatedSeats']);
    expect(car.customFeatures).toEqual(['Panoramic Roof']);

    // The original data is untouched.
    expect(car.overallScore).toBe(4.3);
    expect(car.verdict).toBe('yes');
    expect(car.comments).toContain('Rio should fit easily in the back.');
    expect(car.trim).toBe('Premium Plus');
    expect(car.createdAt).toBe(1_700_000_000_000);

    const photos: Photo[] = await db.photos.where('carId').equals('legacy-lexus').toArray();
    expect(photos).toHaveLength(1);
  });

  it('a car created today still matches the legacy shape for every old field', async () => {
    const created = await carsRepo.create({ make: 'Mini', model: 'Cooper' });
    const legacyKeys = Object.keys(legacyCarRecord());
    for (const key of legacyKeys) {
      expect(created).toHaveProperty(key);
    }
    expect(created.ratings).toEqual(emptyRatings());
  });
});

/**
 * A database exactly as v1.2.0 left it: schema version 1, two stores, and cars
 * that already carry feature selections. v1.3 adds the `settings` store, which
 * is the first change in the app's life that genuinely needs a version bump.
 */
async function seedV12Database() {
  const legacy = new Dexie('car-rater');
  legacy.version(1).stores(V1_STORES);
  await legacy.open();
  await legacy.table('cars').put({
    ...legacyCarRecord(),
    mileage: 12_500,
    price: 16_995,
    transmission: 'automatic',
    features: ['heatedSeats', 'digitalDash', 'climateControl'],
    customFeatures: ['Panoramic Roof'],
  });
  await legacy.table('photos').put(legacyPhotoRecord());
  legacy.close();
}

describe('upgrading a database written by v1.2.0', () => {
  it('adds the settings store without disturbing cars or photos', async () => {
    db.close();
    await seedV12Database();
    await db.open();

    expect(db.verno).toBe(2);

    const car = (await carsRepo.get('legacy-lexus')) as Car;
    expect(car.id).toBe('legacy-lexus');
    expect(car.createdAt).toBe(1_700_000_000_000);
    expect(car.overallScore).toBe(4.3);
    expect(car.trim).toBe('Premium Plus');
    expect(car.mileage).toBe(12_500);
    expect(car.price).toBe(16_995);
    expect(car.transmission).toBe('automatic');
    expect(car.features).toEqual(['heatedSeats', 'digitalDash', 'climateControl']);
    expect(car.customFeatures).toEqual(['Panoramic Roof']);

    const photos = await db.photos.where('carId').equals('legacy-lexus').toArray();
    expect(photos).toHaveLength(1);
    expect(photos[0].blob.size).toBe(5);
  });

  it('starts with an empty settings store, which reads as the default checklist', async () => {
    db.close();
    await seedV12Database();
    await db.open();

    expect(await db.settings.count()).toBe(0);
    expect(await settingsRepo.activeFeatureOrder()).toEqual([...CAR_FEATURE_KEYS]);
    expect(formatFeatureCount(await carsRepo.get('legacy-lexus'), CAR_FEATURE_KEYS)).toBe(
      '3/9 features',
    );
  });

  it('removing a feature afterwards retires it on the car instead of erasing it', async () => {
    db.close();
    await seedV12Database();
    await db.open();

    await settingsRepo.removeFeature('digitalDash');
    await settingsRepo.removeFeature('climateControl');
    const active = await settingsRepo.activeFeatureOrder();

    const car = (await carsRepo.get('legacy-lexus')) as Car;
    // The stored record is byte-for-byte what it was.
    expect(car.features).toEqual(['heatedSeats', 'digitalDash', 'climateControl']);
    // It is simply presented differently.
    expect(activeCarFeatures(car, active)).toEqual(['heatedSeats']);
    expect(retiredCarFeatures(car, active)).toEqual(['digitalDash', 'climateControl']);
    expect(formatFeatureCount(car, active)).toBe('1/7 features');
  });
});
