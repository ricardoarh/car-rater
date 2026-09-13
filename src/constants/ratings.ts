import type { RatingKey } from '../types/models';

/**
 * THE single source of truth for the seven rating categories.
 * Order here is the order everywhere: rate screen, detail, compare, sorting.
 *
 * The labels are deliberate. Do not "fix" the spelling of Comfyness or
 * Techonologia, and do not make "Uuhhh, I didn't expect that" more corporate.
 */
export interface RatingCategory {
  key: RatingKey;
  /** Exact user-facing wording. */
  label: string;
  /** Compact label for the Compare table / narrow columns. */
  shortLabel: string;
  icon: string;
  /** One-line meaning shown under the label / in the info sheet. */
  helper: string;
  /** Longer prompt shown when the user opens the info sheet. */
  detail: string[];
  order: number;
}

export const RATING_CATEGORIES: readonly RatingCategory[] = [
  {
    key: 'cuteness',
    label: 'Cuteness',
    shortLabel: 'Cuteness',
    icon: '💗',
    helper: 'How much do we actually like the look and personality of it?',
    detail: [
      'Exterior styling',
      'Interior vibe',
      'Personality and desirability',
      'Colours and materials',
      'General "I want this" factor',
    ],
    order: 1,
  },
  {
    key: 'comfyness',
    label: 'Comfyness',
    shortLabel: 'Comfyness',
    icon: '💺',
    helper: 'How nice does it feel to sit in and live with?',
    detail: [
      'Seats',
      'Driving position',
      'Visibility',
      'Getting in and out',
      'Cabin comfort',
      'General feeling from the driver’s seat',
    ],
    order: 2,
  },
  {
    key: 'techonologia',
    label: 'Techonologia',
    shortLabel: 'Techonologia',
    icon: '🖥️',
    helper: 'How good is the gadgetry — and how nice is it to actually use?',
    detail: [
      'Infotainment, Apple CarPlay, Android Auto',
      'Reversing and 360 cameras, parking sensors',
      'Digital dashboard and sound system',
      'Adaptive cruise and driver assistance',
      'More gadgets do not win points if they are annoying to operate',
    ],
    order: 3,
  },
  {
    key: 'vroomFactor',
    label: 'Vroom Factor',
    shortLabel: 'Vroom Factor',
    icon: '🏎️',
    helper: 'How much does it make you want to drive it?',
    detail: [
      'Acceleration and responsiveness',
      'Handling and steering',
      'Character and fun',
      'This is not simply horsepower',
    ],
    order: 4,
  },
  {
    key: 'rioApproved',
    label: 'Rio Approved 🐶',
    shortLabel: 'Rio Approved',
    icon: '🐾',
    helper: 'How good is this car for transporting Rio?',
    detail: [
      'Getting Rio in and out',
      'Loading height and rear-seat access',
      'Boot space — can he lie down comfortably?',
      'How easy it is to secure him safely',
      'Ventilation and suitability for longer journeys',
    ],
    order: 5,
  },
  {
    key: 'unexpectedFactor',
    label: 'Uuhhh, I didn’t expect that',
    shortLabel: 'Uuhhh, I didn’t expect that',
    icon: '✨',
    helper: 'The positive surprise score — higher means a bigger nice surprise.',
    detail: [
      'Interior dramatically nicer than expected',
      'Surprisingly quick, or feels more premium than expected',
      'A clever feature, or unexpectedly spacious',
      'Much better in person than in photographs',
    ],
    order: 6,
  },
  {
    key: 'value',
    label: '$$',
    shortLabel: '$$',
    icon: '💰',
    helper: 'How happy is the wallet?',
    detail: [
      '★★★★★ = wallet very happy / excellent value',
      '★ = financially questionable decision',
      'Think whole-ownership value: price, insurance, tax, fuel, servicing, likely repairs',
    ],
    order: 7,
  },
] as const;

export const RATING_KEYS = RATING_CATEGORIES.map((c) => c.key);

export const RATING_CATEGORY_BY_KEY: Record<RatingKey, RatingCategory> =
  Object.fromEntries(RATING_CATEGORIES.map((c) => [c.key, c])) as Record<
    RatingKey,
    RatingCategory
  >;
