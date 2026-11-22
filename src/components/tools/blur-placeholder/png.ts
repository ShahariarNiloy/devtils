/**
 * A tiny, exact PNG encoder for placeholder-sized images (≤ 64 × 64).
 *
 * Why not canvas.toDataURL("image/png")? A 2D canvas stores premultiplied
 * alpha, so semi-transparent pixels come back with shifted colours, and the
 * output differs between browsers. This writes the pixels you computed, bit
 * for bit: 8-bit truecolour (RGB or RGBA), every PNG row filter tried, and
 * the smaller of a stored or fixed-Huffman LZ77 deflate stream kept.
 *
 * Pure: no React, no DOM. `btoa` is the only global used.
 */

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

export function crc32(bytes: ArrayLike<number>, start = 0, end = bytes.length): number {
  let c = 0xffffffff;
  for (let i = start; i < end; i++) c = CRC_TABLE[(c ^ bytes[i]) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function adler32(bytes: ArrayLike<number>): number {
  let s1 = 1;
  let s2 = 0;
  for (let i = 0; i < bytes.length; i++) {
    s1 = (s1 + bytes[i]) % 65521;
    s2 = (s2 + s1) % 65521;
  }
  return ((s2 << 16) | s1) >>> 0;
}

/* ---------- deflate ---------- */

class BitWriter {
  out: number[] = [];
  private bit = 0;
  private cur = 0;
  /** Write `n` bits of `v`, least-significant first (deflate's bit order). */
  bits(v: number, n: number) {
    for (let i = 0; i < n; i++) {
      this.cur |= ((v >>> i) & 1) << this.bit;
      if (++this.bit === 8) {
        this.out.push(this.cur);
        this.bit = 0;
        this.cur = 0;
      }
    }
  }
  /** Write a Huffman code, most-significant bit first. */
  code(c: number, n: number) {
    for (let i = n - 1; i >= 0; i--) this.bits((c >>> i) & 1, 1);
  }
  flush() {
    if (this.bit) this.out.push(this.cur);
    this.bit = 0;
    this.cur = 0;
  }
}

const LEN_BASE = [3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258];
const LEN_EXTRA = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0];
const DIST_BASE = [
  1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145, 8193,
  12289, 16385, 24577,
];
const DIST_EXTRA = [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13];

function writeLiteral(w: BitWriter, sym: number) {
  if (sym <= 143) w.code(0x30 + sym, 8);
  else if (sym <= 255) w.code(0x190 + sym - 144, 9);
  else if (sym <= 279) w.code(sym - 256, 7);
  else w.code(0xc0 + sym - 280, 8);
}

function writeMatch(w: BitWriter, len: number, dist: number) {
  let li = LEN_BASE.length - 1;
  while (LEN_BASE[li] > len) li--;
  writeLiteral(w, 257 + li);
  if (LEN_EXTRA[li]) w.bits(len - LEN_BASE[li], LEN_EXTRA[li]);
  let di = DIST_BASE.length - 1;
  while (DIST_BASE[di] > dist) di--;
  w.code(di, 5);
  if (DIST_EXTRA[di]) w.bits(dist - DIST_BASE[di], DIST_EXTRA[di]);
}

/** One fixed-Huffman block with greedy hash-chain LZ77. */
function deflateFixed(data: Uint8Array): number[] {
  const w = new BitWriter();
  w.bits(1, 1); // BFINAL
  w.bits(1, 2); // BTYPE = 01 (fixed Huffman)
  const head = new Map<number, number>();
  const prev = new Int32Array(data.length).fill(-1);
  const key = (i: number) => (data[i] << 16) | (data[i + 1] << 8) | data[i + 2];
  const insert = (i: number) => {
    if (i + 2 >= data.length) return;
    const k = key(i);
    prev[i] = head.get(k) ?? -1;
    head.set(k, i);
  };
  let i = 0;
  while (i < data.length) {
    let bestLen = 0;
    let bestDist = 0;
    if (i + 2 < data.length) {
      let cand = head.get(key(i)) ?? -1;
      let chain = 0;
      while (cand >= 0 && i - cand <= 32768 && chain++ < 128) {
        let l = 0;
        const max = Math.min(258, data.length - i);
        while (l < max && data[cand + l] === data[i + l]) l++;
        if (l > bestLen) {
          bestLen = l;
          bestDist = i - cand;
          if (l === max) break;
        }
        cand = prev[cand];
      }
    }
    if (bestLen >= 3) {
      writeMatch(w, bestLen, bestDist);
      for (let k = 0; k < bestLen; k++) insert(i + k);
      i += bestLen;
    } else {
      writeLiteral(w, data[i]);
      insert(i);
      i++;
    }
  }
  writeLiteral(w, 256);
  w.flush();
  return w.out;
}

function deflateStored(data: Uint8Array): number[] {
  const out: number[] = [];
  let pos = 0;
  do {
    const len = Math.min(65535, data.length - pos);
    const last = pos + len >= data.length ? 1 : 0;
    out.push(last, len & 255, len >> 8, ~len & 255, (~len >> 8) & 255);
    for (let k = 0; k < len; k++) out.push(data[pos + k]);
    pos += len;
  } while (pos < data.length);
  return out;
}

/** zlib stream (RFC 1950) around the smaller deflate encoding. */
export function zlib(data: Uint8Array): number[] {
  const fixed = deflateFixed(data);
  const stored = deflateStored(data);
  const body = fixed.length < stored.length ? fixed : stored;
  const a = adler32(data);
  return [0x78, 0x01, ...body, (a >>> 24) & 255, (a >>> 16) & 255, (a >>> 8) & 255, a & 255];
}

/* ---------- PNG ---------- */

function paeth(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  return pb <= pc ? b : c;
}

/** Every filter applied to every row: rows[y][type] = filter byte + filtered bytes. */
function filterAll(w: number, h: number, px: ArrayLike<number>, ch: number): Uint8Array[][] {
  const stride = w * ch;
  const at = (y: number, x: number) => (y < 0 || x < 0 ? 0 : px[(y * w + Math.floor(x / ch)) * 4 + (x % ch)]);
  const rows: Uint8Array[][] = [];
  for (let y = 0; y < h; y++) {
    const variants: Uint8Array[] = [];
    for (let type = 0; type <= 4; type++) {
      const out = new Uint8Array(stride + 1);
      out[0] = type;
      for (let x = 0; x < stride; x++) {
        const a = at(y, x - ch);
        const b = at(y - 1, x);
        const c = at(y - 1, x - ch);
        const pred = [0, a, b, (a + b) >> 1, paeth(a, b, c)][type];
        out[1 + x] = (at(y, x) - pred) & 255;
      }
      variants.push(out);
    }
    rows.push(variants);
  }
  return rows;
}

const join = (rows: Uint8Array[]): Uint8Array => {
  const out = new Uint8Array(rows.reduce((n, r) => n + r.length, 0));
  let o = 0;
  for (const r of rows) {
    out.set(r, o);
    o += r.length;
  }
  return out;
};

/** Signed-sum heuristic from libpng: the row whose bytes stay closest to zero. */
const rowCost = (r: Uint8Array) => {
  let s = 0;
  for (let i = 1; i < r.length; i++) s += r[i] < 128 ? r[i] : 256 - r[i];
  return s;
};

function u32(n: number): number[] {
  return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
}

function chunk(type: string, data: number[]): number[] {
  const td = [type.charCodeAt(0), type.charCodeAt(1), type.charCodeAt(2), type.charCodeAt(3), ...data];
  return [...u32(data.length), ...td, ...u32(crc32(td))];
}

/**
 * Encode RGBA pixels (not premultiplied) as PNG bytes. `alpha: false` writes
 * an RGB image and ignores the alpha channel.
 */
export function encodePng(w: number, h: number, px: ArrayLike<number>, alpha: boolean): Uint8Array {
  const ch = alpha ? 4 : 3;
  const rows = filterAll(w, h, px, ch);
  const candidates: Uint8Array[][] = [];
  // One filter for every row (5 candidates)…
  for (let type = 0; type <= 4; type++) candidates.push(rows.map((r) => r[type]));
  // …the per-row heuristic…
  candidates.push(rows.map((r) => r.reduce((best, v) => (rowCost(v) < rowCost(best) ? v : best))));
  // …and, for placeholder-sized images, per-row choice by actual compressed size.
  if (w * h <= 256) {
    const picked: Uint8Array[] = [];
    for (const r of rows) {
      let bestRow = r[0];
      let bestLen = Infinity;
      for (const v of r) {
        const len = zlib(join([...picked, v])).length;
        if (len < bestLen) {
          bestLen = len;
          bestRow = v;
        }
      }
      picked.push(bestRow);
    }
    candidates.push(picked);
  }
  let best: number[] | null = null;
  for (const c of candidates) {
    const z = zlib(join(c));
    if (!best || z.length < best.length) best = z;
  }
  const ihdr = [...u32(w), ...u32(h), 8, alpha ? 6 : 2, 0, 0, 0];
  return new Uint8Array([
    137, 80, 78, 71, 13, 10, 26, 10,
    ...chunk("IHDR", ihdr),
    ...chunk("IDAT", best ?? []),
    ...chunk("IEND", []),
  ]);
}

export function bytesToBase64(bytes: ArrayLike<number>): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

export function pngDataUrl(w: number, h: number, px: ArrayLike<number>, alpha: boolean): string {
  return "data:image/png;base64," + bytesToBase64(encodePng(w, h, px, alpha));
}
