import '@testing-library/jest-dom/vitest';
import 'fake-indexeddb/auto';
import { afterEach, beforeEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import { db } from '../db/database';

beforeEach(async () => {
  await db.open();
  await db.cars.clear();
  await db.photos.clear();
  await db.settings.clear();
  localStorage.clear();
});

afterEach(() => {
  cleanup();
});

// Object URLs are not meaningful in jsdom; keep them harmless.
globalThis.URL.createObjectURL = () => 'blob:mock';
globalThis.URL.revokeObjectURL = () => undefined;
