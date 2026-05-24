// SSIM helper — used by the per-format quality search. The encoded
// buffer is decoded back to ImageData and compared to the original.

// `ssim.js` ships as CommonJS without first-class TS types in our setup.
// We dynamic-import it to keep the bundle lazy and assert a minimal
// shape — the only field we read is the mean MSSIM score.
type SsimResult = { mssim: number };

let _ssimFn: ((a: ImageData, b: ImageData) => SsimResult) | null = null;

async function loadSsim(): Promise<(a: ImageData, b: ImageData) => SsimResult> {
  if (_ssimFn) return _ssimFn;
  const mod = (await import("ssim.js")) as unknown as {
    default?: (a: ImageData, b: ImageData) => SsimResult;
    ssim?: (a: ImageData, b: ImageData) => SsimResult;
  };
  const fn = mod.default ?? mod.ssim;
  if (!fn) throw new Error("ssim.js exported neither default nor ssim()");
  _ssimFn = fn;
  return fn;
}

export async function computeSSIM(
  original: ImageData,
  candidate: ImageData,
): Promise<number> {
  const ssim = await loadSsim();
  return ssim(original, candidate).mssim;
}

export async function decodeBufferToImageData(
  buffer: ArrayBuffer,
  mimeType: string,
): Promise<ImageData> {
  switch (mimeType) {
    case "image/jpeg": {
      const mod = await import("@jsquash/jpeg");
      return (mod.decode as (b: ArrayBuffer) => Promise<ImageData>)(buffer);
    }
    case "image/webp": {
      const mod = await import("@jsquash/webp");
      return (mod.decode as (b: ArrayBuffer) => Promise<ImageData>)(buffer);
    }
    case "image/avif": {
      const mod = await import("@jsquash/avif");
      return (mod.decode as (b: ArrayBuffer) => Promise<ImageData>)(buffer);
    }
    default:
      throw new Error(`Cannot decode mimeType: ${mimeType}`);
  }
}
