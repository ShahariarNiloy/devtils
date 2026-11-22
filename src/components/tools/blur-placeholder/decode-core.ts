/**
 * Decode core shared by the worker and the main-thread fallback:
 * createImageBitmap → browser high-quality resize to ≤ 256 px → exact
 * alpha-weighted area average to the ≤ 100 px working size (ThumbHash's
 * input limit). Pixels are read back in sRGB.
 */

import { resize, workingDims } from "./blur-placeholder.lib";

export interface Decoded {
  /** Original (EXIF-oriented) size. */
  w: number;
  h: number;
  sw: number;
  sh: number;
  px: Uint8ClampedArray;
}

const MID = 256;

function midDims(w: number, h: number) {
  const s = Math.min(1, MID / Math.max(w, h));
  return { w: Math.max(1, Math.round(w * s)), h: Math.max(1, Math.round(h * s)) };
}

type Ctx2D = OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D;

function readPixels(source: CanvasImageSource, w: number, h: number): Uint8ClampedArray {
  let ctx: Ctx2D | null;
  if (typeof OffscreenCanvas !== "undefined") {
    ctx = new OffscreenCanvas(w, h).getContext("2d", { willReadFrequently: true, colorSpace: "srgb" });
  } else {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    ctx = c.getContext("2d", { willReadFrequently: true, colorSpace: "srgb" });
  }
  if (!ctx) throw new Error("No 2D canvas");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, 0, 0, w, h);
  return ctx.getImageData(0, 0, w, h).data;
}

export async function fromBitmap(bmp: ImageBitmap | HTMLImageElement, W: number, H: number): Promise<Decoded> {
  const mid = midDims(W, H);
  let source: CanvasImageSource = bmp;
  let scaled: ImageBitmap | null = null;
  if (mid.w !== W || mid.h !== H) {
    try {
      scaled = await createImageBitmap(bmp, { resizeWidth: mid.w, resizeHeight: mid.h, resizeQuality: "high" });
      source = scaled;
    } catch {
      // Older engines: drawImage scales instead.
    }
  }
  const data = readPixels(source, mid.w, mid.h);
  scaled?.close();
  const wd = workingDims(W, H);
  const px = wd.w === mid.w && wd.h === mid.h ? data : resize(data, mid.w, mid.h, wd.w, wd.h);
  return { w: W, h: H, sw: wd.w, sh: wd.h, px };
}

/** Decode with createImageBitmap (works in a worker). */
export async function decodeBlob(blob: Blob): Promise<Decoded> {
  const bmp = await createImageBitmap(blob);
  try {
    if (!bmp.width || !bmp.height) throw new Error("Empty image");
    return await fromBitmap(bmp, bmp.width, bmp.height);
  } finally {
    bmp.close();
  }
}

