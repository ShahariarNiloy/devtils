"use client";

import { useSyncExternalStore } from "react";
import { estimateWidth, type Measure } from "../meta-preview/meta-preview.lib";

let ctx: CanvasRenderingContext2D | null | undefined;

/** Real text width via canvas; falls back to the Arial estimate. */
function canvasMeasure(text: string, font: string): number {
  if (ctx === undefined) ctx = document.createElement("canvas").getContext("2d");
  if (!ctx) return estimateWidth(text, font);
  ctx.font = font;
  return ctx.measureText(text).width;
}

const noopSubscribe = () => () => {};

/**
 * Text measurer for search-result previews. Server render and hydration use
 * the estimate; the browser then measures with canvas.
 */
export function useTextMeasure(): Measure {
  const isClient = useSyncExternalStore(noopSubscribe, () => true, () => false);
  return isClient ? canvasMeasure : estimateWidth;
}
