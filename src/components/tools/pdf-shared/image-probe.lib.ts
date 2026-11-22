/**
 * Reading just enough of an image file to place it in a PDF: its format, its
 * size, and — for JPEGs, which go into a PDF untouched — the frame details
 * and EXIF orientation PDF viewers ignore. Pure: no DOM, no React.
 */

import {
  readJpegOrientation,
  type Orientation,
} from "../image-compressor/image-compressor.exif";

export type { Orientation };
export type ImageType =
  | "jpeg"
  | "png"
  | "gif"
  | "webp"
  | "heic"
  | "avif"
  | "bmp";

const ascii = (b: Uint8Array, at: number, n: number) =>
  String.fromCharCode(...b.subarray(at, at + n));

/** The format from the file's first bytes — names and MIME types lie. */
export function sniffImage(b: Uint8Array): ImageType | null {
  if (b.length < 12) return null;
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpeg";
  if (b[0] === 0x89 && ascii(b, 1, 3) === "PNG") return "png";
  if (ascii(b, 0, 4) === "GIF8") return "gif";
  if (ascii(b, 0, 4) === "RIFF" && ascii(b, 8, 4) === "WEBP") return "webp";
  if (b[0] === 0x42 && b[1] === 0x4d) return "bmp";
  if (ascii(b, 4, 4) === "ftyp") {
    // ISO-BMFF: major brand, then compatible brands, inside the ftyp box.
    const size = Math.min(
      b.length,
      (b[0] << 24) | (b[1] << 16) | (b[2] << 8) | b[3] || 32,
    );
    const brands: string[] = [];
    for (let at = 8; at + 4 <= size; at += 4)
      if (at !== 12) brands.push(ascii(b, at, 4));
    if (brands.some((x) => x === "avif" || x === "avis")) return "avif";
    if (
      brands.some((x) =>
        [
          "heic",
          "heix",
          "hevc",
          "hevx",
          "heim",
          "heis",
          "mif1",
          "msf1",
        ].includes(x),
      )
    )
      return "heic";
  }
  return null;
}

export interface JpegFrame {
  /** Stored size, before EXIF orientation. */
  w: number;
  h: number;
  /** 1 grey, 3 YCbCr/RGB, 4 CMYK/YCCK. */
  components: number;
  /** Carries an Adobe APP14 marker — its CMYK values are stored inverted. */
  adobe: boolean;
}

/** SOF size and component count of a baseline or progressive JPEG. */
export function jpegFrame(b: Uint8Array): JpegFrame | null {
  let adobe = false;
  let at = 2;
  while (at + 4 <= b.length) {
    if (b[at] !== 0xff) return null;
    const m = b[at + 1];
    if (m === 0xff) {
      at++; // fill byte
      continue;
    }
    if (m === 0xd9 || m === 0xda) return null; // EOI / SOS before a frame
    const len = (b[at + 2] << 8) | b[at + 3];
    if (m === 0xee && ascii(b, at + 4, 5) === "Adobe") adobe = true;
    // SOF0–SOF15 except DHT (C4), JPG (C8) and DAC (CC).
    if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) {
      if (at + 9 >= b.length || b[at + 4] !== 8) return null; // 12-bit JPEGs aren't PDF-embeddable
      const h = (b[at + 5] << 8) | b[at + 6];
      const w = (b[at + 7] << 8) | b[at + 8];
      const components = b[at + 9];
      if (!w || !h || ![1, 3, 4].includes(components)) return null;
      // APP14 can come after the frame; keep scanning the header for it.
      for (
        let k = at + 2 + len;
        k + 4 <= b.length && b[k] === 0xff && b[k + 1] !== 0xda;
        k += 2 + ((b[k + 2] << 8) | b[k + 3])
      ) {
        if (b[k + 1] === 0xee && ascii(b, k + 4, 5) === "Adobe") adobe = true;
      }
      return { w, h, components, adobe };
    }
    at += 2 + len;
  }
  return null;
}

export const jpegOrientation = (b: Uint8Array): Orientation =>
  readJpegOrientation(
    b.byteOffset === 0 && b.byteLength === b.buffer.byteLength
      ? (b.buffer as ArrayBuffer)
      : b.slice().buffer,
  );

/** Orientations 5–8 turn the picture a quarter, swapping width and height. */
export const swapsSides = (o: Orientation) => o >= 5;

/**
 * Upright size from the header alone, without decoding pixels. Null when
 * the header isn't one we read (HEIC, AVIF) — decode it instead.
 */
export function headerSize(
  b: Uint8Array,
  type: ImageType,
): { w: number; h: number } | null {
  const u32 = (at: number) =>
    ((b[at] << 24) | (b[at + 1] << 16) | (b[at + 2] << 8) | b[at + 3]) >>> 0;
  switch (type) {
    case "jpeg": {
      const f = jpegFrame(b);
      if (!f) return null;
      return swapsSides(jpegOrientation(b))
        ? { w: f.h, h: f.w }
        : { w: f.w, h: f.h };
    }
    case "png":
      return b.length >= 24 && ascii(b, 12, 4) === "IHDR"
        ? { w: u32(16), h: u32(20) }
        : null;
    case "gif":
      return { w: b[6] | (b[7] << 8), h: b[8] | (b[9] << 8) };
    case "webp": {
      // WebP can carry EXIF orientation too, and browsers honour it — decode to be safe.
      const kind = ascii(b, 12, 4);
      if (kind === "VP8X") return null;
      if (kind === "VP8L" && b.length >= 25) {
        const bits = b[21] | (b[22] << 8) | (b[23] << 16) | (b[24] << 24);
        return { w: (bits & 0x3fff) + 1, h: ((bits >> 14) & 0x3fff) + 1 };
      }
      if (kind === "VP8 " && b.length >= 30)
        return {
          w: (b[26] | (b[27] << 8)) & 0x3fff,
          h: (b[28] | (b[29] << 8)) & 0x3fff,
        };
      return null;
    }
    default:
      return null;
  }
}

/** A 2-D affine map in PDF's `cm` order: (x, y) → (a·x + c·y + e, b·x + d·y + f). */
export type Matrix = readonly [number, number, number, number, number, number];

/** `outer ∘ inner`: apply `inner` first, then `outer`. */
export function compose(outer: Matrix, inner: Matrix): Matrix {
  const [a1, b1, c1, d1, e1, f1] = outer;
  const [a2, b2, c2, d2, e2, f2] = inner;
  return [
    a1 * a2 + c1 * b2,
    b1 * a2 + d1 * b2,
    a1 * c2 + c1 * d2,
    b1 * c2 + d1 * d2,
    a1 * e2 + c1 * f2 + e1,
    b1 * e2 + d1 * f2 + f1,
  ];
}

/*
 * Maps of the unit square (u right, v up — how PDF draws an image) that turn
 * a stored picture upright. Each is written as where (u, v) lands.
 */
const EXIF: Record<Orientation, Matrix> = {
  1: [1, 0, 0, 1, 0, 0], //       (u, v)
  2: [-1, 0, 0, 1, 1, 0], //      (1−u, v)    mirrored
  3: [-1, 0, 0, -1, 1, 1], //     (1−u, 1−v)  upside down
  4: [1, 0, 0, -1, 0, 1], //      (u, 1−v)    flipped
  5: [0, -1, -1, 0, 1, 1], //     (1−v, 1−u)  transposed
  6: [0, -1, 1, 0, 0, 1], //      (v, 1−u)    needs a quarter turn clockwise
  7: [0, 1, 1, 0, 0, 0], //       (v, u)      transverse
  8: [0, 1, -1, 0, 1, 0], //      (1−v, u)    needs a quarter turn anticlockwise
};

/** A quarter turn clockwise, as the reader sees it: (u, v) → (v, 1−u). */
const CW: Matrix = EXIF[6];

/**
 * Unit-square map that shows a stored picture upright (EXIF), then turned
 * `rotate` degrees clockwise by the user (multiples of 90).
 */
export function uprightMatrix(
  orientation: Orientation,
  rotate: number,
): Matrix {
  let m = EXIF[orientation];
  for (let q = ((Math.round(rotate / 90) % 4) + 4) % 4; q > 0; q--)
    m = compose(CW, m);
  return m;
}
