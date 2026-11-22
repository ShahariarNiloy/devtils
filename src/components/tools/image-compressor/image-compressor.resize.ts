/** "Max width" ↔ the resize settings. Pure and dependency-free (the
 *  starting points use it from server-rendered SEO data). */

import type { CompressionSettings } from "./image-compressor.types";

/** Current "Max width" cap in px, or 0 when images keep their width. */
export function maxWidthOf(s: CompressionSettings): number {
  const r = s.resize;
  return r.enabled && r.width && r.height === null && r.downscaleOnly === true ? r.width : 0;
}

/** Cap the width (never upscales, height keeps the aspect); 0 = off. */
export function maxWidthPatch(width: number): Pick<CompressionSettings, "resize"> {
  return {
    resize:
      width > 0
        ? { enabled: true, width, height: null, lockAspectRatio: true, downscaleOnly: true }
        : { enabled: false, width: null, height: null, lockAspectRatio: true, downscaleOnly: false },
  };
}
