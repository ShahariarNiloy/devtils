/**
 * Smooth-gradient photo detector.
 *
 * 256-color palette quantization bands visibly on smooth, bright,
 * single-hue tonal ramps — clear sky, skin, sunsets. Those are the only
 * PNGs where "High" mode's "visually identical" promise can't be met by
 * quantization, so they're the only ones routed to lossless. Screenshots,
 * UI, illustrations and textured photos quantize fine and must NOT be
 * routed (forcing them lossless balloons the file).
 *
 * Signal: a block qualifies as "smooth-gradient" when it is
 *   - near a single hue        (low chroma variance), AND
 *   - gently varying in tone    (small but non-zero luma range), AND
 *   - free of edges / texture   (low high-frequency luma energy), AND
 *   - mid-to-bright             (excludes dark UI backgrounds).
 * The image is flagged when > SMOOTH_FRACTION of blocks qualify.
 *
 * Thresholds tuned empirically: screenshots / logos / noise land ~1%,
 * while real smooth photos and synthetic sky/skin/sunset hit 90–100%.
 */

import { srgbToOKLab } from "./png-quantize/color-space";

const ANALYSIS_MAX_DIM = 256; // downsample target (longest side)
const BLOCK = 16; // analysis tile size on the downsampled grid
const SMOOTH_FRACTION = 0.4; // flag when > 40% of tiles qualify
const CHROMA_VAR_MAX = 0.0008; // OKLab a/b variance — single-hue region
const LUMA_RANGE_MIN = 0.004; // tonal ramp present (excludes dead-flat fills)
const LUMA_EDGE_MAX = 0.02; // smooth — no text / edges / noise
const LUMA_MEAN_MIN = 0.35; // mid/bright — excludes dark UI backgrounds
const MIN_BLOCK_PIXELS = 16; // ignore sparse edge tiles

export function isSmoothGradientPhoto(imageData: ImageData): boolean {
  const { width: sw, height: sh, data: sd } = imageData;
  if (sw === 0 || sh === 0) return false;

  // 1. Box-average downsample to ≤ ANALYSIS_MAX_DIM. Fully-transparent
  //    source pixels are ignored so alpha cutouts don't skew the stats.
  const scale = Math.min(1, ANALYSIS_MAX_DIM / Math.max(sw, sh));
  const w = Math.max(1, Math.round(sw * scale));
  const h = Math.max(1, Math.round(sh * scale));
  const sumR = new Float64Array(w * h);
  const sumG = new Float64Array(w * h);
  const sumB = new Float64Array(w * h);
  const count = new Float64Array(w * h);
  for (let y = 0; y < sh; y++) {
    const dy = Math.min(h - 1, Math.floor((y * h) / sh));
    for (let x = 0; x < sw; x++) {
      const i = (y * sw + x) * 4;
      if (sd[i + 3] === 0) continue;
      const di = dy * w + Math.min(w - 1, Math.floor((x * w) / sw));
      sumR[di] += sd[i];
      sumG[di] += sd[i + 1];
      sumB[di] += sd[i + 2];
      count[di] += 1;
    }
  }

  // 2. OKLab per downsampled pixel.
  const L = new Float64Array(w * h);
  const a = new Float64Array(w * h);
  const b = new Float64Array(w * h);
  const ok = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    if (count[i] === 0) continue;
    const lab = srgbToOKLab(
      Math.round(sumR[i] / count[i]),
      Math.round(sumG[i] / count[i]),
      Math.round(sumB[i] / count[i]),
    );
    L[i] = lab.L;
    a[i] = lab.a;
    b[i] = lab.b;
    ok[i] = 1;
  }

  // 3. Classify each BLOCK×BLOCK tile.
  let blocks = 0;
  let smooth = 0;
  for (let by = 0; by < h; by += BLOCK) {
    for (let bx = 0; bx < w; bx += BLOCK) {
      const yEnd = Math.min(by + BLOCK, h);
      const xEnd = Math.min(bx + BLOCK, w);
      let n = 0;
      let sa = 0;
      let sb = 0;
      let saa = 0;
      let sbb = 0;
      let sl = 0;
      let minL = Infinity;
      let maxL = -Infinity;
      let edge = 0;
      let edgeN = 0;
      for (let y = by; y < yEnd; y++) {
        for (let x = bx; x < xEnd; x++) {
          const i = y * w + x;
          if (!ok[i]) continue;
          n++;
          sa += a[i];
          sb += b[i];
          saa += a[i] * a[i];
          sbb += b[i] * b[i];
          sl += L[i];
          if (L[i] < minL) minL = L[i];
          if (L[i] > maxL) maxL = L[i];
          if (x + 1 < xEnd && ok[i + 1]) {
            edge += Math.abs(L[i] - L[i + 1]);
            edgeN++;
          }
          if (y + 1 < yEnd && ok[i + w]) {
            edge += Math.abs(L[i] - L[i + w]);
            edgeN++;
          }
        }
      }
      if (n < MIN_BLOCK_PIXELS) continue;
      blocks++;
      const chromaVar =
        Math.max(0, saa / n - (sa / n) ** 2) +
        Math.max(0, sbb / n - (sb / n) ** 2);
      const lumaRange = maxL - minL;
      const meanEdge = edgeN > 0 ? edge / edgeN : 0;
      const meanL = sl / n;
      if (
        chromaVar < CHROMA_VAR_MAX &&
        lumaRange > LUMA_RANGE_MIN &&
        meanEdge < LUMA_EDGE_MAX &&
        meanL > LUMA_MEAN_MIN
      ) {
        smooth++;
      }
    }
  }

  return blocks > 0 && smooth / blocks > SMOOTH_FRACTION;
}
