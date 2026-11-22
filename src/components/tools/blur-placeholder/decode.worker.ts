/// <reference lib="webworker" />
/**
 * Decode worker: createImageBitmap + OffscreenCanvas off the main thread,
 * returning the ≤ 100 px working pixels (transferred, not copied).
 */

import { decodeBlob } from "./decode-core";

self.onmessage = async (e: MessageEvent<{ id: number; blob: Blob }>) => {
  const { id, blob } = e.data;
  try {
    const result = await decodeBlob(blob);
    self.postMessage({ id, ok: true, result }, [result.px.buffer]);
  } catch (err) {
    self.postMessage({ id, ok: false, error: err instanceof Error ? err.message : String(err) });
  }
};
