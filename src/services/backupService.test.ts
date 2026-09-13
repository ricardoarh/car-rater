import { describe, expect, it, vi } from 'vitest';
import { zipSync, unzipSync, strToU8, strFromU8 } from 'fflate';
import {
  BACKUP_FORMAT,
  InvalidBackupError,
  backupFileName,
  buildBackupJson,
  exportBackup,
  importBackup,
  validateBackupJson,
} from './backupService';
import { carsRepo } from './carsRepo';
import { db } from '../db/database';
import { CAR_FEATURE_KEYS } from '../constants/features';
import { settingsRepo } from './settingsRepo';
import { retiredCarFeatures } from './featuresService';
import { duplicateCar } from './duplicateService';
import type { BackupFile, Car, Photo } from '../types/models';

// The real thumbnail regeneration needs a canvas; jsdom has none.
vi.mock('./photoService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./photoService')>();
  return {
    ...actual,
    processImage: vi.fn(async (blob: Blob) => ({
      blob,
      thumb: blob,
      width: 100,
      height: 75,
    })),
  };
});

async function seedCar(model: string) {
  const car = await carsRepo.create({ make: 'Lexus', model, trim: 'Premium Plus' }, 'saved');
  await carsRepo.setRating(car.id, 'cuteness', 5);
  await carsRepo.setRating(car.id, 'rioApproved', 5);
  await carsRepo.update(car.id, {
    verdict: 'yes',
    headachePotential: 'low',
    euroNcapStars: 5,
    euroNcapYear: 2024,
    comments: 'Way nicer inside than expected.',
  });
  return car.id;
}

async function addPhoto(carId: string, id = 'photo-1'): Promise<Photo> {
  const photo: Photo = {
    id,
    carId,
    blob: new Blob([new Uint8Array([1, 2, 3, 4])], { type: 'image/jpeg' }),
    thumb: new Blob([new Uint8Array([1, 2])], { type: 'image/jpeg' }),
    width: 1600,
    height: 1200,
    caption: 'Boot for Rio',
    order: 0,
    createdAt: Date.now(),
  };
  await db.photos.add(photo);
  await db.cars.update(carId, { coverPhotoId: id });
  return photo;
}

describe('backup file naming', () => {
  it('uses a dated name', () => {
    expect(backupFileName(new Date('2026-09-13T10:00:00Z'))).toBe(
      'car-rater-backup-2026-09-13.zip',
    );
  });
});

describe('buildBackupJson', () => {
  it('produces a valid export payload with photo file references', async () => {
    const carId = await seedCar('LBX');
    const car = (await carsRepo.get(carId))!;
    const photo = await addPhoto(carId);
    const { json } = buildBackupJson([car], [photo]);

    expect(json.format).toBe(BACKUP_FORMAT);
    expect(json.version).toBe(1);
    expect(json.cars).toHaveLength(1);
    expect(json.cars[0].overallScore).toBe(5);
    expect(json.photos[0].file).toBe('photos/photo-1.jpg');
    expect(json.photos[0].caption).toBe('Boot for Rio');
    expect(() => validateBackupJson(json)).not.toThrow();
  });
});

describe('validateBackupJson', () => {
  it('rejects a file that is not a Car Rater backup', () => {
    expect(() => validateBackupJson({ hello: 'world' })).toThrow(InvalidBackupError);
    expect(() => validateBackupJson(null)).toThrow(InvalidBackupError);
    expect(() => validateBackupJson('nope')).toThrow(InvalidBackupError);
  });

  it('rejects a backup from a newer version of the app', () => {
    expect(() =>
      validateBackupJson({ format: BACKUP_FORMAT, version: 99, cars: [] }),
    ).toThrow(/newer version/i);
  });

  it('rejects a backup with corrupted ratings', () => {
    expect(() =>
      validateBackupJson({
        format: BACKUP_FORMAT,
        version: 1,
        cars: [{ id: 'a', make: 'Lexus', model: 'LBX', ratings: { cuteness: 99 } }],
      }),
    ).toThrow(/corrupted/i);
  });

  it('accepts a backup with no photos array', () => {
    const result = validateBackupJson({ format: BACKUP_FORMAT, version: 1, cars: [] });
    expect(result.photos).toEqual([]);
  });
});

describe('backwards and forwards compatibility', () => {
  it('exports the new fields when a car has them', async () => {
    const carId = await seedCar('LBX');
    await carsRepo.update(carId, {
      mileage: 12500,
      price: 16995,
      transmission: 'automatic',
    });
    const car = (await carsRepo.get(carId))!;
    const { json } = buildBackupJson([car], []);
    expect(json.cars[0].mileage).toBe(12500);
    expect(json.cars[0].price).toBe(16995);
    expect(json.cars[0].transmission).toBe('automatic');
  });

  it('round-trips the new fields through a real ZIP', async () => {
    const carId = await seedCar('LBX');
    await carsRepo.update(carId, {
      mileage: 42000,
      price: 22500,
      transmission: 'manual',
    });
    const { blob } = await exportBackup();
    await carsRepo.clearAll();
    await importBackup(blob, 'merge');

    const restored = (await carsRepo.all())[0];
    expect(restored.mileage).toBe(42000);
    expect(restored.price).toBe(22500);
    expect(restored.transmission).toBe('manual');
  });

  it('imports a pre-v1.1 backup that has no mileage, price or transmission', async () => {
    const carId = await seedCar('LBX');
    const car = (await carsRepo.get(carId))!;
    // Build exactly what the previous release wrote: the new keys absent.
    const legacy = { ...car } as Record<string, unknown>;
    delete legacy.mileage;
    delete legacy.price;
    delete legacy.transmission;
    const { json } = buildBackupJson([legacy as unknown as Car], []);

    expect(() => validateBackupJson(json)).not.toThrow();

    const zipped = zipSync({ 'cars.json': strToU8(JSON.stringify(json)) });
    await carsRepo.clearAll();
    const result = await importBackup(
      new Blob([new Uint8Array(zipped)], { type: 'application/zip' }),
      'merge',
    );

    expect(result.carsImported).toBe(1);
    const restored = (await carsRepo.all())[0];
    expect(restored.model).toBe('LBX');
    expect(restored.overallScore).toBe(5);
    expect(restored.verdict).toBe('yes');
    expect(restored.comments).toBe('Way nicer inside than expected.');
    expect(restored.mileage).toBeUndefined();
    expect(restored.price).toBeUndefined();
    expect(restored.transmission).toBeUndefined();
  });

  it('a missing optional new field is never a validation failure', () => {
    expect(() =>
      validateBackupJson({
        format: BACKUP_FORMAT,
        version: 1,
        cars: [
          {
            id: 'old',
            make: 'Lexus',
            model: 'LBX',
            ratings: { cuteness: 4 },
          },
        ],
      }),
    ).not.toThrow();
  });

  it('drops a nonsensical stored value rather than failing the whole restore', async () => {
    const carId = await seedCar('LBX');
    const car = (await carsRepo.get(carId))!;
    const corrupted = {
      ...car,
      mileage: -500,
      price: Number.NaN,
      transmission: 'cvt',
    } as unknown as Car;
    const { json } = buildBackupJson([corrupted], []);
    const zipped = zipSync({ 'cars.json': strToU8(JSON.stringify(json)) });
    await carsRepo.clearAll();

    const result = await importBackup(
      new Blob([new Uint8Array(zipped)], { type: 'application/zip' }),
      'merge',
    );
    expect(result.carsImported).toBe(1);
    const restored = (await carsRepo.all())[0];
    expect(restored.mileage).toBeUndefined();
    expect(restored.price).toBeUndefined();
    expect(restored.transmission).toBeUndefined();
    // The rest of the car still arrived.
    expect(restored.model).toBe('LBX');
  });

  it('exports and restores built-in and custom features', async () => {
    const carId = await seedCar('LBX');
    await carsRepo.toggleFeature(carId, 'heatedSeats');
    await carsRepo.toggleFeature(carId, 'parkingSensors');
    await carsRepo.addCustomFeature(carId, 'Panoramic Roof');

    const car = (await carsRepo.get(carId))!;
    const { json } = buildBackupJson([car], []);
    expect(json.cars[0].features).toEqual(['heatedSeats', 'parkingSensors']);
    expect(json.cars[0].customFeatures).toEqual(['Panoramic Roof']);

    const { blob } = await exportBackup();
    await carsRepo.clearAll();
    await importBackup(blob, 'merge');

    const restored = (await carsRepo.all())[0];
    expect(restored.features).toEqual(['heatedSeats', 'parkingSensors']);
    expect(restored.customFeatures).toEqual(['Panoramic Roof']);
  });

  it('imports a backup written before features existed', async () => {
    const carId = await seedCar('LBX');
    const car = (await carsRepo.get(carId))!;
    const legacy = { ...car } as Record<string, unknown>;
    delete legacy.features;
    delete legacy.customFeatures;
    const { json } = buildBackupJson([legacy as unknown as Car], []);

    expect(() => validateBackupJson(json)).not.toThrow();

    const zipped = zipSync({ 'cars.json': strToU8(JSON.stringify(json)) });
    await carsRepo.clearAll();
    const result = await importBackup(
      new Blob([new Uint8Array(zipped)], { type: 'application/zip' }),
      'merge',
    );

    expect(result.carsImported).toBe(1);
    const restored = (await carsRepo.all())[0];
    expect(restored.features).toBeUndefined();
    expect(restored.customFeatures).toBeUndefined();
    // Everything else still arrived.
    expect(restored.overallScore).toBe(5);
    expect(restored.verdict).toBe('yes');
    expect(restored.comments).toBe('Way nicer inside than expected.');
  });

  it('a backup with no feature fields passes validation', () => {
    expect(() =>
      validateBackupJson({
        format: BACKUP_FORMAT,
        version: 1,
        cars: [{ id: 'old', make: 'Lexus', model: 'LBX', ratings: { cuteness: 4 } }],
      }),
    ).not.toThrow();
  });

  it('drops feature keys it does not recognise instead of failing', async () => {
    const carId = await seedCar('LBX');
    const car = (await carsRepo.get(carId))!;
    const corrupted = {
      ...car,
      features: ['heatedSeats', 'teleporter', null],
      customFeatures: ['Premium Sound', 99],
    } as unknown as Car;
    const { json } = buildBackupJson([corrupted], []);
    const zipped = zipSync({ 'cars.json': strToU8(JSON.stringify(json)) });
    await carsRepo.clearAll();

    const result = await importBackup(
      new Blob([new Uint8Array(zipped)], { type: 'application/zip' }),
      'merge',
    );
    expect(result.carsImported).toBe(1);
    const restored = (await carsRepo.all())[0];
    expect(restored.features).toEqual(['heatedSeats']);
    expect(restored.customFeatures).toEqual(['Premium Sound']);
  });

  it('keeps a legacy trim value through an export and restore', async () => {
    const carId = await seedCar('LBX');
    expect((await carsRepo.get(carId))!.trim).toBe('Premium Plus');
    const { blob } = await exportBackup();
    await carsRepo.clearAll();
    await importBackup(blob, 'merge');
    expect((await carsRepo.all())[0].trim).toBe('Premium Plus');
  });
});

describe('export then import round trip', () => {
  it('restores cars and photos from a real ZIP', async () => {
    const carId = await seedCar('LBX');
    await addPhoto(carId);

    const { blob, fileName } = await exportBackup();
    expect(fileName).toMatch(/^car-rater-backup-\d{4}-\d{2}-\d{2}\.zip$/);
    expect(blob.type).toBe('application/zip');

    await carsRepo.clearAll();
    expect(await carsRepo.all()).toHaveLength(0);

    const result = await importBackup(blob, 'merge');
    expect(result.carsImported).toBe(1);
    expect(result.photosImported).toBe(1);
    expect(result.photosMissing).toBe(0);

    const cars = await carsRepo.all();
    expect(cars[0].model).toBe('LBX');
    expect(cars[0].comments).toBe('Way nicer inside than expected.');
    expect(cars[0].euroNcapStars).toBe(5);
    expect(cars[0].verdict).toBe('yes');

    const photos = await db.photos.toArray();
    expect(photos).toHaveLength(1);
    expect(photos[0].caption).toBe('Boot for Rio');
    expect(cars[0].coverPhotoId).toBe(photos[0].id);
  });

  it('merge keeps existing cars and never overwrites them', async () => {
    const carId = await seedCar('LBX');
    await addPhoto(carId);
    const { blob } = await exportBackup();

    const result = await importBackup(blob, 'merge');
    expect(result.mode).toBe('merge');
    const cars = await carsRepo.all();
    expect(cars).toHaveLength(2);
    expect(cars.filter((c) => c.model === 'LBX')).toHaveLength(2);
    // The duplicate was given a fresh id rather than clobbering the original.
    expect(new Set(cars.map((c) => c.id)).size).toBe(2);
  });

  it('replace wipes first', async () => {
    const carId = await seedCar('LBX');
    await addPhoto(carId);
    const { blob } = await exportBackup();
    await seedCar('UX');
    expect(await carsRepo.all()).toHaveLength(2);

    await importBackup(blob, 'replace');
    const cars = await carsRepo.all();
    expect(cars).toHaveLength(1);
    expect(cars[0].model).toBe('LBX');
  });

  it('reports missing photo files without failing the restore', async () => {
    const carId = await seedCar('LBX');
    const car = (await carsRepo.get(carId))!;
    const photo = await addPhoto(carId);
    const { json } = buildBackupJson([car], [photo]);
    // Build a ZIP that references the photo but omits the file itself.
    const zipped = zipSync({ 'cars.json': strToU8(JSON.stringify(json)) });
    const blob = new Blob([new Uint8Array(zipped)], { type: 'application/zip' });

    await carsRepo.clearAll();
    const result = await importBackup(blob, 'merge');
    expect(result.carsImported).toBe(1);
    expect(result.photosImported).toBe(0);
    expect(result.photosMissing).toBe(1);
    // A car whose cover photo did not survive still loads.
    expect((await carsRepo.all())[0].coverPhotoId).toBeNull();
  });

  it('rejects a file that is not a ZIP', async () => {
    const junk = new Blob(['this is definitely not a zip file']);
    await expect(importBackup(junk)).rejects.toThrow(InvalidBackupError);
  });

  it('rejects a ZIP with no cars.json', async () => {
    const zipped = zipSync({ 'notes.txt': strToU8('hello') });
    const blob = new Blob([new Uint8Array(zipped)]);
    await expect(importBackup(blob)).rejects.toThrow(/cars\.json/);
  });

  it('rejects a ZIP whose cars.json is corrupted', async () => {
    const zipped = zipSync({ 'cars.json': strToU8('{ not json at all') });
    const blob = new Blob([new Uint8Array(zipped)]);
    await expect(importBackup(blob)).rejects.toThrow(/corrupted/i);
  });

  it('leaves existing data untouched when the backup is invalid', async () => {
    await seedCar('LBX');
    const junk = new Blob(['nope']);
    await expect(importBackup(junk, 'replace')).rejects.toThrow();
    expect(await carsRepo.all()).toHaveLength(1);
  });

  it('does not export drafts', async () => {
    await seedCar('LBX');
    await carsRepo.create({ make: 'Draft', model: 'Car' });
    const { blob } = await exportBackup();
    await carsRepo.clearAll();
    const result = await importBackup(blob);
    expect(result.carsImported).toBe(1);
  });
});

describe('feature preferences in a backup', () => {
  const [first, second, third] = CAR_FEATURE_KEYS;

  it('exports the active checklist alongside the cars', async () => {
    await seedCar('LBX');
    await settingsRepo.removeFeature(second);
    await settingsRepo.moveFeatureBefore(third, first);

    const { blob } = await exportBackup();
    const files = unzipSync(new Uint8Array(await blob.arrayBuffer()));
    const json = JSON.parse(strFromU8(files['cars.json'])) as BackupFile;

    expect(json.settings?.activeFeatureOrder).toEqual(
      await settingsRepo.activeFeatureOrder(),
    );
    expect(json.settings?.activeFeatureOrder).not.toContain(second);
    // Still format version 1 — the block is additive, older apps ignore it.
    expect(json.version).toBe(1);
  });

  it('a default device exports the shipped list rather than nothing', async () => {
    await seedCar('LBX');
    const { blob } = await exportBackup();
    const files = unzipSync(new Uint8Array(await blob.arrayBuffer()));
    const json = JSON.parse(strFromU8(files['cars.json'])) as BackupFile;
    expect(json.settings?.activeFeatureOrder).toEqual([...CAR_FEATURE_KEYS]);
  });

  it('a damaged settings block never fails the restore', () => {
    const valid = validateBackupJson({
      format: BACKUP_FORMAT,
      version: 1,
      cars: [],
      photos: [],
      settings: { activeFeatureOrder: 'not an array' },
    });
    expect(valid.settings).toBeUndefined();
  });

  it('replace applies the backup’s checklist to this device', async () => {
    await seedCar('LBX');
    await settingsRepo.removeFeature(second);
    const exported = await exportBackup();

    // Somebody else's device, arranged differently.
    await settingsRepo.restoreDefaultFeatures();
    await settingsRepo.removeFeature(first);

    await importBackup(exported.blob, 'replace');

    const order = await settingsRepo.activeFeatureOrder();
    expect(order).toContain(first);
    expect(order).not.toContain(second);
  });

  it('merge keeps the checklist the person is looking at', async () => {
    await seedCar('LBX');
    await settingsRepo.removeFeature(second);
    const exported = await exportBackup();

    await settingsRepo.restoreDefaultFeatures();
    await settingsRepo.removeFeature(first);
    const before = await settingsRepo.activeFeatureOrder();

    await importBackup(exported.blob, 'merge');

    expect(await settingsRepo.activeFeatureOrder()).toEqual(before);
  });

  it('a merged car keeps a feature this device no longer lists', async () => {
    const carId = await seedCar('LBX');
    await carsRepo.toggleFeature(carId, second);
    const exported = await exportBackup();

    await db.cars.clear();
    await settingsRepo.removeFeature(second);
    await importBackup(exported.blob, 'merge');

    const restored = (await db.cars.toArray())[0];
    expect(restored.features).toContain(second);
    expect(
      retiredCarFeatures(restored, await settingsRepo.activeFeatureOrder()),
    ).toContain(second);
  });

  it('restoring a pre-1.3 backup by replace falls back to the defaults', async () => {
    await settingsRepo.removeFeature(first);

    // A 1.2 backup: same format version, no settings block at all.
    const legacy = zipSync({
      'cars.json': strToU8(
        JSON.stringify({
          format: BACKUP_FORMAT,
          version: 1,
          exportedAt: new Date().toISOString(),
          appVersion: '1.2.0',
          cars: [],
          photos: [],
        }),
      ),
    });

    await importBackup(new Blob([legacy]), 'replace');
    expect(await settingsRepo.activeFeatureOrder()).toEqual([...CAR_FEATURE_KEYS]);
  });

  it('restoring a pre-1.3 backup by merge leaves preferences alone', async () => {
    await settingsRepo.removeFeature(first);
    const before = await settingsRepo.activeFeatureOrder();

    const legacy = zipSync({
      'cars.json': strToU8(
        JSON.stringify({
          format: BACKUP_FORMAT,
          version: 1,
          exportedAt: new Date().toISOString(),
          appVersion: '1.2.0',
          cars: [],
          photos: [],
        }),
      ),
    });

    await importBackup(new Blob([legacy]), 'merge');
    expect(await settingsRepo.activeFeatureOrder()).toEqual(before);
  });
});

describe('a duplicated car in a backup', () => {
  it('exports and restores as two fully independent cars, photos and all', async () => {
    const sourceId = await seedCar('LBX');
    await carsRepo.update(sourceId, { year: 2024, mileage: 12_500, price: 16_995 });
    await carsRepo.toggleFeature(sourceId, 'heatedSeats');
    await addPhoto(sourceId, 'photo-1');
    await addPhoto(sourceId, 'photo-2');
    await db.photos.update('photo-2', { order: 1, caption: 'Boot for Rio' });
    await carsRepo.update(sourceId, { coverPhotoId: 'photo-2' });

    const copy = await duplicateCar(sourceId, {
      mileage: true,
      price: true,
      photos: true,
      comments: true,
      verdict: true,
    });

    const exported = await exportBackup();
    await carsRepo.clearAll();
    expect(await db.cars.count()).toBe(0);

    await importBackup(exported.blob, 'merge');

    const restored = await db.cars.toArray();
    expect(restored).toHaveLength(2);
    // Both kept their own ids — a duplicate is just another car to the backup.
    expect(new Set(restored.map((c) => c.id))).toEqual(new Set([sourceId, copy.id]));

    const restoredSource = restored.find((c) => c.id === sourceId)!;
    const restoredCopy = restored.find((c) => c.id === copy.id)!;
    expect(restoredCopy.make).toBe(restoredSource.make);
    expect(restoredCopy.model).toBe(restoredSource.model);
    expect(restoredCopy.overallScore).toBe(restoredSource.overallScore);

    const sourcePhotos = await db.photos.where('carId').equals(sourceId).toArray();
    const copyPhotos = await db.photos.where('carId').equals(copy.id).toArray();
    expect(sourcePhotos).toHaveLength(2);
    expect(copyPhotos).toHaveLength(2);

    // Not one photo id is shared between them after the round trip.
    const sourceIds = new Set(sourcePhotos.map((p) => p.id));
    expect(copyPhotos.every((p) => !sourceIds.has(p.id))).toBe(true);

    // And each car's cover still points inside its own set.
    expect(sourceIds.has(restoredSource.coverPhotoId!)).toBe(true);
    expect(copyPhotos.some((p) => p.id === restoredCopy.coverPhotoId)).toBe(true);

    // Deleting one car's photo leaves the other's alone.
    await db.photos.delete(copyPhotos[0].id);
    expect(await db.photos.where('carId').equals(sourceId).count()).toBe(2);
  });

  it('adds nothing duplicate-specific to the backup format', async () => {
    const sourceId = await seedCar('LBX');
    const copy = await duplicateCar(sourceId);

    const { blob } = await exportBackup();
    const files = unzipSync(new Uint8Array(await blob.arrayBuffer()));
    const json = JSON.parse(strFromU8(files['cars.json'])) as BackupFile;

    expect(json.version).toBe(1);
    const exportedCopy = json.cars.find((c) => c.id === copy.id)!;
    const exportedSource = json.cars.find((c) => c.id === sourceId)!;
    // Same shape as any other car — no marker, no provenance field.
    expect(Object.keys(exportedCopy).sort()).toEqual(Object.keys(exportedSource).sort());
    expect(JSON.stringify(json)).not.toMatch(/duplicat|clone|copyOf/i);
  });
});
