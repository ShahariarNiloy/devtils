import type { PngMode, QualityMode } from "./image-compressor.constants";

/**
 * Single source of truth for the three named quality modes.
 *
 * Everything a mode means — its display copy *and* its encoder behaviour
 * (perceptual SSIM target, the lossy quality search window, and PNG
 * lossy/lossless mapping) — lives in one place. Previously this was spread
 * across `QUALITY_MODE_TARGETS` + `PNG_QUALITY_MODE_MAP` (constants),
 * `SSIM_BOUNDS` (lib), and `QUALITY_LABEL`/`QUALITY_HELPER`/
 * `QUALITY_DESCRIPTION`/`QUALITY_BLURB` (two components), so changing a mode
 * meant editing four files. The values here are carried over verbatim.
 *
 * "custom" is not user-selectable; its leftover copy lives in
 * `CUSTOM_MODE_COPY` below.
 */

export type NamedQualityMode = Exclude<QualityMode, "custom">;

export interface QualityModeDef {
  /** Pill / segment label (per-file picker and Settings drawer). */
  label: string;
  /** One-line sub-copy under the picker in the expanded row. */
  helper: string;
  /** Short tag shown beside the label in the Settings drawer grid. */
  description: string;
  /** Longer blurb shown for the active mode in the Settings drawer. */
  blurb: string;
  /**
   * Fixed encoder quality per lossy codec. Calibrated with SSIMULACRA2 on
   * the Kodak set + screenshots + alpha graphics (2026-11): Best ≈ 84–85
   * (visually lossless), Balanced ≈ 71–76 (TinyPNG-level), Smallest ≈ 61–64
   * (slight loss on close inspection). One encode per image — no search.
   */
  quality: { jpeg: number; webp: number; avif: number };
  /**
   * JPEG chroma: "full" always keeps 4:4:4; "photo-420" uses 4:2:0 for
   * photographic images (≈9% smaller at equal perceived quality) and keeps
   * 4:4:4 for screenshots/graphics, where 4:2:0 smears coloured text.
   */
  jpegChroma: "full" | "photo-420";
  /** How named modes map onto PNG behaviour. */
  png: { pngMode: PngMode; pngQuantizationQuality: number };
}

export const QUALITY_MODE_DEFS: Record<NamedQualityMode, QualityModeDef> = {
  maximum: {
    label: "Best",
    helper: "Visually lossless, larger files.",
    description: "Visually lossless",
    blurb: "Visually lossless — differences don't show even side by side. Larger files. Lossless for PNG.",
    quality: { jpeg: 90, webp: 90, avif: 80 },
    jpegChroma: "full",
    png: { pngMode: "lossless", pngQuantizationQuality: 100 },
  },
  high: {
    label: "Balanced",
    helper: "Looks the same at normal viewing, much smaller. Recommended.",
    description: "Recommended",
    blurb:
      "Looks the same at normal viewing size, at a fraction of the bytes. The right pick for most images.",
    quality: { jpeg: 75, webp: 80, avif: 60 },
    jpegChroma: "photo-420",
    png: { pngMode: "lossy", pngQuantizationQuality: 85 },
  },
  small: {
    label: "Smallest",
    helper: "Smallest files, with a slight quality trade-off.",
    description: "Smallest file",
    blurb:
      "Smallest files, with a slight quality trade-off on close inspection.",
    quality: { jpeg: 60, webp: 60, avif: 50 },
    jpegChroma: "photo-420",
    png: { pngMode: "lossy", pngQuantizationQuality: 45 },
  },
};

/** Copy for the legacy, no-longer-selectable "custom" mode. */
export const CUSTOM_MODE_COPY = {
  helper: "Using custom encoder settings from the Settings drawer.",
  blurb:
    "Custom encoder settings carried over from before. Pick a named mode to replace them.",
};
