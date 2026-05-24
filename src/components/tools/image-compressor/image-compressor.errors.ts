/**
 * Structured, kind-tagged compression failures.
 *
 * Replaces opaque "Compression failed" strings so the UI can show a
 * distinct message + recovery hint per failure mode. The plain `detail`
 * object is structured-cloneable, so it travels worker → main as-is;
 * `CompressionFailure` re-wraps it as an `Error` on either side.
 */

export type CompressionError =
  | { kind: "decode-failed"; mime: string }
  | { kind: "encode-failed"; targetMime: string }
  | { kind: "out-of-memory" }
  | { kind: "cancelled" }
  | { kind: "unsupported-input"; mime: string }
  | { kind: "image-too-large"; dimensions: [number, number] }
  | { kind: "unknown"; message: string };

/** Error carrying a structured {@link CompressionError} detail. */
export class CompressionFailure extends Error {
  readonly detail: CompressionError;
  constructor(detail: CompressionError) {
    super(detail.kind);
    this.name = "CompressionFailure";
    this.detail = detail;
  }
}

/**
 * Coerce any thrown value into a `CompressionError`: unwrap a
 * `CompressionFailure`, classify common WASM out-of-memory messages, and
 * fall back to `unknown` carrying the raw message.
 */
export function toCompressionError(err: unknown): CompressionError {
  if (err instanceof CompressionFailure) return err.detail;
  const message = err instanceof Error ? err.message : String(err);
  if (/memory|allocation/i.test(message)) return { kind: "out-of-memory" };
  return { kind: "unknown", message: message || "Compression failed" };
}

function shortFormat(mime: string): string {
  return mime.replace(/^image\//, "").toUpperCase() || "image";
}

/**
 * User-facing copy for the file row: a short status label plus a longer
 * hint (shown as a tooltip) that names the recovery action.
 */
export function describeCompressionError(e: CompressionError): {
  label: string;
  hint: string;
} {
  switch (e.kind) {
    case "cancelled":
      return { label: "cancelled", hint: "Compression cancelled." };
    case "decode-failed":
      return {
        label: "failed",
        hint: `Couldn't read this ${shortFormat(e.mime)} — it may be corrupt or use an unsupported feature.`,
      };
    case "encode-failed":
      return {
        label: "failed",
        hint: `Couldn't encode to ${shortFormat(e.targetMime)} — try a different output format.`,
      };
    case "out-of-memory":
      return {
        label: "too large",
        hint: "Ran out of memory — resize the image or pick a smaller file first.",
      };
    case "image-too-large":
      return {
        label: "too large",
        hint: `Image is ${e.dimensions[0]}×${e.dimensions[1]} — too large to process. Resize it first.`,
      };
    case "unsupported-input":
      return {
        label: "unsupported",
        hint: `${shortFormat(e.mime)} isn't a supported input format.`,
      };
    case "unknown":
      return { label: "failed", hint: e.message || "Compression failed." };
  }
}
