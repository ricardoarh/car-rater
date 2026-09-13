import { useMemo } from 'react';
import { carsRepo } from '../services/carsRepo';
import { useToast } from '../components/ui/toast-context';
import type { CarFeatureKey } from '../types/models';

/**
 * Feature edits go straight to the repository — no debounce, no local mirror.
 *
 * Each call recomputes the list inside its own transaction, so tapping four
 * chips in a second queues four writes that each see the previous one's result.
 * Holding a copy in React state and saving the whole array is exactly what
 * would lose taps.
 */
export function useFeatureActions(carId: string | undefined) {
  const toast = useToast();

  return useMemo(
    () => ({
      toggle: (key: CarFeatureKey) => {
        if (!carId) return;
        void carsRepo.toggleFeature(carId, key).catch((error) => {
          toast.error(error, 'That feature could not be saved.');
        });
      },
      addCustom: (name: string) => {
        if (!carId) return;
        void carsRepo.addCustomFeature(carId, name).catch((error) => {
          toast.error(error, 'That feature could not be added.');
        });
      },
      renameCustom: (from: string, to: string) => {
        if (!carId) return;
        void carsRepo.renameCustomFeature(carId, from, to).catch((error) => {
          toast.error(error, 'That feature could not be renamed.');
        });
      },
      removeCustom: (name: string) => {
        if (!carId) return;
        void carsRepo.removeCustomFeature(carId, name).catch((error) => {
          toast.error(error, 'That feature could not be removed.');
        });
      },
    }),
    [carId, toast],
  );
}
