/**
 * Browser image codecs for the PDF worker (or the page, as a fallback):
 * decode with createImageBitmap *without colour conversion*, so the pixel
 * values the PDF's colour space interprets are exactly the ones we
 * re-encode, then downscale and write JPEGs through OffscreenCanvas.
 */

import type { ImageType } from "./image-probe.lib";
import type { Pixels, RasterCodec } from "./images-to-pdf.lib";
import type { ImageCodec } from "./pdf-ops.lib";

async function encode(src: ImageBitmap, quality: number, maxPx: number) {
  const s = Math.min(1, maxPx / Math.max(src.width, src.height));
  const w = Math.max(1, Math.round(src.width * s));
  const h = Math.max(1, Math.round(src.height * s));
  const canvas = new OffscreenCanvas(w, h);
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(src, 0, 0, w, h);
  src.close();
  const blob = await canvas.convertToBlob({ type: "image/jpeg", quality });
  return { bytes: new Uint8Array(await blob.arrayBuffer()), w, h };
}

export const browserCodec: ImageCodec = {
  async fromJpeg(jpeg, quality, maxPx) {
    const bmp = await createImageBitmap(
      new Blob([jpeg as Uint8Array<ArrayBuffer>], { type: "image/jpeg" }),
      {
        colorSpaceConversion: "none",
        premultiplyAlpha: "none",
      },
    );
    return encode(bmp, quality, maxPx);
  },
  async fromPixels(px, w, h, channels, quality, maxPx) {
    const rgba = new Uint8ClampedArray(w * h * 4);
    for (let i = 0, o = 0; i < w * h; i++, o += 4) {
      const k = i * channels;
      rgba[o] = px[k];
      rgba[o + 1] = channels === 3 ? px[k + 1] : px[k];
      rgba[o + 2] = channels === 3 ? px[k + 2] : px[k];
      rgba[o + 3] = 255;
    }
    const bmp = await createImageBitmap(new ImageData(rgba, w, h), {
      colorSpaceConversion: "none",
    });
    return encode(bmp, quality, maxPx);
  },
};

const RAW = { colorSpaceConversion: "none", premultiplyAlpha: "none" } as const;

/** Upright bitmap of any image the browser reads; HEIC falls back to libheif. */
async function bitmapOf(
  bytes: Uint8Array,
  type: ImageType,
  options: ImageBitmapOptions = RAW,
): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(
      new Blob([bytes as Uint8Array<ArrayBuffer>]),
      options,
    );
  } catch (e) {
    // Safari reads HEIC natively; elsewhere it's WASM, loaded on first use.
    if (type !== "heic") throw e;
    const { decodeHeic } =
      await import("../image-compressor/image-compressor.heic");
    return createImageBitmap(await decodeHeic(bytes.slice().buffer));
  }
}

function canvasFor(w: number, h: number) {
  const canvas = new OffscreenCanvas(w, h);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No 2D canvas");
  ctx.imageSmoothingQuality = "high";
  return { canvas, ctx };
}

const fitIn = (w: number, h: number, maxPx: number) => {
  const s = Math.min(1, maxPx / Math.max(w, h));
  return {
    w: Math.max(1, Math.round(w * s)),
    h: Math.max(1, Math.round(h * s)),
  };
};

async function previewJpeg(
  bmp: ImageBitmap,
  w: number,
  h: number,
): Promise<Uint8Array> {
  const { canvas, ctx } = canvasFor(w, h);
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(bmp, 0, 0, w, h);
  bmp.close();
  const blob = await canvas.convertToBlob({ type: "image/jpeg", quality: 0.8 });
  return new Uint8Array(await blob.arrayBuffer());
}

export const rasterCodec: RasterCodec = {
  async decode(bytes, type, maxPx): Promise<Pixels> {
    const bmp = await bitmapOf(bytes, type);
    const { w, h } = fitIn(bmp.width, bmp.height, maxPx);
    const { ctx } = canvasFor(w, h);
    ctx.drawImage(bmp, 0, 0, w, h);
    bmp.close();
    return { rgba: ctx.getImageData(0, 0, w, h).data, w, h };
  },
  async jpeg(px, quality) {
    const { canvas, ctx } = canvasFor(px.w, px.h);
    ctx.putImageData(new ImageData(px.rgba, px.w, px.h), 0, 0);
    const blob = await canvas.convertToBlob({ type: "image/jpeg", quality });
    return new Uint8Array(await blob.arrayBuffer());
  },
  async thumbnail(blob, type, size, px) {
    if (size && type !== "heic") {
      // Decode straight to preview size — far cheaper than a 12 MP decode.
      const t = fitIn(size.w, size.h, px);
      try {
        const bmp = await createImageBitmap(blob, {
          resizeWidth: t.w,
          resizeHeight: t.h,
          resizeQuality: "medium",
        });
        if (bmp.width === t.w && bmp.height === t.h)
          return {
            jpeg: await previewJpeg(bmp, t.w, t.h),
            w: size.w,
            h: size.h,
          };
        bmp.close();
      } catch {
        /* decode in full below */
      }
    }
    // Previews are viewed on screen, so let the browser convert to sRGB here.
    const bmp = await bitmapOf(
      new Uint8Array(await blob.arrayBuffer()),
      type,
      {},
    );
    // Read the size first: previewJpeg closes the bitmap, which zeroes it.
    const { width: w, height: h } = bmp;
    const t = fitIn(w, h, px);
    return { jpeg: await previewJpeg(bmp, t.w, t.h), w, h };
  },
};
