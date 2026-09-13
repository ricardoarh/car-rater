import { zip, unzip, strToU8, strFromU8 } from 'fflate';
import { db, toFriendlyError } from '../db/database';
import { APP_VERSION } from '../constants/app';
import { CAR_FEATURE_KEYS } from '../constants/features';
import { RATING_KEYS } from '../constants/ratings';
import type {
  BackupFile,
  Car,
  CarFeatureKey,
  Photo,
  Ratings,
  Transmission,
} from '../types/models';
import { withDerivedScore } from './ratingService';
import { blobToUint8Array, bytesToBlob } from '../utils/blob';
import { processImage } from './photoService';
import { sanitiseCustomFeatures, sanitiseFeatures } from './featuresService';
import { sanitiseFeatureOrder, settingsRepo } from './settingsRepo';
import { newId } from '../utils/id';

export const BACKUP_FORMAT = 'car-rater-backup';

/**
 * Still 1, on purpose.
 *
 * v1.1 added three optional car fields (mileage, price, transmission) and v1.2
 * added two more (features, customFeatures). All are additive properties inside
 * the existing car objects, so:
 *   - a backup written before v1.1 imports fine, with the fields undefined;
 *   - a backup written by v1.1 still imports into v1.0, which simply ignores
 *     the properties it does not know about.
 *
 * v1.3 adds a top-level `settings` block holding the customised feature
 * checklist. Same reasoning: an older app ignores the key it does not know,
 * and a 1.3 app treats its absence as "this backup predates preferences".
 *
 * Bumping the number would have broken that second direction for no gain:
 * `validateBackupJson` rejects anything with a version above this constant, so
 * every v1.0 install in the wild would start refusing new backups.
 */
export const BACKUP_VERSION = 1;

export class InvalidBackupError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidBackupError';
  }
}

function extensionFor(type: string | undefined): string {
  if (type?.includes('webp')) return 'webp';
  if (type?.includes('png')) return 'png';
  return 'jpg';
}

function zipAsync(files: Record<string, Uint8Array>): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    zip(files, { level: 6 }, (err, data) => (err ? reject(err) : resolve(data)));
  });
}

function unzipAsync(data: Uint8Array): Promise<Record<string, Uint8Array>> {
  return new Promise((resolve, reject) => {
    unzip(data, (err, files) => (err ? reject(err) : resolve(files)));
  });
}

export function backupFileName(date = new Date()): string {
  const iso = date.toISOString().slice(0, 10);
  return `car-rater-backup-${iso}.zip`;
}

/** Build the JSON half of a backup (exported separately so tests can use it). */
export function buildBackupJson(
  cars: Car[],
  photos: Photo[],
  exportedAt = new Date(),
  activeFeatureOrder?: readonly CarFeatureKey[],
): { json: BackupFile; fileNames: Map<string, string> } {
  const fileNames = new Map<string, string>();
  const json: BackupFile = {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: exportedAt.toISOString(),
    appVersion: APP_VERSION,
    settings: activeFeatureOrder
      ? { activeFeatureOrder: [...activeFeatureOrder] }
      : undefined,
    cars,
    photos: photos.map((p) => {
      const file = `photos/${p.id}.${extensionFor(p.blob.type)}`;
      fileNames.set(p.id, file);
      return {
        id: p.id,
        carId: p.carId,
        file,
        width: p.width,
        height: p.height,
        caption: p.caption,
        order: p.order,
        createdAt: p.createdAt,
      };
    }),
  };
  return { json, fileNames };
}

/** Export everything — cars, ratings, metadata and the photo files — as a ZIP. */
export async function exportBackup(): Promise<{ blob: Blob; fileName: string }> {
  try {
    const cars = await db.cars.where('status').equals('saved').toArray();
    const carIds = new Set(cars.map((c) => c.id));
    const allPhotos = await db.photos.toArray();
    const photos = allPhotos.filter((p) => carIds.has(p.carId));

    const activeFeatureOrder = await settingsRepo.activeFeatureOrder();
    const { json, fileNames } = buildBackupJson(cars, photos, new Date(), activeFeatureOrder);

    const files: Record<string, Uint8Array> = {
      'cars.json': strToU8(JSON.stringify(json, null, 2)),
      'README.txt': strToU8(
        [
          'Car Rater backup',
          '',
          `Exported: ${json.exportedAt}`,
          `Cars: ${cars.length}`,
          `Photos: ${photos.length}`,
          '',
          'cars.json holds every car, rating, verdict and comment,',
          'plus your Manage Features checklist under "settings".',
          'The photos/ folder holds the image files referenced from cars.json.',
          'Restore it from Car Rater > More > Backup & Restore > Import Backup.',
        ].join('\n'),
      ),
    };

    for (const photo of photos) {
      const name = fileNames.get(photo.id);
      if (!name) continue;
      files[name] = await blobToUint8Array(photo.blob);
    }

    const zipped = await zipAsync(files);
    const blob = bytesToBlob(zipped, 'application/zip');
    return { blob, fileName: backupFileName() };
  } catch (error) {
    throw toFriendlyError(error);
  }
}

function isRatingsShape(value: unknown): value is Ratings {
  if (!value || typeof value !== 'object') return false;
  const r = value as Record<string, unknown>;
  return RATING_KEYS.every((k) => {
    const v = r[k];
    return v === null || v === undefined || (typeof v === 'number' && v >= 1 && v <= 5);
  });
}

/** Throws InvalidBackupError with a readable reason when the file is not ours. */
export function validateBackupJson(raw: unknown): BackupFile {
  if (!raw || typeof raw !== 'object') {
    throw new InvalidBackupError('That file does not contain Car Rater data.');
  }
  const data = raw as Partial<BackupFile>;
  if (data.format !== BACKUP_FORMAT) {
    throw new InvalidBackupError('That is not a Car Rater backup file.');
  }
  if (typeof data.version !== 'number' || data.version > BACKUP_VERSION) {
    throw new InvalidBackupError(
      'That backup was made by a newer version of Car Rater. Update the app first.',
    );
  }
  if (!Array.isArray(data.cars)) {
    throw new InvalidBackupError('The backup is missing its list of cars.');
  }
  for (const car of data.cars) {
    if (!car || typeof car !== 'object' || typeof car.id !== 'string') {
      throw new InvalidBackupError('The backup contains a car record we cannot read.');
    }
    if (!isRatingsShape(car.ratings)) {
      const name = `${car.make ?? ''} ${car.model ?? ''}`.trim() || 'one of the cars';
      throw new InvalidBackupError(`The ratings for ${name} look corrupted.`);
    }
  }
  if (data.photos !== undefined && !Array.isArray(data.photos)) {
    throw new InvalidBackupError('The photo index in the backup is damaged.');
  }
  // Preferences are advisory: a damaged or absent block never fails a restore,
  // it just means there is nothing to apply.
  const activeFeatureOrder = sanitiseFeatureOrder(
    (data.settings as { activeFeatureOrder?: unknown } | undefined)?.activeFeatureOrder,
  );
  return {
    ...(data as BackupFile),
    photos: data.photos ?? [],
    settings: activeFeatureOrder ? { activeFeatureOrder } : undefined,
  };
}

/** A whole, non-negative number, or undefined for anything else. */
function optionalWholeNumber(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return undefined;
  return Math.round(value);
}

function optionalTransmission(value: unknown): Transmission | undefined {
  return value === 'automatic' || value === 'manual' ? value : undefined;
}

/**
 * Fills in any fields an older or partial backup might not carry.
 *
 * Fields added after the backup was written are simply absent, which is not an
 * error — they come back as undefined. A value that is present but nonsense
 * (a negative mileage, a transmission or feature key we do not recognise) is
 * dropped rather than failing the whole restore.
 */
function normaliseCar(raw: Car): Car {
  const ratings: Ratings = { ...raw.ratings };
  for (const key of RATING_KEYS) {
    const v = ratings[key];
    ratings[key] = typeof v === 'number' ? v : null;
  }
  const base: Car = {
    ...raw,
    ratings,
    trim: raw.trim ?? '',
    notes: raw.notes ?? '',
    year: raw.year ?? null,
    powertrain: raw.powertrain ?? null,
    mileage: optionalWholeNumber(raw.mileage),
    price: optionalWholeNumber(raw.price),
    transmission: optionalTransmission(raw.transmission),
    features: sanitiseFeatures(raw.features),
    customFeatures: sanitiseCustomFeatures(raw.customFeatures),
    headachePotential: raw.headachePotential ?? 'unknown',
    euroNcapStars: raw.euroNcapStars ?? null,
    euroNcapYear: raw.euroNcapYear ?? null,
    dealbreaker: Boolean(raw.dealbreaker),
    dealbreakerReasons: Array.isArray(raw.dealbreakerReasons) ? raw.dealbreakerReasons : [],
    dealbreakerComment: raw.dealbreakerComment ?? '',
    verdict: raw.verdict ?? null,
    comments: raw.comments ?? '',
    coverPhotoId: raw.coverPhotoId ?? null,
    status: raw.status === 'draft' ? 'draft' : 'saved',
    createdAt: raw.createdAt ?? Date.now(),
    updatedAt: raw.updatedAt ?? Date.now(),
  };
  return withDerivedScore(base);
}

export interface ImportResult {
  carsImported: number;
  photosImported: number;
  photosMissing: number;
  mode: 'merge' | 'replace';
}

export type ImportMode = 'merge' | 'replace';

/**
 * Restore a backup. `merge` keeps what is already here (importing a car that
 * already exists gives it a fresh id), `replace` wipes first — the caller is
 * responsible for confirming that with the user.
 */
export async function importBackup(
  file: Blob,
  mode: ImportMode = 'merge',
): Promise<ImportResult> {
  let entries: Record<string, Uint8Array>;
  try {
    entries = await unzipAsync(await blobToUint8Array(file));
  } catch {
    throw new InvalidBackupError('That file is not a readable ZIP archive.');
  }

  const jsonKey = Object.keys(entries).find((k) => k.replace(/^.*\//, '') === 'cars.json');
  if (!jsonKey) {
    throw new InvalidBackupError('The backup does not contain a cars.json file.');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(strFromU8(entries[jsonKey]));
  } catch {
    throw new InvalidBackupError('The data file inside the backup is corrupted.');
  }

  const backup = validateBackupJson(parsed);
  const prefix = jsonKey.slice(0, jsonKey.length - 'cars.json'.length);

  // Everything is validated before a single row is touched.
  const existingIds = new Set((await db.cars.toArray()).map((c) => c.id));
  const idMap = new Map<string, string>();

  const carsToWrite: Car[] = backup.cars
    .filter((c) => c.status !== 'draft')
    .map((raw) => {
      const car = normaliseCar(raw);
      if (mode === 'merge' && existingIds.has(car.id)) {
        const fresh = newId();
        idMap.set(car.id, fresh);
        return { ...car, id: fresh };
      }
      idMap.set(car.id, car.id);
      return car;
    });

  const photosToWrite: Photo[] = [];
  let photosMissing = 0;
  const photoIdMap = new Map<string, string>();

  for (const entry of backup.photos) {
    const carId = idMap.get(entry.carId);
    if (!carId) continue;
    const bytes = entries[prefix + entry.file] ?? entries[entry.file];
    if (!bytes) {
      photosMissing += 1;
      continue;
    }
    const type = entry.file.endsWith('.webp')
      ? 'image/webp'
      : entry.file.endsWith('.png')
        ? 'image/png'
        : 'image/jpeg';
    const blob = bytesToBlob(bytes, type);
    let thumb = blob;
    try {
      thumb = (await processImage(blob, entry.file)).thumb;
    } catch {
      // A thumbnail we cannot regenerate just falls back to the full image.
    }
    const id = mode === 'merge' && idMap.get(entry.carId) !== entry.carId ? newId() : entry.id;
    photoIdMap.set(entry.id, id);
    photosToWrite.push({
      id,
      carId,
      blob,
      thumb,
      width: entry.width ?? 0,
      height: entry.height ?? 0,
      caption: entry.caption ?? '',
      order: entry.order ?? 0,
      createdAt: entry.createdAt ?? Date.now(),
    });
  }

  const finalCars = carsToWrite.map((car) => ({
    ...car,
    coverPhotoId: car.coverPhotoId ? (photoIdMap.get(car.coverPhotoId) ?? null) : null,
  }));

  try {
    await db.transaction('rw', db.cars, db.photos, async () => {
      if (mode === 'replace') {
        await db.photos.clear();
        await db.cars.clear();
      }
      await db.cars.bulkPut(finalCars);
      if (photosToWrite.length > 0) await db.photos.bulkPut(photosToWrite);
    });

    /*
     * Feature preferences follow the mode, and only the mode.
     *
     * `replace` means "make this device match the backup", so the backup's
     * checklist wins — and a backup written before 1.3 carries none, which
     * describes a device on the default checklist, so that is what it becomes.
     *
     * `merge` means "add these cars to what I already have". The person is
     * sitting in front of a checklist they arranged; silently rearranging it
     * because an old ZIP disagreed would be a surprise, so the device keeps
     * what it has. Nothing is lost either way: a merged car that carries a
     * feature this device no longer lists simply shows it as a retired
     * selection on its profile.
     *
     * Kept outside the transaction above on purpose — `settings` is not one of
     * its tables, and a preference that failed to apply must never roll back a
     * restore of the cars and photos, which is the part that matters.
     */
    if (mode === 'replace') {
      await settingsRepo.setActiveFeatureOrder(
        backup.settings?.activeFeatureOrder ?? [...CAR_FEATURE_KEYS],
      );
    }
  } catch (error) {
    throw toFriendlyError(error);
  }

  return {
    carsImported: finalCars.length,
    photosImported: photosToWrite.length,
    photosMissing,
    mode,
  };
}

/** Kick off a browser download for a generated backup. */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
