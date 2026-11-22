/**
 * Small queue thumbnails.
 *
 * The queue card shows a 40px square. Pointing its <img> at the original
 * object URL made the browser keep 12–70 MP bitmaps around just to draw 40px
 * squares, and re-decode them as rows scrolled in and out of view — the
 * queue stuttered with ~15 large photos. Here each image is decoded once,
 * already downscaled (`createImageBitmap` with `resizeWidth` decodes off the
 * main thread), and re-encoded as a tiny WebP. Two at a time, so a batch of
 * huge photos doesn't spike memory.
 */

/** Long enough for a 40px cover-crop on a 2–3× display, whatever the aspect. */
const THUMB_WIDTH = 160;
const MAX_CONCURRENT = 2;

let active = 0;
const waiting: (() => void)[] = [];

async function slot<T>(run: () => Promise<T>): Promise<T> {
  if (active >= MAX_CONCURRENT) await new Promise<void>((resolve) => waiting.push(resolve));
  active++;
  try {
    return await run();
  } finally {
    active--;
    waiting.shift()?.();
  }
}

/**
 * Object URL of a ~160px-wide thumbnail, or `null` when the browser can't
 * decode the file (e.g. HEIC in Chrome) — callers fall back to the preview.
 * The caller owns the URL and must revoke it.
 */
export function makeThumbnail(source: Blob): Promise<string | null> {
  return slot(async () => {
    let bitmap: ImageBitmap | null = null;
    try {
      bitmap = await createImageBitmap(source, {
        resizeWidth: THUMB_WIDTH,
        resizeQuality: "medium",
        imageOrientation: "from-image",
      });
      const blob = await encode(bitmap);
      return blob ? URL.createObjectURL(blob) : null;
    } catch {
      return null;
    } finally {
      bitmap?.close();
    }
  });
}

async function encode(bitmap: ImageBitmap): Promise<Blob | null> {
  if (typeof OffscreenCanvas !== "undefined") {
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(bitmap, 0, 0);
    return canvas.convertToBlob({ type: "image/webp", quality: 0.8 });
  }
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(bitmap, 0, 0);
  return new Promise((resolve) => canvas.toBlob(resolve, "image/webp", 0.8));
}
