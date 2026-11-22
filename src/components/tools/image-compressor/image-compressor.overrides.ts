/**
 * Per-image output format overrides. Pure — the store applies these.
 *
 * The settings column is global; clicking a format bar on the stage gives
 * just the selected image its own format (unless "Apply to all images" is
 * on). A file's effective settings are the global ones with its override
 * swapped in. A global Format choice is an explicit "every image uses
 * this", so it clears the overrides (the UI offers Undo).
 */

import type { CompressionSettings, ImageFile, OutputFormat } from "./image-compressor.types";

/** The settings an image is compressed with. */
export function effectiveSettings(global: CompressionSettings, override: OutputFormat | null): CompressionSettings {
  return override === null || override === global.outputFormat ? global : { ...global, outputFormat: override };
}

/** Override to store for a picked format: none when it matches the global one. */
export function overrideFor(picked: OutputFormat, global: CompressionSettings): OutputFormat | null {
  return picked === global.outputFormat ? null : picked;
}

/** Files with their own format, as id → format (for Undo). */
export function collectOverrides(files: readonly Pick<ImageFile, "id" | "formatOverride">[]): Map<string, OutputFormat> {
  const out = new Map<string, OutputFormat>();
  for (const f of files) if (f.formatOverride !== null) out.set(f.id, f.formatOverride);
  return out;
}

/** Does this settings patch change the format for every image? */
export function patchSetsGlobalFormat(patch: Partial<CompressionSettings>): boolean {
  return patch.outputFormat !== undefined;
}

/** What a bar click does: the global format (Apply to all) or this image's own. */
export function barPick(
  picked: OutputFormat,
  convertAll: boolean,
  global: CompressionSettings,
): { kind: "global"; patch: Partial<CompressionSettings> } | { kind: "image"; override: OutputFormat | null } {
  return convertAll ? { kind: "global", patch: { outputFormat: picked } } : { kind: "image", override: overrideFor(picked, global) };
}
