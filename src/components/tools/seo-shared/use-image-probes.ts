"use client";

import { useEffect, useState } from "react";

export type ImageProbeResult = { state: "loading" } | { state: "ok"; w: number; h: number } | { state: "error" };

/** Give up on an image that hasn't loaded after this long. */
const TIMEOUT_MS = 8000;

/**
 * Load each image URL in the browser (no CORS needed to display or measure
 * it) and report its real size, or that it failed. The image's host isn't
 * told which page asked. URLs not yet settled read as "loading".
 */
export function useImageProbes(urls: readonly string[]): Record<string, ImageProbeResult> {
  const [done, setDone] = useState<Record<string, ImageProbeResult>>({});
  const key = urls.join("\n");

  useEffect(() => {
    const list = key ? key.split("\n") : [];
    const cleanups = list.map((src) => {
      const img = new Image();
      let settled = false;
      const settle = (r: ImageProbeResult) => {
        if (settled) return;
        settled = true;
        setDone((d) => (d[src]?.state === r.state ? d : { ...d, [src]: r }));
      };
      const timer = setTimeout(() => settle({ state: "error" }), TIMEOUT_MS);
      img.referrerPolicy = "no-referrer";
      img.onload = () => settle(img.naturalWidth ? { state: "ok", w: img.naturalWidth, h: img.naturalHeight } : { state: "error" });
      img.onerror = () => settle({ state: "error" });
      img.src = src;
      return () => {
        clearTimeout(timer);
        img.onload = img.onerror = null;
      };
    });
    return () => cleanups.forEach((c) => c());
  }, [key]);

  const out: Record<string, ImageProbeResult> = {};
  for (const u of urls) out[u] = done[u] ?? { state: "loading" };
  return out;
}
