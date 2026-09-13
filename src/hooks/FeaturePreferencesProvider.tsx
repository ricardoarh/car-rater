import { useMemo, type ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import { resolveActiveFeatureOrder, resolveActiveFeatures } from '../services/settingsRepo';
import { FeaturePreferencesContext } from './feature-preferences-context';

/**
 * One live query at the app root feeds every screen, so a row in a long list
 * does not open its own database observer.
 *
 * The result is wrapped in an object on purpose: `db.settings.get()` returns
 * undefined both while the read is in flight AND for the very common case of a
 * user who has never customised anything, and those two states need to be
 * distinguishable. An absent wrapper means "still loading"; a wrapper holding
 * undefined means "loaded, nothing stored — use the defaults".
 */
export function FeaturePreferencesProvider({ children }: { children: ReactNode }) {
  const result = useLiveQuery(
    async () => ({ settings: await db.settings.get('app') }),
    [],
  );
  const settings = result?.settings ?? null;
  const ready = result !== undefined;

  const value = useMemo(
    () => ({
      activeFeatures: resolveActiveFeatures(settings),
      activeOrder: resolveActiveFeatureOrder(settings),
      ready,
    }),
    [settings, ready],
  );

  return (
    <FeaturePreferencesContext.Provider value={value}>
      {children}
    </FeaturePreferencesContext.Provider>
  );
}
