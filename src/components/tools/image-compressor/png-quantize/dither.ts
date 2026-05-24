import { srgbToOKLab } from "./color-space";
import { KDTree } from "./kdtree";
import type { OKLab, PaletteEntry } from "./png-quantize.types";

interface DitherOptions {
  ditherStrength: number;
  noDither: boolean;
}

/**
 * Apply quantization + region-modulated Floyd-Steinberg dithering.
 * Error diffusion runs in OKLab so it tracks human perception rather
 * than gamma-encoded sRGB.
 *
 * Edge map controls per-pixel dither strength:
 *   - on edges (> 0.5): no dither (avoids jagging)
 *   - near edges (> 0.2): reduced strength
 *   - flat regions: full strength (gradients need it)
 *
 * Scan order is serpentine — left-to-right on even rows, right-to-left
 * on odd rows — to avoid the diagonal banding artifact that pure-FS
 * dithering produces on flat gradients.
 */
export function applyDither(
  imageData: ImageData,
  palette: PaletteEntry[],
  edgeMap: Float32Array,
  options: DitherOptions,
): ImageData {
  const { width, height, data } = imageData;
  const output = new Uint8ClampedArray(data.length);
  const kdtree = new KDTree(palette);

  // OKLab buffer for in-place error diffusion. Stride 3 (L, a, b).
  const labBuffer = new Float32Array(width * height * 3);
  for (let i = 0; i < width * height; i++) {
    const px = i * 4;
    const lab = srgbToOKLab(data[px], data[px + 1], data[px + 2]);
    labBuffer[i * 3] = lab.L;
    labBuffer[i * 3 + 1] = lab.a;
    labBuffer[i * 3 + 2] = lab.b;
  }

  const target: OKLab = { L: 0, a: 0, b: 0 };
  for (let y = 0; y < height; y++) {
    const leftToRight = (y & 1) === 0;
    const xStart = leftToRight ? 0 : width - 1;
    const xEnd = leftToRight ? width : -1;
    const xStep = leftToRight ? 1 : -1;
    // Floyd–Steinberg propagation directions, mirrored for R-to-L rows
    // so the kernel still pushes error in the scan direction.
    const dxForward = leftToRight ? 1 : -1;

    for (let x = xStart; x !== xEnd; x += xStep) {
      const i = y * width + x;
      const opx = i * 4;
      const sourceAlpha = data[opx + 3];

      // Transparent source pixels: write zero RGBA and skip propagation.
      // Their RGB is often pre-multiplied or undefined; diffusing that
      // error into visible neighbors causes color fringing at alpha
      // boundaries.
      if (sourceAlpha === 0) {
        output[opx]     = 0;
        output[opx + 1] = 0;
        output[opx + 2] = 0;
        output[opx + 3] = 0;
        continue;
      }

      const pi = i * 3;
      target.L = labBuffer[pi];
      target.a = labBuffer[pi + 1];
      target.b = labBuffer[pi + 2];

      const paletteIdx = kdtree.findNearest(target);
      const chosen = palette[paletteIdx];

      output[opx]     = chosen.rgba.r;
      output[opx + 1] = chosen.rgba.g;
      output[opx + 2] = chosen.rgba.b;
      // Preserve original per-pixel alpha so semi-transparent regions
      // remain smooth even after color quantization.
      output[opx + 3] = sourceAlpha;

      if (options.noDither) continue;

      const errL = target.L - chosen.oklab.L;
      const errA = target.a - chosen.oklab.a;
      const errB = target.b - chosen.oklab.b;

      const edgeHere = edgeMap[i];
      let strength = options.ditherStrength;
      if (edgeHere > 0.5) strength = 0;
      else if (edgeHere > 0.2) strength *= 0.3;
      if (strength === 0) continue;

      // FS kernel:        *  7/16
      //          3/16  5/16  1/16
      // For R-to-L rows the horizontal offsets flip so error still
      // travels in the scan direction.
      propagate(labBuffer, data, x + dxForward, y,     width, height, errL, errA, errB, (7 / 16) * strength);
      propagate(labBuffer, data, x - dxForward, y + 1, width, height, errL, errA, errB, (3 / 16) * strength);
      propagate(labBuffer, data, x,             y + 1, width, height, errL, errA, errB, (5 / 16) * strength);
      propagate(labBuffer, data, x + dxForward, y + 1, width, height, errL, errA, errB, (1 / 16) * strength);
    }
  }

  return new ImageData(output, width, height);
}

function propagate(
  buffer: Float32Array,
  data: Uint8ClampedArray,
  x: number,
  y: number,
  width: number,
  height: number,
  errL: number,
  errA: number,
  errB: number,
  weight: number,
): void {
  if (x < 0 || x >= width || y < 0 || y >= height) return;
  const i = y * width + x;
  // Don't push error into transparent pixels — they will be written as
  // (0,0,0,0) by the dither loop anyway, so the energy would be lost
  // and would only contaminate the L/a/b buffer values that subsequent
  // (visible) neighbors might still read from.
  if (data[i * 4 + 3] === 0) return;
  const pi = i * 3;
  buffer[pi]     += errL * weight;
  buffer[pi + 1] += errA * weight;
  buffer[pi + 2] += errB * weight;
}
