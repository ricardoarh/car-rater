import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import { listPhotos } from '../services/photoService';
import type { Car, Photo } from '../types/models';

/** Every saved car, live-updating as the database changes. */
export function useSavedCars(): Car[] | undefined {
  return useLiveQuery(() => db.cars.where('status').equals('saved').toArray(), []);
}

export function useCar(id: string | undefined): Car | undefined | null {
  return useLiveQuery(async () => (id ? ((await db.cars.get(id)) ?? null) : null), [id]);
}

export function useCarPhotos(carId: string | undefined): Photo[] | undefined {
  return useLiveQuery(async () => (carId ? await listPhotos(carId) : []), [carId]);
}

export function useLatestDraft(): Car | null | undefined {
  return useLiveQuery(async () => {
    const drafts = await db.cars.where('status').equals('draft').toArray();
    const meaningful = drafts.filter(
      (d) => d.make.trim() || d.model.trim() || d.overallScore !== null,
    );
    if (meaningful.length === 0) return null;
    return meaningful.sort((a, b) => b.updatedAt - a.updatedAt)[0];
  }, []);
}
