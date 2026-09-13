import type { Car, Powertrain, Transmission } from '../types/models';
import { parseWholeNumber } from '../utils/format';

/**
 * Form state for a car's factual details.
 *
 * Numbers are held as digit strings while the user is typing — an input can
 * legitimately be mid-edit and empty — and are converted exactly once, by
 * `basicsToPatch`, on the way to the database.
 */
export interface CarBasics {
  make: string;
  model: string;
  year: string;
  mileage: string;
  price: string;
  transmission: Transmission | null;
  powertrain: Powertrain | null;
  notes: string;
}

export function emptyBasics(): CarBasics {
  return {
    make: '',
    model: '',
    year: '',
    mileage: '',
    price: '',
    transmission: null,
    powertrain: null,
    notes: '',
  };
}

export function carToBasics(car: Car): CarBasics {
  return {
    make: car.make,
    model: car.model,
    year: car.year != null ? String(car.year) : '',
    mileage: car.mileage != null ? String(car.mileage) : '',
    price: car.price != null ? String(car.price) : '',
    transmission: car.transmission ?? null,
    powertrain: car.powertrain ?? null,
    notes: car.notes,
  };
}

/**
 * Turns form state into a database patch.
 *
 * `trim` is deliberately absent. It was retired from the UI in v1.1 but the
 * stored value has to survive editing, and `carsRepo.update` merges patches —
 * so a key that is not in the patch is a key that is left alone.
 */
export function basicsToPatch(basics: CarBasics): Partial<Car> {
  return {
    make: basics.make.trim(),
    model: basics.model.trim(),
    year: parseWholeNumber(basics.year) ?? null,
    mileage: parseWholeNumber(basics.mileage),
    price: parseWholeNumber(basics.price),
    transmission: basics.transmission ?? undefined,
    powertrain: basics.powertrain,
    notes: basics.notes,
  };
}
