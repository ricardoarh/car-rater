import { db, isQuotaError, QuotaExceededError, toFriendlyError } from '../db/database';
import type { Car, Photo } from '../types/models';
import { withDerivedScore } from './ratingService';
import { listPhotos } from './photoService';
import { blobToUint8Array, bytesToBlob } from '../utils/blob';
import { newId } from '../utils/id';

/**
 * Duplicate Car (v1.4).
 *
 * "I've found another one of these" — the user is looking at a second example
 * of the same make and model and wants the spec-level judgements they have
 * already made, without retyping them.
 *
 * That framing decides what copies. Anything true of the MODEL comes across;
 * anything true of THIS PARTICULAR CAR or of that one viewing does not, unless
 * the user explicitly asks for it. So the ratings, the features and the safety
 * figures copy, while the mileage, the price, the photos, what was written down
 * on the day and the verdict all start clean.
 */

/** The opt-in extras. Everything here defaults to false. */
export interface DuplicateOptions {
  mileage: boolean;
  price: boolean;
  photos: boolean;
  /** Comments *and* the older free-text notes — both are "that viewing". */
  comments: boolean;
  /** The verdict and the dealbreaker flag travel together as one judgement. */
  verdict: boolean;
}

export const DEFAULT_DUPLICATE_OPTIONS: DuplicateOptions = {
  mileage: false,
  price: false,
  photos: false,
  comments: false,
  verdict: false,
};

/**
 * Shown when something goes wrong part-way. The message is deliberately plain:
 * a raw Dexie or decode failure means nothing to someone standing in a
 * dealership.
 */
export class DuplicateFailedError extends Error {
  constructor(cause?: unknown) {
    super('Couldn’t duplicate this car. Please try again.');
    this.name = 'DuplicateFailedError';
    this.cause = cause;
  }
}

export class SourceCarMissingError extends Error {
  constructor() {
    super('That car is no longer on this device, so there is nothing to copy.');
    this.name = 'SourceCarMissingError';
  }
}

/**
 * Builds the new car record. Pure — no database, no clock beyond what is passed
 * in — so the copy rules can be tested exactly, and so every nested value is
 * visibly rebuilt rather than shared with the source.
 */
export function buildDuplicate(
  source: Car,
  options: DuplicateOptions = DEFAULT_DUPLICATE_OPTIONS,
  now: number = Date.now(),
): Car {
  const duplicate: Car = {
    id: newId(),
    createdAt: now,
    updatedAt: now,

    // The model and its spec — the whole point of duplicating.
    make: source.make,
    model: source.model,
    year: source.year,
    powertrain: source.powertrain,
    transmission: source.transmission,

    /*
     * Retired from the UI in v1.1, still carried on the record. A duplicate of
     * a car that predates that change keeps its trim so the two records stay
     * equivalent and older backups keep round-tripping. Nothing shows it.
     */
    trim: source.trim,

    /*
     * Copied by reconstruction, never by reference: a duplicate that shared the
     * source's ratings object or feature array would let an edit to one car
     * silently rewrite the other. `undefined` is preserved as `undefined` so a
     * copy of a pre-1.2 car looks exactly like a pre-1.2 car.
     *
     * Note this copies the stored keys verbatim, which matters for a feature
     * the user has since retired from the master checklist: it was recorded
     * against this model, so the duplicate records it too.
     */
    ratings: { ...source.ratings },
    features: Array.isArray(source.features) ? [...source.features] : undefined,
    customFeatures: Array.isArray(source.customFeatures)
      ? [...source.customFeatures]
      : undefined,

    headachePotential: source.headachePotential,
    euroNcapStars: source.euroNcapStars,
    euroNcapYear: source.euroNcapYear,

    // Opt-in: true of this example, not of the model.
    mileage: options.mileage ? source.mileage : undefined,
    price: options.price ? source.price : undefined,

    // Opt-in: written on the day, about that car.
    comments: options.comments ? source.comments : '',
    notes: options.comments ? source.notes : '',

    // Opt-in: a judgement about that specific car, at that price, on that day.
    verdict: options.verdict ? source.verdict : null,
    dealbreaker: options.verdict ? source.dealbreaker : false,
    dealbreakerReasons: options.verdict ? [...source.dealbreakerReasons] : [],
    dealbreakerComment: options.verdict ? source.dealbreakerComment : '',

    // Filled in by `duplicateCar` when photos are being copied.
    coverPhotoId: null,

    /*
     * A real entry straight away, not a draft: it belongs in My Cars, and a
     * fresh createdAt floats it to the top of Recent on its own. It opens in
     * Edit next, which is where the differences get typed in.
     */
    status: 'saved',

    // Recomputed below from the copied ratings.
    overallScore: null,
    ratingIncomplete: true,
  };

  /*
   * The score is derived, never transcribed. Copying `source.overallScore`
   * would enshrine whatever was stored, including a value from before a rating
   * rule changed; running the current logic over the copied ratings cannot
   * drift.
   */
  return withDerivedScore(duplicate);
}

/**
 * Independent photo records for the new car, built entirely in memory.
 *
 * Every byte is read out and rebuilt into a new Blob, so the two cars share
 * nothing at all — deleting a photo from one can never touch the other.
 *
 * Reading happens *before* any write, on purpose. If one photo cannot be read,
 * this throws having written nothing, rather than leaving the user with a
 * duplicate that quietly lost a picture.
 */
async function buildPhotoCopies(
  sourcePhotos: Photo[],
  newCarId: string,
  now: number,
): Promise<{ photos: Photo[]; idMap: Map<string, string> }> {
  const idMap = new Map<string, string>();
  const photos: Photo[] = [];

  for (const source of sourcePhotos) {
    const blob = bytesToBlob(await blobToUint8Array(source.blob), source.blob.type);
    const thumb = bytesToBlob(await blobToUint8Array(source.thumb), source.thumb.type);
    const id = newId();
    idMap.set(source.id, id);
    photos.push({
      id,
      carId: newCarId,
      blob,
      thumb,
      width: source.width,
      height: source.height,
      caption: source.caption,
      // Order is preserved so the strip and the viewer read the same as before.
      order: source.order,
      createdAt: now,
    });
  }

  return { photos, idMap };
}

/**
 * Creates a new car from an existing one.
 *
 * Never touches the source: it is read, and that is all. The new car and its
 * photos are written in a single transaction, so the result is either a
 * complete duplicate or nothing at all — never a car whose `coverPhotoId`
 * points at a photo that was not written.
 */
export async function duplicateCar(
  sourceCarId: string,
  options: DuplicateOptions = DEFAULT_DUPLICATE_OPTIONS,
): Promise<Car> {
  const source = await db.cars.get(sourceCarId).catch((error) => {
    throw toFriendlyError(error);
  });
  if (!source) throw new SourceCarMissingError();

  const now = Date.now();
  const duplicate = buildDuplicate(source, options, now);

  let photos: Photo[] = [];
  if (options.photos) {
    try {
      const sourcePhotos = await listPhotos(sourceCarId);
      const built = await buildPhotoCopies(sourcePhotos, duplicate.id, now);
      photos = built.photos;
      /*
       * The cover follows the photo it pointed at, through the old id → new id
       * map. Falling back to the first copied photo matches what the rest of
       * the app does when a cover is missing.
       */
      const mappedCover = source.coverPhotoId
        ? (built.idMap.get(source.coverPhotoId) ?? null)
        : null;
      duplicate.coverPhotoId = mappedCover ?? photos[0]?.id ?? null;
    } catch (error) {
      if (isQuotaError(error)) throw new QuotaExceededError(error);
      // Photos were asked for, so a half-copy is not an acceptable outcome.
      throw new DuplicateFailedError(error);
    }
  }

  try {
    await db.transaction('rw', db.cars, db.photos, async () => {
      await db.cars.add(duplicate);
      if (photos.length > 0) await db.photos.bulkAdd(photos);
    });
  } catch (error) {
    if (isQuotaError(error)) throw new QuotaExceededError(error);
    throw new DuplicateFailedError(error);
  }

  return duplicate;
}
