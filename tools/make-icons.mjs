// Generates PNG app icons without any dependency: draws a ring + wedge into an RGBA
// buffer and encodes it as PNG with node:zlib. Run: node tools/make-icons.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const crcTable = new Int32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c;
});
const crc32 = (buf) => {
  let c = -1;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
};

function png(size, paint) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = paint(x + 0.5, y + 0.5, size);
      const i = y * (size * 4 + 1) + 1 + x * 4;
      raw[i] = r; raw[i + 1] = g; raw[i + 2] = b; raw[i + 3] = a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0)),
  ]);
}

// Icon: rounded dark square, thick accent ring, 3/4 filled wedge (a timer at 15:00 left).
const BG = [22, 24, 33], RING = [58, 62, 80], ACC = [255, 122, 69], WHITE = [240, 240, 245];
function paint(x, y, s) {
  const c = s / 2, r = s * 0.44, rad = s * 0.22;
  // rounded square mask
  const dx = Math.max(Math.abs(x - c) - (c - rad), 0), dy = Math.max(Math.abs(y - c) - (c - rad), 0);
  if (Math.hypot(dx, dy) > rad) return [0, 0, 0, 0];
  const d = Math.hypot(x - c, y - c);
  const ring = s * 0.36, w = s * 0.075;
  let ang = Math.atan2(y - c, x - c) + Math.PI / 2; // 0 at 12 o'clock
  if (ang < 0) ang += Math.PI * 2;
  const inRing = Math.abs(d - ring) <= w;
  if (inRing) return [...(ang <= Math.PI * 1.5 ? ACC : RING), 255];
  // hand from centre to 12 o'clock
  if (Math.abs(x - c) < s * 0.03 && y < c && y > c - ring * 0.7) return [...WHITE, 255];
  if (d < s * 0.045) return [...WHITE, 255];
  return [...BG, 255];
}

mkdirSync(new URL('../app/icons/', import.meta.url), { recursive: true });
for (const size of [192, 512]) {
  writeFileSync(new URL(`../app/icons/icon-${size}.png`, import.meta.url), png(size, paint));
}
// maskable variant: same drawing but on a full-bleed background (safe zone = inner 80%)
for (const size of [512]) {
  writeFileSync(new URL(`../app/icons/maskable-${size}.png`, import.meta.url), png(size, (x, y, s) => {
    const p = paint(s * 0.1 + x * 0.8, s * 0.1 + y * 0.8, s);
    return p[3] === 0 ? [...BG, 255] : p;
  }));
}
console.log('icons written');
