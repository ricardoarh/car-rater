/** Core domain types for Car Rater. */

export type RatingKey =
  | 'cuteness'
  | 'comfyness'
  | 'techonologia'
  | 'vroomFactor'
  | 'rioApproved'
  | 'unexpectedFactor'
  | 'value';

/** 1–5, or null when the user has not rated that category yet. */
export type StarValue = 1 | 2 | 3 | 4 | 5;

export type Ratings = Record<RatingKey, StarValue | null>;

export type Verdict = 'yes' | 'maybe' | 'no';

export type HeadachePotential = 'low' | 'medium' | 'high' | 'unknown';

export type Transmission = 'automatic' | 'manual';

export type Powertrain =
  | 'petrol'
  | 'diesel'
  | 'hybrid'
  | 'phev'
  | 'electric'
  | 'other';

export type DealbreakerReason =
  | 'rio'
  | 'price'
  | 'comfort'
  | 'tech'
  | 'driving'
  | 'looks'
  | 'reliability'
  | 'safety'
  | 'other';

export type CarStatus = 'draft' | 'saved';

/**
 * Stable internal keys for the nine built-in features.
 * Records store these, never the display wording — see
 * `src/constants/features.ts` for the labels.
 */
export type CarFeatureKey =
  | 'heatedSeats'
  | 'carplayAndroidAuto'
  | 'reversingCamera'
  | 'parkingSensors'
  | 'cruiseControl'
  | 'keylessEntryStart'
  | 'digitalDash'
  | 'automaticLightsWipers'
  | 'climateControl';

export interface Car {
  id: string;
  createdAt: number;
  updatedAt: number;

  make: string;
  model: string;
  /**
   * Legacy. Retired from the UI in v1.1 but kept on the model so existing
   * records and older backups stay readable and round-trip unchanged.
   * Nothing writes it any more; nothing deletes it either.
   */
  trim: string;
  year: number | null;
  powertrain: Powertrain | null;
  notes: string;

  /*
   * Added in v1.1. These are optional rather than `T | null` (the convention
   * used above) precisely because records written before v1.1 do not carry the
   * property at all — `undefined` is the honest representation, and it means
   * not one stored row had to be rewritten to introduce them.
   */
  /** Whole miles. Never negative. */
  mileage?: number;
  /** Whole pounds sterling. Never negative. */
  price?: number;
  transmission?: Transmission;

  /*
   * Added in v1.2, optional for the same reason as the v1.1 fields: records
   * written earlier simply do not carry them, so `undefined` is honest and no
   * stored row needed rewriting. Neither list affects any score.
   */
  /** Built-in features this car has. Order follows CAR_FEATURES. */
  features?: CarFeatureKey[];
  /** Free-text extras the user typed, e.g. "Panoramic Roof". */
  customFeatures?: string[];

  ratings: Ratings;
  /** Mean of the rated categories, 1 decimal place. null when nothing rated. */
  overallScore: number | null;
  /** True when at least one of the seven categories is still unrated. */
  ratingIncomplete: boolean;

  headachePotential: HeadachePotential;
  euroNcapStars: number | null;
  euroNcapYear: number | null;

  dealbreaker: boolean;
  dealbreakerReasons: DealbreakerReason[];
  dealbreakerComment: string;

  verdict: Verdict | null;
  comments: string;

  coverPhotoId: string | null;
  status: CarStatus;
}

/**
 * A single keyed row in the `settings` table. Global app preferences live here
 * so nothing has to be smuggled into a Car record.
 *
 * `activeFeatureOrder` is the whole feature customisation in one array:
 * presence means active, position means order. Absent (or undefined) means the
 * user has never customised it, and the canonical list in
 * `src/constants/features.ts` applies unchanged.
 */
export interface AppSettings {
  key: 'app';
  activeFeatureOrder?: CarFeatureKey[];
  updatedAt: number;
}

/** Photos live in their own table, keyed by car, so Car records stay small. */
export interface Photo {
  id: string;
  carId: string;
  /** Full-size (resized/compressed) image. */
  blob: Blob;
  /** Small thumbnail used in lists and strips. */
  thumb: Blob;
  width: number;
  height: number;
  caption: string;
  order: number;
  createdAt: number;
}

/** Shape of the JSON inside an exported backup. */
export interface BackupCarPhoto {
  id: string;
  carId: string;
  file: string;
  width: number;
  height: number;
  caption: string;
  order: number;
  createdAt: number;
}

export interface BackupFile {
  format: 'car-rater-backup';
  version: 1;
  exportedAt: string;
  appVersion: string;
  cars: Car[];
  photos: BackupCarPhoto[];
  /**
   * Added in v1.3. Absent in every backup written before then, which is not an
   * error — the restore simply leaves the device's defaults in place.
   */
  settings?: BackupSettings;
}

export interface BackupSettings {
  activeFeatureOrder?: CarFeatureKey[];
}
