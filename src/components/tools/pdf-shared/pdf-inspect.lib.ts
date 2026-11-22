/** Small PDF helpers that need no PDF library. Pure: no DOM, no React. */

const ascii = (s: string) => Uint8Array.from(s, (c) => c.charCodeAt(0));

/** First index of `needle` in `hay` at or after `from`, or -1. */
export function indexOfBytes(hay: Uint8Array, needle: Uint8Array, from = 0): number {
  const n = needle.length;
  if (!n) return from;
  const first = needle[0];
  const last = hay.length - n;
  for (let i = from; i <= last; i++) {
    if (hay[i] !== first) continue;
    let j = 1;
    while (j < n && hay[i + j] === needle[j]) j++;
    if (j === n) return i;
  }
  return -1;
}

const PDF_HEADER = ascii("%PDF-");

export interface PdfFacts {
  /** Has an encryption dictionary — pdf-lib can't rewrite it. */
  encrypted: boolean;
  /** Carries a certificate signature that any rewrite would invalidate. */
  digitallySigned: boolean;
}

/**
 * Starts like a PDF: a %PDF- header in the first 1 KB (some files carry junk
 * before it). Everything deeper is read by PDF.js in its worker — scanning a
 * 300 MB file here would block the page for half a second or more.
 */
export function looksLikePdf(bytes: Uint8Array): boolean {
  return indexOfBytes(bytes.subarray(0, 1024), PDF_HEADER) >= 0;
}

/** "Report Q3" / "report.PDF" → "report-q3.pdf"-style safe download name. */
export function pdfFileName(name: string, fallback: string): string {
  const base = name
    .trim()
    .replace(/\.pdf$/i, "")
    .replace(/[\\/:*?"<>|]+/g, "-")
    .trim();
  return `${base || fallback}.pdf`;
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1048576) return `${Math.round(n / 1024)} KB`;
  return `${(n / 1048576).toFixed(1)} MB`;
}
