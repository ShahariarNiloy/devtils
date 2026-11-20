import type { CheckLevel } from "./seo.lib";

/** Check row / summary chip colours per level (mockup CHK table). */
export const CHECK_TONE: Record<CheckLevel, { icon: string; text: string; bg: string }> = {
  err: { icon: "✕", text: "text-error-text", bg: "bg-error/12" },
  warn: { icon: "!", text: "text-[#f0c9a0]", bg: "bg-clay-light/10" },
  ok: { icon: "✓", text: "text-success-text", bg: "bg-success/10" },
  info: { icon: "i", text: "text-info-text", bg: "bg-info/10" },
};

/** Stronger dot / table-icon colour per level. */
export const LEVEL_DOT: Record<CheckLevel, string> = {
  err: "text-error",
  warn: "text-clay-light",
  ok: "text-success",
  info: "text-info",
};
