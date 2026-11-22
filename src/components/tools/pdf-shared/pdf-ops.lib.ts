/**
 * The PDF writing itself (pdf-lib). Pure apart from pdf-lib: runs in the
 * PDF worker, and in tests under Node.
 */

import { degrees, EncryptedPDFError, ParseSpeeds, PDFArray, PDFBool, PDFDocument, PDFName, PDFNumber, PDFRawStream, PDFRef, rgb, StandardFonts, type PDFDict, type PDFObject } from "pdf-lib";
import type { CompressJob, CompressStats, MergeJob, SignJob, SplitJob } from "./pdf-ops.types";

export class PdfOpError extends Error {}

/*
 * pdf-lib yields to the event loop every 100 objects when parsing and every
 * 50 when saving, to keep a page responsive. In the worker there's no page
 * to keep responsive, and in a browser each yield costs ≥ 4 ms (timer
 * clamping) — so parse and save in one go.
 */
export const FAST_SAVE = { objectsPerTick: Number.POSITIVE_INFINITY } as const;

async function load(bytes: ArrayBuffer, name: string): Promise<PDFDocument> {
  try {
    return await PDFDocument.load(bytes, { updateMetadata: false, parseSpeed: ParseSpeeds.Fastest });
  } catch (e) {
    if (e instanceof EncryptedPDFError) throw new PdfOpError(`${name} is password-protected. Unlock it first, then add it again.`);
    throw new PdfOpError(`${name} couldn't be read as a PDF.`);
  }
}

/** Copy the chosen pages, in order, into one new document. */
export async function mergePdfs(job: MergeJob): Promise<Uint8Array> {
  const out = await PDFDocument.create();
  const docs = new Map<string, PDFDocument>();
  for (const f of job.files) docs.set(f.id, await load(f.bytes, "A file"));

  // One copyPages call per source keeps shared resources (fonts, images)
  // copied once instead of once per page.
  const wanted = new Map<string, number[]>();
  for (const p of job.pages) wanted.set(p.file, [...(wanted.get(p.file) ?? []), p.index]);
  const copied = new Map<string, Map<number, ReturnType<PDFDocument["getPage"]>>>();
  for (const [file, indices] of wanted) {
    const src = docs.get(file);
    if (!src) throw new PdfOpError("A file is missing.");
    const unique = [...new Set(indices)];
    const pages = await out.copyPages(src, unique);
    copied.set(file, new Map(unique.map((ix, k) => [ix, pages[k]])));
  }
  for (const p of job.pages) {
    const page = copied.get(p.file)?.get(p.index);
    if (!page) throw new PdfOpError("A page is missing.");
    if (p.rotate) page.setRotation(degrees((((page.getRotation().angle + p.rotate) % 360) + 360) % 360));
    out.addPage(page);
  }
  return out.save(FAST_SAVE);
}

/** Rotate (dx, dy) by `deg` counter-clockwise. */
function turn(dx: number, dy: number, deg: number): [number, number] {
  const r = (deg * Math.PI) / 180;
  return [dx * Math.cos(r) - dy * Math.sin(r), dx * Math.sin(r) + dy * Math.cos(r)];
}

/** Write signatures, initials, dates, text and ticks into the pages. */
export async function signPdf(job: SignJob): Promise<Uint8Array> {
  const doc = await load(job.bytes, "This PDF");
  const pages = doc.getPages();
  let font: Awaited<ReturnType<PDFDocument["embedFont"]>> | null = null;
  for (const it of job.items) {
    const page = pages[it.page];
    if (!page) continue;
    const rotate = degrees(it.rotate);
    if (it.kind === "image") {
      const img = await doc.embedPng(it.png);
      page.drawImage(img, { x: it.x, y: it.y, width: it.w, height: it.h, rotate });
    } else if (it.kind === "text") {
      font ??= await doc.embedFont(StandardFonts.Helvetica);
      // Fit the box height; baseline sits a quarter up from the bottom.
      const size = it.h * 0.7;
      const [ox, oy] = turn(0, it.h * 0.24, it.rotate);
      page.drawText(it.text, { x: it.x + ox, y: it.y + oy, size, font, color: rgb(...it.color), rotate });
    } else {
      // A tick drawn as two strokes inside the box.
      const pt = (fx: number, fy: number) => {
        const [dx, dy] = turn(fx * it.w, fy * it.h, it.rotate);
        return { x: it.x + dx, y: it.y + dy };
      };
      const thickness = Math.max(1, it.h * 0.12);
      const color = rgb(...it.color);
      page.drawLine({ start: pt(0.12, 0.5), end: pt(0.4, 0.18), thickness, color });
      page.drawLine({ start: pt(0.4, 0.18), end: pt(0.9, 0.86), thickness, color });
    }
  }
  return doc.save(FAST_SAVE);
}

/* ---------------------------------------------------------------- split */

/** One new PDF per group of pages. */
export async function splitPdf(job: SplitJob): Promise<Uint8Array[]> {
  const src = await load(job.bytes, "This PDF");
  const out: Uint8Array[] = [];
  for (const group of job.groups) {
    const doc = await PDFDocument.create();
    const pages = await doc.copyPages(src, group);
    for (const p of pages) doc.addPage(p);
    out.push(await doc.save(FAST_SAVE));
  }
  return out;
}

/* ------------------------------------------------------------- compress */

/** Run `fn` over `items`, at most `limit` at a time. */
export async function inPool<T>(items: readonly T[], limit: number, fn: (item: T) => Promise<void>): Promise<void> {
  let next = 0;
  const worker = async () => {
    while (next < items.length) await fn(items[next++]);
  };
  await Promise.all(Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, worker));
}

/**
 * The pixel work compression needs, supplied by the caller: in the browser
 * worker it's createImageBitmap + OffscreenCanvas; in tests, a stand-in.
 */
export interface ImageCodec {
  /** A JPEG → re-encoded JPEG (downscaled to `maxPx`), without colour conversion. */
  fromJpeg(jpeg: Uint8Array, quality: number, maxPx: number): Promise<{ bytes: Uint8Array; w: number; h: number } | null>;
  /** Raw 8-bit grey or RGB pixels → JPEG. */
  fromPixels(px: Uint8Array, w: number, h: number, channels: 1 | 3, quality: number, maxPx: number): Promise<{ bytes: Uint8Array; w: number; h: number } | null>;
}

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const out = new Response(new Blob([bytes as Uint8Array<ArrayBuffer>]).stream().pipeThrough(stream));
  return new Uint8Array(await out.arrayBuffer());
}
/** PDF's FlateDecode is zlib — the "deflate" format of the Compression Streams API. */
export const inflate = (b: Uint8Array) => pipe(b, new DecompressionStream("deflate"));
export const deflate = (b: Uint8Array) => pipe(b, new CompressionStream("deflate"));

/** Photos have thousands of colours; diagrams, text and screenshots don't. */
export function looksLikePhoto(px: Uint8Array, channels: 1 | 3, sample = 20_000): boolean {
  const pixels = px.length / channels;
  const step = Math.max(1, Math.floor(pixels / sample));
  const seen = new Set<number>();
  for (let i = 0; i < pixels; i += step) {
    const o = i * channels;
    seen.add(channels === 3 ? (px[o] << 16) | (px[o + 1] << 8) | px[o + 2] : px[o]);
    if (seen.size >= 2048) return true;
  }
  // Greyscale scans have at most 256 levels; judge them by spread instead.
  return channels === 1 && seen.size >= 160;
}

const N = (s: string) => PDFName.of(s);
const numOf = (o: PDFObject | undefined) => (o instanceof PDFNumber ? o.asNumber() : null);
type Space = "rgb" | "gray" | "icc3" | "other";

/** Whether we can re-encode an image without changing how its colours read. */
function colourSpace(doc: PDFDocument, dict: PDFDict): Space {
  const look = (o: PDFObject | undefined) => (o instanceof PDFRef ? doc.context.lookup(o) : o);
  const cs = look(dict.get(N("ColorSpace")));
  if (cs === N("DeviceRGB")) return "rgb";
  if (cs === N("DeviceGray")) return "gray";
  if (cs instanceof PDFArray && cs.size() === 2 && look(cs.get(0)) === N("ICCBased")) {
    const profile = look(cs.get(1));
    // Same pixel values under the same 3-channel profile: colours unchanged.
    if (profile instanceof PDFRawStream && numOf(profile.dict.get(N("N"))) === 3) return "icc3";
  }
  return "other";
}

function filterOf(doc: PDFDocument, dict: PDFDict): PDFName | "none" | "chain" {
  const f = dict.get(N("Filter"));
  const v = f instanceof PDFRef ? doc.context.lookup(f) : f;
  if (v === undefined) return "none";
  if (v instanceof PDFName) return v;
  if (v instanceof PDFArray && v.size() === 1) {
    const only = v.get(0);
    return only instanceof PDFName ? only : "chain";
  }
  return "chain";
}

/**
 * Make a PDF smaller without touching text or vector art: re-encode
 * photos and scans, deflate uncompressed streams, pack objects. Images
 * whose colours could shift (CMYK, profiled grey, Lab, indexed…) are left
 * exactly as they are.
 */
export async function compressPdf(job: CompressJob, codec: ImageCodec): Promise<{ bytes: Uint8Array; stats: CompressStats }> {
  const doc = await load(job.bytes, "This PDF");
  const stats: CompressStats = { images: 0, recompressed: 0, keptForColour: 0, keptAsIs: 0, streamsDeflated: 0 };
  const isImage = (d: PDFDict) => d.get(N("Subtype")) === N("Image");

  const one = async (ref: PDFRef, obj: PDFRawStream): Promise<void> => {
    const dict = obj.dict;
    const filter = filterOf(doc, dict);

    if (!isImage(dict)) {
      // Page content and drawings stored without compression.
      if (filter !== "none" || dict.get(N("Type")) === N("Metadata") || obj.contents.length < 256) return;
      const packed = await deflate(obj.contents);
      if (packed.length < obj.contents.length * 0.9) {
        const d = dict.clone(doc.context);
        d.set(N("Filter"), N("FlateDecode"));
        d.delete(N("DecodeParms"));
        doc.context.assign(ref, PDFRawStream.of(d, packed));
        stats.streamsDeflated++;
      }
      return;
    }

    stats.images++;
    const w = numOf(dict.get(N("Width")));
    const h = numOf(dict.get(N("Height")));
    const bpc = numOf(dict.get(N("BitsPerComponent")));
    const mask = dict.get(N("ImageMask"));
    if (!w || !h || (mask instanceof PDFBool && mask.asBoolean())) {
      stats.keptAsIs++;
      return;
    }
    const space = colourSpace(doc, dict);
    if (space === "other" || dict.has(N("Decode"))) {
      stats.keptForColour++;
      return;
    }
    // Tiny images (icons, bullets) aren't worth it.
    if (w * h < 64 * 64 || bpc !== 8) {
      stats.keptAsIs++;
      return;
    }

    let made: { bytes: Uint8Array; w: number; h: number } | null = null;
    try {
      if (filter === N("DCTDecode")) {
        made = await codec.fromJpeg(obj.contents, job.quality, job.maxPx);
      } else if ((filter === N("FlateDecode") || filter === "none") && job.photosFromLossless && !dict.has(N("DecodeParms"))) {
        const channels = space === "gray" ? 1 : 3;
        const px = filter === "none" ? obj.contents : await inflate(obj.contents);
        if (px.length >= w * h * channels && looksLikePhoto(px, channels)) {
          made = await codec.fromPixels(px.subarray(0, w * h * channels), w, h, channels, job.quality, job.maxPx);
        }
      }
    } catch {
      made = null;
    }
    // Only swap when it clearly pays off.
    if (!made || made.bytes.length >= obj.contents.length * 0.92) {
      stats.keptAsIs++;
      return;
    }
    const d = dict.clone(doc.context);
    d.set(N("Filter"), N("DCTDecode"));
    d.delete(N("DecodeParms"));
    d.set(N("Width"), PDFNumber.of(made.w));
    d.set(N("Height"), PDFNumber.of(made.h));
    d.set(N("BitsPerComponent"), PDFNumber.of(8));
    // The canvas writes 3-channel JPEGs; grey reads the same as RGB grey.
    if (space === "gray") d.set(N("ColorSpace"), N("DeviceRGB"));
    doc.context.assign(ref, PDFRawStream.of(d, made.bytes));
    stats.recompressed++;
  };

  // Images are decoded and encoded by the browser on its own threads, so a
  // few at once finish ~3× sooner than one by one. Each task touches only
  // its own object.
  const streams = doc.context
    .enumerateIndirectObjects()
    .filter((e): e is [PDFRef, PDFRawStream] => e[1] instanceof PDFRawStream);
  await inPool(streams, job.concurrency ?? 4, ([ref, obj]) => one(ref, obj));

  const bytes = await doc.save({ ...FAST_SAVE, useObjectStreams: true });
  return { bytes, stats };
}
