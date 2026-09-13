import { Blob as NodeBlob } from 'node:buffer';

/**
 * Runs before anything else in the test environment.
 *
 * jsdom's Blob is a host object that fake-indexeddb's structured clone cannot
 * round-trip, and it has no .arrayBuffer(). Node's Blob behaves like a real
 * browser Blob for both, so the tests exercise the same code paths the app
 * runs in a browser.
 */
globalThis.Blob = NodeBlob as unknown as typeof globalThis.Blob;
