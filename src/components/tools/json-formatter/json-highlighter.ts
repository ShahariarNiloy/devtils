/**
 * Backwards-compat facade for the new `highlight/` module. Older imports
 * across the formatter still call `highlightJson` and `applySearchHighlight`;
 * those just forward into the new pipeline.
 */

import { highlight, highlightWithSearch, lineCount as _lineCount } from "./highlight";

export function highlightJson(source: string): string {
  return highlight(source, "json");
}
export const highlightJSON = highlightJson;

export function applySearchHighlight(html: string, search: string): string {
  // Legacy callers pass already-highlighted HTML in; we can't recover the
  // token stream from that, so we fall back to the old regex-on-HTML pass.
  if (!search.trim()) return html;
  const encoded = search.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const escaped = encoded.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(${escaped})`, "gi");
  return html.replace(/(<[^>]*>)|([^<]+)/g, (_, tag, text) => {
    if (tag) return tag;
    if (text) return text.replace(re, '<mark class="json-search-match">$1</mark>');
    return "";
  });
}

export const lineCount = _lineCount;

// Re-exports for new call sites that want them directly.
export { highlight, highlightWithSearch } from "./highlight";
export type { Lang } from "./highlight";
