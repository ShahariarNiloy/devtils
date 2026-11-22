/**
 * Invariant tests for the lossy PNG quantizer.
 *
 * Run: npx tsx src/components/tools/image-compressor/png-quantize/__tests__/quantize.test.ts
 */

/* eslint-disable no-console */

import { quantizePng, quantizeToIndexed } from "../index";

// Node has no ImageData; the quantizer only needs the data/width/height shape.
class NodeImageData {
  readonly data: Uint8ClampedArray;
  readonly width: number;
  readonly height: number;
  readonly colorSpace = "srgb";
  constructor(data: Uint8ClampedArray, width: number, height: number) {
    this.data = data;
    this.width = width;
    this.height = height;
  }
}
const g = globalThis as { ImageData?: unknown };
if (typeof g.ImageData === "undefined") g.ImageData = NodeImageData;

function makeImage(data: Uint8ClampedArray<ArrayBuffer>, width: number, height: number): ImageData {
  return new ImageData(data, width, height);
}

let pass = 0;
let fail = 0;
function check(name: string, ok: boolean, hint?: string): void {
  if (ok) {
    pass++;
    console.log(`  ✓ ${name}`);
  } else {
    fail++;
    console.log(`  ✗ ${name}${hint ? ` — ${hint}` : ""}`);
  }
}

/** Deterministic PRNG (mulberry32). */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function uniqueRgba(d: Uint8ClampedArray): number {
  const s = new Set<number>();
  for (let i = 0; i < d.length; i += 4) {
    s.add(((d[i] << 24) | (d[i + 1] << 16) | (d[i + 2] << 8) | d[i + 3]) >>> 0);
  }
  return s.size;
}

/** Photo-like: smooth 2-D gradient + noise, with a translucent radial falloff and a transparent border. */
function richImage(w: number, h: number, seed: number): Uint8ClampedArray<ArrayBuffer> {
  const r = rng(seed);
  const d = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      d[i] = Math.round((x / w) * 255 * 0.8 + r() * 30);
      d[i + 1] = Math.round((y / h) * 255 * 0.7 + r() * 30);
      d[i + 2] = Math.round(((x + y) / (w + h)) * 200 + r() * 40);
      const dx = x / w - 0.5;
      const dy = y / h - 0.5;
      const dist = Math.sqrt(dx * dx + dy * dy);
      // opaque core, translucent ring, fully transparent outside
      let alpha = 0;
      if (dist < 0.25) alpha = 255;
      else if (dist < 0.45) alpha = Math.round(255 * (1 - (dist - 0.25) / 0.2));
      d[i + 3] = alpha;
      if (d[i + 3] === 0) {
        // garbage RGB under α=0 must not leak or count
        d[i] = Math.round(r() * 255);
      }
    }
  }
  return d;
}

async function main(): Promise<void> {
  console.log("png-quantize");

  // 1. ≤ maxColors unique RGBA out, for several budgets.
  const W = 96;
  const H = 80;
  const src = richImage(W, H, 1);
  check("fixture has > 256 colours", uniqueRgba(src) > 256, `got ${uniqueRgba(src)}`);
  for (const maxColors of [256, 64, 16, 2]) {
    for (const quality of [100, 85, 40]) {
      const res = await quantizePng(makeImage(src.slice(), W, H), { quality, maxColors });
      const u = uniqueRgba(res.imageData.data);
      check(`q${quality} max${maxColors}: ${u} unique RGBA ≤ ${maxColors}`, u <= maxColors);
      check(`q${quality} max${maxColors}: paletteSize ≤ maxColors`, res.paletteSize <= maxColors);
      let alphaOk = true;
      for (let i = 3; i < src.length; i += 4) {
        const a = res.imageData.data[i];
        if ((src[i] === 0 && a !== 0) || (src[i] === 255 && a !== 255)) alphaOk = false;
      }
      check(`q${quality} max${maxColors}: α=0 and α=255 preserved`, alphaOk);
    }
  }

  // 2. Alpha invariants: α=0 stays α=0, α=255 stays α=255.
  {
    const res = await quantizePng(makeImage(src.slice(), W, H), { quality: 85, maxColors: 256 });
    const out = res.imageData.data;
    let transparentOk = true;
    let opaqueOk = true;
    for (let i = 3; i < src.length; i += 4) {
      if (src[i] === 0 && out[i] !== 0) transparentOk = false;
      if (src[i] === 255 && out[i] !== 255) opaqueOk = false;
    }
    check("fully transparent pixels stay fully transparent", transparentOk);
    check("opaque pixels stay opaque", opaqueOk);
    const noDither = await quantizePng(makeImage(src.slice(), W, H), {
      quality: 85,
      maxColors: 256,
      noDither: true,
    });
    let ndOk = true;
    for (let i = 3; i < src.length; i += 4) {
      if (src[i] === 0 && noDither.imageData.data[i] !== 0) ndOk = false;
      if (src[i] === 255 && noDither.imageData.data[i] !== 255) ndOk = false;
    }
    check("noDither keeps alpha invariants", ndOk);
  }

  // 3. Exact pass-through when the image already has ≤ maxColors colours.
  {
    const d = new Uint8ClampedArray(64 * 64 * 4);
    for (let p = 0; p < 64 * 64; p++) {
      const c = p % 200; // 200 distinct opaque colours
      d[p * 4] = c;
      d[p * 4 + 1] = 255 - c;
      d[p * 4 + 2] = (c * 7) & 255;
      d[p * 4 + 3] = 255;
    }
    const img = makeImage(d, 64, 64);
    const before = d.slice();
    const res = await quantizePng(img, { quality: 85, maxColors: 256 });
    check("≤256-colour image is returned as-is", res.imageData === img);
    let same = true;
    for (let i = 0; i < before.length; i++) if (res.imageData.data[i] !== before[i]) same = false;
    check("≤256-colour pixels untouched", same);
    check("pass-through reports 0 ΔE", res.meanDeltaE === 0);
    check("quantizeToIndexed returns null for ≤256 colours", quantizeToIndexed(img, { quality: 85 }) === null);

    // 257 colours must NOT pass through (the old bucket-count bug).
    const d2 = new Uint8ClampedArray(257 * 4);
    for (let p = 0; p < 257; p++) {
      d2[p * 4] = p & 255;
      d2[p * 4 + 1] = p >> 8;
      d2[p * 4 + 2] = 0;
      d2[p * 4 + 3] = 255;
    }
    const r2 = await quantizePng(makeImage(d2, 257, 1), { quality: 85, maxColors: 256 });
    check("257 near-identical colours get quantized to ≤256", uniqueRgba(r2.imageData.data) <= 256);
  }

  // 4. Pass-through normalises RGB hidden under α=0 without touching visible pixels.
  {
    const d = new Uint8ClampedArray(32 * 4);
    for (let p = 0; p < 32; p++) {
      d[p * 4] = p * 8;
      d[p * 4 + 1] = 10;
      d[p * 4 + 2] = 20;
      d[p * 4 + 3] = p < 16 ? 0 : 255;
    }
    const res = await quantizePng(makeImage(d.slice(), 32, 1), { quality: 85, maxColors: 20 });
    const out = res.imageData.data;
    let visibleSame = true;
    let transparentZero = true;
    for (let p = 0; p < 32; p++) {
      if (p >= 16) {
        for (let c = 0; c < 4; c++) if (out[p * 4 + c] !== d[p * 4 + c]) visibleSame = false;
      } else if (out[p * 4 + 3] !== 0) {
        transparentZero = false;
      }
    }
    check("α=0 variants collapse to one colour (17 ≤ 20)", uniqueRgba(out) <= 20);
    check("visible pixels untouched by the α=0 normalisation", visibleSame && transparentZero);
  }

  // 5. Determinism.
  {
    const a = await quantizePng(makeImage(src.slice(), W, H), { quality: 85, maxColors: 256 });
    const b = await quantizePng(makeImage(src.slice(), W, H), { quality: 85, maxColors: 256 });
    let same = a.paletteSize === b.paletteSize;
    for (let i = 0; i < a.imageData.data.length && same; i++) {
      if (a.imageData.data[i] !== b.imageData.data[i]) same = false;
    }
    check("identical input → identical output", same);
  }

  // 6. Indexed API agrees with the RGBA API.
  {
    const img = makeImage(src.slice(), W, H);
    const idx = quantizeToIndexed(img, { quality: 85, maxColors: 256 });
    const rgba = await quantizePng(makeImage(src.slice(), W, H), { quality: 85, maxColors: 256 });
    let ok = idx !== null && idx.indices.length === W * H && idx.paletteSize <= 256;
    if (idx !== null) {
      for (let p = 0; p < W * H && ok; p++) {
        const e = idx.indices[p];
        if (e >= idx.paletteSize) ok = false;
        for (let c = 0; c < 4; c++) if (idx.palette[e * 4 + c] !== rgba.imageData.data[p * 4 + c]) ok = false;
      }
    }
    check("quantizeToIndexed palette+indices reproduce quantizePng output", ok);
  }

  // 7. Fidelity sanity: a smooth opaque gradient keeps its colours.
  {
    const w = 256;
    const h = 64;
    const d = new Uint8ClampedArray(w * h * 4);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        d[i] = x;
        d[i + 1] = 128 + (y >> 1);
        d[i + 2] = 255 - x;
        d[i + 3] = 255;
      }
    }
    const res = await quantizePng(makeImage(d, w, h), { quality: 85, maxColors: 256 });
    check(`smooth gradient mean ΔE small (${res.meanDeltaE.toFixed(4)} < 0.02)`, res.meanDeltaE < 0.02);
  }

  // 8. Degenerate sizes.
  {
    const one = await quantizePng(makeImage(new Uint8ClampedArray([1, 2, 3, 4]), 1, 1), { quality: 85 });
    check("1×1 image passes through", one.imageData.data[3] === 4);
    let threw = false;
    try {
      await quantizePng(makeImage(new Uint8ClampedArray(0), 0, 0), { quality: 85 });
    } catch {
      threw = true;
    }
    check("empty image throws", threw);
  }

  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail > 0) process.exit(1);
}

void main();
