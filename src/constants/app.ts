import type {
  DealbreakerReason,
  HeadachePotential,
  Powertrain,
  Transmission,
  Verdict,
} from '../types/models';
import { TRANSMISSION_LABEL } from '../utils/format';

export const APP_NAME = 'Car Rater';
export const APP_TAGLINE = 'Find the one that feels right.';
export const APP_VERSION = '1.4.0';

/** Change this one number to raise or lower the per-car photo limit. */
export const MAX_PHOTOS_PER_CAR = 10;

/** Image processing targets. */
export const IMAGE_MAX_EDGE = 1800; // longest edge of the stored photo
export const IMAGE_QUALITY = 0.82;
export const THUMB_MAX_EDGE = 420;
export const THUMB_QUALITY = 0.75;

export const COMMENT_MAX_LENGTH = 500;

export const VERDICTS: { value: Verdict; label: string }[] = [
  { value: 'yes', label: 'YES' },
  { value: 'maybe', label: 'MAYBE' },
  { value: 'no', label: 'NO' },
];

export const VERDICT_LABEL: Record<Verdict, string> = {
  yes: 'YES',
  maybe: 'MAYBE',
  no: 'NO',
};

export const HEADACHE_OPTIONS: {
  value: HeadachePotential;
  label: string;
  dot: string;
}[] = [
  { value: 'low', label: 'Low', dot: '🟢' },
  { value: 'medium', label: 'Medium', dot: '🟠' },
  { value: 'high', label: 'High', dot: '🔴' },
  { value: 'unknown', label: 'Unknown', dot: '⚪' },
];

export const HEADACHE_LABEL: Record<HeadachePotential, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  unknown: 'Unknown',
};

export const TRANSMISSIONS: { value: Transmission; label: string }[] = [
  { value: 'automatic', label: TRANSMISSION_LABEL.automatic },
  { value: 'manual', label: TRANSMISSION_LABEL.manual },
];

/** Sanity bounds for the optional numeric fields. Deliberately generous. */
export const MAX_MILEAGE = 9_999_999;
export const MAX_PRICE = 99_999_999;

export const POWERTRAINS: { value: Powertrain; label: string }[] = [
  { value: 'petrol', label: 'Petrol' },
  { value: 'diesel', label: 'Diesel' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'phev', label: 'Plug-in Hybrid' },
  { value: 'electric', label: 'Electric' },
  { value: 'other', label: 'Other' },
];

export const POWERTRAIN_LABEL: Record<Powertrain, string> = Object.fromEntries(
  POWERTRAINS.map((p) => [p.value, p.label]),
) as Record<Powertrain, string>;

export const DEALBREAKER_REASONS: { value: DealbreakerReason; label: string }[] = [
  { value: 'rio', label: 'Rio' },
  { value: 'price', label: 'Price' },
  { value: 'comfort', label: 'Comfort' },
  { value: 'tech', label: 'Tech' },
  { value: 'driving', label: 'Driving' },
  { value: 'looks', label: 'Looks' },
  { value: 'reliability', label: 'Reliability' },
  { value: 'safety', label: 'Safety' },
  { value: 'other', label: 'Other' },
];

/** Common makes offered as a datalist on the Add a Car screen. */
export const COMMON_MAKES = [
  'Audi',
  'BMW',
  'BYD',
  'Citroën',
  'Cupra',
  'Dacia',
  'Fiat',
  'Ford',
  'Honda',
  'Hyundai',
  'Jeep',
  'Kia',
  'Land Rover',
  'Lexus',
  'Mazda',
  'Mercedes-Benz',
  'MG',
  'Mini',
  'Nissan',
  'Peugeot',
  'Polestar',
  'Renault',
  'Škoda',
  'Seat',
  'Subaru',
  'Suzuki',
  'Tesla',
  'Toyota',
  'Vauxhall',
  'Volkswagen',
  'Volvo',
];

export const MIN_COMPARE = 2;
export const MAX_COMPARE = 4;
