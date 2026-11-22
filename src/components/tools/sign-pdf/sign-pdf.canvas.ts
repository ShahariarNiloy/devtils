/**
 * Canvas helpers for signatures (DOM only — the maths is in sign-pdf.lib).
 * Every signature ends up as a trimmed transparent PNG plus its aspect.
 */

import { inkBounds, removePaper } from "./sign-pdf.lib";

export interface SigAsset {
  /** PNG data URL, transparent background, cropped to the ink. */
  url: string;
  /** height ÷ width */
  aspect: number;
}

/** Crop a canvas to its ink with a little breathing room. */
export function trimToInk(src: HTMLCanvasElement): SigAsset | null {
  const ctx = src.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  const { width: w, height: h } = src;
  const b = inkBounds(ctx.getImageData(0, 0, w, h).data, w, h);
  if (!b) return null;
  const pad = Math.round(Math.max(b.w, b.h) * 0.04) + 2;
  const out = document.createElement("canvas");
  out.width = b.w + pad * 2;
  out.height = b.h + pad * 2;
  out.getContext("2d")?.drawImage(src, b.x, b.y, b.w, b.h, pad, pad, b.w, b.h);
  return { url: out.toDataURL("image/png"), aspect: out.height / out.width };
}

/** A handwriting face: CSS family list plus the one weight it ships in. */
export interface HandFont {
  family: string;
  weight: number;
}

/** Typed name (or initials) in a handwriting font, as an image. */
export async function textAsset(text: string, face: HandFont, color: string): Promise<SigAsset | null> {
  if (!text.trim()) return null;
  const px = 140;
  const font = `${face.weight} ${px}px ${face.family}`;
  // Load only the real face: next/font's "X Fallback" points at a local
  // font that may not exist, and one missing face rejects the whole load.
  const primary = face.family.split(",")[0].trim();
  try {
    await document.fonts.load(`${face.weight} ${px}px ${primary}`, text);
  } catch {
    /* draw with whatever the browser has */
  }
  const c = document.createElement("canvas");
  const ctx = c.getContext("2d");
  if (!ctx) return null;
  ctx.font = font;
  const width = Math.ceil(ctx.measureText(text).width) + px;
  c.width = width;
  c.height = Math.ceil(px * 1.9);
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textBaseline = "middle";
  ctx.fillText(text, px / 2, c.height / 2);
  return trimToInk(c);
}

/** A photo of a signature → ink on transparent, cropped, ≤ 1200 px wide. */
export async function uploadAsset(file: File): Promise<SigAsset> {
  const bitmap = await createImageBitmap(file);
  const s = Math.min(1, 1200 / bitmap.width);
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(bitmap.width * s));
  c.height = Math.max(1, Math.round(bitmap.height * s));
  const ctx = c.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("no canvas");
  ctx.drawImage(bitmap, 0, 0, c.width, c.height);
  bitmap.close();
  const data = ctx.getImageData(0, 0, c.width, c.height);
  removePaper(data.data);
  ctx.putImageData(data, 0, 0);
  const asset = trimToInk(c);
  if (!asset) throw new Error("No signature found in that image — try a darker pen or a brighter photo.");
  return asset;
}

/** A PNG data URL → its bytes, for pdf-lib. */
export async function dataUrlBytes(url: string): Promise<ArrayBuffer> {
  return (await fetch(url)).arrayBuffer();
}

/** Text that Helvetica can't write (e.g. Cyrillic, CJK) is drawn as an image instead. */
export async function textImage(text: string, color: string): Promise<SigAsset | null> {
  return textAsset(text, { family: "system-ui, sans-serif", weight: 400 }, color);
}
