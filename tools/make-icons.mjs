// Generates PNG app icons without any dependency: draws into an RGBA buffer and encodes it as
// PNG with node:zlib. Run: node tools/make-icons.mjs
// Icon: indigo rounded square, the five-colour ribbon sweeping across as a wide arc, and a cream
// timer ring with a hand on top (its inside is filled so the digits' colours never clash).
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

// 4x supersampling for smooth edges
function png(size, paint) {
  const SS = 4;
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < SS; sy++) for (let sx = 0; sx < SS; sx++) {
        const [pr, pg, pb, pa] = paint(x + (sx + 0.5) / SS, y + (sy + 0.5) / SS, size);
        r += pr * pa; g += pg * pa; b += pb * pa; a += pa;
      }
      const i = y * (size * 4 + 1) + 1 + x * 4;
      const n = SS * SS;
      raw[i] = a ? Math.round(r / a) : 0; raw[i + 1] = a ? Math.round(g / a) : 0; raw[i + 2] = a ? Math.round(b / a) : 0; raw[i + 3] = Math.round(a / n);
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

const BG = [13, 10, 31], CREAM = [242, 237, 226];
const STRIPES = [[67, 217, 232], [67, 201, 79], [242, 195, 39], [240, 115, 28], [220, 43, 31]];

function paint(x, y, s, { bleed = false } = {}) {
  const c = s / 2, rad = s * 0.22;
  if (!bleed) {
    const dx = Math.max(Math.abs(x - c) - (c - rad), 0), dy = Math.max(Math.abs(y - c) - (c - rad), 0);
    if (Math.hypot(dx, dy) > rad) return [0, 0, 0, 0];
  }
  // ribbon: concentric arcs around a centre off the bottom-right corner
  const cx = s * 1.18, cy = s * 1.18;
  const d = Math.hypot(x - cx, y - cy);
  const w = s * 0.075, r0 = s * 0.78;
  const band = Math.floor((d - r0) / w);
  let col = BG;
  if (band >= 0 && band < 5) col = STRIPES[4 - band]; // red innermost, cyan outermost
  // timer ring with a filled inside
  const dc = Math.hypot(x - c, y - c);
  const ring = s * 0.25, rw = s * 0.055;
  if (dc < ring + rw) {
    if (Math.abs(dc - ring) <= rw) {
      let ang = Math.atan2(y - c, x - c) + Math.PI / 2;
      if (ang < 0) ang += Math.PI * 2;
      return [...(ang <= Math.PI * 1.5 ? CREAM : [58, 52, 96]), 255];
    }
    if (Math.abs(x - c) < s * 0.028 && y < c - s * 0.02 && y > c - ring * 0.72) return [...CREAM, 255];
    if (dc < s * 0.04) return [...CREAM, 255];
    return [...BG, 255];
  }
  return [...col, 255];
}

mkdirSync(new URL('../app/icons/', import.meta.url), { recursive: true });
for (const size of [192, 512]) {
  writeFileSync(new URL(`../app/icons/icon-${size}.png`, import.meta.url), png(size, paint));
}
// maskable: full-bleed background, artwork scaled into the inner 80% safe zone
writeFileSync(new URL('../app/icons/maskable-512.png', import.meta.url), png(512, (x, y, s) => {
  const p = paint((x - s * 0.1) / 0.8, (y - s * 0.1) / 0.8, s, { bleed: true });
  return p;
}));
console.log('icons written');
