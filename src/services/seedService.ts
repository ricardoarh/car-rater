import { db } from '../db/database';
import { makeCar } from './carsRepo';
import { withDerivedScore } from './ratingService';
import type { Car, Ratings, StarValue } from '../types/models';

/**
 * Development-only demo data. This is never invoked by the production build —
 * the only caller is a Settings block guarded by `import.meta.env.DEV`.
 */
type Seed = {
  make: string;
  model: string;
  trim: string;
  year: number;
  powertrain: Car['powertrain'];
  ratings: [number, number, number, number, number, number, number];
  verdict: Car['verdict'];
  headache: Car['headachePotential'];
  ncap: [number, number] | null;
  dealbreaker?: boolean;
  reasons?: Car['dealbreakerReasons'];
  comments: string;
};

const SEEDS: Seed[] = [
  {
    make: 'Lexus',
    model: 'LBX',
    trim: 'Premium Plus',
    year: 2025,
    powertrain: 'hybrid',
    ratings: [5, 5, 4, 3, 5, 4, 4],
    verdict: 'yes',
    headache: 'low',
    ncap: [5, 2024],
    comments:
      'Way nicer inside than expected.\nRio should fit easily in the back.\nInfotainment surprisingly good.\nSteering felt a little boring.',
  },
  {
    make: 'Mini',
    model: 'Cooper',
    trim: 'Classic',
    year: 2024,
    powertrain: 'petrol',
    ratings: [5, 4, 4, 5, 2, 4, 3],
    verdict: 'maybe',
    headache: 'medium',
    ncap: [4, 2022],
    comments: 'Huge fun to drive. Boot is far too small for Rio on a long trip.',
  },
  {
    make: 'Mini',
    model: 'Countryman',
    trim: 'Classic',
    year: 2025,
    powertrain: 'electric',
    ratings: [4, 4, 4, 3, 4, 3, 2],
    verdict: 'maybe',
    headache: 'medium',
    ncap: [4, 2024],
    comments: 'Much bigger than the old one. Pricey for what it is.',
  },
  {
    make: 'Audi',
    model: 'Q2',
    trim: 'S line',
    year: 2023,
    powertrain: 'petrol',
    ratings: [3, 4, 3, 4, 3, 3, 4],
    verdict: 'no',
    headache: 'medium',
    ncap: [5, 2016],
    dealbreaker: true,
    reasons: ['rio', 'comfort'],
    comments: 'Feels dated inside. Loading Rio over that boot lip is a pain.',
  },
  {
    make: 'Audi',
    model: 'A1',
    trim: 'Sportback',
    year: 2024,
    powertrain: 'petrol',
    ratings: [4, 3, 4, 4, 2, 3, 4],
    verdict: 'maybe',
    headache: 'low',
    ncap: [5, 2019],
    comments: 'Smart little thing, but really not a dog car.',
  },
];

function toRatings(values: Seed['ratings']): Ratings {
  return {
    cuteness: values[0] as StarValue,
    comfyness: values[1] as StarValue,
    techonologia: values[2] as StarValue,
    vroomFactor: values[3] as StarValue,
    rioApproved: values[4] as StarValue,
    unexpectedFactor: values[5] as StarValue,
    value: values[6] as StarValue,
  };
}

export async function seedDemoData(): Promise<number> {
  const now = Date.now();
  const cars: Car[] = SEEDS.map((seed, index) =>
    withDerivedScore({
      ...makeCar(
        {
          make: seed.make,
          model: seed.model,
          trim: seed.trim,
          year: seed.year,
          powertrain: seed.powertrain,
        },
        'saved',
      ),
      createdAt: now - (SEEDS.length - index) * 86_400_000,
      updatedAt: now,
      ratings: toRatings(seed.ratings),
      verdict: seed.verdict,
      headachePotential: seed.headache,
      euroNcapStars: seed.ncap?.[0] ?? null,
      euroNcapYear: seed.ncap?.[1] ?? null,
      dealbreaker: Boolean(seed.dealbreaker),
      dealbreakerReasons: seed.reasons ?? [],
      comments: seed.comments,
    }),
  );
  await db.cars.bulkPut(cars);
  return cars.length;
}
