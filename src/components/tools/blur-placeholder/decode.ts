/**
 * Image decoding for the blur placeholder tool. Runs in the decode worker
 * when it can, so a 50 MP photo never blocks the page, with a main-thread
 * fallback for formats a worker can't open (SVG, and anything
 * createImageBitmap rejects).
 */

import { decodeBlob, fromBitmap, type Decoded } from "./decode-core";

export type { Decoded };

/** Main-thread fallback via <img> (SVG and friends). */
async function decodeWithImg(blob: Blob): Promise<Decoded> {
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const W = img.naturalWidth || 300;
    const H = img.naturalHeight || 150;
    return await fromBitmap(img, W, H);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/* ---------- worker client ---------- */

type Reply = { id: number; ok: true; result: Decoded } | { id: number; ok: false; error: string };

let worker: Worker | null | undefined;
let seq = 0;
const pending = new Map<number, { resolve: (d: Decoded) => void; reject: (e: Error) => void }>();

function getWorker(): Worker | null {
  if (worker !== undefined) return worker;
  try {
    if (typeof Worker === "undefined" || typeof OffscreenCanvas === "undefined") throw new Error("no worker");
    const w = new Worker(new URL("./decode.worker.ts", import.meta.url), { type: "module" });
    w.onmessage = (e: MessageEvent<Reply>) => {
      const p = pending.get(e.data.id);
      if (!p) return;
      pending.delete(e.data.id);
      if (e.data.ok) p.resolve(e.data.result);
      else p.reject(new Error(e.data.error));
    };
    w.onerror = () => {
      for (const p of pending.values()) p.reject(new Error("Decoder stopped"));
      pending.clear();
      worker = null;
    };
    worker = w;
  } catch {
    worker = null;
  }
  return worker;
}

function decodeInWorker(blob: Blob): Promise<Decoded> {
  const w = getWorker();
  if (!w) return Promise.reject(new Error("no worker"));
  const id = ++seq;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    w.postMessage({ id, blob });
  });
}

/** Decode any image the browser can open, off the main thread when possible. */
export async function decodeImage(blob: Blob): Promise<Decoded> {
  try {
    return await decodeInWorker(blob);
  } catch {
    try {
      return await decodeBlob(blob);
    } catch {
      return await decodeWithImg(blob);
    }
  }
}

/* ---------- lossy encode (main thread, tiny images only) ---------- */

let encCanvas: HTMLCanvasElement | null = null;

/** WebP / JPEG data URL for a ≤ 64 px image, or null if the browser can't. */
export function encodeLossy(w: number, h: number, px: Uint8ClampedArray, mime: "image/webp" | "image/jpeg"): string | null {
  if (typeof document === "undefined") return null;
  try {
    encCanvas ??= document.createElement("canvas");
    encCanvas.width = w;
    encCanvas.height = h;
    const ctx = encCanvas.getContext("2d", { colorSpace: "srgb" });
    if (!ctx) return null;
    const id = ctx.createImageData(w, h);
    id.data.set(px);
    ctx.putImageData(id, 0, 0);
    return encCanvas.toDataURL(mime, 0.7);
  } catch {
    return null;
  }
}
