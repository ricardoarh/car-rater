/**
 * Blob.prototype.arrayBuffer is missing in older Safari (and in jsdom), so we
 * read through FileReader when it is not there.
 */
export function blobToUint8Array(blob: Blob): Promise<Uint8Array> {
  if (typeof blob.arrayBuffer === 'function') {
    return blob.arrayBuffer().then((buffer) => new Uint8Array(buffer));
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
    reader.onerror = () => reject(reader.error ?? new Error('Could not read file'));
    reader.readAsArrayBuffer(blob);
  });
}

/** Builds a Blob from bytes without ever handing over a SharedArrayBuffer. */
export function bytesToBlob(bytes: Uint8Array, type: string): Blob {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return new Blob([copy], { type });
}
