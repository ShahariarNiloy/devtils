/**
 * Merge PDF: the page list as plain data, and every edit as a pure
 * function. No React, no DOM, no PDF library.
 */

export interface PdfFile {
  id: string;
  name: string;
  size: number;
  pageCount: number;
  /** Index into the file colour palette. */
  hue: number;
}

export interface PageItem {
  /** Stable for the page's lifetime, unique across files. */
  id: string;
  file: string;
  /** 0-based page index in its source file. */
  index: number;
  /** Extra rotation, 0 / 90 / 180 / 270. */
  rotate: number;
}

export const pageKey = (file: string, index: number) => `${file}:${index}`;

export function pagesOf(file: PdfFile): PageItem[] {
  return Array.from({ length: file.pageCount }, (_, i) => ({ id: pageKey(file.id, i), file: file.id, index: i, rotate: 0 }));
}

const norm = (deg: number) => ((deg % 360) + 360) % 360;

export function rotatePages(pages: readonly PageItem[], ids: ReadonlySet<string>, delta: number): PageItem[] {
  return pages.map((p) => (ids.has(p.id) ? { ...p, rotate: norm(p.rotate + delta) } : p));
}

export function removePages(pages: readonly PageItem[], ids: ReadonlySet<string>): PageItem[] {
  return pages.filter((p) => !ids.has(p.id));
}

/** Move one page from position `from` to position `to`. */
export function movePage(pages: readonly PageItem[], from: number, to: number): PageItem[] {
  if (from === to || from < 0 || to < 0 || from >= pages.length || to >= pages.length) return [...pages];
  const out = [...pages];
  const [p] = out.splice(from, 1);
  out.splice(to, 0, p);
  return out;
}

/**
 * Shift every selected page one place earlier (-1) or later (+1), as a
 * block. Pages already at the edge stay; the rest keep their order.
 */
export function shiftSelected(pages: readonly PageItem[], ids: ReadonlySet<string>, dir: -1 | 1): PageItem[] {
  const out = [...pages];
  const order = dir < 0 ? out.map((_, i) => i) : out.map((_, i) => out.length - 1 - i);
  for (const i of order) {
    const j = i + dir;
    if (!ids.has(out[i].id) || j < 0 || j >= out.length || ids.has(out[j].id)) continue;
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Move a file from position `from` to `to`. Pages are regrouped in the new
 * file order; within a file the user's own page order is kept.
 */
export function moveFile(files: readonly PdfFile[], pages: readonly PageItem[], from: number, to: number): { files: PdfFile[]; pages: PageItem[] } {
  const nextFiles = [...files];
  if (from !== to && from >= 0 && to >= 0 && from < files.length && to < files.length) {
    const [f] = nextFiles.splice(from, 1);
    nextFiles.splice(to, 0, f);
  }
  return { files: nextFiles, pages: groupByFile(nextFiles, pages) };
}

/** Move a file one place earlier. */
export function moveFileUp(files: readonly PdfFile[], pages: readonly PageItem[], id: string): { files: PdfFile[]; pages: PageItem[] } {
  const i = files.findIndex((f) => f.id === id);
  return moveFile(files, pages, i, Math.max(0, i - 1));
}

/** Pages in file order (stable within each file). */
function groupByFile(files: readonly PdfFile[], pages: readonly PageItem[]): PageItem[] {
  const nextFiles = files;
  const rank = new Map(nextFiles.map((f, k) => [f.id, k]));
  // Stable sort: within a file, the user's own page order is kept.
  return pages
    .map((p, k) => ({ p, k }))
    .sort((a, b) => (rank.get(a.p.file) ?? 0) - (rank.get(b.p.file) ?? 0) || a.k - b.k)
    .map(({ p }) => p);
}

/** Rough output size: each file's bytes, shared out by the pages kept. */
export function estimateBytes(files: readonly PdfFile[], pages: readonly PageItem[]): number {
  const kept = new Map<string, number>();
  for (const p of pages) kept.set(p.file, (kept.get(p.file) ?? 0) + 1);
  return files.reduce((sum, f) => sum + (f.pageCount ? (f.size * (kept.get(f.id) ?? 0)) / f.pageCount : 0), 0);
}

export const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
