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
  /** Perceptual SSIM target for lossy codecs (JPEG/WebP/AVIF). */
  ssimTarget: number;
  /** Quality search window for the SSIM-targeted binary search. */
  ssimBounds: { minQuality: number; maxQuality: number };
  /** How named modes map onto PNG behaviour. */
  png: { pngMode: PngMode; pngQuantizationQuality: number };
}

export const QUALITY_MODE_DEFS: Record<NamedQualityMode, QualityModeDef> = {
  maximum: {
    label: "Best",
    helper: "Top quality, largest files.",
    description: "Top quality",
    blurb: "Top quality, largest files. Lossless for PNG.",
    ssimTarget: 0.98, // visually lossless
    ssimBounds: { minQuality: 60, maxQuality: 95 },
    png: { pngMode: "lossless", pngQuantizationQuality: 100 },
  },
  high: {
    label: "Balanced",
    helper: "Visually identical to the original, much smaller. Recommended.",
    description: "Recommended",
    blurb:
      "Visually identical to the original, much smaller. The right pick for most images.",
    ssimTarget: 0.95, // barely noticeable
    ssimBounds: { minQuality: 40, maxQuality: 90 },
    png: { pngMode: "lossy", pngQuantizationQuality: 85 },
  },
  small: {
    label: "Smallest",
    helper: "Smallest files, with a slight quality trade-off.",
    description: "Smallest file",
    blurb:
      "Smallest files, with a slight quality trade-off on close inspection.",
    ssimTarget: 0.85, // visible on close inspection
    ssimBounds: { minQuality: 20, maxQuality: 80 },
    png: { pngMode: "lossy", pngQuantizationQuality: 45 },
  },
};

/** Copy for the legacy, no-longer-selectable "custom" mode. */
export const CUSTOM_MODE_COPY = {
  helper: "Using custom encoder settings from the Settings drawer.",
  blurb:
    "Custom encoder settings carried over from before. Pick a named mode to replace them.",
};
