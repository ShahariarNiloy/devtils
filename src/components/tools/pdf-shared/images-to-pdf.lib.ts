/**
 * Images → PDF (pdf-lib), run in the PDF worker. Decoding and JPEG encoding
 * come from a `RasterCodec` (createImageBitmap + OffscreenCanvas in the
 * browser, a stand-in in tests); everything else here is pure.
 *
 * Quality and colour rules:
 * - JPEGs go in byte-for-byte whenever they're small enough — untouched
 *   mode always, CMYK and grey always (re-encoding could shift them).
 * - Screenshots and other non-photos stay lossless (Flate) in every mode.
 * - Pixels are read without colour conversion and the source's ICC profile
 *   travels with them, so Display P3 photos keep their colours.
 * - EXIF orientation is applied as a transform; PDF viewers ignore EXIF.
 */

import {
  clip,
  concatTransformationMatrix,
  drawObject,
  endPath,
  popGraphicsState,
  pushGraphicsState,
  PDFDocument,
  PDFName,
  PDFRawStream,
  rectangle,
  type PDFObject,
  type PDFRef,
} from "pdf-lib";
import {
  extractIcc,
  iccProfileBytes,
} from "../image-compressor/image-compressor.icc";
import { layoutPage, SIZE_MODES, turned } from "./image-layout.lib";
import {
  compose,
  headerSize,
  jpegFrame,
  jpegOrientation,
  sniffImage,
  swapsSides,
  uprightMatrix,
  type ImageType,
  type JpegFrame,
  type Orientation,
} from "./image-probe.lib";
import {
  deflate,
  FAST_SAVE,
  inPool,
  looksLikePhoto,
  PdfOpError,
} from "./pdf-ops.lib";
import type { ImageInfo, ImageInfoJob, ImagesJob } from "./pdf-ops.types";

export interface Pixels {
  /** Upright (EXIF applied), straight alpha, values as stored. */
  rgba: Uint8ClampedArray<ArrayBuffer>;
  w: number;
  h: number;
}

export interface RasterCodec {
  /** Decode to upright RGBA, at most `maxPx` on the long side, without colour conversion. */
  decode(bytes: Uint8Array, type: ImageType, maxPx: number): Promise<Pixels>;
  /** Opaque RGBA → JPEG. */
  jpeg(px: Pixels, quality: number): Promise<Uint8Array>;
  /** A JPEG preview at most `px` on the long side, plus the upright size (from `size` when known). */
  thumbnail(
    blob: Blob,
    type: ImageType,
    size: { w: number; h: number } | null,
    px: number,
  ): Promise<{ jpeg: Uint8Array; w: number; h: number }>;
}

const N = (s: string) => PDFName.of(s);
const MIME: Partial<Record<ImageType, string>> = {
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  heic: "image/avif",
  avif: "image/avif",
};
const PROFILE_SPACE = { 1: "GRAY", 3: "RGB ", 4: "CMYK" } as const;
const DEVICE = { 1: "DeviceGray", 3: "DeviceRGB", 4: "DeviceCMYK" } as const;
type Channels = keyof typeof DEVICE;
/** JPEG component count → colour channels (YCbCr is 3). */
const channelsOf = (components: number): Channels =>
  components === 1 || components === 4 ? components : 3;

/** The file's ICC profile, if it has one for this many channels. */
async function profileOf(
  bytes: Uint8Array,
  type: ImageType,
  channels: Channels,
): Promise<Uint8Array | null> {
  const mime = MIME[type];
  if (!mime) return null;
  const raw = extractIcc(bytes.buffer as ArrayBuffer, mime);
  const profile = raw && (await iccProfileBytes(raw, mime));
  if (!profile || profile.length < 128) return null;
  return String.fromCharCode(...profile.subarray(16, 20)) ===
    PROFILE_SPACE[channels]
    ? profile
    : null;
}

/** Split RGBA into packed RGB and, when anything is see-through, an alpha plane. */
export function splitAlpha(rgba: Uint8ClampedArray): {
  rgb: Uint8Array;
  alpha: Uint8Array | null;
} {
  const n = rgba.length / 4;
  const rgb = new Uint8Array(n * 3);
  let opaque = true;
  for (let i = 0, o = 0; i < n; i++, o += 3) {
    rgb[o] = rgba[i * 4];
    rgb[o + 1] = rgba[i * 4 + 1];
    rgb[o + 2] = rgba[i * 4 + 2];
    if (rgba[i * 4 + 3] !== 255) opaque = false;
  }
  if (opaque) return { rgb, alpha: null };
  const alpha = new Uint8Array(n);
  for (let i = 0; i < n; i++) alpha[i] = rgba[i * 4 + 3];
  return { rgb, alpha };
}

/** RGBA flattened onto white — JPEG has no alpha, and the page is white. */
export function onWhite(
  rgba: Uint8ClampedArray,
): Uint8ClampedArray<ArrayBuffer> {
  const out = new Uint8ClampedArray(rgba.length);
  for (let i = 0; i < rgba.length; i += 4) {
    const a = rgba[i + 3] / 255;
    out[i] = rgba[i] * a + 255 * (1 - a);
    out[i + 1] = rgba[i + 1] * a + 255 * (1 - a);
    out[i + 2] = rgba[i + 2] * a + 255 * (1 - a);
    out[i + 3] = 255;
  }
  return out;
}

interface Prepared {
  ref: PDFRef;
  /** Stored size; `o` turns it upright. */
  w: number;
  h: number;
  o: Orientation;
}

class Writer {
  private profiles = new Map<string, PDFRef>();
  constructor(readonly doc: PDFDocument) {}

  private register(
    dict: Record<string, PDFObject | number | string>,
    bytes: Uint8Array,
  ): PDFRef {
    const ctx = this.doc.context;
    const d = ctx.obj({});
    for (const [k, v] of Object.entries(dict)) {
      if (typeof v === "number") d.set(N(k), ctx.obj(v));
      else d.set(N(k), typeof v === "string" ? N(v) : v);
    }
    return ctx.register(PDFRawStream.of(d, bytes));
  }

  /** A colour space: ICC-tagged when the file had a profile. */
  private async space(
    profile: Uint8Array | null,
    channels: Channels,
  ): Promise<PDFObject> {
    const device = N(DEVICE[channels]);
    if (!profile) return device;
    const key = `${profile.length}:${String.fromCharCode(...profile.subarray(0, 4096))}`;
    let ref = this.profiles.get(key);
    if (!ref) {
      ref = this.register(
        { N: channels, Alternate: device, Filter: "FlateDecode" },
        await deflate(profile),
      );
      this.profiles.set(key, ref);
    }
    return this.doc.context.obj([N("ICCBased"), ref]);
  }

  async jpeg(
    bytes: Uint8Array,
    f: Pick<JpegFrame, "w" | "h" | "components" | "adobe">,
    profile: Uint8Array | null,
    smask: PDFRef | null,
  ): Promise<PDFRef> {
    const channels = channelsOf(f.components);
    const dict: Record<string, PDFObject | number | string> = {
      Type: "XObject",
      Subtype: "Image",
      Width: f.w,
      Height: f.h,
      BitsPerComponent: 8,
      ColorSpace: await this.space(profile, channels),
      Filter: "DCTDecode",
    };
    // Adobe-written CMYK JPEGs store their values inverted.
    if (channels === 4 && f.adobe)
      dict.Decode = this.doc.context.obj([1, 0, 1, 0, 1, 0, 1, 0]);
    if (smask) dict.SMask = smask;
    return this.register(dict, bytes);
  }

  async flate(
    rgb: Uint8Array,
    w: number,
    h: number,
    profile: Uint8Array | null,
    smask: PDFRef | null,
  ): Promise<PDFRef> {
    const dict: Record<string, PDFObject | number | string> = {
      Type: "XObject",
      Subtype: "Image",
      Width: w,
      Height: h,
      BitsPerComponent: 8,
      ColorSpace: await this.space(profile, 3),
      Filter: "FlateDecode",
    };
    if (smask) dict.SMask = smask;
    return this.register(dict, await deflate(rgb));
  }

  async mask(alpha: Uint8Array, w: number, h: number): Promise<PDFRef> {
    return this.register(
      {
        Type: "XObject",
        Subtype: "Image",
        Width: w,
        Height: h,
        BitsPerComponent: 8,
        ColorSpace: "DeviceGray",
        Filter: "FlateDecode",
      },
      await deflate(alpha),
    );
  }
}

async function prepare(
  w: Writer,
  im: ImagesJob["images"][number],
  job: ImagesJob,
  codec: RasterCodec,
): Promise<Prepared> {
  const bytes = new Uint8Array(await im.blob.arrayBuffer());
  const type = sniffImage(bytes);
  if (!type) throw new PdfOpError(`“${im.name}” isn't an image we can read.`);
  const { maxPx, quality } = SIZE_MODES[job.mode];
  const frame = type === "jpeg" ? jpegFrame(bytes) : null;

  const asIs = async (f: JpegFrame): Promise<Prepared> => {
    const channels = channelsOf(f.components);
    const ref = await w.jpeg(
      bytes,
      f,
      await profileOf(bytes, type, channels),
      null,
    );
    return { ref, w: f.w, h: f.h, o: jpegOrientation(bytes) };
  };
  // Untouched mode, and JPEGs whose colours a re-encode could shift.
  if (frame && (job.mode === "original" || frame.components !== 3))
    return asIs(frame);

  let px: Pixels;
  try {
    px = await codec.decode(bytes, type, maxPx);
  } catch {
    if (frame) return asIs(frame);
    throw new PdfOpError(
      type === "heic"
        ? `“${im.name}” couldn't be decoded. Export it from Photos as JPEG and add it again.`
        : `“${im.name}” couldn't be decoded. It may be damaged.`,
    );
  }
  const profile = await profileOf(bytes, type, 3);
  const { rgb, alpha } = splitAlpha(px.rgba);
  const smask = alpha ? await w.mask(alpha, px.w, px.h) : null;

  // JPEG sources stay JPEG; other photos become JPEG unless kept untouched.
  const photo =
    frame !== null || (job.mode !== "original" && looksLikePhoto(rgb, 3));
  if (photo) {
    const enc = await codec.jpeg(
      alpha ? { ...px, rgba: onWhite(px.rgba) } : px,
      quality,
    );
    // Already small enough and the re-save barely helps: keep the original bytes.
    if (
      frame &&
      Math.max(frame.w, frame.h) <= maxPx &&
      enc.length > bytes.length * 0.9
    )
      return asIs(frame);
    const ref = await w.jpeg(
      enc,
      { w: px.w, h: px.h, components: 3, adobe: false },
      profile,
      smask,
    );
    return { ref, w: px.w, h: px.h, o: 1 };
  }
  return {
    ref: await w.flate(rgb, px.w, px.h, profile, smask),
    w: px.w,
    h: px.h,
    o: 1,
  };
}

/** One page per image, in order. `onProgress` fires as each image is ready. */
export async function imagesToPdf(
  job: ImagesJob,
  codec: RasterCodec,
  onProgress?: (done: number, total: number) => void,
): Promise<Uint8Array> {
  if (!job.images.length) throw new PdfOpError("Add at least one image.");
  const doc = await PDFDocument.create({ updateMetadata: false });
  const writer = new Writer(doc);
  const ready: Prepared[] = new Array(job.images.length);
  let done = 0;
  // Two at a time: decoding runs on the browser's own threads, and a pair
  // of 12-megapixel photos is the most worth holding in memory at once.
  await inPool(
    job.images.map((im, i) => ({ im, i })),
    2,
    async ({ im, i }) => {
      ready[i] = await prepare(writer, im, job, codec);
      onProgress?.(++done, job.images.length);
    },
  );

  job.images.forEach((im, i) => {
    const p = ready[i];
    const upright = swapsSides(p.o) ? { w: p.h, h: p.w } : { w: p.w, h: p.h };
    const shown = turned(upright.w, upright.h, im.rotate);
    const L = layoutPage(shown.w, shown.h, job.layout);
    const page = doc.addPage([L.pw, L.ph]);
    const name = page.node.newXObject("Im", p.ref);
    const m = compose(
      [L.box.w, 0, 0, L.box.h, L.box.x, L.box.y],
      uprightMatrix(p.o, im.rotate),
    );
    page.pushOperators(
      pushGraphicsState(),
      ...(L.cropped
        ? [
            rectangle(L.inner.x, L.inner.y, L.inner.w, L.inner.h),
            clip(),
            endPath(),
          ]
        : []),
      concatTransformationMatrix(...m),
      drawObject(name),
      popGraphicsState(),
    );
  });
  doc.setProducer("utilyx");
  doc.setCreator("utilyx");
  return doc.save({ ...FAST_SAVE, useObjectStreams: true });
}

/** Most headers sit in the first few KB; EXIF and ICC can push the frame to ~200 KB. */
const HEAD = 512 * 1024;

/** Format, upright size and a preview — what the page grid needs. */
export async function imageInfo(
  job: ImageInfoJob,
  codec: RasterCodec,
): Promise<{ info: ImageInfo; thumb: Uint8Array }> {
  let head = new Uint8Array(await job.blob.slice(0, HEAD).arrayBuffer());
  const type = sniffImage(head);
  if (!type) throw new PdfOpError(`“${job.name}” isn't an image we can read.`);
  let size = headerSize(head, type);
  if (!size && type === "jpeg" && job.blob.size > HEAD) {
    head = new Uint8Array(await job.blob.arrayBuffer());
    size = headerSize(head, type);
  }
  try {
    const t = await codec.thumbnail(job.blob, type, size, job.thumbPx);
    return { info: { type, w: t.w, h: t.h }, thumb: t.jpeg };
  } catch {
    throw new PdfOpError(
      type === "heic"
        ? `“${job.name}” is HEIC and couldn't be decoded here. Export it from Photos as JPEG, or set your iPhone camera to “Most Compatible”.`
        : `“${job.name}” couldn't be read. It may be damaged.`,
    );
  }
}
