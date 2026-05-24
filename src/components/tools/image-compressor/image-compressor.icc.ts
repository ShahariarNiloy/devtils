/**
 * ICC color-profile pass-through.
 *
 * Browsers display wide-gamut images (Display P3, Adobe RGB, ProPhoto)
 * correctly only when an ICC color profile is embedded in the file.
 * The @jsquash codecs decode pixels but drop the ICC chunk — so without
 * pass-through, an iPhone Display P3 photo gets re-encoded as bare bytes
 * that browsers treat as sRGB, making colors look less saturated.
 *
 * Strategy: read the ICC chunk's *raw bytes* from the source container,
 * encode the image normally with @jsquash, then splice the same chunk
 * bytes into the output container at the right offset. The pixel byte
 * values aren't reinterpreted — only the color-space label travels.
 *
 * Per format:
 *   PNG  — `iCCP` chunk between IHDR and IDAT
 *   JPEG — `APP2` segment(s) prefixed with "ICC_PROFILE\0", right after SOI
 *   WebP — `ICCP` chunk inside RIFF, requires VP8X extended header
 *   AVIF — `colr` box of type `prof` inside iprp/ipco (ISOBMFF nesting)
 */

// ── Public API ─────────────────────────────────────────────────────

export type IccMime = "image/png" | "image/jpeg" | "image/webp" | "image/avif";

/** Whether ICC pass-through is supported for this mime type. */
export function supportsIcc(mime: string): mime is IccMime {
  return (
    mime === "image/png" ||
    mime === "image/jpeg" ||
    mime === "image/webp" ||
    mime === "image/avif"
  );
}

/** Read the ICC profile bytes (raw, format-independent) from a source. */
export function extractIcc(buffer: ArrayBuffer, mime: string): Uint8Array | null {
  try {
    if (mime === "image/png") return extractPngIcc(buffer);
    if (mime === "image/jpeg") return extractJpegIcc(buffer);
    if (mime === "image/webp") return extractWebpIcc(buffer);
    if (mime === "image/avif") return extractAvifIcc(buffer);
  } catch {
    // Malformed containers are tolerated — fall through to "no ICC".
  }
  return null;
}

/**
 * Inject ICC bytes into an output container of the same format.
 * Returns the new ArrayBuffer, or the original buffer if injection
 * fails (best-effort; caller may surface a warning).
 */
export function injectIcc(
  buffer: ArrayBuffer,
  mime: string,
  icc: Uint8Array,
): { buffer: ArrayBuffer; injected: boolean } {
  try {
    if (mime === "image/png") {
      const out = injectPngIcc(buffer, icc);
      if (out) return { buffer: out, injected: true };
    } else if (mime === "image/jpeg") {
      const out = injectJpegIcc(buffer, icc);
      if (out) return { buffer: out, injected: true };
    } else if (mime === "image/webp") {
      const out = injectWebpIcc(buffer, icc);
      if (out) return { buffer: out, injected: true };
    } else if (mime === "image/avif") {
      const out = injectAvifIcc(buffer, icc);
      if (out) return { buffer: out, injected: true };
    }
  } catch {
    // Fall through.
  }
  return { buffer, injected: false };
}

// ── Shared byte helpers ─────────────────────────────────────────────

function u32be(view: DataView, offset: number): number {
  return view.getUint32(offset, false);
}

function writeU32be(view: DataView, offset: number, value: number): void {
  view.setUint32(offset, value, false);
}

function fourCC(view: DataView, offset: number): string {
  return (
    String.fromCharCode(view.getUint8(offset)) +
    String.fromCharCode(view.getUint8(offset + 1)) +
    String.fromCharCode(view.getUint8(offset + 2)) +
    String.fromCharCode(view.getUint8(offset + 3))
  );
}

function concat(parts: Uint8Array[]): Uint8Array {
  let total = 0;
  for (const p of parts) total += p.byteLength;
  const out = new Uint8Array(total);
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.byteLength;
  }
  return out;
}

// `Uint8Array.buffer` is typed as `ArrayBufferLike` in TS 5.7+ to permit
// SharedArrayBuffer-backed views. Every call site here builds the array
// from a fresh `ArrayBuffer`, so the runtime type is always plain. This
// helper makes the cast explicit and centralized.
function asArrayBuffer(u8: Uint8Array): ArrayBuffer {
  return u8.buffer as ArrayBuffer;
}

// ── PNG ─────────────────────────────────────────────────────────────

const PNG_MAGIC_0 = 0x89504e47; // \x89PNG
const PNG_MAGIC_1 = 0x0d0a1a0a; // \r\n\x1a\n

function isPng(view: DataView): boolean {
  return (
    view.byteLength >= 8 &&
    u32be(view, 0) === PNG_MAGIC_0 &&
    u32be(view, 4) === PNG_MAGIC_1
  );
}

/**
 * Returns the *decompressed* ICC bytes from an iCCP chunk, or null if
 * the chunk isn't present. The decompression step is intentionally
 * synchronous-via-pako — but we don't want to add pako as a dep, so we
 * use the WHATWG DecompressionStream which is sync-in-promise. Since
 * extract/inject are called from a worker, we keep the API sync by
 * returning the *raw zlib payload* and decompressing only when the
 * caller asks for it. For pass-through (extract → inject for the same
 * format) we never need the decompressed form.
 *
 * Trick: we return the iCCP chunk's *raw bytes (length+type+data+crc)*
 * unchanged. Re-emitting them verbatim into another PNG output is
 * spec-valid as long as the chunk type, profile name, compression
 * method, and zlib payload are all preserved together.
 */
function extractPngIcc(buffer: ArrayBuffer): Uint8Array | null {
  const view = new DataView(buffer);
  if (!isPng(view)) return null;

  let offset = 8;
  while (offset + 8 <= view.byteLength) {
    const length = u32be(view, offset);
    const type = fourCC(view, offset + 4);
    const chunkTotal = 12 + length; // length(4) + type(4) + data + crc(4)
    if (type === "iCCP") {
      // Return the entire chunk (length + type + data + crc) so we can
      // re-emit it byte-for-byte into the output.
      return new Uint8Array(buffer, offset, chunkTotal);
    }
    if (type === "IDAT" || type === "IEND") {
      // ICC must come before IDAT per spec; bail early.
      return null;
    }
    offset += chunkTotal;
  }
  return null;
}

/**
 * For non-PNG sources we still need to produce a *PNG-shaped* iCCP
 * chunk when the output is PNG. The pass-through path only fires when
 * input mime === output mime, so this case shouldn't arise; we leave
 * the bytes as-is from extract and rely on inject seeing PNG bytes.
 */
function injectPngIcc(
  buffer: ArrayBuffer,
  iccChunk: Uint8Array,
): ArrayBuffer | null {
  const view = new DataView(buffer);
  if (!isPng(view)) return null;

  // Validate the incoming bytes really are a PNG iCCP chunk.
  if (iccChunk.byteLength < 12) return null;
  const chunkType = String.fromCharCode(
    iccChunk[4],
    iccChunk[5],
    iccChunk[6],
    iccChunk[7],
  );
  if (chunkType !== "iCCP") {
    // Could happen if the source was a non-PNG that we extracted from
    // and is now being injected into a PNG output. Build a new iCCP
    // chunk wrapping the raw bytes as the compressed payload (the
    // payload would normally be zlib-compressed but the data passed
    // here is already raw ICC). Skip for v1 — only same-mime path is
    // exercised.
    return null;
  }

  // Splice iCCP after IHDR (offset 8..8+25 = first chunk). The IHDR
  // chunk is exactly 25 bytes (4 len + 4 type + 13 data + 4 crc).
  const ihdrEnd = 8 + 25;
  if (ihdrEnd > view.byteLength) return null;

  // Make sure the file actually has IHDR where we expect it.
  const ihdrType = fourCC(view, 12);
  if (ihdrType !== "IHDR") return null;

  const head = new Uint8Array(buffer, 0, ihdrEnd);
  const tail = new Uint8Array(buffer, ihdrEnd, view.byteLength - ihdrEnd);
  return asArrayBuffer(concat([head, iccChunk, tail]));
}

// ── JPEG ────────────────────────────────────────────────────────────

const JPEG_SOI = 0xffd8;
const JPEG_APP2 = 0xffe2;
const ICC_PROFILE_HEADER = new TextEncoder().encode("ICC_PROFILE\0");

function isJpeg(view: DataView): boolean {
  return view.byteLength >= 2 && view.getUint16(0, false) === JPEG_SOI;
}

/**
 * Walk JPEG markers and collect APP2 segments whose payload starts with
 * "ICC_PROFILE\0". Returns the concatenated ICC profile bytes (i.e. all
 * segments stitched, with the per-segment header stripped). For pass-
 * through we re-split into segments on inject.
 */
function extractJpegIcc(buffer: ArrayBuffer): Uint8Array | null {
  const view = new DataView(buffer);
  if (!isJpeg(view)) return null;

  let offset = 2;
  const segments: { chunkNum: number; total: number; data: Uint8Array }[] = [];
  while (offset + 4 <= view.byteLength) {
    const marker = view.getUint16(offset, false);
    offset += 2;
    if (marker === 0xffd9) break; // EOI
    if (marker === 0xffda) break; // SOS — image data follows, no more markers
    if ((marker & 0xff00) !== 0xff00) return null; // resync corrupt

    const segLength = view.getUint16(offset, false);
    const segDataStart = offset + 2;
    const segDataEnd = offset + segLength;
    if (segDataEnd > view.byteLength) return null;

    if (marker === JPEG_APP2 && segLength > 16) {
      // Check for ICC_PROFILE\0 prefix
      let isIcc = true;
      for (let i = 0; i < ICC_PROFILE_HEADER.length; i++) {
        if (view.getUint8(segDataStart + i) !== ICC_PROFILE_HEADER[i]) {
          isIcc = false;
          break;
        }
      }
      if (isIcc) {
        const headerEnd = segDataStart + ICC_PROFILE_HEADER.length;
        const chunkNum = view.getUint8(headerEnd);
        const total = view.getUint8(headerEnd + 1);
        const data = new Uint8Array(
          buffer,
          headerEnd + 2,
          segDataEnd - (headerEnd + 2),
        );
        segments.push({ chunkNum, total, data });
      }
    }
    offset = segDataEnd;
  }

  if (segments.length === 0) return null;

  // Validate segment continuity before stitching. A multi-segment ICC
  // profile must declare a consistent `total`, and we must hold exactly
  // one segment for every index 1..total. A gap, a duplicate, or a
  // mismatched count means the source was truncated or hand-edited —
  // concatenating those bytes would hand a corrupt profile downstream,
  // so we return null and let the caller treat it as "no ICC".
  const declaredTotal = segments[0].total;
  if (declaredTotal < 1 || segments.length !== declaredTotal) return null;
  const seen = new Array<boolean>(declaredTotal + 1).fill(false);
  for (const s of segments) {
    if (s.total !== declaredTotal) return null;
    if (s.chunkNum < 1 || s.chunkNum > declaredTotal) return null;
    if (seen[s.chunkNum]) return null; // duplicate index
    seen[s.chunkNum] = true;
  }

  segments.sort((a, b) => a.chunkNum - b.chunkNum);
  return concat(segments.map((s) => s.data));
}

/**
 * Build APP2 ICC_PROFILE segment(s) and insert right after SOI. Segments
 * are limited to 65535 bytes total including marker+length, so payload
 * per segment is capped at 65519. The chunk_num/total fields tell the
 * decoder how to reassemble.
 */
function injectJpegIcc(
  buffer: ArrayBuffer,
  icc: Uint8Array,
): ArrayBuffer | null {
  const view = new DataView(buffer);
  if (!isJpeg(view)) return null;

  // Max ICC payload per APP2 segment:
  //   segment length field = 2 bytes
  //   "ICC_PROFILE\0" = 12 bytes
  //   chunk_num + total = 2 bytes
  // Remaining for ICC data = 65533 - 14 = 65519
  const MAX_PER_SEGMENT = 65519;
  const totalChunks = Math.max(1, Math.ceil(icc.length / MAX_PER_SEGMENT));
  if (totalChunks > 255) return null; // spec max

  const segments: Uint8Array[] = [];
  for (let i = 0; i < totalChunks; i++) {
    const start = i * MAX_PER_SEGMENT;
    const end = Math.min(icc.length, start + MAX_PER_SEGMENT);
    const payload = icc.subarray(start, end);
    const segLen = 2 + ICC_PROFILE_HEADER.length + 2 + payload.length;
    const seg = new Uint8Array(2 + segLen);
    // FFE2 marker
    seg[0] = 0xff;
    seg[1] = 0xe2;
    // length (big-endian, includes the length bytes themselves)
    seg[2] = (segLen >> 8) & 0xff;
    seg[3] = segLen & 0xff;
    // ICC_PROFILE\0
    seg.set(ICC_PROFILE_HEADER, 4);
    // chunk_num (1-indexed), total
    seg[4 + ICC_PROFILE_HEADER.length] = i + 1;
    seg[5 + ICC_PROFILE_HEADER.length] = totalChunks;
    // payload
    seg.set(payload, 6 + ICC_PROFILE_HEADER.length);
    segments.push(seg);
  }

  // Insert after SOI (first 2 bytes).
  const head = new Uint8Array(buffer, 0, 2);
  const tail = new Uint8Array(buffer, 2, view.byteLength - 2);
  return asArrayBuffer(concat([head, ...segments, tail]));
}

// ── WebP ────────────────────────────────────────────────────────────

function isWebp(view: DataView): boolean {
  return (
    view.byteLength >= 12 &&
    fourCC(view, 0) === "RIFF" &&
    fourCC(view, 8) === "WEBP"
  );
}

function extractWebpIcc(buffer: ArrayBuffer): Uint8Array | null {
  const view = new DataView(buffer);
  if (!isWebp(view)) return null;
  let offset = 12;
  while (offset + 8 <= view.byteLength) {
    const type = fourCC(view, offset);
    const size = view.getUint32(offset + 4, true); // RIFF is little-endian
    if (type === "ICCP") {
      return new Uint8Array(buffer, offset + 8, size);
    }
    // Chunks are padded to even size.
    offset += 8 + size + (size & 1);
  }
  return null;
}

/**
 * Insert an ICCP chunk into a WebP RIFF container. If the source is a
 * simple VP8/VP8L WebP, we need to upgrade it to VP8X extended format
 * (adds a 10-byte VP8X header chunk) so ICCP is legal. The VP8X flags
 * byte announces which optional chunks follow — we set bit 5 (0x20)
 * for ICCP.
 */
function injectWebpIcc(
  buffer: ArrayBuffer,
  icc: Uint8Array,
): ArrayBuffer | null {
  const view = new DataView(buffer);
  if (!isWebp(view)) return null;
  if (view.byteLength < 30) return null;

  const firstChunkType = fourCC(view, 12);
  const iccPadded = icc.length + (icc.length & 1);
  // ICCP chunk: 4-byte type + 4-byte size (LE) + data + 1 byte pad if odd
  const iccChunk = new Uint8Array(8 + iccPadded);
  iccChunk[0] = 0x49; // 'I'
  iccChunk[1] = 0x43; // 'C'
  iccChunk[2] = 0x43; // 'C'
  iccChunk[3] = 0x50; // 'P'
  new DataView(iccChunk.buffer).setUint32(4, icc.length, true);
  iccChunk.set(icc, 8);

  if (firstChunkType === "VP8X") {
    // Already extended. Set ICCP flag (bit 5 of the flags byte at +8)
    // and insert ICCP chunk after the VP8X chunk.
    const vp8xSize = view.getUint32(16, true);
    const vp8xEnd = 20 + vp8xSize + (vp8xSize & 1);
    // Mutate flag byte in a copy of the head.
    const head = new Uint8Array(buffer, 0, vp8xEnd);
    const headCopy = new Uint8Array(head);
    headCopy[20] |= 0x20; // ICCP present
    const tail = new Uint8Array(buffer, vp8xEnd, view.byteLength - vp8xEnd);
    const out = concat([headCopy, iccChunk, tail]);
    // Update RIFF size: total bytes - 8
    new DataView(out.buffer).setUint32(4, out.byteLength - 8, true);
    return asArrayBuffer(out);
  }

  if (firstChunkType !== "VP8 " && firstChunkType !== "VP8L") return null;

  // Build VP8X header: needs width/height which we can read from the
  // first chunk. For pass-through we only need to wrap correctly, but
  // we still need real dimensions.
  let widthMinusOne = 0;
  let heightMinusOne = 0;
  let hasAlpha = false;
  if (firstChunkType === "VP8L") {
    // VP8L bitstream: signature byte 0x2f, then width-1 / height-1 in
    // 14-bit fields LSB-first inside 32 bits, then alpha flag.
    if (view.byteLength < 25) return null;
    const sig = view.getUint8(20);
    if (sig !== 0x2f) return null;
    const b0 = view.getUint8(21);
    const b1 = view.getUint8(22);
    const b2 = view.getUint8(23);
    const b3 = view.getUint8(24);
    widthMinusOne = b0 | ((b1 & 0x3f) << 8);
    heightMinusOne = (b1 >> 6) | (b2 << 2) | ((b3 & 0x0f) << 10);
    hasAlpha = (b3 & 0x10) !== 0;
  } else {
    // VP8 lossy: width/height embedded in keyframe header. Layout:
    //   bytes 20..22: frame tag (start_code is at 23..25 = 0x9d012a)
    //   bytes 26..29: width and height (14 bits each, with scale bits)
    if (view.byteLength < 30) return null;
    if (
      view.getUint8(23) !== 0x9d ||
      view.getUint8(24) !== 0x01 ||
      view.getUint8(25) !== 0x2a
    ) {
      return null;
    }
    const w = view.getUint16(26, true) & 0x3fff;
    const h = view.getUint16(28, true) & 0x3fff;
    widthMinusOne = w - 1;
    heightMinusOne = h - 1;
    hasAlpha = false;
  }

  // VP8X chunk: type(4) + size(4=10) + flags(1) + reserved(3) + W-1(3) + H-1(3)
  const vp8x = new Uint8Array(8 + 10);
  vp8x[0] = 0x56; // 'V'
  vp8x[1] = 0x50; // 'P'
  vp8x[2] = 0x38; // '8'
  vp8x[3] = 0x58; // 'X'
  new DataView(vp8x.buffer).setUint32(4, 10, true);
  // flags: bit 5 ICCP, bit 4 alpha (preserve if present), others 0
  vp8x[8] = 0x20 | (hasAlpha ? 0x10 : 0x00);
  // bytes 9..11 reserved (0)
  // bytes 12..14 canvas width - 1, little-endian 24-bit
  vp8x[12] = widthMinusOne & 0xff;
  vp8x[13] = (widthMinusOne >> 8) & 0xff;
  vp8x[14] = (widthMinusOne >> 16) & 0xff;
  vp8x[15] = heightMinusOne & 0xff;
  vp8x[16] = (heightMinusOne >> 8) & 0xff;
  vp8x[17] = (heightMinusOne >> 16) & 0xff;

  // Assemble: RIFF + size + WEBP + VP8X + ICCP + original VP8/VP8L chunk(s)
  const head = new Uint8Array(buffer, 0, 12);
  const tail = new Uint8Array(buffer, 12, view.byteLength - 12);
  const out = concat([head, vp8x, iccChunk, tail]);
  // Update RIFF size
  new DataView(out.buffer).setUint32(4, out.byteLength - 8, true);
  return asArrayBuffer(out);
}

// ── AVIF ────────────────────────────────────────────────────────────
//
// AVIF is ISOBMFF (ISO base-media file format). ICC profile lives in
// a `colr` box of subtype `prof` inside meta/iprp/ipco/. To inject we
// need to:
//   1) Locate meta/iprp/ipco/ in the output container
//   2) Either insert a new `colr` box or replace an existing one
//   3) Update the byte size of every ancestor box (ipco, iprp, meta)
//
// Implementation here handles the common case produced by @jsquash/avif
// outputs (single colr box, predictable structure). Falls back to null
// (caller surfaces a warning) on anything unexpected.

interface IsoBox {
  start: number;
  size: number;
  type: string;
  contentStart: number;
  contentEnd: number;
  /** True when the box used the 64-bit largesize encoding (32-bit size
   *  field == 1, real size in the following 8 bytes). The injector only
   *  knows how to rewrite 32-bit size fields, so it must refuse to touch
   *  any ancestor that used this form. */
  sizeIs64: boolean;
}

function readIsoBox(view: DataView, offset: number): IsoBox | null {
  if (offset + 8 > view.byteLength) return null;
  let size = u32be(view, offset);
  const type = fourCC(view, offset + 4);
  let contentStart = offset + 8;
  let sizeIs64 = false;
  if (size === 1) {
    // 64-bit size — read uint64. We don't support > 4GB files so the
    // high 32 bits must be zero.
    sizeIs64 = true;
    if (offset + 16 > view.byteLength) return null;
    const hi = u32be(view, offset + 8);
    if (hi !== 0) return null;
    size = u32be(view, offset + 12);
    contentStart = offset + 16;
  } else if (size === 0) {
    // Extends to end of file (rare). We don't handle this case for
    // safety — return a single box covering the rest of the buffer.
    size = view.byteLength - offset;
  }
  return {
    start: offset,
    size,
    type,
    contentStart,
    contentEnd: offset + size,
    sizeIs64,
  };
}

function findChildBox(view: DataView, parent: IsoBox, type: string): IsoBox | null {
  let offset = parent.contentStart;
  while (offset < parent.contentEnd) {
    const box = readIsoBox(view, offset);
    if (!box) return null;
    if (box.type === type) return box;
    offset = box.contentEnd;
  }
  return null;
}

/**
 * Try to extract an ICC profile from an AVIF source. We look for the
 * `colr` box of subtype `prof` in meta/iprp/ipco; if found, return the
 * raw profile bytes (everything after the 4-byte colour_type field).
 */
function extractAvifIcc(buffer: ArrayBuffer): Uint8Array | null {
  const view = new DataView(buffer);
  // Walk top-level boxes
  let offset = 0;
  let meta: IsoBox | null = null;
  while (offset < view.byteLength) {
    const box = readIsoBox(view, offset);
    if (!box) return null;
    if (box.type === "meta") {
      meta = box;
      break;
    }
    offset = box.contentEnd;
  }
  if (!meta) return null;
  // meta box has a 4-byte FullBox version+flags header before child boxes
  const metaInner: IsoBox = {
    ...meta,
    contentStart: meta.contentStart + 4,
  };
  const iprp = findChildBox(view, metaInner, "iprp");
  if (!iprp) return null;
  const ipco = findChildBox(view, iprp, "ipco");
  if (!ipco) return null;
  const colr = findChildBox(view, ipco, "colr");
  if (!colr) return null;

  // colr box: 4-byte colour_type, then either nclx (7 bytes) or prof
  // (ICC profile bytes filling the rest of the box).
  if (colr.contentEnd - colr.contentStart < 4) return null;
  const subtype = fourCC(view, colr.contentStart);
  if (subtype !== "prof" && subtype !== "rICC") return null;
  return new Uint8Array(
    buffer,
    colr.contentStart + 4,
    colr.contentEnd - (colr.contentStart + 4),
  );
}

/**
 * Inject an ICC profile into an AVIF output. Replaces the existing
 * `colr` box if present, otherwise inserts a new one as the last child
 * of `ipco`. All ancestor box sizes are recomputed.
 *
 * Returns null on any structural mismatch — caller falls back to no
 * pass-through (with a warning).
 */
function injectAvifIcc(
  buffer: ArrayBuffer,
  icc: Uint8Array,
): ArrayBuffer | null {
  const view = new DataView(buffer);
  // Walk top-level boxes; record positions of `meta` and any siblings
  // so we can recompute sizes.
  let metaBox: IsoBox | null = null;
  let scan = 0;
  while (scan < view.byteLength) {
    const box = readIsoBox(view, scan);
    if (!box) return null;
    if (box.type === "meta") {
      metaBox = box;
      break;
    }
    scan = box.contentEnd;
  }
  if (!metaBox) return null;

  // FullBox header inside `meta`
  const metaInner: IsoBox = {
    ...metaBox,
    contentStart: metaBox.contentStart + 4,
  };
  const iprp = findChildBox(view, metaInner, "iprp");
  if (!iprp) return null;
  const ipco = findChildBox(view, iprp, "ipco");
  if (!ipco) return null;

  // The size-recompute below writes 32-bit big-endian size fields at each
  // ancestor's `start`. If any ancestor used the 64-bit largesize form,
  // its real size lives 8 bytes later and a 32-bit write would corrupt
  // the box. Bail rather than mangle the container — the caller falls
  // back to "lost" and the colors are left untouched.
  if (metaBox.sizeIs64 || iprp.sizeIs64 || ipco.sizeIs64) return null;

  const existingColr = findChildBox(view, ipco, "colr");

  // Build the new colr box: size(4) + 'colr' + 'prof' + ICC bytes
  const newColr = new Uint8Array(4 + 4 + 4 + icc.length);
  const colrView = new DataView(newColr.buffer);
  colrView.setUint32(0, newColr.byteLength, false);
  newColr[4] = 0x63; // 'c'
  newColr[5] = 0x6f; // 'o'
  newColr[6] = 0x6c; // 'l'
  newColr[7] = 0x72; // 'r'
  newColr[8] = 0x70; // 'p'
  newColr[9] = 0x72; // 'r'
  newColr[10] = 0x6f; // 'o'
  newColr[11] = 0x66; // 'f'
  newColr.set(icc, 12);

  // Splice the new colr into ipco — replacing or appending.
  let modified: Uint8Array;
  if (existingColr) {
    // Replace
    const head = new Uint8Array(buffer, 0, existingColr.start);
    const tail = new Uint8Array(
      buffer,
      existingColr.contentEnd,
      view.byteLength - existingColr.contentEnd,
    );
    modified = concat([head, newColr, tail]);
  } else {
    // Append before ipco ends
    const head = new Uint8Array(buffer, 0, ipco.contentEnd);
    const tail = new Uint8Array(
      buffer,
      ipco.contentEnd,
      view.byteLength - ipco.contentEnd,
    );
    modified = concat([head, newColr, tail]);
  }

  // Recompute sizes of ipco, iprp, meta. The size delta is:
  //   newColr.byteLength - (existing ? existingColr.size : 0)
  const sizeDelta =
    newColr.byteLength - (existingColr ? existingColr.size : 0);

  // Helper to bump a 4-byte big-endian size field in-place inside the
  // mutated buffer. The 'modified' Uint8Array shares the new buffer.
  const outView = new DataView(modified.buffer);
  // ipco
  writeU32be(outView, ipco.start, outView.getUint32(ipco.start, false) + sizeDelta);
  // iprp
  writeU32be(outView, iprp.start, outView.getUint32(iprp.start, false) + sizeDelta);
  // meta
  writeU32be(outView, metaBox.start, outView.getUint32(metaBox.start, false) + sizeDelta);

  return asArrayBuffer(modified);
}
