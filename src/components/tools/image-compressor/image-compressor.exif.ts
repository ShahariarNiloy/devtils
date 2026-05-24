/**
 * Minimal EXIF Orientation reader + applier.
 *
 * `@jsquash/jpeg` decodes pixel data but does not honor the EXIF
 * Orientation tag (TIFF tag 0x0112). iPhone portrait photos are
 * encoded landscape with orientation=6 (rotate 90° CW); without this
 * pass they come out of the pipeline sideways.
 *
 * Only the orientation tag is parsed — anything else in EXIF is
 * ignored. Output JPEGs already drop EXIF (the encoder re-emits a bare
 * file), so we don't need to strip it explicitly afterwards.
 */

/** EXIF orientation values per spec, 1..8. 1 = identity. */
export type Orientation = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

/**
 * Read the EXIF Orientation tag from a JPEG buffer.
 * Returns 1 (identity) if not present or unparseable.
 */
export function readJpegOrientation(buffer: ArrayBuffer): Orientation {
  try {
    const view = new DataView(buffer);
    if (view.byteLength < 4 || view.getUint16(0, false) !== 0xffd8) return 1;

    let offset = 2;
    while (offset + 4 <= view.byteLength) {
      const marker = view.getUint16(offset, false);
      offset += 2;
      // SOS / EOI / non-FF prefix → no more APP segments worth scanning.
      if (marker === 0xffd9 || marker === 0xffda) return 1;
      if ((marker & 0xff00) !== 0xff00) return 1;

      const segLength = view.getUint16(offset, false);
      const segStart = offset + 2;
      const segEnd = offset + segLength;
      if (segEnd > view.byteLength) return 1;

      // APP1 = 0xFFE1, payload begins with "Exif\0\0".
      if (
        marker === 0xffe1 &&
        segLength > 10 &&
        view.getUint8(segStart) === 0x45 && // E
        view.getUint8(segStart + 1) === 0x78 && // x
        view.getUint8(segStart + 2) === 0x69 && // i
        view.getUint8(segStart + 3) === 0x66 && // f
        view.getUint8(segStart + 4) === 0x00 &&
        view.getUint8(segStart + 5) === 0x00
      ) {
        return parseTiffOrientation(view, segStart + 6, segEnd);
      }

      offset = segEnd;
    }
  } catch {
    /* fall through to identity */
  }
  return 1;
}

/**
 * Parse a TIFF block (after the "Exif\0\0" prefix) looking for tag
 * 0x0112 (Orientation) in IFD0. Returns 1 if not found.
 */
function parseTiffOrientation(
  view: DataView,
  tiffStart: number,
  end: number,
): Orientation {
  if (tiffStart + 8 > end) return 1;
  const byteOrder = view.getUint16(tiffStart, false);
  const little = byteOrder === 0x4949;
  const big = byteOrder === 0x4d4d;
  if (!little && !big) return 1;
  // 0x002a magic number, then IFD0 offset.
  const magic = view.getUint16(tiffStart + 2, !big);
  if (magic !== 0x002a) return 1;
  const ifd0Offset = view.getUint32(tiffStart + 4, !big);
  const ifd0 = tiffStart + ifd0Offset;
  if (ifd0 + 2 > end) return 1;
  const entries = view.getUint16(ifd0, !big);
  for (let i = 0; i < entries; i++) {
    const entry = ifd0 + 2 + i * 12;
    if (entry + 12 > end) return 1;
    const tag = view.getUint16(entry, !big);
    if (tag === 0x0112) {
      // Orientation is type SHORT (3), count 1 → value in first 2
      // bytes of the value field (offset entry+8).
      const value = view.getUint16(entry + 8, !big);
      if (value >= 1 && value <= 8) return value as Orientation;
      return 1;
    }
  }
  return 1;
}

/**
 * Apply an EXIF orientation to an ImageData, returning a new ImageData
 * with the corrected pixel layout. Handles all 8 spec values:
 *   1 identity, 2 mirror-h, 3 rotate 180, 4 mirror-v,
 *   5 mirror-h + rotate 90 CW, 6 rotate 90 CW,
 *   7 mirror-h + rotate 90 CCW, 8 rotate 90 CCW.
 */
export function applyExifOrientation(
  img: ImageData,
  orientation: Orientation,
): ImageData {
  if (orientation === 1) return img;

  const { width: w, height: h, data: src } = img;
  // After a 90° rotation (orientations 5/6/7/8) width/height swap.
  const swap = orientation >= 5;
  const outW = swap ? h : w;
  const outH = swap ? w : h;
  const dst = new Uint8ClampedArray(outW * outH * 4);

  // For each destination pixel (dx, dy) compute the matching source
  // (sx, sy) per orientation. We iterate destination-major so the
  // dst writes are sequential (faster) and reads from src jump around.
  for (let dy = 0; dy < outH; dy++) {
    for (let dx = 0; dx < outW; dx++) {
      let sx: number;
      let sy: number;
      switch (orientation) {
        case 2: // mirror horizontal
          sx = w - 1 - dx;
          sy = dy;
          break;
        case 3: // rotate 180
          sx = w - 1 - dx;
          sy = h - 1 - dy;
          break;
        case 4: // mirror vertical
          sx = dx;
          sy = h - 1 - dy;
          break;
        case 5: // transpose (mirror across top-left diagonal)
          sx = dy;
          sy = dx;
          break;
        case 6: // rotate 90 CW
          sx = dy;
          sy = h - 1 - dx;
          break;
        case 7: // transverse (mirror across other diagonal)
          sx = w - 1 - dy;
          sy = h - 1 - dx;
          break;
        case 8: // rotate 90 CCW
          sx = w - 1 - dy;
          sy = dx;
          break;
        default:
          sx = dx;
          sy = dy;
      }
      const s = (sy * w + sx) * 4;
      const d = (dy * outW + dx) * 4;
      dst[d] = src[s];
      dst[d + 1] = src[s + 1];
      dst[d + 2] = src[s + 2];
      dst[d + 3] = src[s + 3];
    }
  }

  return new ImageData(dst, outW, outH);
}
