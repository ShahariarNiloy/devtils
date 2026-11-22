/**
 * HEIC/HEIF (iPhone photos) → RGBA, via libheif compiled to WASM. Shared by
 * the image compressor and Image to PDF.
 *
 * The `wasm-bundle` entry inlines the .wasm as base64, which avoids having
 * to serve a separate binary and works cleanly inside worker bundles. It's
 * a ~1.4 MB lazy chunk, fetched only when a HEIC is first decoded. Pixel
 * values come out as stored — no colour conversion.
 */

interface HeifImage {
  get_width(): number;
  get_height(): number;
  /** Fills `target.data` (RGBA) and invokes the callback with the same
   *  object, or null on a processing error. */
  display(
    target: { data: Uint8ClampedArray; width: number; height: number },
    cb: (out: { data: Uint8ClampedArray } | null) => void,
  ): void;
}
interface HeifDecoderInstance {
  decode(buffer: Uint8Array): HeifImage[];
}
interface LibheifModule {
  HeifDecoder: new () => HeifDecoderInstance;
}

/** Thrown when the libheif chunk itself can't be loaded (offline, blocked). */
export class HeicLoadError extends Error {
  constructor(readonly reason: unknown) {
    super("The HEIC decoder couldn't be loaded.");
  }
}

let lib: Promise<LibheifModule> | null = null;

function loadLibheif(): Promise<LibheifModule> {
  // The package has no type declarations for the high-level decoder; the
  // structural cast above covers the surface we touch.
  lib ??= import("libheif-js/wasm-bundle").then(
    (m) => (m as unknown as { default: LibheifModule }).default,
  );
  lib.catch(() => {
    lib = null;
  });
  return lib;
}

export async function decodeHeic(buffer: ArrayBuffer): Promise<ImageData> {
  let libheif: LibheifModule;
  try {
    libheif = await loadLibheif();
  } catch (err) {
    throw new HeicLoadError(err);
  }
  const decoder = new libheif.HeifDecoder();
  const images = decoder.decode(new Uint8Array(buffer));
  if (!images || images.length === 0) {
    throw new Error("HEIC file contains no decodable image.");
  }
  const image = images[0];
  const width = image.get_width();
  const height = image.get_height();
  if (!width || !height) {
    throw new Error("HEIC image has invalid dimensions.");
  }
  const data = new Uint8ClampedArray(width * height * 4);
  await new Promise<void>((resolve, reject) => {
    image.display({ data, width, height }, (out) => {
      if (!out) reject(new Error("Failed to decode HEIC pixel data."));
      else resolve();
    });
  });
  return new ImageData(data, width, height);
}
