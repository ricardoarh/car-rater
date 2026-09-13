import { db, toFriendlyError, isQuotaError, QuotaExceededError } from '../db/database';
import {
  IMAGE_MAX_EDGE,
  IMAGE_QUALITY,
  MAX_PHOTOS_PER_CAR,
  THUMB_MAX_EDGE,
  THUMB_QUALITY,
} from '../constants/app';
import type { Photo } from '../types/models';
import { newId } from '../utils/id';

export class PhotoLimitError extends Error {
  constructor(limit: number) {
    super(`You can keep up to ${limit} photos per car. Remove one to add another.`);
    this.name = 'PhotoLimitError';
  }
}

export class ImageProcessingError extends Error {
  constructor(fileName: string) {
    super(`"${fileName}" could not be read as an image. Try another photo.`);
    this.name = 'ImageProcessingError';
  }
}

interface Decoded {
  width: number;
  height: number;
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void;
  close: () => void;
}

/**
 * Decode a file honouring EXIF orientation.
 * createImageBitmap({imageOrientation:'from-image'}) handles it where supported;
 * the <img> fallback is orientation-correct in every current browser.
 */
async function decode(file: Blob): Promise<Decoded> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
      return {
        width: bitmap.width,
        height: bitmap.height,
        draw: (ctx, w, h) => ctx.drawImage(bitmap, 0, 0, w, h),
        close: () => bitmap.close?.(),
      };
    } catch {
      /* fall through to the <img> path */
    }
  }

  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('decode failed'));
      el.src = url;
    });
    return {
      width: img.naturalWidth,
      height: img.naturalHeight,
      draw: (ctx, w, h) => ctx.drawImage(img, 0, 0, w, h),
      close: () => URL.revokeObjectURL(url),
    };
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}

function fit(width: number, height: number, maxEdge: number) {
  const longest = Math.max(width, height);
  if (longest <= maxEdge) return { width, height };
  const scale = maxEdge / longest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

let cachedType: string | null = null;
/** Prefer WebP where the browser can actually encode it; JPEG otherwise. */
function outputType(): string {
  if (cachedType) return cachedType;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    cachedType = canvas.toDataURL('image/webp').startsWith('data:image/webp')
      ? 'image/webp'
      : 'image/jpeg';
  } catch {
    cachedType = 'image/jpeg';
  }
  return cachedType;
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('encode failed'))),
      type,
      quality,
    );
  });
}

async function render(
  decoded: Decoded,
  maxEdge: number,
  quality: number,
): Promise<{ blob: Blob; width: number; height: number }> {
  const size = fit(decoded.width, decoded.height, maxEdge);
  const canvas = document.createElement('canvas');
  canvas.width = size.width;
  canvas.height = size.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas unavailable');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  decoded.draw(ctx, size.width, size.height);
  const blob = await canvasToBlob(canvas, outputType(), quality);
  canvas.width = 0;
  canvas.height = 0;
  return { blob, ...size };
}

/** Resize + compress a picked file into a stored photo and its thumbnail. */
export async function processImage(file: File | Blob, fileName = 'photo') {
  let decoded: Decoded;
  try {
    decoded = await decode(file);
  } catch {
    throw new ImageProcessingError(fileName);
  }
  try {
    const full = await render(decoded, IMAGE_MAX_EDGE, IMAGE_QUALITY);
    const thumb = await render(decoded, THUMB_MAX_EDGE, THUMB_QUALITY);
    return { blob: full.blob, thumb: thumb.blob, width: full.width, height: full.height };
  } catch {
    throw new ImageProcessingError(fileName);
  } finally {
    decoded.close();
  }
}

export async function listPhotos(carId: string): Promise<Photo[]> {
  try {
    const photos = await db.photos.where('carId').equals(carId).toArray();
    return photos.sort((a, b) => a.order - b.order || a.createdAt - b.createdAt);
  } catch (error) {
    throw toFriendlyError(error);
  }
}

export async function countPhotos(carId: string): Promise<number> {
  return db.photos.where('carId').equals(carId).count();
}

export interface AddPhotosResult {
  added: Photo[];
  skipped: { name: string; reason: string }[];
}

/** Compress and store one or more picked files against a car. */
export async function addPhotos(
  carId: string,
  files: (File | Blob)[],
): Promise<AddPhotosResult> {
  const existing = await listPhotos(carId);
  const added: Photo[] = [];
  const skipped: { name: string; reason: string }[] = [];
  let order = existing.length > 0 ? Math.max(...existing.map((p) => p.order)) + 1 : 0;
  let total = existing.length;

  for (const file of files) {
    const name = (file as File).name ?? 'photo';
    if (total >= MAX_PHOTOS_PER_CAR) {
      skipped.push({ name, reason: `Limit is ${MAX_PHOTOS_PER_CAR} photos per car` });
      continue;
    }
    try {
      const processed = await processImage(file, name);
      const photo: Photo = {
        id: newId(),
        carId,
        blob: processed.blob,
        thumb: processed.thumb,
        width: processed.width,
        height: processed.height,
        caption: '',
        order: order++,
        createdAt: Date.now(),
      };
      await db.photos.add(photo);
      added.push(photo);
      total += 1;
    } catch (error) {
      if (isQuotaError(error)) throw new QuotaExceededError(error);
      skipped.push({
        name,
        reason: error instanceof Error ? error.message : 'Could not be processed',
      });
    }
  }

  // First photo on a car becomes the cover automatically.
  if (added.length > 0) {
    const car = await db.cars.get(carId);
    if (car && !car.coverPhotoId) {
      await db.cars.update(carId, { coverPhotoId: added[0].id, updatedAt: Date.now() });
    }
  }

  return { added, skipped };
}

export async function removePhoto(photoId: string): Promise<void> {
  try {
    const photo = await db.photos.get(photoId);
    if (!photo) return;
    await db.photos.delete(photoId);
    const car = await db.cars.get(photo.carId);
    if (car?.coverPhotoId === photoId) {
      const remaining = await listPhotos(photo.carId);
      await db.cars.update(photo.carId, {
        coverPhotoId: remaining[0]?.id ?? null,
        updatedAt: Date.now(),
      });
    }
  } catch (error) {
    throw toFriendlyError(error);
  }
}

export async function setCoverPhoto(carId: string, photoId: string): Promise<void> {
  await db.cars.update(carId, { coverPhotoId: photoId, updatedAt: Date.now() });
}

export async function setCaption(photoId: string, caption: string): Promise<void> {
  await db.photos.update(photoId, { caption });
}

export async function deletePhotosForCar(carId: string): Promise<void> {
  await db.photos.where('carId').equals(carId).delete();
}

/** Thumbnail blob for a car's cover, for list rendering. */
export async function getCoverThumb(car: {
  id: string;
  coverPhotoId: string | null;
}): Promise<Blob | null> {
  try {
    if (car.coverPhotoId) {
      const photo = await db.photos.get(car.coverPhotoId);
      if (photo) return photo.thumb;
    }
    const first = (await listPhotos(car.id))[0];
    return first?.thumb ?? null;
  } catch {
    return null;
  }
}
