/**
 * "Pick a starting point" — the four preset cards under the tool. Each maps
 * its settings chip onto CompressionSettings. Pure.
 */

import type { CompressionSettings } from "./image-compressor.types";
import { maxWidthPatch } from "./image-compressor.resize";

export interface StartingPoint {
  id: string;
  /** Mono settings chip, exactly as shown on the card. */
  chip: string;
  title: string;
  body: string;
  tint: "clay" | "sage" | "teal" | "rose";
  patch: Partial<CompressionSettings>;
}

export const STARTING_POINTS: readonly StartingPoint[] = [
  {
    id: "hero",
    chip: "auto · q75 · 1920",
    title: "Hero and blog images",
    body: "Sharp on large screens, usually 80–90% smaller than a camera JPEG.",
    tint: "clay",
    // q75 on the JPEG scale is exactly Balanced (JPEG 75 · WebP 80 · AVIF 60).
    patch: { outputFormat: "auto", goal: "quality", qualityMode: "high", customQuality: 75, ...maxWidthPatch(1920) },
  },
  {
    id: "cards",
    chip: "budget · 100 KB · 1280",
    title: "Thumbnails and cards",
    body: "Set a budget once and every image fits it, whatever its content.",
    tint: "sage",
    // The chip names no format: the budget applies to whatever format is
    // chosen (the uploads' own by default) — no silent switch to Auto.
    patch: { goal: "budget", budgetKb: 100, ...maxWidthPatch(1280) },
  },
  {
    id: "ui",
    chip: "webp · q85",
    title: "Screenshots and UI",
    body: "Keep text crisp. Turn on “Show what changed” to check the edges.",
    tint: "teal",
    patch: {
      outputFormat: "image/webp",
      goal: "quality",
      qualityMode: "custom",
      customQuality: 85,
      pngQuantizationQuality: 85,
      pngMode: "lossy",
      ...maxWidthPatch(0),
    },
  },
  {
    id: "upload",
    chip: "budget · 300 KB",
    title: "Upload limits",
    body: "Forms and CMSs that reject big files — aim just under their limit.",
    tint: "rose",
    patch: { goal: "budget", budgetKb: 300, ...maxWidthPatch(0) },
  },
];
