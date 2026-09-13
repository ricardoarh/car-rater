import { createContext, useContext } from 'react';
import { CAR_FEATURES, CAR_FEATURE_KEYS } from '../constants/features';
import type { CarFeature } from '../constants/features';
import type { CarFeatureKey } from '../types/models';

export interface FeaturePreferences {
  /** Active feature definitions, already in the user's chosen order. */
  activeFeatures: readonly CarFeature[];
  /** The same list as bare keys — handy for set membership and counts. */
  activeOrder: readonly CarFeatureKey[];
  /** False only while the very first read is in flight. */
  ready: boolean;
}

export const DEFAULT_FEATURE_PREFERENCES: FeaturePreferences = {
  activeFeatures: CAR_FEATURES,
  activeOrder: CAR_FEATURE_KEYS,
  ready: false,
};

export const FeaturePreferencesContext = createContext<FeaturePreferences>(
  DEFAULT_FEATURE_PREFERENCES,
);

/**
 * One live query at the app root feeds every screen, so a row in a list does
 * not open its own database observer. Falls back to the canonical list, which
 * is exactly what an install upgrading from 1.2 sees until it customises.
 */
export function useFeaturePreferences(): FeaturePreferences {
  return useContext(FeaturePreferencesContext);
}

export function useActiveFeatures(): readonly CarFeature[] {
  return useFeaturePreferences().activeFeatures;
}

export function useActiveFeatureOrder(): readonly CarFeatureKey[] {
  return useFeaturePreferences().activeOrder;
}
