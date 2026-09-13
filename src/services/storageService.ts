const PERSIST_ASKED_KEY = 'car-rater:persist-asked';

export interface StorageEstimateInfo {
  supported: boolean;
  usage: number | null;
  quota: number | null;
  persisted: boolean;
}

export async function getStorageInfo(): Promise<StorageEstimateInfo> {
  const storage = navigator.storage;
  if (!storage?.estimate) {
    return { supported: false, usage: null, quota: null, persisted: false };
  }
  try {
    const estimate = await storage.estimate();
    const persisted = storage.persisted ? await storage.persisted() : false;
    return {
      supported: true,
      usage: estimate.usage ?? null,
      quota: estimate.quota ?? null,
      persisted,
    };
  } catch {
    return { supported: false, usage: null, quota: null, persisted: false };
  }
}

/**
 * Ask the browser to keep our data even under storage pressure.
 * We ask once, ever — never nag.
 */
export async function requestPersistentStorageOnce(): Promise<boolean> {
  try {
    const storage = navigator.storage;
    if (!storage?.persist || !storage.persisted) return false;
    if (await storage.persisted()) return true;
    if (localStorage.getItem(PERSIST_ASKED_KEY)) return false;
    localStorage.setItem(PERSIST_ASKED_KEY, '1');
    return await storage.persist();
  } catch {
    return false;
  }
}

export function formatBytes(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined) return 'Unknown';
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i += 1;
  }
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[i]}`;
}
