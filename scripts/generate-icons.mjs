/**
 * Generates the PWA icon set into public/icons/ with no external dependency.
 * Run with: npm run icons
 *
 * The artwork is the Car Rater hatchback: a pink car on the app's cream ground
 * for the "any" icons, and on the dark green for the maskable ones so the
 * safe-zone crop on Android still looks deliberate.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(here, '../public/icons');
mkdirSync(outDir, { recursive: true });

const CREAM = [250, 248, 244];
const GREEN = [23, 78, 69];
const PINK = [239, 71, 120];
const WHITE = [255, 255, 255];
const INK = [18, 24, 28];

/** Very small software rasteriser — enough for a car silhouette. */
function createCanvas(size, background) {
  const pixels = new Uint8Array(size * size * 3);
  for (let i = 0; i < size * size; i += 1) {
    pixels[i * 3] = background[0];
    pixels[i * 3 + 1] = background[1];
    pixels[i * 3 + 2] = background[2];
  }
  return pixels;
}

function blend(pixels, index, colour, alpha) {
  for (let c = 0; c < 3; c += 1) {
    const at = index * 3 + c;
    pixels[at] = Math.round(pixels[at] * (1 - alpha) + colour[c] * alpha);
  }
}

/** Anti-aliased shape fill via 3x3 supersampling of an inside() predicate. */
function fill(pixels, size, colour, inside) {
  const samples = 3;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let hits = 0;
      for (let sy = 0; sy < samples; sy += 1) {
        for (let sx = 0; sx < samples; sx += 1) {
          const px = x + (sx + 0.5) / samples;
          const py = y + (sy + 0.5) / samples;
          if (inside(px / size, py / size)) hits += 1;
        }
      }
      if (hits > 0) blend(pixels, y * size + x, colour, hits / (samples * samples));
    }
  }
}

const roundedRect = (x0, y0, x1, y1, r) => (x, y) => {
  if (x < x0 || x > x1 || y < y0 || y > y1) return false;
  const cx = Math.min(Math.max(x, x0 + r), x1 - r);
  const cy = Math.min(Math.max(y, y0 + r), y1 - r);
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
};

const circle = (cx, cy, r) => (x, y) => (x - cx) ** 2 + (y - cy) ** 2 <= r * r;

/** Draws the car, positioned inside the unit square with the given scale. */
function drawCar(pixels, size, { cx = 0.5, cy = 0.52, s = 1 } = {}) {
  const T = (fx, fy) => [cx + (fx - 0.5) * s, cy + (fy - 0.5) * s];
  const rect = (x0, y0, x1, y1, r) => {
    const [ax, ay] = T(x0, y0);
    const [bx, by] = T(x1, y1);
    return roundedRect(ax, ay, bx, by, r * s);
  };
  const circ = (x, y, r) => {
    const [ax, ay] = T(x, y);
    return circle(ax, ay, r * s);
  };

  // body
  fill(pixels, size, PINK, rect(0.12, 0.44, 0.88, 0.76, 0.13));
  // cabin
  fill(pixels, size, PINK, rect(0.24, 0.24, 0.76, 0.56, 0.14));
  // windows
  fill(pixels, size, WHITE, rect(0.29, 0.29, 0.485, 0.47, 0.05));
  fill(pixels, size, WHITE, rect(0.515, 0.29, 0.71, 0.47, 0.05));
  // headlights
  fill(pixels, size, WHITE, rect(0.155, 0.53, 0.28, 0.6, 0.035));
  fill(pixels, size, WHITE, rect(0.72, 0.53, 0.845, 0.6, 0.035));
  // grille
  fill(pixels, size, WHITE, rect(0.42, 0.63, 0.58, 0.695, 0.032));
  // wheels
  fill(pixels, size, INK, circ(0.265, 0.785, 0.088));
  fill(pixels, size, INK, circ(0.735, 0.785, 0.088));
}

function toPng(pixels, size) {
  const raw = Buffer.alloc(size * (size * 3 + 1));
  for (let y = 0; y < size; y += 1) {
    raw[y * (size * 3 + 1)] = 0;
    Buffer.from(pixels.buffer, y * size * 3, size * 3).copy(
      raw,
      y * (size * 3 + 1) + 1,
    );
  }

  const chunk = (type, data) => {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length);
    const typed = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(typed) >>> 0);
    return Buffer.concat([length, typed, crc]);
  };

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // truecolour
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return c ^ 0xffffffff;
}

function writeIcon(name, size, { maskable }) {
  const pixels = createCanvas(size, maskable ? GREEN : CREAM);
  if (!maskable) {
    // rounded cream plate so the icon reads well on any wallpaper
    fill(pixels, size, CREAM, roundedRect(0, 0, 1, 1, 0.22));
  }
  drawCar(pixels, size, { cy: 0.5, s: maskable ? 0.6 : 0.78 });
  writeFileSync(resolve(outDir, name), toPng(pixels, size));
  console.log(`wrote icons/${name} (${size}x${size})`);
}

writeIcon('icon-192.png', 192, { maskable: false });
writeIcon('icon-512.png', 512, { maskable: false });
writeIcon('maskable-192.png', 192, { maskable: true });
writeIcon('maskable-512.png', 512, { maskable: true });

// Matching favicon, vector so it stays sharp in a browser tab.
writeFileSync(
  resolve(outDir, '../favicon.svg'),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="#FAF8F4"/>
  <g transform="translate(6 9) scale(0.82)">
    <rect x="6" y="26" width="52" height="21" rx="9" fill="#EF4778"/>
    <rect x="14" y="13" width="36" height="22" rx="9" fill="#EF4778"/>
    <rect x="17.5" y="16.5" width="13" height="12" rx="3" fill="#fff"/>
    <rect x="33.5" y="16.5" width="13" height="12" rx="3" fill="#fff"/>
    <rect x="27" y="38" width="10" height="4.5" rx="2.2" fill="#fff"/>
    <circle cx="18" cy="49" r="5.6" fill="#12181C"/>
    <circle cx="46" cy="49" r="5.6" fill="#12181C"/>
  </g>
</svg>
`,
);
console.log('wrote favicon.svg');
